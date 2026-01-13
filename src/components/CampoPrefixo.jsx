// src/components/CampoPrefixo.jsx
// (Corrigido para usar a coluna 'codigo')

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'

export default function CampoPrefixo({ value, onChange, label = 'Prefixo' }) {
  const [todos, setTodos] = useState([])
  const [q, setQ] = useState('') 
  const [open, setOpen] = useState(false)
  const [errorLoading, setErrorLoading] = useState(null); 

  // 1. Carrega todos os prefixos
  useEffect(() => {
    setErrorLoading(null); 
    (async () => {
      // --- CORREÇÃO AQUI: Usa 'codigo' ---
      const { data, error } = await supabase
        .from('prefixos') 
        .select('id, codigo') // Alterado de 'codigo_prefixo' para 'codigo'
        .order('codigo', { ascending: true }); // Alterado de 'codigo_prefixo' para 'codigo'
      // --- FIM CORREÇÃO ---

      if (error) {
        console.error("Erro ao buscar prefixos:", error);
        setErrorLoading("Falha ao carregar prefixos. Verifique o console.");
        setTodos([]); 
      } else {
        setTodos(data || []);
      }
    })()
  }, [])

  // 2. Abre o dropdown
  useEffect(() => {
    if (!String(q || '')) {
      setOpen(false);
      return;
    }
    setOpen(filtrados.length > 0); 
  }, [q]) 

  // 3. Filtra os prefixos
  const filtrados = useMemo(() => {
    const s = String(q || '').trim().toLowerCase(); 
    if (!s) return [];
    if (!Array.isArray(todos)) return []; 

    return todos
      .filter(
        (p) =>
          // --- CORREÇÃO AQUI: Usa 'codigo' ---
          String(p.codigo || '').toLowerCase().startsWith(s) // Alterado de 'codigo_prefixo' para 'codigo'
          // --- FIM CORREÇÃO ---
      )
      .slice(0, 8)
  }, [q, todos])

  // 4. Aplica a seleção
  function aplicar(p) {
    // --- CORREÇÃO AQUI: Usa 'codigo' ---
    onChange?.(p.codigo); // Alterado de 'codigo_prefixo' para 'codigo'
    setQ(p.codigo);       // Alterado de 'codigo_prefixo' para 'codigo'
    // --- FIM CORREÇÃO ---
    setOpen(false);
  }

  // 5. Sincroniza o input
  useEffect(() => {
    setQ(String(value || '')); 
  }, [value])

  return (
    <div className="relative">
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <input
        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={errorLoading ? "Erro ao carregar" : "Digite o prefixo…"}
        value={q}
        onChange={(e) => setQ(e.target.value)} 
        onFocus={() => { if (q && filtrados.length > 0) setOpen(true) }}
        onBlur={() => setTimeout(() => setOpen(false), 150)} 
        required
        disabled={!!errorLoading} 
      />
       {errorLoading && <div className="text-red-600 text-xs mt-1">{errorLoading}</div>}
      {open && filtrados.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow">
          {filtrados.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={() => aplicar(p)} 
              className="block w-full text-left px-3 py-2 hover:bg-gray-100"
            >
              {/* --- CORREÇÃO AQUI: Usa 'codigo' --- */}
              <div className="text-sm font-medium">{p.codigo}</div> 
              {/* --- FIM CORREÇÃO --- */}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
