import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function CentralResolucao() {
  const [tratativas, setTratativas] = useState([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState(null)
  const [observacao, setObservacao] = useState('')
  const [novoStatus, setNovoStatus] = useState('Pendente')
  const [responsavel, setResponsavel] = useState('')

  // 🔄 Carrega todas as tratativas do banco
  const carregarTratativas = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('tratativas')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Erro ao buscar tratativas:', error)
      alert('Erro ao carregar tratativas.')
    } else {
      setTratativas(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    carregarTratativas()
  }, [])

  // 💾 Atualiza uma tratativa
  const atualizarTratativa = async (id) => {
    const { error } = await supabase
      .from('tratativas')
      .update({
        status: novoStatus,
        observacao_resolucao: observacao,
        responsavel,
        resolvido_em: novoStatus === 'Resolvido' ? new Date().toISOString() : null,
      })
      .eq('id', id)

    if (error) {
      console.error('❌ Erro ao atualizar tratativa:', error)
      alert('Erro ao salvar atualização.')
    } else {
      alert('✅ Tratativa atualizada com sucesso!')
      setEditando(null)
      setObservacao('')
      setResponsavel('')
      await carregarTratativas()
    }
  }

  // 🔍 Render
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">🛠️ Central de Resolução</h2>

      {loading ? (
        <p>Carregando tratativas...</p>
      ) : tratativas.length === 0 ? (
        <p>Nenhuma tratativa encontrada.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl shadow-md">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="p-2">ID</th>
                <th className="p-2">Motorista</th>
                <th className="p-2">Tipo</th>
                <th className="p-2">Prioridade</th>
                <th className="p-2">Status</th>
                <th className="p-2">Responsável</th>
                <th className="p-2">Descrição</th>
                <th className="p-2">Imagem</th>
                <th className="p-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {tratativas.map((t) => (
                <tr key={t.id} className="border-b hover:bg-gray-100">
                  <td className="p-2">{t.id}</td>
                  <td className="p-2">{t.motorista}</td>
                  <td className="p-2">{t.tipo}</td>
                  <td className="p-2">{t.prioridade}</td>
                  <td className="p-2">
                    <span
                      className={`px-2 py-1 rounded-lg text-sm ${
                        t.status === 'Resolvido'
                          ? 'bg-green-100 text-green-700'
                          : t.status === 'Em andamento'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="p-2">{t.responsavel || '-'}</td>
                  <td className="p-2">{t.descricao}</td>
                  <td className="p-2">
                    {t.imagem_url ? (
                      <a
                        href={t.imagem_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 underline"
                      >
                        Ver
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="p-2">
                    <button
                      onClick={() => {
                        setEditando(t.id)
                        setNovoStatus(t.status)
                        setResponsavel(t.responsavel || '')
                        setObservacao(t.observacao_resolucao || '')
                      }}
                      className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Edição */}
      {editando && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg p-6 w-96 shadow-lg">
            <h3 className="text-lg font-semibold mb-3">
              ✏️ Atualizar Tratativa #{editando}
            </h3>

            <label className="block text-sm font-medium mb-1">Novo Status:</label>
            <select
              value={novoStatus}
              onChange={(e) => setNovoStatus(e.target.value)}
              className="border p-2 rounded w-full mb-2"
            >
              <option>Pendente</option>
              <option>Em andamento</option>
              <option>Resolvido</option>
            </select>

            <label className="block text-sm font-medium mb-1">Responsável:</label>
            <input
              type="text"
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
              className="border p-2 rounded w-full mb-2"
            />

            <label className="block text-sm font-medium mb-1">Observação:</label>
            <textarea
              rows="3"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="border p-2 rounded w-full mb-3"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditando(null)}
                className="bg-gray-300 px-3 py-1 rounded-lg hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={() => atualizarTratativa(editando)}
                className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
