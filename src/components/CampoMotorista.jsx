import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'

/**
 * props:
 *  - value: { chapa, nome }
 *  - onChange: (novo) => void
 *  - label?: string
 */
export default function CampoMotorista({ value, onChange, label = 'Motorista' }) {
  const [todos, setTodos] = useState([])
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('motoristas')
        .select('chapa, nome')
        .order('nome', { ascending: true })
      if (!error && data) setTodos(data)
    })()
  }, [])

  useEffect(() => {
    if (!q) return setOpen(false)
    setOpen(true)
  }, [q])

  const filtrados = useMemo(() => {
    const s = (q || '').trim().toLowerCase()
    if (!s) return []
    return todos
      .filter(
        (m) =>
          String(m.chapa).toLowerCase().startsWith(s) ||
          (m.nome || '').toLowerCase().includes(s)
      )
      .slice(0, 8)
  }, [q, todos])

  function aplicar(m) {
    onChange?.({ chapa: String(m.chapa), nome: m.nome })
    setQ(`${m.chapa} - ${m.nome}`)
    setOpen(false)
  }

  // manter input sincronizado quando value vem pronto
  useEffect(() => {
    if (!value) return
    const texto = [value.chapa, value.nome].filter(Boolean).join(' - ')
    setQ(texto)
  }, [value])

  return (
    <div className="relative">
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <input
        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Digite a chapa ou nome…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => { if (q) setOpen(true) }}
        onBlur={() => setTimeout(() => setOpen(false), 150)} // Adicionado onBlur
      />
      {open && filtrados.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow">
          {filtrados.map((m) => (
            <button
              key={m.chapa}
              type="button"
              onMouseDown={() => aplicar(m)} // Adicionado onMouseDown
              className="block w-full text-left px-3 py-2 hover:bg-gray-100"
            >
              <div className="text-sm font-medium">{m.nome}</div>
              <div className="text-xs text-gray-500">Chapa: {m.chapa}</div>
            </button>
          ))}
        </div>
      )}
