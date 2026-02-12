import React, { useEffect, useState } from "react";
// MANTENHA O IMPORT EXATAMENTE COMO ESTAVA PARA TESTAR O CAMINHO
import { supabase } from "../supabaseClient"; 

export default function TesteSupabase() {
  const [status, setStatus] = useState("Iniciando teste de conexão...");

  useEffect(() => {
    async function testarConexao() {
      console.log("--- ⚡ INICIANDO TESTE ISOLADO ---");
      
      // 'head: true' faz uma requisição leve que não baixa dados, apenas conta.
      // Isso valida a conexão sem "consumir" banda ou processamento.
      const { count, error } = await supabase
        .from('diesel_acompanhamentos')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error("❌ Erro de Conexão:", error);
        setStatus("ERRO: Veja o console (F12)");
      } else {
        console.log("✅ Conexão BEM SUCEDIDA. Registros encontrados:", count);
        setStatus(`✅ Sucesso! Conectado ao Supabase. Tabela tem ${count} registros.`);
      }
    }

    testarConexao();
  }, []);

  return (
    <div className="p-10 flex flex-col items-center justify-center h-screen bg-gray-50">
      <h1 className="text-2xl font-bold mb-4">Teste de Diagnóstico</h1>
      <div className={`p-4 rounded border ${status.includes("Sucesso") ? "bg-green-100 border-green-400 text-green-800" : "bg-red-100 border-red-400 text-red-800"}`}>
        {status}
      </div>
      <p className="mt-4 text-gray-500 text-sm">
        Se o erro "Multiple GoTrueClient" sumir aqui, o problema estava na renderização da tabela anterior.
        <br/>Se o erro persistir, o problema está dentro do arquivo <code>../supabaseClient.js</code> ou no <code>App.js</code>.
      </p>
    </div>
  );
}
