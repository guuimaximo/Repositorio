// src/pages/ConsultarTratativa.jsx
import { useEffect, useState } from 'react'
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

      // Histórico
      const h = await supabase
        .from('tratativas_detalhes')
        .select('*')
        .eq('tratativa_id', id)
        .order('created_at')
      setHistorico(h.data || [])

      // Descrição da linha (se houver código)
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

  if (!t) return <div className="p-6">Carregando…</div>

  // Campo data/hora: tolera nomes diferentes usados em telas antigas
  const dataOcorr = t.data_ocorrido || t.data_ocorrida || '-'
  const horaOcorr = t.hora_ocorrido || t.hora_ocorrida || ''

  // Suspensões no histórico
  const suspensoes = (historico || []).filter(h => (h.acao_aplicada || '').toLowerCase() === 'suspensão')

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold">Consultar</h1>
        <button
          onClick={() => nav(`/tratar/${id}`)}
          className="rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
        >
          Editar
        </button>
      </div>

      {/* Dados da tratativa */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Item
            titulo="Motorista"
            valor={`${t.motorista_nome || '-'}`}
          />
          <Item
            titulo="Registro"
            valor={t.motorista_chapa || '-'}
          />
          <Item titulo="Ocorrência" valor={t.tipo_ocorrencia || '-'} />
          <Item titulo="Prioridade" valor={t.prioridade || '-'} />
          <Item titulo="Setor" valor={t.setor_origem || '-'} />
          <Item
            titulo="Linha"
            valor={
              t.linha
                ? `${t.linha}${linhaDesc ? ` - ${linhaDesc}` : ''}`
                : '-'
            }
          />
          <Item titulo="Status" valor={t.status || '-'} />
          <Item titulo="Data/Hora" valor={`${dataOcorr} ${horaOcorr}`} />
          <Item titulo="Descrição" valor={t.descricao || '-'} className="md:col-span-2" />

          {/* Imagem enviada na abertura (se existir) */}
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

      {/* Histórico geral */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <h2 className="font-semibold mb-3">Histórico / Ações aplicadas</h2>
        {historico.length === 0 ? (
          <div className="text-gray-500">Sem histórico.</div>
        ) : (
          <ul className="space-y-3">
            {historico.map(h => (
              <li key={h.id} className="rounded border p-3">
                <div className="text-sm text-gray-600">
                  {h.created_at ? new Date(h.created_at).toLocaleString('pt-BR') : '-'}
                </div>
                <div className="font-medium">{h.acao_aplicada || '-'}</div>
                {h.observacoes && <div className="text-gray-700 whitespace-pre-wrap">{h.observacoes}</div>}

                {/* Imagens anexadas naquele atendimento */}
                <div className="flex gap-3 mt-2 flex-wrap">
                  {h.imagem_tratativa && (
                    <a href={h.imagem_tratativa} target="_blank" rel="noopener noreferrer">
                      <img
                        src={h.imagem_tratativa}
                        className="h-20 rounded cursor-pointer hover:opacity-80 transition-opacity"
                        alt="Imagem da tratativa"
                      />
                    </a>
                  )}
                  {h.assinatura_url && (
                    <a className="text-blue-600 underline self-end" href={h.assinatura_url} target="_blank" rel="noreferrer">
                      Ver assinatura
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Histórico de Suspensão (recorte) */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h2 className="font-semibold mb-3">Histórico de Suspensões</h2>
        {suspensoes.length === 0 ? (
          <div className="text-gray-500">Sem suspensões registradas nesta tratativa.</div>
        ) : (
          <ul className="space-y-2">
            {suspensoes.map(s => (
              <li key={s.id} className="border rounded p-3">
                <div className="text-sm text-gray-600">
                  {s.created_at ? new Date(s.created_at).toLocaleString('pt-BR') : '-'}
                </div>
                <div className="font-medium">Suspensão aplicada</div>
                {s.observacoes && <div className="text-gray-700">{s.observacoes}</div>}
                {s.imagem_tratativa && (
                  <div className="mt-2">
                    <a href={s.imagem_tratativa} target="_blank" rel="noopener noreferrer">
                      <img
                        src={s.imagem_tratativa}
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
