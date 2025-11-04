// src/pages/TratarTratativa.jsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabase'

const acoes = [
  'Orientação',
  'Advertência',
  'Suspensão',
  'Aviso de última oportunidade',
  'Contato Pessoal',
  'Não aplicada',
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
  const [loading, setLoading] = useState(false)

  // Complementos
  const [linhaDescricao, setLinhaDescricao] = useState('')
  const [cargoMotorista, setCargoMotorista] = useState('MOTORISTA')

  // Edição inline
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    tipo_ocorrencia: '',
    prioridade: 'Média',
    setor_origem: '',
    linha: '',
    descricao: '',
  })

  // ---- Controles de Suspensão ----
  const [diasSusp, setDiasSusp] = useState(1) // 1,3,5,7
  const [dataSuspensao, setDataSuspensao] = useState(() => new Date().toISOString().slice(0,10)) // yyyy-mm-dd

  const dataPtCompletaUpper = (d = new Date()) => {
    const meses = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO']
    const dia = String(d.getDate()).padStart(2,'0')
    const mes = meses[d.getMonth()]
    const ano = d.getFullYear()
    return `${dia} de ${mes} de ${ano}`
  }
  const br = (d) => {
    if (!d) return '—'
    const dt = (d instanceof Date) ? d : new Date(d)
    if (Number.isNaN(dt.getTime())) return '—'
    return dt.toLocaleDateString('pt-BR')
  }
  const addDays = (dateStr, n) => {
    const d = new Date(dateStr)
    d.setDate(d.getDate() + n)
    return d
  }

  // Início, fim e retorno (dias corridos: fim = início + (dias - 1), retorno = fim + 1)
  const inicioSusp = useMemo(() => new Date(dataSuspensao), [dataSuspensao])
  const fimSusp = useMemo(() => addDays(dataSuspensao, Math.max(Number(diasSusp) - 1, 0)), [dataSuspensao, diasSusp])
  const retornoSusp = useMemo(() => addDays(dataSuspensao, Math.max(Number(diasSusp), 0)), [dataSuspensao, diasSusp])

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('tratativas').select('*').eq('id', id).single()
      if (error) { console.error(error); return }
      setT(data || null)

      setEditForm({
        tipo_ocorrencia: data?.tipo_ocorrencia || '',
        prioridade: data?.prioridade || 'Média',
        setor_origem: data?.setor_origem || '',
        linha: data?.linha || '',
        descricao: data?.descricao || '',
      })

      // Linha (código -> descrição)
      if (data?.linha) {
        const { data: row } = await supabase
          .from('linhas')
          .select('descricao')
          .eq('codigo', data.linha)
          .maybeSingle()
        setLinhaDescricao(row?.descricao || '')
      } else setLinhaDescricao('')

      // Cargo (por registro/chapa)
      if (data?.motorista_chapa) {
        const { data: m } = await supabase
          .from('motoristas')
          .select('cargo')
          .eq('chapa', data.motorista_chapa)
          .maybeSingle()
        setCargoMotorista((m?.cargo || data?.cargo || 'Motorista').toUpperCase())
      } else {
        setCargoMotorista((data?.cargo || 'Motorista').toUpperCase())
      }
    })()
  }, [id])

  async function salvarEdicao() {
    if (!t) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('tratativas')
        .update({
          tipo_ocorrencia: editForm.tipo_ocorrencia || null,
          prioridade: editForm.prioridade || null,
          setor_origem: editForm.setor_origem || null,
          linha: editForm.linha || null,
          descricao: editForm.descricao || null,
        })
        .eq('id', t.id)
      if (error) throw error

      setT(prev => prev ? ({ ...prev, ...editForm }) : prev)

      if (editForm.linha) {
        const { data: row } = await supabase
          .from('linhas')
          .select('descricao')
          .eq('codigo', editForm.linha)
          .maybeSingle()
        setLinhaDescricao(row?.descricao || '')
      } else setLinhaDescricao('')

      setIsEditing(false)
      alert('Dados atualizados!')
    } catch (e) {
      alert(`Erro ao salvar: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

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

      // detalhe/histórico
      await supabase.from('tratativas_detalhes').insert({
        tratativa_id: t.id,
        acao_aplicada: acao,
        observacoes: resumo,
        imagem_tratativa
      })

      // atualiza status
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

  // ======== Impressão – CSS base ========
  function baseCssCourier() {
    return `
      <style>
        @page { size: A4; margin: 25mm; }
        html, body { height: 100%; }
        body {
          font-family: "Courier New", Courier, monospace;
          color:#000; font-size: 14px; line-height: 1.55; margin: 0;
        }
        .page { min-height: 100vh; display: flex; flex-direction: column; }
        .content { padding: 0; }
        .linha { display:flex; justify-content:space-between; gap:16px; }
        .mt { margin-top: 16px; }
        .center { text-align: center; font-weight: bold; }
        .right { text-align: right; }
        .bl { white-space: pre-wrap; }
        .label { font-weight: bold; }
        .footer-sign { margin-top: auto; }
        .ass-grid { display:grid; grid-template-columns: 1fr 1fr; gap: 28px; }
        .ass { text-align: center; }
        .ass-line { margin-top: 34px; border-top: 1px solid #000; height:1px; }
      </style>
    `
  }

function renderSuspensaoHtml({
  nome, registro, cargo, ocorrencia, dataOcorr, observ, dataDoc,
  dias, inicio, fim, retorno
}) {
  const br = (d) => {
    const dt = (d instanceof Date) ? d : new Date(d);
    return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('pt-BR');
  };
  const diasFmt = String(dias).padStart(2, '0');
  const rotuloDia = Number(dias) === 1 ? 'dia' : 'dias';

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        @page { size: A4; margin: 25mm; }
        html, body { height: 100%; }
        body {
          font-family: "Courier New", Courier, monospace;
          font-size: 14px; line-height: 1.7; color: #000; margin: 0;
        }
        .page { min-height: 100vh; display: flex; flex-direction: column; }
        .content { max-width: 80ch; margin: 0 auto; }
        .center { text-align: center; font-weight: bold; }
        .right { text-align: right; }
        .linha { display:flex; justify-content:space-between; gap:16px; }
        .mt { margin-top: 18px; }
        .label { font-weight: bold; }
        .bl { white-space: pre-wrap; text-align: left; }
        .nowrap { white-space: nowrap; }
        .footer-sign { margin-top: auto; }
        .ass-grid { display:grid; grid-template-columns: 1fr 1fr; gap: 28px; }
        .ass { text-align:center; }
        .ass-line { margin-top: 36px; border-top:1px solid #000; height:1px; }
      </style>
      <title>SUSPENSÃO DISCIPLINAR - ${nome}</title>
    </head>
    <body>
      <div class="page">
        <div class="content">
          <div class="center">SUSPENSÃO DISCIPLINAR</div>
          <div class="right mt">${dataDoc}</div>

          <div class="linha mt">
            <div>SR(A) <span class="label">${nome}</span> ${registro ? `(REGISTRO: ${registro})` : ''}</div>
            <div><span class="label">Cargo:</span> ${cargo}</div>
          </div>

          <p class="mt bl">
  Pelo presente, notificamos que, por ter o senhor cometido a falta abaixo descrita,
  encontra-se suspenso do serviço por <span class="label nowrap">${diasFmt} ${rotuloDia}</span>,
  <span class="nowrap">a partir de <span class="label">${br(inicio)}</span></span>, devendo, portanto,
  apresentar-se ao mesmo, no horário usual, <span class="nowrap">no dia <span class="label">${br(retorno)}</span></span>,
  salvo outra resolução nossa, que lhe daremos parte se for o caso e, assim, pedimos a devolução do presente com o seu “ciente”.
</p>


          <div class="mt"><span class="label">Ocorrência:</span> ${ocorrencia}</div>
          <div class="mt"><span class="label">Data da Ocorrência:</span> ${dataOcorr}</div>
          <div class="mt"><span class="label">Período da Suspensão:</span> ${br(inicio)} a ${br(fim)} (retorno: ${br(retorno)})</div>
          <div class="mt"><span class="label">Observação:</span> ${observ}</div>

          <div class="mt"><span class="label">Ciente e Concordo:</span> ________/______/__________</div>
        </div>

        <div class="footer-sign mt">
          <div class="ass-grid">
            <div class="ass"><div class="ass-line"></div>Assinatura do Empregado</div>
            <div class="ass"><div class="ass-line"></div>Assinatura do Empregador</div>
          </div>
          <div class="ass-grid" style="margin-top:20px">
            <div class="ass"><div class="ass-line"></div>Testemunha &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; CPF:</div>
            <div class="ass"><div class="ass-line"></div>Testemunha &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; CPF:</div>
          </div>
        </div>
      </div>
      <script>window.onload = () => { window.print(); }</script>
    </body>
  </html>
  `;
}


  function renderGenericHtml({ titulo, intro1, intro2, nome, registro, cargo, ocorrencia, dataOcorr, observ, dataDoc }) {
    return `
      <html>
        <head>
          <meta charset="utf-8" />
          ${baseCssCourier()}
          <title>${titulo} - ${nome}</title>
        </head>
        <body>
          <div class="page">
            <div class="content">
              <div class="center">${titulo}</div>
              <div class="right mt">${dataDoc}</div>

              <div class="linha mt">
                <div>SR(A) <span class="label">${nome}</span> ${registro ? `(REGISTRO: ${registro})` : ''}</div>
                <div><span class="label">Cargo:</span> ${cargo}</div>
              </div>

              <p class="mt bl">${intro1}</p>
              <p class="bl">${intro2}</p>

              <div class="mt"><span class="label">Ocorrência:</span> ${ocorrencia}</div>
              <div class="mt"><span class="label">Data da Ocorrência:</span> ${dataOcorr}</div>
              <div class="mt"><span class="label">Observação:</span> ${observ}</div>

              <div class="mt"><span class="label">Ciente e Concordo:</span> ________/______/__________</div>
            </div>

            <div class="footer-sign mt">
              <div class="ass-grid">
                <div class="ass">
                  <div class="ass-line"></div>
                  Assinatura do Empregado
                </div>
                <div class="ass">
                  <div class="ass-line"></div>
                  Assinatura do Empregador
                </div>
              </div>
              <div class="ass-grid" style="margin-top:20px">
                <div class="ass">
                  <div class="ass-line"></div>
                  Testemunha &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; CPF:
                </div>
                <div class="ass">
                  <div class="ass-line"></div>
                  Testemunha &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; CPF:
                </div>
              </div>
            </div>
          </div>
          <script>window.onload = () => { window.print(); }</script>
        </body>
      </html>
    `
  }

  // ======== Geradores ========
  function gerarOrientacao() {
    if (!t) return
    if (!resumo.trim()) { alert('Preencha o Resumo / Observações para gerar a medida.'); return }

    const dataDoc = dataPtCompletaUpper(new Date())
    const nome = (t.motorista_nome || '—').toUpperCase()
    const registro = t.motorista_chapa || ''
    const cargo = cargoMotorista
    const ocorrencia = (t.tipo_ocorrencia || '—').toUpperCase()
    const dataOcorr = t.data_ocorrido ? br(t.data_ocorrido) : '—'
    const observ = (resumo || t.descricao || '').trim() || '—'

    const html = renderGenericHtml({
      titulo: 'ORIENTAÇÃO DISCIPLINAR',
      intro1: 'Vimos pelo presente, aplicar-lhe a pena de orientação disciplinar, em virtude de o(a) senhor(a) ter cometido a falta abaixo descrita.',
      intro2: 'Pedimos que tal falta não mais se repita, pois, caso contrário, seremos obrigados a adotar medidas mais severas que nos são facultadas pela lei.',
      nome, registro, cargo, ocorrencia, dataOcorr, observ, dataDoc
    })

    const w = window.open('', '_blank'); w.document.write(html); w.document.close()
  }

  function gerarAdvertencia() {
    if (!t) return
    if (!resumo.trim()) { alert('Preencha o Resumo / Observações para gerar a medida.'); return }

    const dataDoc = dataPtCompletaUpper(new Date())
    const nome = (t.motorista_nome || '—').toUpperCase()
    const registro = t.motorista_chapa || ''
    const cargo = cargoMotorista
    const ocorrencia = (t.tipo_ocorrencia || '—').toUpperCase()
    const dataOcorr = t.data_ocorrido ? br(t.data_ocorrido) : '—'
    const observ = (resumo || t.descricao || '').trim() || '—'

    const html = renderGenericHtml({
      titulo: 'ADVERTÊNCIA DISCIPLINAR',
      intro1: 'Vimos pelo presente, aplicar-lhe a pena de advertência disciplinar, em virtude de o(a) senhor(a) ter cometido a falta abaixo descrita.',
      intro2: 'Pedimos que tal falta não mais se repita, pois, caso contrário, seremos obrigados a adotar medidas mais severas, nos termos da lei.',
      nome, registro, cargo, ocorrencia, dataOcorr, observ, dataDoc
    })

    const w = window.open('', '_blank'); w.document.write(html); w.document.close()
  }

  function gerarSuspensao() {
    if (!t) return
    if (!resumo.trim()) { alert('Preencha o Resumo / Observações para gerar a medida.'); return }

    const dataDoc = dataPtCompletaUpper(new Date())
    const nome = (t.motorista_nome || '—').toUpperCase()
    const registro = t.motorista_chapa || ''
    const cargo = cargoMotorista
    const ocorrencia = (t.tipo_ocorrencia || '—').toUpperCase()
    const dataOcorr = t.data_ocorrido ? br(t.data_ocorrido) : '—'
    const observ = (resumo || t.descricao || '').trim() || '—'

    const html = renderSuspensaoHtml({
      nome, registro, cargo, ocorrencia, dataOcorr, observ, dataDoc,
      dias: diasSusp, inicio: inicioSusp, fim: fimSusp, retorno: retornoSusp
    })

    const w = window.open('', '_blank'); w.document.write(html); w.document.close()
  }

  function gerarMedida() {
    if (acao === 'Orientação') return gerarOrientacao()
    if (acao === 'Advertência') return gerarAdvertencia()
    if (acao === 'Suspensão') return gerarSuspensao()
    alert('Selecione "Orientação", "Advertência" ou "Suspensão" para gerar o documento.')
  }

  if (!t) return <div className="p-6">Carregando…</div>

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold mb-2">Tratar</h1>
      <p className="text-gray-600 mb-6">Revise os dados, anexe a imagem da tratativa e gere a medida.</p>

      {/* Card: dados + edição */}
      <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Item titulo="Motorista" valor={`${t.motorista_nome || '-'}`} />
          <Item titulo="Registro" valor={t.motorista_chapa || '-'} />

          <Item
            titulo="Ocorrência"
            valor={isEditing ? (
              <input className="w-full border rounded px-2 py-1"
                     value={editForm.tipo_ocorrencia}
                     onChange={e=>setEditForm(s=>({...s, tipo_ocorrencia: e.target.value}))}/>
            ) : t.tipo_ocorrencia}
          />
          <Item
            titulo="Prioridade"
            valor={isEditing ? (
              <select className="w-full border rounded px-2 py-1"
                      value={editForm.prioridade}
                      onChange={e=>setEditForm(s=>({...s, prioridade: e.target.value}))}>
                <option>Baixa</option><option>Média</option><option>Alta</option>
              </select>
            ) : t.prioridade}
          />
          <Item
            titulo="Setor"
            valor={isEditing ? (
              <input className="w-full border rounded px-2 py-1"
                     value={editForm.setor_origem}
                     onChange={e=>setEditForm(s=>({...s, setor_origem: e.target.value}))}/>
            ) : t.setor_origem}
          />
          <Item
            titulo="Linha"
            valor={isEditing ? (
              <input className="w-full border rounded px-2 py-1"
                     placeholder="Código ex.: 01TR"
                     value={editForm.linha}
                     onChange={e=>setEditForm(s=>({...s, linha: e.target.value}))}/>
            ) : (t.linha ? `${t.linha}${linhaDescricao ? ` - ${linhaDescricao}` : ''}` : '-')}
          />
          <Item titulo="Status" valor={t.status} />
          <Item titulo="Data/Hora" valor={`${t.data_ocorrido || '-'} ${t.hora_ocorrido || ''}`} />
          <Item
            className="md:col-span-2"
            titulo="Descrição"
            valor={isEditing ? (
              <textarea className="w-full border rounded px-2 py-1" rows={3}
                        value={editForm.descricao}
                        onChange={e=>setEditForm(s=>({...s, descricao: e.target.value}))}/>
            ) : (t.descricao || '-')}
          />

          {/* Imagem única da tratativa */}
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-600 mb-1">Imagem da tratativa (opcional)</label>
            <input type="file" accept="image/*" onChange={e => setImg(e.target.files?.[0] || null)} />
            {t.imagem_tratativa || t.imagem_url ? (
              <div className="mt-2">
                <span className="block text-sm text-gray-600 mb-1">Imagem existente (clique para ampliar)</span>
                <a href={(t.imagem_tratativa || t.imagem_url)} target="_blank" rel="noopener noreferrer">
                  <img
                    src={(t.imagem_tratativa || t.imagem_url)}
                    className="max-h-48 rounded cursor-pointer hover:opacity-80 transition-opacity"
                    alt="Imagem da tratativa"
                  />
                </a>
              </div>
            ) : null}
          </div>
        </dl>

        <div className="mt-4 flex gap-2">
          {!isEditing ? (
            <button
              onClick={()=>setIsEditing(true)}
              className="rounded-md bg-yellow-500 px-3 py-2 text-white hover:bg-yellow-600"
            >
              Editar dados
            </button>
          ) : (
            <>
              <button
                onClick={salvarEdicao}
                disabled={loading}
                className="rounded-md bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                Salvar
              </button>
              <button
                onClick={()=>{ setIsEditing(false); setEditForm({
                  tipo_ocorrencia: t.tipo_ocorrencia || '',
                  prioridade: t.prioridade || 'Média',
                  setor_origem: t.setor_origem || '',
                  linha: t.linha || '',
                  descricao: t.descricao || '',
                })}}
                className="rounded-md bg-gray-400 px-3 py-2 text-white hover:bg-gray-500"
              >
                Cancelar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Card: Suspensão + Ações */}
      <div className="bg-white rounded-lg shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Ação aplicada</label>
            <select className="w-full rounded-md border px-3 py-2" value={acao} onChange={e => setAcao(e.target.value)}>
              {acoes.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {acao === 'Suspensão' && (
            <>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Dias de Suspensão</label>
                <select
                  className="w-full rounded-md border px-3 py-2"
                  value={diasSusp}
                  onChange={e => setDiasSusp(Number(e.target.value))}
                >
                  {[1,3,5,7].map(d => <option key={d} value={d}>{d} dia(s)</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Data da Suspensão (emissão)</label>
                <input
                  type="date"
                  className="w-full rounded-md border px-3 py-2"
                  value={dataSuspensao}
                  onChange={e => setDataSuspensao(e.target.value)}
                />
              </div>

              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                <Item titulo="Início" valor={br(inicioSusp)} />
                <Item titulo="Fim" valor={br(fimSusp)} />
                <Item titulo="Retorno" valor={br(retornoSusp)} />
              </div>
            </>
          )}
        </div>

        <div className="mt-4">
          <label className="block text-sm text-gray-600 mb-1">Resumo / Observações</label>
          <textarea rows={4} className="w-full rounded-md border px-3 py-2"
            value={resumo} onChange={e => setResumo(e.target.value)} />
        </div>

        <div className="mt-4 flex gap-3 flex-wrap">
          <button
            onClick={concluir}
            disabled={loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? 'Salvando…' : 'Concluir'}
          </button>

          <button
            type="button"
            onClick={() => {
              if (acao === 'Orientação') return gerarOrientacao()
              if (acao === 'Advertência') return gerarAdvertencia()
              if (acao === 'Suspensão') return gerarSuspensao()
              alert('Selecione "Orientação", "Advertência" ou "Suspensão" para gerar o documento.')
            }}
            className="rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
            title="Gerar documento conforme a ação selecionada"
          >
            GERAR MEDIDA DISCIPLINAR
          </button>
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
