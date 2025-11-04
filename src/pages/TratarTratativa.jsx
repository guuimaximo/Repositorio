// src/pages/TratarTratativa.jsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabase'

const acoes = [
  'Orientação',
  'Advertência',
  'Suspensão',
  'Contato Pessoal',
  'Contato via Celular',
  'Não aplicada',
  'Elogiado',
]

export default function TratarTratativa() {
  const { id } = useParams()
  const nav = useNavigate()

  const [t, setT] = useState(null)
  const [resumo, setResumo] = useState('')
  const [acao, setAcao] = useState('Orientação')
  const [img, setImg] = useState(null)            // Imagem da tratativa (opcional)
  const [assinatura, setAssinatura] = useState(null) // Assinatura (foto/PDF) opcional
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('tratativas')
        .select('*')
        .eq('id', id)
        .single()
      if (error) console.error(error)
      setT(data || null)
    })()
  }, [id])

  async function concluir() {
    if (!t) return
    if (!resumo) { alert('Informe o resumo/observações'); return }

    setLoading(true)
    try {
      // Upload único opcional (evidência)
      let imagem_tratativa = null
      if (img) {
        const nome = `trat_${Date.now()}_${img.name}`.replace(/\s+/g, '_')
        const up = await supabase.storage.from('tratativas').upload(nome, img)
        if (up.error) throw up.error
        imagem_tratativa = supabase.storage.from('tratativas').getPublicUrl(nome).data.publicUrl
      }

      // Upload assinatura (opcional)
      let assinatura_url = null
      if (assinatura) {
        const nome = `ass_${Date.now()}_${assinatura.name}`.replace(/\s+/g, '_')
        const up = await supabase.storage.from('tratativas').upload(nome, assinatura)
        if (up.error) throw up.error
        assinatura_url = supabase.storage.from('tratativas').getPublicUrl(nome).data.publicUrl
      }

      // 1) Insere no histórico com os Nomes REAIS de coluna
      const ins = await supabase
        .from('tratativas_detalhes')
        .insert({
          id_tratativa: t.id,                 // << nome correto
          tipo_acao: acao,                    // Orientação | Advertência | Suspensão
          descricao_acao: resumo,             // observações
          imagem_evidencia_url: imagem_tratativa || null,
          imagem_assinatura_url: assinatura_url || null,
        })
        .select('criado_em')
        .single()
      if (ins.error) throw ins.error

      // 2) Atualiza a tratativa com a última ação (denormalizado)
      const quando = ins.data?.criado_em || new Date().toISOString()
      const upd = await supabase
        .from('tratativas')
        .update({
          status: 'Concluída',
          imagem_tratativa: imagem_tratativa || t.imagem_tratativa || null,
          ultima_acao_aplicada: acao,
          ultima_observacao: resumo,
          ultima_acao_at: quando,
        })
        .eq('id', t.id)
      if (upd.error) throw upd.error

      alert('Tratativa concluída com sucesso!')
      nav('/central')
    } catch (e) {
      alert(`Erro: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (!t) return <div className="p-6">Carregando…</div>

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold mb-2">Tratar</h1>
      <p className="text-gray-600 mb-6">Revise os dados e finalize a tratativa.</p>

      {/* Resumo da abertura */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Item titulo="Motorista" valor={`${t.motorista_nome || ''}`} />
          <Item titulo="Registro" valor={t.motorista_chapa || '-'} />
          <Item titulo="Ocorrência" valor={t.tipo_ocorrencia || '-'} />
          <Item titulo="Prioridade" valor={t.prioridade || '-'} />
          <Item titulo="Setor" valor={t.setor_origem || '-'} />
          <Item titulo="Linha" valor={t.linha || '-'} />
          <Item titulo="Status" valor={t.status || '-'} />
          <Item
            titulo="Data/Hora"
            valor={`${t.data_ocorrido || t.data_ocorrida || '-'} ${t.hora_ocorrido || t.hora_ocorrida || ''}`}
          />
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

      {/* Ação/Conclusão */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Ação aplicada</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={acao}
              onChange={e => setAcao(e.target.value)}
            >
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
            <textarea
              rows={4}
              className="w-full rounded-md border px-3 py-2"
              value={resumo}
              onChange={e => setResumo(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={concluir}
            disabled={loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? 'Salvando…' : 'Concluir'}
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
