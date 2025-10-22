import React, { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { Pie } from "react-chartjs-2";
import "chart.js/auto";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [dados, setDados] = useState([]);
  const navigate = useNavigate();

  const buscarDados = async () => {
    const { data, error } = await supabase
      .from("tratativas")
      .select("*");

    if (error) {
      console.error("Erro ao carregar tratativas:", error.message);
    } else {
      setDados(data || []);
    }
  };

  useEffect(() => {
    buscarDados();

    // Atualização em tempo real
    const canal = supabase
      .channel("tratativas-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tratativas" },
        (payload) => {
          console.log("Alteração detectada:", payload);
          buscarDados();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  const total = dados.length;
  const resolvidos = dados.filter((t) => t.status === "Resolvido").length;
  const pendentes = dados.filter((t) => t.status !== "Resolvido").length;

  const chartData = {
    labels: ["Resolvidos", "Pendentes"],
    datasets: [
      {
        data: [resolvidos, pendentes],
        backgroundColor: ["#22c55e", "#ef4444"],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-md p-6">
        <h1 className="text-3xl font-bold text-blue-700 mb-4 text-center">
          🚍 Painel Geral — InoveQuatai
        </h1>

        <div className="grid grid-cols-3 gap-4 mb-8 text-center">
          <div className="bg-green-100 rounded-lg p-4 shadow">
            <p className="text-2xl font-bold text-green-700">{resolvidos}</p>
            <p className="text-gray-700 font-medium">Resolvidos</p>
          </div>
          <div className="bg-yellow-100 rounded-lg p-4 shadow">
            <p className="text-2xl font-bold text-yellow-700">{pendentes}</p>
            <p className="text-gray-700 font-medium">Pendentes</p>
          </div>
          <div className="bg-blue-100 rounded-lg p-4 shadow">
            <p className="text-2xl font-bold text-blue-700">{total}</p>
            <p className="text-gray-700 font-medium">Total de Tratativas</p>
          </div>
        </div>

        <div className="max-w-md mx-auto mb-6">
          <Pie data={chartData} />
        </div>

        <div className="text-center">
          <button
            onClick={() => navigate("/tratativas")}
            className="bg-blue-700 text-white px-6 py-2 rounded-md shadow hover:bg-blue-800"
          >
            📋 Ir para Central de Tratativas
          </button>
        </div>
      </div>
    </div>
  );
}
