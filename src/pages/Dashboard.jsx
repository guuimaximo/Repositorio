import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

export default function Dashboard() {
  const [resumo, setResumo] = useState({
    tratativas: 0,
    avarias: 0,
    cobrancas: 0,
  });
  const [evolucao, setEvolucao] = useState([]);
  const [topMotoristas, setTopMotoristas] = useState([]);

  useEffect(() => {
    carregarResumo();
    carregarEvolucao();
    carregarTopMotoristas();
  }, []);

  // === Resumo geral ===
  const carregarResumo = async () => {
    const [t, a, c] = await Promise.all([
      supabase.from("tratativas").select("id", { count: "exact" }),
      supabase.from("avarias").select("id", { count: "exact" }),
      supabase.from("cobrancas_avarias").select("id", { count: "exact" }),
    ]);

    setResumo({
      tratativas: t.count || 0,
      avarias: a.count || 0,
      cobrancas: c.count || 0,
    });
  };

  // === Evolução 30 dias ===
  const carregarEvolucao = async () => {
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - 30);

    const [trat, av, cob] = await Promise.all([
      supabase
        .from("tratativas")
        .select("created_at")
        .gte("created_at", dataInicio.toISOString()),
      supabase
        .from("avarias")
        .select("created_at")
        .gte("created_at", dataInicio.toISOString()),
      supabase
        .from("cobrancas_avarias")
        .select("created_at")
        .gte("created_at", dataInicio.toISOString()),
    ]);

    const contagem = {};

    const somar = (dados, chave) => {
      dados?.data?.forEach((item) => {
        const dia = new Date(item.created_at).toLocaleDateString("pt-BR");
        contagem[dia] = contagem[dia] || { dia, tratativas: 0, avarias: 0, cobrancas: 0 };
        contagem[dia][chave]++;
      });
    };

    somar(trat, "tratativas");
    somar(av, "avarias");
    somar(cob, "cobrancas");

    const resultado = Object.values(contagem).sort(
      (a, b) =>
        new Date(a.dia.split("/").reverse().join("-")) -
        new Date(b.dia.split("/").reverse().join("-"))
    );

    setEvolucao(resultado);
  };

  // === Motoristas com mais tratativas ===
  const carregarTopMotoristas = async () => {
    const { data } = await supabase
      .from("tratativas")
      .select("motorista_nome")
      .not("motorista_nome", "is", null);

    if (!data) return;

    const contador = {};
    data.forEach((t) => {
      contador[t.motorista_nome] = (contador[t.motorista_nome] || 0) + 1;
    });

    const top = Object.entries(contador)
      .map(([nome, qtd]) => ({ nome, qtd }))
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 5);

    setTopMotoristas(top);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6 text-gray-700">
        Painel de Gestão Integrada
      </h1>

      {/* === Cards principais === */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <CardResumo titulo="Tratativas" valor={resumo.tratativas} cor="bg-blue-100 text-blue-700" />
        <CardResumo titulo="Avarias" valor={resumo.avarias} cor="bg-red-100 text-red-700" />
        <CardResumo titulo="Cobranças" valor={resumo.cobrancas} cor="bg-green-100 text-green-700" />
      </div>

      {/* === Gráfico de evolução === */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-lg font-medium mb-4 text-gray-700">
          Evolução dos últimos 30 dias
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={evolucao}>
            <XAxis dataKey="dia" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="tratativas" stroke="#2563eb" name="Tratativas" />
            <Line type="monotone" dataKey="avarias" stroke="#dc2626" name="Avarias" />
            <Line type="monotone" dataKey="cobrancas" stroke="#16a34a" name="Cobranças" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* === Top Motoristas === */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4 text-gray-700">
          Motoristas com mais tratativas
        </h2>
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100 text-gray-700 text-left">
              <th className="p-3">Motorista</th>
              <th className="p-3 text-center">Qtd</th>
            </tr>
          </thead>
          <tbody>
            {topMotoristas.length > 0 ? (
              topMotoristas.map((m, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="p-3">{m.nome}</td>
                  <td className="p-3 text-center font-semibold">{m.qtd}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="2" className="p-3 text-center text-gray-500">
                  Nenhum dado disponível.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// === Componente para card de resumo ===
function CardResumo({ titulo, valor, cor }) {
  return (
    <div className={`${cor} rounded-lg shadow p-5 text-center`}>
      <h3 className="text-sm font-medium">{titulo}</h3>
      <p className="text-3xl font-bold mt-2">{valor}</p>
    </div>
  );
}
