// src/pages/CobrancasAvarias.jsx
// (Restaurado o estilo visual da tabela e filtros)

import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { FaSearch, FaEye } from "react-icons/fa";
import CobrancaDetalheModal from "../components/CobrancaDetalheModal";

// Componente CardResumo (Reaplicando estilos)
function CardResumo({ titulo, valor, cor }) {
  // Use as cores de fundo completas como antes (ex: bg-blue-100)
  return (
    <div className={`${cor} rounded-lg shadow p-5 text-center`}> 
      <h3 className="text-sm font-medium text-gray-600">{titulo}</h3> {/* Cor de texto ajustada */}
      <p className="text-3xl font-bold mt-2 text-gray-800">{valor}</p> {/* Cor de texto ajustada */}
    </div>
  );
}


export default function CobrancasAvarias() {
  const [cobrancas, setCobrancas] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState({ total: 0, pendentes: 0, cobradas: 0, canceladas: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAvaria, setSelectedAvaria] = useState(null);

  const formatCurrency = (value) => (value === null || value === undefined ? '-' :
    Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  );

  // --- Funções de Carregamento (sem alteração na lógica) ---
  const carregarCobrancas = async () => { /* ... */ };
  const carregarResumo = async () => { /* ... */ };
  const carregarTudo = async () => {
      setLoading(true);
      try {
          await Promise.all([ carregarResumo(), carregarCobrancas() ]);
      } catch (err) { console.error("Erro geral:", err); } 
      finally { setLoading(false); }
  }
  useEffect(() => { carregarTudo(); }, [filtro, statusFiltro]);

  // --- Funções do Modal (sem alteração na lógica) ---
  const handleVerDetalhes = (avaria) => { /* ... */ };
  const handleCloseModal = () => { /* ... */ };
  const handleAtualizarStatusCobranca = async (avariaId, novoStatus, updateData) => { /* ... */ };


  return (
    // Container principal (igual CentralTratativas)
    <div className="max-w-7xl mx-auto p-6"> 
      <h1 className="text-2xl font-semibold mb-4 text-gray-700"> {/* Estilo título */}
        Central de Cobranças de Avarias
      </h1>

      {/* --- Filtros (Restaurando estilo bg-white) --- */}
      <div className="bg-white p-4 shadow rounded-lg mb-6 flex flex-wrap gap-3 items-center">
        <div className="flex items-center border rounded-md px-2 flex-1"> {/* Input com borda */}
          <FaSearch className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Buscar (motorista, prefixo, tipo...)"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="flex-1 outline-none py-1" // Sem borda interna
          />
        </div>
        <select
          className="border rounded-md p-2" // Select com borda
          value={statusFiltro}
          onChange={(e) => setStatusFiltro(e.target.value)}
        >
          <option value="">Todos os Status</option>
          <option value="Pendente">Pendentes</option>
          <option value="Cobrada">Cobradas</option>
          <option value="Cancelada">Canceladas</option>
        </select>
        {/* Botão Limpar com estilo */}
        <button
          onClick={() => { setFiltro(""); setStatusFiltro(""); }}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md px-4 py-2"
        > Limpar </button>
      </div>
      {/* --- FIM Filtros --- */}

      {/* --- Cards resumo (Restaurando cores e texto) --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"> {/* Ajustado grid-cols e gap */}
        <CardResumo titulo="Total Aprovado" valor={resumo.total} cor="bg-blue-100 text-blue-700" />
        <CardResumo titulo="Pendentes Cobrança" valor={resumo.pendentes} cor="bg-yellow-100 text-yellow-700" />
        <CardResumo titulo="Cobradas" valor={resumo.cobradas} cor="bg-green-100 text-green-700" />
        <CardResumo titulo="Canceladas" valor={resumo.canceladas} cor="bg-red-100 text-red-700" subValor={formatCurrency(resumo.canceladasTotalValue)} />
      </div>
      {/* --- FIM Cards --- */}

      {/* --- Tabela (Restaurando estilos) --- */}
      <div className="bg-white rounded-lg shadow overflow-x-auto"> {/* Container branco com sombra */}
        <table className="min-w-full border-collapse"> {/* Tabela */}
          {/* Cabeçalho Azul */}
          <thead>
            <tr className="bg-blue-600 text-white text-left"> 
              <th className="p-3">Data Aprovação</th>
              <th className="p-3">Motorista</th>
              <th className="p-3">Prefixo</th>
              <th className="p-3">Tipo Avaria</th>
              <th className="p-3">Valor Orçado</th>
              <th className="p-3">Valor Cobrado</th>
              <th className="p-3">Status Cobrança</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>
          {/* Corpo da Tabela */}
          <tbody>
            {(() => {
              if (loading) { 
                return <tr><td colSpan="8" className="text-center p-6 text-gray-500">Carregando...</td></tr>; 
              }
              if (cobrancas.length === 0) { 
                return <tr><td colSpan="8" className="text-center p-6 text-gray-500">Nenhuma cobrança encontrada.</td></tr>; 
              }
              return cobrancas.map((c) => (
                // Linha com borda inferior e hover
                <tr key={c.id} className="border-b hover:bg-gray-50"> 
                  <td className="p-3 text-gray-700">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="p-3 text-gray-700">{c.motoristaId || "-"}</td>
                  <td className="p-3 text-gray-700">{c.prefixo || "-"}</td>
                  <td className="p-3 text-gray-700">{c.tipoOcorrencia || "-"}</td>
                  <td className="p-3 text-gray-700">{formatCurrency(c.valor_total_orcamento)}</td>
                  <td className="p-3 text-gray-900 font-medium">{formatCurrency(c.valor_cobrado)}</td> {/* Valor cobrado destacado */}
                  <td className="p-3"> 
                    <span className={`px-2 py-1 rounded text-xs font-medium ${ // Ajustado tamanho fonte
                        c.status_cobranca === "Cobrada" ? "bg-green-100 text-green-800"
                        : c.status_cobranca === "Cancelada" ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800" }`}
                    > {c.status_cobranca} </span>
                  </td>
                  <td className="p-3"> 
                     {/* Botão Detalhes com estilo */}
                     <button 
                        onClick={() => handleVerDetalhes(c)} 
                        className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
                        title="Ver Detalhes e Ações"
                      > <FaEye /> Detalhes </button>
                  </td>
                </tr>
              ));
            })()}
          </tbody>
        </table>
      </div>
      {/* --- FIM Tabela --- */}

      {/* Renderiza o Modal */}
      {modalOpen && ( <CobrancaDetalheModal /* ... */ /> )}
    </div>
  );
}
