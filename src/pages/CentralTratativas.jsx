// src/pages/CentralTratativas.jsx

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

  // Contadores reais do banco (não sofrem com limite 1000)
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
    if (f.dataInicio) query = query.gte('created_at', f.dataInicio) // Filtro usa created_at
    if (f.dataFim) {
        const dataFimAjustada = new Date(f.dataFim);
        dataFimAjustada.setDate(dataFimAjustada.getDate() + 1);
        query = query.lt('created_at', dataFimAjustada.toISOString().split('T')[0]); // Compara apenas a data
    }

    return query
  }

  // --- Carregar lista (visual) ---
  async function carregarLista() {
    setLoading(true)
    let query = supabase.from('tratativas').select('*').limit(100000); // Alto limite

    query = applyCommonFilters(query);
    const { data, error } = await query
      .order('created_at', { ascending: false });

    if (!error) setTratativas(data || [])
    else console.error("Erro ao carregar lista de tratativas:", error);
    setLoading(false)
  }

  // --- Carregar contadores "head" (contagem precisa no banco) ---
  async function carregarContadores() {
     // Calcula a data limite para Atrasadas (> 10 dias)
     const date10DaysAgo = new Date();
     date10DaysAgo.setDate(date10DaysAgo.getDate() - 10);
     const date10DaysAgoISO = date10DaysAgo.toISOString();

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
      .or('status.ilike.%conclu%,status.ilike.%resolvid%')
    qConc = applyCommonFilters(qConc)
    const { count: conc } = await qConc

    // Atrasadas
    let qAtr = supabase
      .from('tratativas')
      .select('id', { count: 'exact', head: true })
      .ilike('status', '%pendente%') // Tem que estar pendente
      .lt('created_at', date10DaysAgoISO); // E ser antiga
    qAtr = applyCommonFilters(qAtr) // Aplica filtros gerais também
    const { count: atr } = await qAtr

    setTotalCount(total || 0)
    setPendentesCount(pend || 0)
    setConcluidasCount(conc || 0)
    setAtrasadasCount(atr || 0)
  }

  async function aplicar() {
    setLoading(true); // Define loading antes das buscas
    try {
        await Promise.all([carregarLista(), carregarContadores()])
    } catch(e){
        console.error("Erro ao aplicar filtros:", e);
    } finally {
        setLoading(false); // Garante que loading termine
    }
  }

  useEffect(() => {
    aplicar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Roda apenas na montagem inicial

  function limparFiltros() {
    setFiltros({ busca: '', dataInicio: '', dataFim: '', setor: '', status: '' })
    // Recarrega com filtros vazios após resetar o estado
    setTimeout(() => aplicar(), 0)
  }

  return (
    // Container principal
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-700">Central de Tratativas</h1>

      {/* 🔍 Filtros */}
      <div className="bg-white shadow rounded-lg p-4 mb-6"> {/* Adicionado mb-6 */}
        <h2 className="text-lg font-semibold mb-3">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Buscar (nome, chapa, descrição...)"
            value={filtros.busca}
            onChange={e => setFiltros({ ...filtros, busca: e.target.value })}
            className="border rounded-md px-3 py-2" // Estilo padrão
          />
          <input
            type="date"
            placeholder="Data Início" // Placeholder pode ajudar
            value={filtros.dataInicio}
            onChange={e => setFiltros({ ...filtros, dataInicio: e.target.value })}
            className="border rounded-md px-3 py-2"
          />
          <input
            type="date"
            placeholder="Data Fim"
            value={filtros.dataFim}
            onChange={e => setFiltros({ ...filtros, dataFim: e.target.value })}
            className="border rounded-md px-3 py-2"
          />
          <select
            value={filtros.setor}
            onChange={e => setFiltros({ ...filtros, setor: e.target.value })}
            className="border rounded-md px-3 py-2 bg-white" // Adicionado bg-white
          >
            <option value="">Todos os Setores</option>
            {/* TODO: Carregar setores dinamicamente */}
            <option value="Telemetria">Telemetria</option>
            <option value="CCO">CCO</option>
            <option value="Manutenção">Manutenção</option>
            <option value="Fiscalização">Fiscalização</option>
            <option value="SAC">SAC</option>
          </select>
          <select
            value={filtros.status}
            onChange={e => setFiltros({ ...filtros, status: e.target.value })}
            className="border rounded-md px-3 py-2 bg-white" // Adicionado bg-white
          >
            <option value="">Todos os Status</option>
            <option value="Pendente">Pendente</option>
            <option value="Resolvido">Resolvido</option>
            <option value="Concluída">Concluída</option>
            {/* Incluir Atrasada como filtro? */}
          </select>
        </div>

        <div className="flex justify-end mt-3">
          <button
            onClick={limparFiltros}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300" // Estilo padrão
          > Limpar </button>
          <button
            onClick={aplicar}
            disabled={loading} // Desabilita enquanto carrega
            className="ml-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400" // Estilo padrão com disabled
          > {loading ? 'Aplicando...' : 'Aplicar'} </button>
        </div>
      </div>

      {/* 🧾 Resumo abaixo dos filtros (com Atrasadas) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"> {/* Ajustado gap e mb */}
        {/* Usando componente CardResumo */}
        <CardResumo titulo="Total" valor={totalCount} cor="bg-blue-100 text-blue-700" />
        <CardResumo titulo="Pendentes" valor={pendentesCount} cor="bg-yellow-100 text-yellow-700" />
        <CardResumo titulo="Concluídas" valor={concluidasCount} cor="bg-green-100 text-green-700" />
        <CardResumo titulo="Atrasadas (>10d)" valor={atrasadasCount} cor="bg-red-100 text-red-700" />
      </div>

      {/* 📋 Lista */}
      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-blue-600 text-white"> {/* Cabeçalho azul */}
            <tr>
              <th className="py-2 px-3 text-left">Data de Abertura</th>
              <th className="py-2 px-3 text-left">Motorista</th>
              <th className="py-2 px-3 text-left">Ocorrência</th>
              <th className="py-2 px-3 text-left">Prioridade</th>
              <th className="py-2 px-3 text-left">Setor</th>
              <th className="py-2 px-3 text-left">Status</th>
              {/* <th className="py-2 px-3 text-left">Imagem</th> // Removido por simplicidade */}
              <th className="py-2 px-3 text-left">Ações</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="text-center p-4 text-gray-500">Carregando...</td></tr> // Colspan 7
            ) : tratativas.length === 0 ? (
              <tr><td colSpan="7" className="text-center p-4 text-gray-500">Nenhuma tratativa encontrada.</td></tr> // Colspan 7
            ) : (
              tratativas.map(t => (
                <tr key={t.id} className="border-t hover:bg-gray-50"> {/* Estilo de linha */}
                  <td className="py-2 px-3 text-gray-600">
                    {t.created_at ? new Date(t.created_at).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="py-2 px-3 text-gray-700">{t.motorista_nome || "-"}</td> {/*Fallback "-"*/}
                  <td className="py-2 px-3 text-gray-700">{t.tipo_ocorrencia || "-"}</td>
                  <td className="py-2 px-3 text-gray-700">{t.prioridade || '-'}</td>
                  <td className="py-2 px-3 text-gray-700">{t.setor_origem || "-"}</td>
                  <td className="py-2 px-3">
                    {/* Tags de Status com estilo */}
                    {t.status?.toLowerCase().includes('pendente') && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800"> Pendente </span>
                    )}
                    {(t.status?.toLowerCase().includes('resolvido') || t.status?.toLowerCase().includes('conclu')) && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800"> Resolvido </span>
                    )}
                    {/* Poderíamos adicionar Atrasada aqui também se quisesse visualmente */}
                  </td>
                  {/* <td className="py-2 px-3 italic text-gray-500">
                    {t.imagem_url ? '📎 Com imagem' : 'Sem imagem'}
                  </td> */}
                  <td className="py-2 px-3">
                    {/* Botões de Ação */}
                    {t.status?.toLowerCase().includes('conclu') || t.status?.toLowerCase().includes('resolvido') ? (
                      <button
                        onClick={() => navigate(`/consultar/${t.id}`)}
                        className="bg-gray-500 text-white px-3 py-1 rounded-md hover:bg-gray-600 text-sm" // Cinza para consultar
                      > Consultar </button>
                    ) : (
                      <button
                        onClick={() => navigate(`/tratar/${t.id}`)}
                        className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm" // Azul para tratar
                      > Tratar </button>
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

// Reusa o CardResumo do Dashboard
function CardResumo({ titulo, valor, cor }) {
  return (
    <div className={`${cor} rounded-lg shadow p-5 text-center`}>
      <h3 className="text-sm font-medium text-gray-600">{titulo}</h3>
      <p className="text-3xl font-bold mt-2 text-gray-800">{valor}</p>
    </div>
  );
}
