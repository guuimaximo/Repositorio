import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabase'

const acoes = [
  'Advertência',
  'Aviso de última oportunidade',
  'Contato Pessoal',
  'Não aplicada',
  'Orientação',
  'Suspensão',
  'Contato via Celular',
  'Elogiado',
]

export default function TratarTratativa() {
  const { id } = useParams()
  const nav = useNavigate()
  const [t, setT] = useState(null)
  const [resumo, setResumo] = useState('')
  const [acao, setAcao] = useState('Orientação')
  const [img, setImg] = useState(null)
  const [assinatura, setAssinatura] = useState(null)
  const [loading, setLoading] = useState(false)

  // Linha (código + descrição)
  const [linhaDescricao, setLinhaDescricao] = useState('')

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('tratativas')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error(error)
        return
      }
      setT(data || null)

      if (data?.linha) {
        const { data: row, error: e2 } = await supabase
          .from('linhas')
          .select('descricao')
          .eq('codigo', data.linha)
          .maybeSingle()
        if (e2) console.warn('Falha ao buscar descrição da linha:', e2)
        setLinhaDescricao(row?.descricao || '')
      } else {
        setLinhaDescricao('')
      }
    })()
  }, [id])

  async function concluir() {
    if (!t) return
    if (!resumo) { alert('Informe o resumo/observações'); return }

    setLoading(true)
    try {
      let imagem_tratativa = null
      if (img) {
        const nome = `trat_${Date.now()}_${img.name}`.replace(/\s+/g, '_')
        const up = await supabase.storage.from('tratativas').upload(nome, img)
        if (up.error) throw up.error
        imagem_tratativa = supabase.storage.from('tratativas').getPublicUrl(nome).data.publicUrl
      }
      let assinatura_url = null
      if (assinatura) {
        const nome = `ass_${Date.now()}_${assinatura.name}`.replace(/\s+/g, '_')
        const up = await supabase.storage.from('tratativas').upload(nome, assinatura)
        if (up.error) throw up.error
        assinatura_url = supabase.storage.from('tratativas').getPublicUrl(nome).data.publicUrl
      }

      await supabase.from('tratativas_detalhes').insert({
        tratativa_id: t.id,
        acao_aplicada: acao,
        observacoes: resumo,
        imagem_tratativa,
        assinatura_url,
        // linha: t.linha || null, // opcional, caso queira registrar no histórico
      })

      await supabase
        .from('tratativas')
        .update({
          status: 'Concluída',
          imagem_tratativa: imagem_tratativa || t.imagem_tratativa || null,
        })
        .eq('id', t.id)

      alert('Tratativa concluída com sucesso!')
      nav('/central')
    } catch (e) {
      alert(`Erro: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  // ================== GERAÇÃO DA MEDIDA DISCIPLINAR (PRINT) ==================
  const podeGerarMedida = ['Advertência', 'Suspensão', 'Orientação'].includes(acao)

  const dataHojePt = (d = new Date()) =>
    d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  const linhaLabel = t?.linha ? `${t.linha}${linhaDescricao ? ` - ${linhaDescricao}` : ''}` : '-'

  const textoCabecalho = (tipo) => {
    if (tipo === 'Advertência') return 'ADVERTÊNCIA DISCIPLINAR'
    if (tipo === 'Suspensão') return 'SUSPENSÃO DISCIPLINAR'
    return 'ORIENTAÇÃO DISCIPLINAR'
  }

  function handleGerarMedida() {
    if (!t) return
    if (!resumo.trim()) {
      if (!confirm('O campo "Resumo / Observações" está vazio. Deseja gerar mesmo assim?')) return
    }

    // Monta HTML usando seus modelos como base (título e seções, 1 página A4)
    const titulo = textoCabecalho(acao)
    const registro = t.id.toString().padStart(8, '0') // simples: usa o id como “Registro”
    const nome = t.motorista_nome || '—'
    const chapa = t.motorista_chapa ? `(${t.motorista_chapa})` : ''
    const cargo = 'Motorista'
    const dataDocumento = dataHojePt()
    const dataOcorrencia = t.data_ocorrido || '—'
    const ocorrencia = t.tipo_ocorrencia || '—'
    const observacao = (resumo || '').replace(/\n/g, '<br/>')

    const estilos = `
      <style>
        @page { size: A4; margin: 16mm; }
        * { box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; color: #111827; }
        .wrap { max-width: 800px; margin: 0 auto; }
        h1 { font-size: 20px; text-align: center; margin: 0 0 12px; text-transform: uppercase; }
        .muted { color: #6b7280; }
        .linha { margin: 8px 0; display: flex; justify-content: space-between; gap: 12px; }
        .box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-top: 10px; }
        .label { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
        .valor { font-weight: 600; }
        .mb8 { margin-bottom: 8px; }
        .mb12 { margin-bottom: 12px; }
        .mb16 { margin-bottom: 16px; }
        .flex { display: flex; gap: 12px; }
        .col { flex: 1; }
        .assinaturas { margin-top: 28px; }
        .ass { text-align: center; margin-top: 40px; }
        .ass .linha-ass { border-top: 1px solid #111827; width: 100%; height: 1px; margin: 24px auto 4px; }
        .duas-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .nota { font-size: 12px; color: #374151; }
        .titulo-menor { text-transform: none; font-size: 18px; }
      </style>
    `

    // blocos comuns
    const blocoIdent = `
      <div class="box">
        <div class="linha"><div><span class="label">Registro</span><div class="valor">${registro}</div></div>
        <div><span class="label">Data</span><div class="valor">${dataDocumento}</div></div></div>
        <div class="linha"><div><span class="label">Sr(a)</span><div class="valor">${nome} ${chapa}</div></div>
        <div><span class="label">Cargo</span><div class="valor">${cargo}</div></div></div>
        <div class="linha"><div><span class="label">Linha</span><div class="valor">${linhaLabel}</div></div>
        <div><span class="label">Data da Ocorrência</span><div class="valor">${dataOcorrencia}</div></div></div>
      </div>
    `

    const blocoConteudo = `
      <div class="box">
        <div class="mb8"><span class="label">Ocorrência</span><div class="valor">${ocorrencia}</div></div>
        <div><span class="label">Observação</span><div class="nota">${observacao || '—'}</div></div>
      </div>
    `

    // Rodapé de assinaturas — de acordo com os modelos
    const blocoAssinaturas = `
      <div class="assinaturas">
        <div class="duas-col">
          <div class="ass">
            <div class="linha-ass"></div>
            <div class="nota">Assinatura do Empregado</div>
          </div>
          <div class="ass">
            <div class="linha-ass"></div>
            <div class="nota">Assinatura do Empregador</div>
          </div>
        </div>
        ${acao !== 'Advertência' ? `
        <div class="duas-col" style="margin-top:20px">
          <div class="ass">
            <div class="linha-ass"></div>
            <div class="nota">Testemunha — CPF:</div>
          </div>
          <div class="ass">
            <div class="linha-ass"></div>
            <div class="nota">Testemunha — CPF:</div>
          </div>
        </div>` : ''}
      </div>
    `

    // Texto introdutório conforme a medida (resumo adaptado dos seus modelos)
    const introAdvertencia = `
      <p class="nota">
        Vimos pelo presente aplicar-lhe advertência, em virtude da falta abaixo descrita.
        Solicitamos que a falta não se repita, sob pena de medidas mais severas previstas em lei.
      </p>
    `
    const introSuspensao = `
      <p class="nota">
        Pelo presente, notificamos que, em razão da falta abaixo descrita, o(a) colaborador(a) encontra-se
        <b>Suspenso(a)</b> do serviço pelo período indicado, retornando na data definida pela empresa.
        Pedimos a devolução deste documento com o “ciente”.
      </p>
    `
    const introOrientacao = `
      <p class="nota">
        Pelo presente, registramos <b>Orientação Disciplinar</b> ao(à) colaborador(a), conforme falta
        abaixo descrita e recomendações realizadas.
      </p>
    `

    const intro = acao === 'Advertência' ? introAdvertencia
                : acao === 'Suspensão' ? introSuspensao
                : introOrientacao

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${titulo} - ${nome}</title>
          ${estilos}
        </head>
        <body>
          <div class="wrap">
            <h1>${titulo}</h1>
            ${blocoIdent}
            <div class="mb12"></div>
            ${intro}
            <div class="mb12"></div>
            ${blocoConteudo}
            ${blocoAssinaturas}
          </div>
          <script>window.onload = () => { window.print(); }</script>
        </body>
      </html>
    `

    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
  }
  // ================== FIM DA GERAÇÃO ==================

  if (!t) return <div className="p-6">Carregando…</div>

  const linhaLabelExibicao = linhaLabel

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold mb-2">Tratar</h1>
      <p className="text-gray-600 mb-6">Revise os dados e finalize a tratativa.</p>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Item titulo="Motorista" valor={`${t.motorista_nome || ''} ${t.motorista_chapa ? `(${t.motorista_chapa})` : ''}`} />
          <Item titulo="Ocorrência" valor={t.tipo_ocorrencia} />
          <Item titulo="Prioridade" valor={t.prioridade} />
          <Item titulo="Setor" valor={t.setor_origem} />
          <Item titulo="Linha" valor={linhaLabelExibicao} />
          <Item titulo="Status" valor={t.status} />
          <Item titulo="Data/Hora" valor={`${t.data_ocorrido || '-'} ${t.hora_ocorrido || ''}`} />
          <Item titulo="Descrição" valor={t.descricao || '-'} className="md:col-span-2" />

          {t.imagem_url && (
            <div className="md:col-span-2">
              <span className="block text-sm text-gray-600 mb-1">Imagem enviada (clique para ampliar)</span>
              <a href={t.imagem_url} target="_blank" rel="noopener noreferrer">
                <img
                  src={t.imagem_url}
                  className="max-h-48 rounded cursor-pointer hover:opacity-80 transition-opacity"
                  alt="Imagem da ocorrência"
                />
              </a>
            </div>
          )}
        </dl>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Ação aplicada</label>
            <select className="w-full rounded-md border px-3 py-2" value={acao} onChange={e => setAcao(e.target.value)}>
              {acoes.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Imagem da tratativa (opcional)</label>
            <input type="file" accept="image/*" onChange={e => setImg(e.target.files?.[0] || null)} />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Assinatura do colaborador (foto/PDF)</label>
            <input type="file" onChange={e => setAssinatura(e.target.files?.[0] || null)} />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-gray-600 mb-1">Resumo / Observações</label>
            <textarea rows={4} className="w-full rounded-md border px-3 py-2"
              value={resumo} onChange={e => setResumo(e.target.value)} />
          </div>
        </div>

        <div className="mt-4 flex gap-3 flex-wrap">
          <button
            onClick={concluir}
            disabled={loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? 'Salvando…' : 'Concluir'}
          </button>

          {podeGerarMedida && (
            <button
              type="button"
              onClick={handleGerarMedida}
              className="rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
              title="Gerar documento da medida disciplinar"
            >
              GERAR MEDIDA DISCIPLINAR
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Item({ titulo, valor, className }) {
  return (
    <div className={className}>
      <dt className="text-sm text-gray-600">{titulo}</dt>
      <dd className="font-medium break-words">{valor}</dd>
    </div>
  )
}
