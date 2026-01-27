// src/components/CampoMotorista.jsx
// (Mesmo comportamento do original, mas lendo funcionarios: nr_cracha, nm_funcionario)

import { useEffect, useMemo, useState } from "react";
import { supabaseBCNT } from "../supabaseBCNT";

export default function CampoMotorista({
  value,
  onChange,
  label = "Motorista",
  disabled = false,
}) {
  const [todos, setTodos] = useState([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [errorLoading, setErrorLoading] = useState(null);

  // 1) Carrega lista
  useEffect(() => {
    setErrorLoading(null);
    (async () => {
      const { data, error } = await supabaseBCNT
        .from("funcionarios")
        .select("nr_cracha, nm_funcionario")
        .order("nm_funcionario", { ascending: true });

      if (error) {
        console.error("Erro ao buscar funcionarios:", error);
        setErrorLoading("Falha ao carregar motoristas.");
        setTodos([]);
      } else {
        setTodos(data || []);
      }
    })();
  }, []);

  // 2) Filtra
  const filtrados = useMemo(() => {
    const s = String(q || "").trim().toLowerCase();
    if (!s) return [];
    if (!Array.isArray(todos)) return [];

    return todos
      .filter((m) => {
        const cracha = String(m?.nr_cracha || "").toLowerCase();
        const nome = String(m?.nm_funcionario || "").toLowerCase();
        return cracha.startsWith(s) || nome.includes(s);
      })
      .slice(0, 8);
  }, [q, todos]);

  // 3) Abre dropdown
  useEffect(() => {
    if (!String(q || "")) {
      setOpen(false);
      return;
    }
    setOpen(!disabled && filtrados.length > 0);
  }, [q, disabled, filtrados.length]);

  // 4) Aplica seleção
  function aplicar(m) {
    onChange?.({
      chapa: String(m?.nr_cracha ?? ""),
      nome: String(m?.nm_funcionario ?? ""),
    });
    setQ(`${m?.nr_cracha ?? ""} - ${m?.nm_funcionario ?? ""}`);
    setOpen(false);
  }

  // 5) Sincroniza input
  useEffect(() => {
    if (!value || (!value.chapa && !value.nome)) {
      setQ("");
      return;
    }
    const texto = [value.chapa, value.nome].filter(Boolean).join(" - ");
    setQ(texto);
  }, [value]);

  return (
    <div className="relative">
      <label className="block text-sm text-gray-600 mb-1">{label}</label>

      <input
        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        placeholder={errorLoading ? "Erro ao carregar" : "Digite o crachá ou nome…"}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => {
          if (!disabled && q && filtrados.length > 0) setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        disabled={!!errorLoading || disabled}
      />

      {errorLoading && <div className="text-red-600 text-xs mt-1">{errorLoading}</div>}

      {open && filtrados.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow">
          {filtrados.map((m) => (
            <button
              key={String(m?.nr_cracha ?? "")}
              type="button"
              onMouseDown={() => aplicar(m)}
              className="block w-full text-left px-3 py-2 hover:bg-gray-100"
            >
              <div className="text-sm font-medium">{String(m?.nm_funcionario ?? "")}</div>
              <div className="text-xs text-gray-500">Crachá: {String(m?.nr_cracha ?? "")}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
