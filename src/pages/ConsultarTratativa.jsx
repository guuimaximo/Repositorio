// src/pages/ConsultarTratativa.jsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabase'

export default function ConsultarTratativa() {
  const { id } = useParams()
  const nav = useNavigate()

  const [t, setT] = useState(null)
  const [historico, setHistorico] = useState([])
  const [linhaDesc, setLinhaDesc] = useState('')

  useEffect(() => {
    (async () => {
      // Tratativa
      const { data, error } = await supabase
        .from('tratativas')
        .select('*')
        .eq('id', id)
        .single()
      if (error) console.error(error)
      setT(data || null)

      // Histórico (mais recente primeiro) com Nomes REAIS
      const h = await supabase
        .from('tratativas_detalhes')
        .select('id, criado_em, tipo_acao, descricao_acao, imagem_evidencia_url, imagem_assinatura_url')
        .eq('id_tratativa', id)
        .order('criado_em', { ascending: false })
      setHistorico(h.data || [])

      // Descrição da linha (se salvar código da linha em t.linha)
      if (data?.linha) {
        const { data: row } = await supabase
          .from('linhas')
          .select('descricao')
          .eq('codigo', data.linha)
          .maybeSingle()
        setLinhaDesc(row?.descricao || '')
      } else {
        setLinhaDesc('')
      }
    })()
  }, [id])

  // Usa campos denormalizados se existirem; senão, pega a primeira do histórico
  const ultima = useMemo(() => {
    if (!t) return null
    if (t.ultima_acao_aplicada) {
      return {
        tipo_acao: t.ultima_acao_aplicada,
        descricao_acao: t.ultima_observacao,
        criado_em: t.ultima_acao_at
      }
    }
    return (historico && historico.length > 0 ? historico[0] : null)
  }, [t, historico])

  if (!t) return <div className="p-6">Carregando…</div>

  const dataOcorr = t.data_ocorrido || t.data_ocorrida || '-'
  const horaOcorr = t.hora_ocorrido || t.hora_ocorrida || ''

  const suspensoes = (historico || []).filter(h => (h.tipo_acao || '').toLowerCase() === 'suspensão')

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Consultar</h1>
        <button
          onClick={() => nav(`/tratar/${id}`)}
          className="rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
        >
          Editar
        </button>
      </div>

      {/* Resumo da última ação aplicada */}
      <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Resumo da última ação</h2>
          <span className="text-sm opacity-80">
            {ultima?.criado_em ? new Date(ultima.criado_em).toLocaleString('pt-BR') : '—'}
          </span>
        </div>
        <div className="mt-1 font-medium">
          {ultima?.tipo_acao || '—'}
        </div>
        <div className="mt-1 whitespace-pre-wrap">
          {ultima?.descricao_acao || 'Sem observações registradas.'}
        </div>
      </div>

      {/* Dados da tratativa */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Item titulo="Motorista" valor={t.motorista_nome || '-'} />
          <Item titulo="Registro" valor={t.motorista_chapa || '-'} />
          <Item titulo="Ocorrência" valor={t.tipo_ocorrencia || '-'} />
          <Item titulo="Prioridade" valor={t.prioridade || '-'} />
          <Item titulo="Setor" valor={t.setor_origem || '-'} />
          <Item
            titulo="Linha"
            valor={t.linha ? `${t.linha}${linhaDesc ? ` - ${linhaDesc}` : ''}` : '-'}
          />
          <Item titulo="Status" valor={t.status || '-'} />
          <Item titulo="Data/Hora" valor={`${dataOcorr} ${horaOcorr}`} />
          <Item titulo="Última ação" valor={ultima?.tipo_acao || '—'} />
          <Item titulo="Resumo da ação" valor={ultima?.descricao_acao || '—'} className="md:col-span-2" />
          <Item titulo="Descrição (abertura)" valor={t.descricao || '-'} className="md:col-span-2" />

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

      {/* Histórico completo */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <h2 className="font-semibold mb-3">Histórico / Ações aplicadas</h2>
        {historico.length === 0 ? (
          <div className="text-gray-500">Sem histórico.</div>
        ) : (
          <ul className="space-y-3">
            {historico.map(h => (
              <li key={h.id} className="rounded border p-3">
                <div className="text-sm text-gray-600">
                  {h.criado_em ? new Date(h.criado_em).toLocaleString('pt-BR') : '—'}
                </div>
                <div className="font-medium">{h.tipo_acao || '—'}</div>
                {h.descricao_acao && (
                  <div className="text-gray-700 whitespace-pre-wrap">{h.descricao_acao}</div>
                )}
                <div className="flex gap-3 mt-2 flex-wrap">
                  {h.imagem_evidencia_url && (
                    <a href={h.imagem_evidencia_url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={h.imagem_evidencia_url}
                        className="h-20 rounded cursor-pointer hover:opacity-80 transition-opacity"
                        alt="Imagem da tratativa"
                      />
                    </a>
                  )}
                  {h.imagem_assinatura_url && (
                    <a
                      className="text-blue-600 underline self-end"
                      href={h.imagem_assinatura_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ver assinatura
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recorte de Suspensões */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h2 className="font-semibold mb-3">Histórico de Suspensões</h2>
        {suspensoes.length === 0 ? (
          <div className="text-gray-500">Sem suspensões registradas nesta tratativa.</div>
        ) : (
          <ul className="space-y-2">
            {suspensoes.map(s => (
              <li key={s.id} className="border rounded p-3">
                <div className="text-sm text-gray-600">
                  {s.criado_em ? new Date(s.criado_em).toLocaleString('pt-BR') : '—'}
                </div>
                <div className="font-medium">Suspensão aplicada</div>
                {s.descricao_acao && <div className="text-gray-700">{s.descricao_acao}</div>}
                {s.imagem_evidencia_url && (
                  <div className="mt-2">
                    <a href={s.imagem_evidencia_url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={s.imagem_evidencia_url}
                        className="h-20 rounded cursor-pointer hover:opacity-80 transition-opacity"
                        alt="Imagem da suspensão"
                      />
                    </a>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
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
