import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import {
  FaUserShield, FaUserCheck, FaUserTimes, FaSync, FaKey
} from "react-icons/fa";

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");

  // 🔄 Carregar usuários
  async function carregarUsuarios() {
    setLoading(true);
    const { data, error } = await supabase
      .from("usuarios_aprovadores")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error(error.message);
      alert("Erro ao carregar usuários!");
    } else {
      setUsuarios(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    carregarUsuarios();
  }, []);

  // 🔧 Atualizar nível
  async function atualizarNivel(id, nivel) {
    const { error } = await supabase
      .from("usuarios_aprovadores")
      .update({ nivel })
      .eq("id", id);

    if (error) return alert("Erro ao atualizar nível!");
    alert("Nível atualizado com sucesso ✅");
    carregarUsuarios();
  }

  // 🔄 Alternar status (ativo/inativo)
  async function alternarAtivo(id, atual) {
    const novo = !atual;
    const { error } = await supabase
      .from("usuarios_aprovadores")
      .update({ ativo: novo })
      .eq("id", id);

    if (error) return alert("Erro ao atualizar status!");
    alert(`Usuário ${novo ? "ativado" : "desativado"} com sucesso ✅`);
    carregarUsuarios();
  }

  // 🔍 Filtro por nome ou login
  const filtrados = usuarios.filter((u) =>
    (u.nome || "").toLowerCase().includes(busca.toLowerCase()) ||
    (u.login || "").toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gerenciar Usuários</h1>
        <button
          onClick={carregarUsuarios}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
        >
          <FaSync /> Atualizar
        </button>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <input
          type="text"
          placeholder="Buscar por nome ou login..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="border rounded-md px-3 py-2 w-full"
        />
      </div>

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="py-2 px-4 text-left">ID</th>
              <th className="py-2 px-4 text-left">Nome</th>
              <th className="py-2 px-4 text-left">Login</th>
              <th className="py-2 px-4 text-left">E-mail</th>
              <th className="py-2 px-4 text-center">Nível</th>
              <th className="py-2 px-4 text-center">Status</th>
              <th className="py-2 px-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="text-center py-6 text-gray-600">
                  Carregando...
                </td>
              </tr>
            ) : filtrados.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-6 text-gray-600">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            ) : (
              filtrados.map((u) => (
                <tr
                  key={u.id}
                  className="border-t hover:bg-gray-50 transition-all"
                >
                  <td className="py-2 px-4">{u.id}</td>
                  <td className="py-2 px-4">{u.nome}</td>
                  <td className="py-2 px-4">{u.login}</td>
                  <td className="py-2 px-4">{u.email || "—"}</td>
                  <td className="py-2 px-4 text-center">
                    <select
                      value={u.nivel || ""}
                      onChange={(e) => atualizarNivel(u.id, e.target.value)}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value="">—</option>
                      <option value="Administrador">Administrador</option>
                      <option value="Supervisor">Supervisor</option>
                      <option value="Padrão">Padrão</option>
                    </select>
                  </td>
                  <td className="py-2 px-4 text-center">
                    {u.ativo ? (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold">
                        Ativo
                      </span>
                    ) : (
                      <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-semibold">
                        Inativo
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-4 text-center flex justify-center gap-3">
                    <button
                      onClick={() => alternarAtivo(u.id, u.ativo)}
                      className={`${
                        u.ativo
                          ? "bg-red-500 hover:bg-red-600"
                          : "bg-green-500 hover:bg-green-600"
                      } text-white px-3 py-1 rounded flex items-center gap-1`}
                    >
                      {u.ativo ? <FaUserTimes /> : <FaUserCheck />}
                    </button>
                    <button
                      onClick={() => atualizarNivel(u.id, "Administrador")}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded flex items-center gap-1"
                    >
                      <FaUserShield /> Adm
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
