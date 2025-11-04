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

  // (opcional) descrição da linha – não é usada no documento de orientação (modelo exige só os campos listados)
  const [linhaDescricao, setLinhaDescricao] = useState('')

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('tratativas').select('*').eq('id', id).single()
      if (!error) setT(data || null)

      if (data?.linha) {
        const { data: row } = await supabase.from('linhas').select('descricao').eq('codigo', data.linha).maybeSingle()
        setLinhaDescricao(row?.descricao || '')
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
        assinatura_url
      })

      await supabase.from('tratativas').update({
        status: 'Concluída',
        imagem_tratativa: imagem_tratativa || t.imagem_tratativa || null
      }).eq('id', t.id)

      alert('Tratativa concluída com sucesso!')
      nav('/central')
    } catch (e) {
      alert(`Erro: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  // ================== ORIENTAÇÃO — Geração EXATA do modelo ==================
  const podeGerarOrientacao = acao === 'Orientação'

  const dataPtCompletaUpper = (d = new Date()) => {
    const meses = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO']
    const dia = String(d.getDate()).padStart(2,'0')
    const mes = meses[d.getMonth()]
    const ano = d.getFullYear()
    return `${dia} de ${mes} de ${ano}`
  }

  function gerarOrientacao() {
    if (!t) return

    const registro = String(t.id).padStart(8,'0') // ajuste se tiver outro número de registro
    const dataDoc = dataPtCompletaUpper(new Date())
    const nome = (t.motorista_nome || '—').toUpperCase()
    const cargo = (t.cargo || 'Motorista').toUpperCase() // ajuste se tiver campo específico
    const ocorrencia = (t.tipo_ocorrencia || '—').toUpperCase()
    const dataOcorr = t.data_ocorrido ? new Date(t.data_ocorrido).toLocaleDateString('pt-BR') : '—'
    const observ = (resumo || t.descricao || '—')

    const estilos = `
      <style>
        @page { size: A4; margin: 18mm; }
        body { font-family: Arial, Helvetica, sans-serif; color:#000; }
        .l { line-height: 1.35; }
        .t { text-align: center; font-weight: bold; font-size: 18px; margin-bottom: 14px; }
        .row { display:flex; justify-content:space-between; gap:12px; margin: 6px 0; }
        .mt { margin-top: 10px; }
        .mb { margin-bottom: 10px; }
        .bl { white-space: pre-wrap; }
        .assin { display:grid; grid-template-columns: 1fr 1fr; gap:24px; margin-top: 24px; }
        .ass-linha { margin-top: 30px; border-top: 1px solid #000; height:1px; }
        .nota { font-size: 12px; }
      </style>
    `

    // Texto fiel ao modelo (mantém “advertência” conforme documento-base)
    const intro1 = `Vimos pelo presente, aplicar-lhe a pena de advertência disciplinar, em virtude de o senhor ter cometido à falta abaixo descrita.`
    const intro2 = `Pedimos-lhe que tal falta não mais se repita, pois pelo contrário seremos obrigados a adotar medidas mais severas que nos são facultadas pela lei.`

    const html = `
      <html>
        <head><meta charset="utf-8" />${estilos}<title>ORIENTAÇÃO DISCIPLINAR - ${nome}</title></head>
        <body class="l">
          <div class="t">ORIENTAÇÃO DISCIPLINAR</div>

          <div class="row"><div><b>Registro:</b> ${registro}</div><div>${dataDoc}</div></div>

          <div class="row">
            <div><b>SR(A)</b> ${nome}</div>
            <div><b>Cargo:</b> ${cargo}</div>
          </div>

          <p class="mt bl">${intro1}</p>
          <p class="bl">${intro2}</p>

          <div class="mt"><b>Ocorrência:</b> ${ocorrencia}</div>
          <div class="mt"><b>Data da Ocorrência:</b> ${dataOcorr}</div>
          <div class="mt"><b>Observação:</b> ${observ}</div>

          <div class="mt"><b>Ciente e Concordo:</b> ________/______/__________</div>

          <div class="assin">
            <div>
              <div class="ass-linha"></div>
              <div class="nota">Assinatura do Empregado</div>
            </div>
            <div>
              <div class="ass-linha"></div>
              <div class="nota">Assinatura do Empregador</div>
            </div>
          </div>

          <div class="assin">
            <div>
              <div class="ass-linha"></div>
              <div class="nota">Testemunha &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; CPF:</div>
            </div>
            <div>
              <div class="ass-linha"></div>
              <div class="nota">Testemunha &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; CPF:</div>
            </div>
          </div>

          <script>window.onload = () => { window.print(); }</script>
        </body>
      </html>
    `
    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
  }
  // ================== FIM ORIENTAÇÃO ==================

  if (!t) return <div className="p-6">Carregando…</div>

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
          <Item titulo="Status" valor={t.status} />
          <Item titulo="Data/Hora" valor={`${t.data_ocorrido || '-'} ${t.hora_ocorrido || ''}`} />
          <Item titulo="Descrição" valor={t.descricao || '-'} className="md:col-span-2" />
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

          {podeGerarOrientacao && (
            <button
              type="button"
              onClick={gerarOrientacao}
              className="rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
              title="Gerar documento de ORIENTAÇÃO DISCIPLINAR"
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
