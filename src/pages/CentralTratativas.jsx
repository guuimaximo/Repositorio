import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function CentralTratativas() {
  const [tratativas, setTratativas] = useState([])
  const [filtros, setFiltros] = useState({
    busca: '',
    dataInicio: '',
    dataFim: '',
    setor: '',
    status: '',
  })
  const [loading, setLoading] = useState(false)

  // ➜ Contadores reais do banco (não sofrem com limite 1000)
  const [totalCount, setTotalCount] = useState(0)
  const [pendentesCount, setPendentesCount] = useState(0)
  const [concluidasCount, setConcluidasCount] = useState(0)
  const [atrasadasCount, setAtrasadasCount] = useState(0)

  const navigate = useNavigate()

  // --- Helpers para aplicar mesmos filtros nas consultas de count/lista ---
  function applyCommonFilters(query) {
    const f = filtros

    if (f.busca) {
      query = query.or(
        `motorista_nome.ilike.%${f.busca}%,motorista_chapa.ilike.%${f.busca}%,descricao.ilike.%${f.busca}%`
      )
    }
    if (f.setor) query = query.eq('setor_origem', f.setor)
    if (f.status) query = query.ilike('status', `%${f.status}%`)
    if (f.dataInicio) query = query.gte('data_ocorrido', f.dataInicio)
    if (f.dataFim) query = query.lte('data_ocorrido', f.dataFim)

    return query
  }

  // --- Carregar lista (visual) ---
  async function carregarLista() {
    setLoading(true)
    let query = supabase.from('tratativas').select('*')

    query = applyCommonFilters(query)
    // Mantém a ordenação e, opcionalmente, eleva o limite. (Ideal: paginação)
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(10000)

    if (!error) setTratativas(data || [])
    setLoading(false)
  }

  // --- Carregar contadores "head" (contagem precisa no banco) ---
  async function carregarContadores() {
    // Total
    let qTotal = supabase
      .from('tratativas')
      .select('id', { count: 'exact', head: true })
    qTotal = applyCommonFilters(qTotal)
    const { count: total } = await qTotal

    // Pendentes
    let qPend = supabase
      .from('tratativas')
      .select('id', { count: 'exact', head: true })
      .ilike('status', '%pendente%')
    qPend = applyCommonFilters(qPend)
    const { count: pend } = await qPend

    // Concluídas (Concluída ou Resolvido)
    let qConc = supabase
      .from('tratativas')
      .select('id', { count: 'exact', head: true })
      .or('status.ilike.%concluída%,status.ilike.%resolvido%')
    qConc = applyCommonFilters(qConc)
    const { count: conc } = await qConc

    // Atrasadas
    let qAtr = supabase
      .from('tratativas')
      .select('id', { count: 'exact', head: true })
      .ilike('status', '%atrasad%')
    qAtr = applyCommonFilters(qAtr)
    const { count: atr } = await qAtr

    setTotalCount(total || 0)
    setPendentesCount(pend || 0)
    setConcluidasCount(conc || 0)
    setAtrasadasCount(atr || 0)
  }

  async function aplicar() {
    await Promise.all([carregarLista(), carregarContadores()])
  }

  useEffect(() => {
    aplicar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function limparFiltros() {
    setFiltros({ busca: '', dataInicio: '', dataFim: '', setor: '', status: '' })
    // Recarrega com filtros vazios
    setTimeout(() => aplicar(), 0)
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Central de Tratativas</h1>

      {/* 🔍 Filtros */}
      <div className="bg-white shadow rounded-lg p-4 mb-4">
        <h2 className="text-lg font-semibold mb-3">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Buscar (nome, chapa, descrição...)"
            value={filtros.busca}
            onChange={e => setFiltros({ ...filtros, busca: e.target.value })}
            className="border rounded-md px-3 py-2"
          />
          <input
            type="date"
            value={filtros.dataInicio}
            onChange={e => setFiltros({ ...filtros, dataInicio: e.target.value })}
            className="border rounded-md px-3 py-2"
          />
          <input
            type="date"
            value={filtros.dataFim}
            onChange={e => setFiltros({ ...filtros, dataFim: e.target.value })}
            className="border rounded-md px-3 py-2"
          />
          <select
            value={filtros.setor}
            onChange={e => setFiltros({ ...filtros, setor: e.target.value })}
            className="border rounded-md px-3 py-2"
          >
            <option value="">Setor</option>
            <option value="Telemetria">Telemetria</option>
            <option value="CCO">CCO</option>
            <option value="Manutenção">Manutenção</option>
            <option value="Fiscalização">Fiscalização</option>
            <option value="SAC">SAC</option>
          </select>
          <select
            value={filtros.status}
            onChange={e => setFiltros({ ...filtros, status: e.target.value })}
            className="border rounded-md px-3 py-2"
          >
            <option value="">Status</option>
            <option value="Pendente">Pendente</option>
            <option value="Resolvido">Resolvido</option>
            <option value="Concluída">Concluída</option>
            <option value="Atrasada">Atrasada</option>
          </select>
        </div>

        <div className="flex justify-end mt-3">
          <button
            onClick={limparFiltros}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
          >
            Limpar
          </button>
          <button
            onClick={aplicar}
            className="ml-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Aplicar
          </button>
        </div>
      </div>

      {/* 🧾 Resumo abaixo dos filtros (contagem real do banco) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-100 text-center rounded-lg p-4">
          <p className="text-gray-600 text-sm">Total</p>
          <p className="text-2xl font-bold text-blue-600">{totalCount}</p>
        </div>
        <div className="bg-yellow-100 text-center rounded-lg p-4">
          <p className="text-gray-600 text-sm">Pendentes</p>
          <p className="text-2xl font-bold text-yellow-600">{pendentesCount}</p>
        </div>
        <div className="bg-green-100 text-center rounded-lg p-4">
          <p className="text-gray-600 text-sm">Concluídas</p>
          <p className="text-2xl font-bold text-green-600">{concluidasCount}</p>
        </div>
        <div className="bg-red-100 text-center rounded-lg p-4">
          <p className="text-gray-600 text-sm">Atrasadas</p>
          <p className="text-2xl font-bold text-red-600">{atrasadasCount}</p>
        </div>
      </div>

      {/* 📋 Lista */}
      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="py-2 px-3 text-left">Data de Abertura</th>
              <th className="py-2 px-3 text-left">Motorista</th>
              <th className="py-2 px-3 text-left">Ocorrência</th>
              <th className="py-2 px-3 text-left">Prioridade</th>
              <th className="py-2 px-3 text-left">Setor</th>
              <th className="py-2 px-3 text-left">Status</th>
              <th className="py-2 px-3 text-left">Imagem</th>
              <th className="py-2 px-3 text-left">Ações</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="text-center p-4">
                  Carregando...
                </td>
              </tr>
            ) : tratativas.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center p-4">
                  Nenhuma tratativa encontrada.
                </td>
              </tr>
            ) : (
              tratativas.map(t => (
                <tr key={t.id} className="border-t hover:bg-gray-50">
                  <td className="py-2 px-3 text-gray-600">
                    {t.created_at
                      ? new Date(t.created_at).toLocaleDateString('pt-BR')
                      : '-'}
                  </td>
                  <td className="py-2 px-3">{t.motorista_nome}</td>
                  <td className="py-2 px-3">{t.tipo_ocorrencia}</td>
                  <td className="py-2 px-3">{t.prioridade || '-'}</td>
                  <td className="py-2 px-3">{t.setor_origem}</td>
                  <td className="py-2 px-3">
                    {t.status?.toLowerCase().includes('pendente') && (
                      <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-md text-sm">
                        Pendente
                      </span>
                    )}
                    {t.status?.toLowerCase().includes('resolvido') ||
                    t.status?.toLowerCase().includes('conclu') ? (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-sm">
                        Resolvido
                      </span>
                    ) : null}
                    {t.status?.toLowerCase().includes('atrasad') && (
                      <span className="bg-red-100 text-red-700 px-2 py-1 rounded-md text-sm">
                        Atrasada
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 italic text-gray-500">
                    {t.imagem_url ? '📎 Com imagem' : 'Sem imagem'}
                  </td>
                  <td className="py-2 px-3">
                    {t.status?.toLowerCase().includes('conclu') ||
                    t.status?.toLowerCase().includes('resolvido') ? (
                      <button
                        onClick={() => navigate(`/consultar/${t.id}`)}
                        className="bg-gray-300 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-400"
                      >
                        Consultar
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate(`/tratar/${t.id}`)}
                        className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700"
                      >
                        Tratar
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
