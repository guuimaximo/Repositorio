import React, { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { Link } from "react-router-dom";

export default function CentralTratativas() {
  const [tratativas, setTratativas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      const { data, error } = await supabase
        .from("tratativas")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) console.error(error);
      else setTratativas(data || []);

      setCarregando(false);
    }
    carregar();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-blue-700 mb-4">
        Central de Tratativas
      </h1>

      {carregando ? (
        <p className="text-gray-500">Carregando dados...</p>
      ) : tratativas.length === 0 ? (
        <p className="text-gray-500">Nenhuma tratativa encontrada.</p>
      ) : (
        <table className="w-full border-collapse border border-gray-300 text-sm shadow-sm rounded-lg">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="border p-2 text-left">#</th>
              <th className="border p-2 text-left">Nome</th>
              <th className="border p-2 text-left">Setor</th>
              <th className="border p-2 text-left">Status</th>
              <th className="border p-2 text-left">Ação</th>
            </tr>
          </thead>
          <tbody>
            {tratativas.map((t, index) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="border p-2">{index + 1}</td>
                <td className="border p-2">{t.nome}</td>
                <td className="border p-2">{t.setor}</td>
                <td className="border p-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      t.status === "Concluída"
                        ? "bg-green-100 text-green-700"
                        : t.status === "Pendente"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {t.status}
                  </span>
                </td>
                <td className="border p-2">
                  {t.status === "Concluída" ? (
                    <Link
                      to={`/consultar/${t.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      Consultar
                    </Link>
                  ) : (
                    <Link
                      to={`/tratar/${t.id}`}
                      className="text-green-600 hover:underline"
                    >
                      Tratar
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
