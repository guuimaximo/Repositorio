// src/pages/SOSDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import * as XLSX from "xlsx";
import { FaDownload } from "react-icons/fa";

const PAGE_SIZE = 1000;

// Converte "YYYY-MM" -> {inicio: "YYYY-MM-01", fim: "YYYY-MM-<ultimo-dia>"}
function monthToRange(ym) {
  if (!ym) return { inicio: "", fim: "" };
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return { inicio: "", fim: "" };

  const first = new Date(Date.UTC(y, m - 1, 1));
  const last = new Date(Date.UTC(y, m, 0)); // dia 0 do próximo mês = último dia do mês atual

  const toYMD = (d) => {
    const yy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  };

  return { inicio: toYMD(first), fim: toYMD(last) };
}

export default function SOSDashboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // filtros
  const [status, setStatus] = useState("TODOS"); // TODOS | Aberto | Em Andamento | Fechado
  const [dataInicio, setDataInicio] = useState(""); // YYYY-MM-DD
  const [dataFim, setDataFim] = useState(""); // YYYY-MM-DD
  const [mesRef, setMesRef] = useState(""); // YYYY-MM

  // ATENÇÃO: escolha uma coluna de data para filtrar.
  // Para relatório “geral”, normalmente faz mais sentido filtrar por data_fechamento quando status=Fechado;
  // e por created_at nos demais.
  const dateColumn = useMemo(() => {
    if (status === "Fechado") return "data_fechamento";
    return "created_at";
  }, [status]);

  function buildQuery() {
    let q = supabase.from("sos_acionamentos").select("*");

    if (status !== "TODOS") {
      q = q.eq("status", status);
    }

    // 1) filtro por MÊS (YYYY-MM) -> vira um range de datas
    const { inicio: mesIni, fim: mesFim } = monthToRange(mesRef);

    // 2) filtro por DATA (YYYY-MM-DD) manual
    // Regra: aplica os dois, mas sem se atrapalhar.
    // Se usuário preencheu mês e data, a interseção é aplicada (mais restritivo).
    const ini = dataInicio || mesIni;
    const fim = dataFim || mesFim;

    // se sua coluna for timestamptz, use limites com hora para evitar “voltar 1 dia”
    // Como você está no Brasil, isso evita shift de timezone no filtro.
    if (ini) q = q.gte(dateColumn, `${ini}T00:00:00-03:00`);
    if (fim) q = q.lte(dateColumn, `${fim}T23:59:59-03:00`);

    // ordenação padrão
    q = q.order(dateColumn, { ascending: false, nullsFirst: false });

    return q;
  }

  async function carregarTudo() {
    setLoading(true);
    setMsg("");
    setRows([]);

    const all = [];
    let page = 0;

    while (true) {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await buildQuery().range(from, to);

      if (error) {
        setMsg(`Erro ao buscar dados: ${error.message}`);
        break;
      }

      const chunk = data || [];
      all.push(...chunk);

      if (chunk.length < PAGE_SIZE) {
        // acabou
        break;
      }

      page += 1;

      // proteção simples contra loop infinito em caso de bug
      if (page > 200) {
        setMsg("Interrompido por segurança (muitas páginas). Ajuste filtros para reduzir volume.");
        break;
      }
    }

    setRows(all);
    setMsg(all.length ? `Carregado: ${all.length} registros.` : "Nenhum registro encontrado com os filtros atuais.");
    setLoading(false);
  }

  function baixarExcel() {
    if (!rows.length) {
      alert("Não há registros para exportar.");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SOS");

    // nome amigável
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    XLSX.writeFile(wb, `SOS_acionamentos_${stamp}.xlsx`);
  }

  useEffect(() => {
    // carrega sem filtro por padrão
    carregarTudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Dashboard - Intervenções (Exportação)</h1>

      <div className="bg-white shadow rounded-lg p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select
            className="border rounded-md px-3 py-2"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="TODOS">TODOS</option>
            <option value="Aberto">Aberto</option>
            <option value="Em Andamento">Em Andamento</option>
            <option value="Fechado">Fechado</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Mês (YYYY-MM)</label>
          <input
            type="month"
            className="border rounded-md px-3 py-2"
            value={mesRef}
            onChange={(e) => setMesRef(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Data início</label>
          <input
            type="date"
            className="border rounded-md px-3 py-2"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Data fim</label>
          <input
            type="date"
            className="border rounded-md px-3 py-2"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
          />
        </div>

        <button
          onClick={carregarTudo}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Carregando..." : "Aplicar / Recarregar"}
        </button>

        <button
          onClick={baixarExcel}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2 disabled:opacity-60"
          disabled={loading || !rows.length}
        >
          <FaDownload /> Baixar Excel
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <div className="text-sm text-gray-700">
          <div><strong>Coluna de data usada no filtro:</strong> {dateColumn}</div>
          <div><strong>Status:</strong> {status}</div>
          <div className="mt-2">{msg}</div>
        </div>

        {/* preview simples */}
        {rows.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left">Nº SOS</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Veículo</th>
                  <th className="p-2 text-left">Motorista</th>
                  <th className="p-2 text-left">Data</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 20).map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">{r.numero_sos ?? "—"}</td>
                    <td className="p-2">{r.status ?? "—"}</td>
                    <td className="p-2">{r.veiculo ?? "—"}</td>
                    <td className="p-2">{r.motorista_nome ?? "—"}</td>
                    <td className="p-2">
                      {(r[dateColumn] ? new Date(r[dateColumn]).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-500 mt-2">Mostrando apenas 20 primeiros no preview.</p>
          </div>
        )}
      </div>
    </div>
  );
}
