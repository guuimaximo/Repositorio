import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'

export default function ConsultarTratativa() {
  const { id } = useParams()
  const [t, setT] = useState(null)
  const [historico, setHistorico] = useState([])

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('tratativas').select('*').eq('id', id).single()
      setT(data || null)
      const h = await supabase.from('tratativas_detalhes').select('*').eq('tratativa_id', id).order('created_at')
      setHistorico(h.data || [])
    })()
  }, [id])

  if (!t) return <div className="p-6">Carregando…</div>

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold mb-2">Consultar</h1>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Item titulo="Motorista" valor={`${t.motorista_nome || ''} ${t.motorista_chapa ? `(${t.motorista_chapa})` : ''}`} />
          <Item titulo="Ocorrência" valor={t.tipo_ocorrencia} />
          <Item titulo="Prioridade" valor={t.prioridade} />
          <Item titulo="Setor" valor={t.setor_origem} />
          <Item titulo="Status" valor={t.status} />
          <Item titulo="Data/Hora" valor={`${t.data_ocorrida || '-'} ${t.hora_ocorrida || ''}`} />
          <Item titulo="Descrição" valor={t.descricao || '-'} className="md:col-span-2" />
          {t.imagem_url && (
            <div className="md:col-span-2">
              <span className="block text-sm text-gray-600 mb-1">Imagem enviada</span>
              <img src={t.imagem_url} className="max-h-48 rounded" />
            </div>
          )}
        </dl>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4">
        <h2 className="font-semibold mb-3">Histórico / Ações aplicadas</h2>
        {historico.length === 0 ? (
          <div className="text-gray-500">Sem histórico.</div>
        ) : (
          <ul className="space-y-3">
            {historico.map(h => (
              <li key={h.id} className="rounded border p-3">
                <div className="text-sm text-gray-600">{new Date(h.created_at).toLocaleString('pt-BR')}</div>
                <div className="font-medium">{h.acao_aplicada}</div>
                {h.observacoes && <div className="text-gray-700">{h.observacoes}</div>}
                <div className="flex gap-3 mt-2">
                  {h.imagem_tratativa && <img src={h.imagem_tratativa} className="h-20 rounded" />}
                  {h.assinatura_url && (
                    <a className="text-blue-600 underline" href={h.assinatura_url} target="_blank" rel="noreferrer">
                      Ver assinatura
                    </a>
                  )}
                </div>
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
      <dd className="font-medium">{valor}</dd>
    </div>
  )
}
