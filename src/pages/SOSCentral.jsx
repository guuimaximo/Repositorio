import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import {
  FaSearch, FaEye, FaTimes, FaLock, FaEdit, FaSave
} from "react-icons/fa";

/* --- Modal de Login (reutilizado do modelo das Avarias) --- */
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

/* --- Modal de Detalhes --- */
function DetalheSOSModal({ sos, onClose, onAtualizar }) {
  const [editMode, setEditMode] = useState(false);
  const [responsavel, setResponsavel] = useState("");
  const [ocorrencia, setOcorrencia] = useState("");
  const [observacao, setObservacao] = useState("");
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  useEffect(() => {
    if (sos) {
      setResponsavel(sos.avaliador || "");
      setOcorrencia(sos.ocorrencia || "");
      setObservacao(sos.observacao || "");
    }
  }, [sos]);

  function solicitarLogin() {
    setLoginModalOpen(true);
  }

  async function onLoginConfirm({ nome }) {
    setLoginModalOpen(false);
    setEditMode(true);
  }

  async function salvarAlteracoes() {
    const { error } = await supabase
      .from("sos_acionamentos")
      .update({
        avaliador: responsavel,
        ocorrencia,
        observacao,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", sos.id);

    if (error) {
      alert("Erro ao salvar: " + error.message);
      return;
    }

    alert("Alterações salvas com sucesso ✅");
    onAtualizar();
    setEditMode(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-40 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">
            Detalhes do SOS #{sos.numero_sos}
          </h2>
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

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500">Prefixo</label>
              <p>{sos.veiculo}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Motorista</label>
              <p>{sos.motorista_nome}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Linha</label>
              <p>{sos.linha}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Data de Fechamento</label>
              <p>{new Date(sos.data_fechamento).toLocaleDateString("pt-BR")}</p>
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-500">Responsável Técnico</label>
            {editMode ? (
              <input
                type="text"
                className="border p-2 rounded w-full"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
              />
            ) : (
              <p className="bg-gray-50 p-2 border rounded">{responsavel || "—"}</p>
            )}
          </div>

          <div>
            <label className="text-sm text-gray-500">Ocorrência</label>
            {editMode ? (
              <select
                className="border p-2 rounded w-full"
                value={ocorrencia}
                onChange={(e) => setOcorrencia(e.target.value)}
              >
                <option value="">Selecione...</option>
                <option value="SOS">SOS</option>
                <option value="RECOLHEU">RECOLHEU</option>
                <option value="TROCA">TROCA</option>
                <option value="AVARIA">AVARIA</option>
                <option value="IMPROCEDENTE">IMPROCEDENTE</option>
                <option value="SEGUIU VIAGEM">SEGUIU VIAGEM</option>
              </select>
            ) : (
              <p className="bg-gray-50 p-2 border rounded">{ocorrencia || "—"}</p>
            )}
          </div>

          <div>
            <label className="text-sm text-gray-500">Observações</label>
            {editMode ? (
              <textarea
                className="border p-2 rounded w-full"
                rows="3"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
            ) : (
              <p className="bg-gray-50 p-2 border rounded min-h-[60px]">
                {observacao || "—"}
              </p>
            )}
          </div>
        </div>

        {loginModalOpen && (
          <LoginModal
            onConfirm={onLoginConfirm}
            onCancel={() => setLoginModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

/* --- Página Principal: CENTRAL SOS --- */
export default function SOSCentral() {
  const [sosList, setSosList] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [selected, setSelected] = useState(null);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  async function carregarSOS() {
    setLoading(true);
    let query = supabase
      .from("sos_acionamentos")
      .select("*")
      .eq("status", "Fechado");

    if (dataInicio) query = query.gte("data_fechamento", dataInicio);
    if (dataFim) query = query.lte("data_fechamento", dataFim);

    const { data, error } = await query.order("data_fechamento", { ascending: false });

    if (error) {
      console.error(error.message);
      setLoading(false);
      return;
    }

    setSosList(data || []);
    const contagens = {};
    data.forEach((s) => {
      const o = (s.ocorrencia || "").toUpperCase().trim();
      contagens[o] = (contagens[o] || 0) + 1;
    });
    setCounts(contagens);
    setLoading(false);
  }

  useEffect(() => {
    carregarSOS();
  }, []);

  const filtrados = sosList.filter((s) => {
    const termo = busca.toLowerCase();
    return (
      s.numero_sos?.toString().includes(termo) ||
      s.veiculo?.toLowerCase().includes(termo) ||
      s.motorista_nome?.toLowerCase().includes(termo)
    );
  });

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">
        Central de Intervenções (Fechadas)
      </h1>

      {/* 🔢 Cards de Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        {["SOS", "RECOLHEU", "TROCA", "AVARIA", "IMPROCEDENTE", "SEGUIU VIAGEM"].map((key) => (
          <CardResumo
            key={key}
            titulo={key}
            valor={counts[key] || 0}
            cor={cores[key]}
          />
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
          onClick={carregarSOS}
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
              <th className="py-3 px-4 text-left">Número</th>
              <th className="py-3 px-4 text-left">Data</th>
              <th className="py-3 px-4 text-left">Prefixo</th>
              <th className="py-3 px-4 text-left">Motorista</th>
              <th className="py-3 px-4 text-left">Ocorrência</th>
              <th className="py-3 px-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="text-center py-6 text-gray-600">Carregando...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-6 text-gray-600">Nenhum SOS encontrado.</td></tr>
            ) : (
              filtrados.map((s) => (
                <tr key={s.id} className="border-t hover:bg-gray-50 transition">
                  <td className="py-3 px-4">{s.numero_sos}</td>
                  <td className="py-3 px-4">{new Date(s.data_fechamento).toLocaleDateString("pt-BR")}</td>
                  <td className="py-3 px-4">{s.veiculo}</td>
                  <td className="py-3 px-4">{s.motorista_nome}</td>
                  <td className="py-3 px-4"><OcorrenciaTag ocorrencia={s.ocorrencia} /></td>
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
      </div>

      {selected && (
        <DetalheSOSModal
          sos={selected}
          onClose={() => setSelected(null)}
          onAtualizar={carregarSOS}
        />
      )}
    </div>
  );
}

/* --- Card de Resumo --- */
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

/* --- Tag colorida da Ocorrência --- */
function OcorrenciaTag({ ocorrencia }) {
  const o = (ocorrencia || "").toUpperCase();
  const estilo = cores[o] || "bg-gray-300 text-gray-700";
  return (
    <span className={`${estilo} px-2 py-1 rounded text-xs font-semibold`}>
      {o || "—"}
    </span>
  );
}
