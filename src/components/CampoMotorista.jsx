// src/components/CampoPrefixo.jsx
// (Baseado no seu CampoMotorista.jsx - Busca na tabela 'prefixos')

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
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)

  // 1. Carrega todos os prefixos (da tabela 'prefixos')
  useEffect(() => {
    (async () => {
      // Suposição: coluna 'codigo_prefixo'
      const { data, error } = await supabase
        .from('prefixos') 
        .select('id, codigo') 
        .order('codigo', { ascending: true })
      if (!error && data) setTodos(data)
    })()
  }, [])

  // 2. Abre o dropdown se houver texto
  useEffect(() => {
    if (!q) return setOpen(false)
    setOpen(true)
  }, [q])

  // 3. Filtra os prefixos
  const filtrados = useMemo(() => {
    const s = (q || '').trim().toLowerCase()
    if (!s) return []
    return todos
      .filter(
        (p) =>
          String(p.codigo).toLowerCase().startsWith(s)
      )
      .slice(0, 8)
  }, [q, todos])

  // 4. Aplica a seleção
  function aplicar(p) {
    onChange?.(p.codigo) // Retorna a string do prefixo
    setQ(p.codigo) // Define o texto do input
    setOpen(false)
  }

  // 5. Sincroniza o input (se o valor 'value' for alterado por fora)
  useEffect(() => {
    if (!value) return
    setQ(value)
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
        onBlur={() => setTimeout(() => setOpen(false), 150)} 
        required
      />
      {open && filtrados.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow">
          {filtrados.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={() => aplicar(p)} 
              className="block w-full text-left px-3 py-2 hover:bg-gray-100"
            >
              <div className="text-sm font-medium">{p.codigo}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
