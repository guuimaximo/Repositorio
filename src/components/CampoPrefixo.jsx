// src/components/CampoPrefixo.jsx
// (Código corrigido, simplificado para ser igual ao CampoMotorista)

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'

/**
 * props:
 * - value: string (o prefixo selecionado)
 * - onChange: (novoPrefixo) => void
 * - label?: string
 */
export default function CampoPrefixo({ value, onChange, label = 'Prefixo' }) {
  const [todos, setTodos] = useState([])
  const [q, setQ] = useState(value || '')
  const [open, setOpen] = useState(false)

  // 1. Carrega todos os prefixos (da tabela 'prefixos')
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('prefixos')
        .select('id, codigo_prefixo') // Suposição: coluna 'codigo_prefixo'
        .order('codigo_prefixo', { ascending: true })
      if (!error && data) setTodos(data)
    })()
  }, [])

  // 2. Abre o dropdown se houver texto (lógica igual ao CampoMotorista)
  useEffect(() => {
    if (!q) return setOpen(false)
    setOpen(true)
  }, [q])

  // 3. Filtra os prefixos (lógica igual ao CampoMotorista)
  const filtrados = useMemo(() => {
    const s = (q || '').trim().toLowerCase()
    if (!s) return []
    return todos
      .filter(
        (p) =>
          String(p.codigo_prefixo).toLowerCase().startsWith(s)
      )
      .slice(0, 8)
  }, [q, todos])

  // 4. Aplica a seleção
  function aplicar(p) {
    onChange?.(p.codigo_prefixo)
    setQ(p.codigo_prefixo)
    setOpen(false)
  }

  // 5. Sincroniza o input (lógica igual ao CampoMotorista)
  useEffect(() => {
    setQ(value || '')
  }, [value])

  return (
    <div className="relative">
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <input
        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Digite o prefixo…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => { if (q) setOpen(true) }}
        onBlur={() => setTimeout(() => setOpen(false), 150)} // Fecha ao perder foco
        required
      />
      {open && filtrados.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow">
          {filtrados.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={() => aplicar(p)} // Previne o 'onBlur' de fechar
              className="block w-full text-left px-3 py-2 hover:bg-gray-100"
            >
              <div className="text-sm font-medium">{p.codigo_prefixo}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
