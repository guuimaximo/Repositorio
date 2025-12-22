// src/pages/SOSCentral.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import { FaSearch, FaEye, FaTimes, FaLock, FaEdit, FaSave, FaSort, FaSortUp, FaSortDown } from "react-icons/fa";

/* --- Modal de Login --- */
function LoginModal({ onConfirm, onCancel, title = "Acesso Restrito" }) {
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    const { data, error } = await supabase
      .from("usuarios_aprovadores")
      .select("*")
      .eq("login", login)
      .eq("senha", senha)
      .eq("ativo", true)
      .single();
    setLoading(false);

    if (error || !data) {
      alert("Login ou senha incorretos!");
      return;
    }
    onConfirm({ nome: data.nome, login: data.login });
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-80">
        <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
          <FaLock /> {title}
        </h2>
        <input
          type="text"
          placeholder="Login"
          className="w-full mb-3 p-2 border rounded"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
        />
        <input
          type="password"
          placeholder="Senha"
          className="w-full mb-4 p-2 border rounded"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
            Cancelar
          </button>
          <button
            onClick={handleLogin}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {loading ? "Verificando..." : "Entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* --- Modal de Detalhes do SOS --- */
function DetalheSOSModal({ sos, onClose, onAtualizar }) {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  useEffect(() => {
    if (sos) setFormData(sos);
  }, [sos]);

  function solicitarLogin() {
    setLoginModalOpen(true);
  }

  async function onLoginConfirm() {
    setLoginModalOpen(false);
    setEditMode(true);
  }

  async function salvarAlteracoes() {
    const { error } = await supabase
      .from("sos_acionamentos")
      .update({
        ...formData,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", sos.id);

    if (error) {
      alert("Erro ao salvar: " + error.message);
      return;
    }

    alert("Alterações salvas com sucesso ✅");
    onAtualizar(true); // força reload do início
    setEditMode(false);
    onClose();
  }

  const renderField = (label, field, multiline = false) => (
    <div>
      <label className="text-sm text-gray-500">{label}</label>
      {editMode ? (
        multiline ? (
          <textarea
            className="border p-2 rounded w-full"
            rows="2"
            value={formData[field] || ""}
            onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
          />
        ) : (
          <input
            type="text"
            className="border p-2 rounded w-full"
            value={formData[field] || ""}
            onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
          />
        )
      ) : (
        <p className="bg-gray-50 p-2 border rounded">{formData[field] || "—"}</p>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-40 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">Detalhes do SOS #{sos.numero_sos}</h2>
          <div className="flex items-center gap-2">
            {!editMode ? (
              <button
                onClick={solicitarLogin}
                className="bg-yellow-500 text-white px-3 py-1 rounded flex items-center gap-1 hover:bg-yellow-600"
              >
                <FaEdit /> Editar
              </button>
            ) : (
              <button
                onClick={salvarAlteracoes}
                className="bg-blue-600 text-white px-3 py-1 rounded flex items-center gap-1 hover:bg-blue-700"
              >
                <FaSave /> Salvar
              </button>
            )}
            <button onClick={onClose} className="text-gray-600 hover:text-gray-900">
              <FaTimes size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto text-sm">
          <h3 className="font-semibold text-blue-700">Informações Gerais</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {renderField("Criado em", "created_at")}
            {renderField("Número SOS", "numero_sos")}
            {renderField("Plantonista", "plantonista")}
            {renderField("Data SOS", "data_sos")}
            {renderField("Hora SOS", "hora_sos")}
            {renderField("Veículo", "veiculo")}
          </div>

          <h3 className="font-semibold text-yellow-700 mt-4">Dados do Motorista e Ocorrência</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {renderField("Motorista ID", "motorista_id")}
            {renderField("Motorista Nome", "motorista_nome")}
            {renderField("Reclamação Motorista", "reclamacao_motorista", true)}
            {renderField("Local Ocorrência", "local_ocorrencia")}
            {renderField("Linha", "linha")}
            {renderField("Tabela Operacional", "tabela_operacional")}
          </div>

          <h3 className="font-semibold text-green-700 mt-4">Atendimento e Manutenção</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {renderField("Avaliador Manutenção", "avaliador_manutencao")}
            {renderField("Procedência do Socorro", "procedencia_socorro")}
            {renderField("Ocorrência", "ocorrencia")}
            {renderField("SR Número", "sr_numero")}
            {renderField("Setor Manutenção", "setor_manutencao")}
            {renderField("Grupo Manutenção", "grupo_manutencao")}
            {renderField("Problema Encontrado", "problema_encontrado", true)}
          </div>

          <h3 className="font-semibold text-red-700 mt-4">Fechamento</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {renderField("Solucionador", "solucionador")}
            {renderField("Solução", "solucao", true)}
          </div>
        </div>

        {loginModalOpen && (
          <LoginModal onConfirm={onLoginConfirm} onCancel={() => setLoginModalOpen(false)} />
        )}
      </div>
    </div>
  );
}

/* --- Página Principal: CENTRAL SOS --- */
export default function SOSCentral() {
  const PAGE_SIZE = 200;

  const [sosList, setSosList] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [busca, setBusca] = useState("");
  const [selected, setSelected] = useState(null);

  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  // ordenação server-side
  const [sortBy, setSortBy] = useState("data_fechamento");
  const [sortAsc, setSortAsc] = useState(false);

  // página atual (offset)
  const [page, setPage] = useState(0);

  function buildQuery() {
    let query = supabase
      .from("sos_acionamentos")
      .select("*")
      .eq("status", "Fechado");

    if (dataInicio) query = query.gte("data_fechamento", dataInicio);
    if (dataFim) query = query.lte("data_fechamento", dataFim);

    // order precisa vir antes do range
    query = query.order(sortBy, { ascending: sortAsc, nullsFirst: false });

    return query;
  }

  async function carregarSOS(reset = false) {
    if (reset) {
      setLoading(true);
      setPage(0);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    const currentPage = reset ? 0 : page;
    const from = currentPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await buildQuery().range(from, to);

    if (error) {
      console.error(error.message);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    const newRows = data || [];
    const merged = reset ? newRows : [...sosList, ...newRows];
    setSosList(merged);

    // hasMore: se voltou menos que page size, acabou
    setHasMore(newRows.length === PAGE_SIZE);

    // Atualiza contagens com base no que está carregado (parcial se não carregou tudo)
    const contagens = {};
    merged.forEach((s) => {
      const o = (s.ocorrencia || "").toUpperCase().trim();
      contagens[o] = (contagens[o] || 0) + 1;
    });
    setCounts(contagens);

    setPage(currentPage + 1);
    setLoading(false);
    setLoadingMore(false);
  }

  useEffect(() => {
    // primeira carga
    carregarSOS(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // sempre que filtro/ordenação mudar, recarrega do início
  useEffect(() => {
    carregarSOS(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataInicio, dataFim, sortBy, sortAsc]);

  const filtrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    if (!termo) return sosList;
    return sosList.filter((s) => {
      return (
        s.numero_sos?.toString().includes(termo) ||
        s.veiculo?.toLowerCase().includes(termo) ||
        s.motorista_nome?.toLowerCase().includes(termo)
      );
    });
  }, [busca, sosList]);

  function toggleSort(field) {
    if (sortBy === field) {
      setSortAsc((v) => !v);
    } else {
      setSortBy(field);
      setSortAsc(true); // padrão: asc quando troca o campo
    }
  }

  function SortIcon({ field }) {
    if (sortBy !== field) return <FaSort className="inline ml-2 opacity-70" />;
    return sortAsc ? (
      <FaSortUp className="inline ml-2" />
    ) : (
      <FaSortDown className="inline ml-2" />
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Central de Intervenções (Fechadas)</h1>

      {/* 🔢 Cards de Resumo (parcial, conforme páginas carregadas) */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        {["SOS", "RECOLHEU", "TROCA", "AVARIA", "IMPROCEDENTE", "SEGUIU VIAGEM"].map((key) => (
          <CardResumo key={key} titulo={key} valor={counts[key] || 0} cor={cores[key]} />
        ))}
      </div>

      {/* 🔍 Filtros */}
      <div className="bg-white shadow rounded-lg p-4 mb-6 flex flex-wrap gap-3 items-center">
        <FaSearch className="text-gray-500" />
        <input
          type="text"
          placeholder="Buscar por número, veículo ou motorista..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="border rounded-md px-3 py-2 flex-1"
        />
        <input
          type="date"
          value={dataInicio}
          onChange={(e) => setDataInicio(e.target.value)}
          className="border rounded-md px-3 py-2"
        />
        <input
          type="date"
          value={dataFim}
          onChange={(e) => setDataFim(e.target.value)}
          className="border rounded-md px-3 py-2"
        />
        <button
          onClick={() => carregarSOS(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Aplicar
        </button>
      </div>

      {/* 📋 Lista */}
      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-blue-600 text-white">
            <tr>
              <ThSortable label="Número" onClick={() => toggleSort("numero_sos")}>
                <SortIcon field="numero_sos" />
              </ThSortable>

              <ThSortable label="Data" onClick={() => toggleSort("data_fechamento")}>
                <SortIcon field="data_fechamento" />
              </ThSortable>

              <ThSortable label="Prefixo" onClick={() => toggleSort("veiculo")}>
                <SortIcon field="veiculo" />
              </ThSortable>

              <ThSortable label="Motorista" onClick={() => toggleSort("motorista_nome")}>
                <SortIcon field="motorista_nome" />
              </ThSortable>

              <ThSortable label="Ocorrência" onClick={() => toggleSort("ocorrencia")}>
                <SortIcon field="ocorrencia" />
              </ThSortable>

              <th className="py-3 px-4 text-center">Ações</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="text-center py-6 text-gray-600">
                  Carregando...
                </td>
              </tr>
            ) : filtrados.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-6 text-gray-600">
                  Nenhum SOS encontrado.
                </td>
              </tr>
            ) : (
              filtrados.map((s) => (
                <tr key={s.id} className="border-t hover:bg-gray-50 transition">
                  <td className="py-3 px-4">{s.numero_sos}</td>
                  <td className="py-3 px-4">
                    {s.data_fechamento ? new Date(s.data_fechamento).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="py-3 px-4">{s.veiculo}</td>
                  <td className="py-3 px-4">{s.motorista_nome}</td>
                  <td className="py-3 px-4">
                    <OcorrenciaTag ocorrencia={s.ocorrencia} />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded-md text-sm flex items-center gap-2 mx-auto"
                      onClick={() => setSelected(s)}
                    >
                      <FaEye /> Consultar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Carregar mais */}
        {!loading && hasMore && (
          <div className="p-4 border-t flex justify-center">
            <button
              onClick={() => carregarSOS(false)}
              disabled={loadingMore}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-60"
            >
              {loadingMore ? "Carregando..." : "Carregar mais"}
            </button>
          </div>
        )}
      </div>

      {selected && (
        <DetalheSOSModal sos={selected} onClose={() => setSelected(null)} onAtualizar={carregarSOS} />
      )}
    </div>
  );
}

/* --- Helpers UI --- */
function ThSortable({ label, onClick, children }) {
  return (
    <th
      className="py-3 px-4 text-left cursor-pointer select-none hover:bg-blue-700 transition"
      onClick={onClick}
      title="Clique para ordenar"
    >
      <span className="inline-flex items-center">
        {label} {children}
      </span>
    </th>
  );
}

/* --- CardResumo e OcorrenciaTag --- */
const cores = {
  SOS: "bg-red-600 text-white",
  RECOLHEU: "bg-blue-600 text-white",
  TROCA: "bg-yellow-400 text-black",
  AVARIA: "bg-gray-700 text-white",
  IMPROCEDENTE: "bg-purple-600 text-white",
  "SEGUIU VIAGEM": "bg-green-600 text-white",
};

function CardResumo({ titulo, valor, cor }) {
  return (
    <div className={`${cor} rounded-lg shadow p-3 text-center`}>
      <h3 className="text-xs font-medium">{titulo}</h3>
      <p className="text-2xl font-bold mt-1">{valor}</p>
    </div>
  );
}

function OcorrenciaTag({ ocorrencia }) {
  const o = (ocorrencia || "").toUpperCase();
  const estilo = cores[o] || "bg-gray-300 text-gray-700";
  return <span className={`${estilo} px-2 py-1 rounded text-xs font-semibold`}>{o || "—"}</span>;
}
