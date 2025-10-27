// src/components/CampoMotorista.jsx
// (Correção no useMemo)

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'

export default function CampoMotorista({ value, onChange, label = 'Motorista' }) {
  const [todos, setTodos] = useState([])
  const [q, setQ] = useState('') // Inicia como string
  const [open, setOpen] = useState(false)
  const [errorLoading, setErrorLoading] = useState(null);

  // 1. Carrega motoristas
  useEffect(() => {
    setErrorLoading(null);
    (async () => {
      const { data, error } = await supabase
        .from('motoristas')
        .select('chapa, nome')
        .order('nome', { ascending: true });
        
      if (error) {
        console.error("Erro ao buscar motoristas:", error);
        setErrorLoading("Falha ao carregar motoristas.");
        setTodos([]);
      } else {
        setTodos(data || []);
      }
    })()
  }, [])

  // 2. Abre dropdown
  useEffect(() => {
    if (!String(q || '')) {
        setOpen(false);
        return;
    }
     setOpen(filtrados.length > 0);
  }, [q]) // Removido 'filtrados' da dependência

  // 3. Filtra motoristas
  const filtrados = useMemo(() => {
    // --- CORREÇÃO AQUI ---
    const s = String(q || '').trim().toLowerCase();
    // --- FIM CORREÇÃO ---
    if (!s) return [];

    if (!Array.isArray(todos)) return [];

    return todos
      .filter(
        (m) =>
          String(m.chapa || '').toLowerCase().startsWith(s) || // Garante string
          String(m.nome || '').toLowerCase().includes(s)     // Garante string
      )
      .slice(0, 8)
  }, [q, todos])

  // 4. Aplica seleção
  function aplicar(m) {
    onChange?.({ chapa: String(m.chapa), nome: m.nome });
    setQ(`${m.chapa} - ${m.nome}`);
    setOpen(false);
  }

  // 5. Sincroniza input
  useEffect(() => {
    if (!value || (!value.chapa && !value.nome)) {
        setQ(''); // Limpa se o valor for nulo ou vazio
        return;
    }
    const texto = [value.chapa, value.nome].filter(Boolean).join(' - ');
    setQ(texto);
  }, [value])

  return (
    <div className="relative">
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <input
        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={errorLoading ? "Erro ao carregar" : "Digite a chapa ou nome…"}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => { if (q && filtrados.length > 0) setOpen(true) }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        disabled={!!errorLoading}
      />
      {errorLoading && <div className="text-red-600 text-xs mt-1">{errorLoading}</div>}
      {open && filtrados.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow">
          {filtrados.map((m) => (
            <button
              key={m.chapa}
              type="button"
              onMouseDown={() => aplicar(m)}
              className="block w-full text-left px-3 py-2 hover:bg-gray-100"
            >
              <div className="text-sm font-medium">{m.nome}</div>
              <div className="text-xs text-gray-500">Chapa: {m.chapa}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
