// src/pages/SOSDashboard.jsx
import React, { useMemo, useState } from "react";
import { supabase } from "../supabase";
import * as XLSX from "xlsx";
import { FaDownload } from "react-icons/fa";

/* ===== Helpers de data ===== */
function monthRange(yyyyMm) {
  if (!yyyyMm) return { start: "", end: "" };
  const [y, m] = yyyyMm.split("-").map(Number);

  const pad2 = (n) => String(n).padStart(2, "0");
  const start = `${y}-${pad2(m)}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${pad2(m)}-${pad2(lastDay)}`;
  return { start, end };
}

function formatDateBRFromDateOnly(value) {
  // "YYYY-MM-DD" -> "DD/MM/YYYY" sem shift
  if (!value) return "";
  const s = String(value).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  const [, yyyy, mm, dd] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR");
}

function formatDateBRFromTimestampUTC(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

/* ===== Colunas/ordem do Excel ===== */
const EXCEL_COLUMNS = [
  { key: "numero_sos", label: "Número SOS" },
  { key: "status", label: "Status" },
  { key: "plantonista", label: "Plantonista" },
  { key: "data_sos", label: "Data SOS" },
  { key: "hora_sos", label: "Hora SOS" },
  { key: "veiculo", label: "Prefixo" },
  { key: "motorista_nome", label: "Motorista" },
  { key: "linha", label: "Linha" },
  { key: "local_ocorrencia", label: "Local" },
  { key: "reclamacao_motorista", label: "Reclamação (Motorista)" },
  { key: "avaliador", label: "Avaliador" },
  { key: "procedencia_socorrista", label: "Procedência" },
  { key: "ocorrencia", label: "Ocorrência" },
  { key: "carro_substituto", label: "Carro Substituto" },
  { key: "sr_numero", label: "SR (Operação)" },
  { key: "setor_manutencao", label: "Setor Manutenção" },
  { key: "grupo_manutencao", label: "Grupo Manutenção" },
  { key: "problema_encontrado", label: "Problema Encontrado" },
  { key: "solucionador", label: "Solucionador" },
  { key: "solucao", label: "Solução" },
  { key: "data_fechamento", label: "Data Fechamento" },
  { key: "created_at", label: "Criado em" },
];

export default function SOSDashboard() {
  const PAGE_SIZE = 1000;

  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [mesAno, setMesAno] = useState(""); // YYYY-MM
  const [status, setStatus] = useState("Todos");

  const [loading, setLoading] = useState(false);
  const [lastCount, setLastCount] = useState(null);

  const effectiveRange = useMemo(() => {
    // se o usuário escolheu mês, ele vira um filtro adicional
    const mr = monthRange(mesAno);
    return {
      startMonth: mr.start,
      endMonth: mr.end,
    };
  }, [mesAno]);

  function buildQueryRange(from, to) {
    let q = supabase
      .from("sos_acionamentos")
      .select("*")
      .order("id", { ascending: true })
      .range(from, to);

    if (status && status !== "Todos") q = q.eq("status", status);

    // Filtro por datas (data_fechamento) - você pode trocar para data_sos se preferir
    if (dataInicio) q = q.gte("data_fechamento", dataInicio);
    if (dataFim) q = q.lte("data_fechamento", dataFim);

    // Filtro por mês/ano (também em data_fechamento)
    if (effectiveRange.startMonth) q = q.gte("data_fechamento", effectiveRange.startMonth);
    if (effectiveRange.endMonth) q = q.lte("data_fechamento", effectiveRange.endMonth);

    return q;
  }

  async function fetchAllRows() {
    const all = [];
    let page = 0;

    while (true) {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await buildQueryRange(from, to);
      if (error) throw error;

      const rows = data || [];
      all.push(...rows);

      if (rows.length < PAGE_SIZE) break;
      page += 1;
    }

    return all;
  }

  function toExcelRows(rows) {
    return rows.map((r) => {
      const out = {};
      for (const col of EXCEL_COLUMNS) {
        let v = r[col.key];

        // Formata datas “bonitas” no Excel
        if (col.key === "data_sos") v = formatDateBRFromDateOnly(r.data_sos);
        if (col.key === "data_fechamento") v = formatDateBRFromTimestampUTC(r.data_fechamento);
        if (col.key === "created_at") v = formatDateBRFromTimestampUTC(r.created_at);

        out[col.label] = v ?? "";
      }
      return out;
    });
  }

  function makeFileName() {
    const parts = ["SOS_Intervencoes"];
    if (status && status !== "Todos") parts.push(status.replace(/\s+/g, "_"));
    if (mesAno) parts.push(mesAno.replace("-", "_"));
    if (dataInicio || dataFim) parts.push(`${dataInicio || "inicio"}_a_${dataFim || "fim"}`);
    return `${parts.join("_")}.xlsx`;
  }

  async function baixarExcel() {
    try {
      setLoading(true);
      setLastCount(null);

      const rows = await fetchAllRows();
      setLastCount(rows.length);

      const excelRows = toExcelRows(rows);
      const ws = XLSX.utils.json_to_sheet(excelRows);

      // Ajuste simples de largura de colunas
      ws["!cols"] = EXCEL_COLUMNS.map(() => ({ wch: 22 }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Intervencoes");

      XLSX.writeFile(wb, makeFileName());
    } catch (e) {
      console.error(e);
      alert("Erro ao gerar Excel: " + (e?.message || "desconhecido"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Dashboard - Intervenções</h1>

      <div className="bg-white shadow rounded-lg p-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col">
          <label className="text-xs text-gray-500">Status</label>
          <select
            className="border rounded-md px-3 py-2"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option>Todos</option>
            <option>Aberto</option>
            <option>Em Andamento</option>
            <option>Fechado</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-gray-500">Mês/Ano</label>
          <input
            type="month"
            className="border rounded-md px-3 py-2"
            value={mesAno}
            onChange={(e) => setMesAno(e.target.value)}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-gray-500">Data início</label>
          <input
            type="date"
            className="border rounded-md px-3 py-2"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-gray-500">Data fim</label>
          <input
            type="date"
            className="border rounded-md px-3 py-2"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
          />
        </div>

        <button
          onClick={baixarExcel}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-60"
        >
          <FaDownload />
          {loading ? "Gerando..." : "Baixar Excel"}
        </button>

        {lastCount !== null && (
          <span className="text-sm text-gray-600">
            Registros exportados: <b>{lastCount}</b>
          </span>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        Observação: o download traz todos os registros conforme filtros. Se estiver muito grande, pode demorar.
      </div>
    </div>
  );
}
