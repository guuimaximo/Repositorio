// src/components/CampoMotorista.jsx
import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabase'

export default function CampoMotorista({ label = 'Motorista', onSelect, initialValue = '' }) {
  const [busca, setBusca] = useState(initialValue)
  const [sugestoes, setSugestoes] = useState([])
  const [mostrar, setMostrar] = useState(false)
  const boxRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setMostrar(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!busca || busca.trim().length < 2) {
      setSugestoes([])
      return
    }
    timerRef.current = setTimeout(() => buscar(busca.trim()), 180)
  }, [busca])

  async function buscar(valor) {
    const { data, error } = await supabase
      .from('motoristas')
      .select('chapa,nome')
      .or(`nome.ilike.%${valor}%,chapa.ilike.%${valor}%`)
      .order('nome', { ascending: true })
      .limit(12)
    if (!error) setSugestoes(data || [])
  }

  function escolher(m) {
    setBusca(`${m.nome} (${m.chapa})`)
    setMostrar(false)
    onSelect?.(m) // {chapa, nome}
  }

  return (
    <div className="relative" ref={boxRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        value={busca}
        onChange={(e) => {
          setBusca(e.target.value)
          setMostrar(true)
        }}
        className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
        placeholder="Digite nome ou chapa..."
      />
      {mostrar && sugestoes.length > 0 && (
        <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow max-h-64 overflow-auto">
          {sugestoes.map((m) => (
            <li
              key={m.chapa}
              onClick={() => escolher(m)}
              className="p-2 hover:bg-blue-50 cursor-pointer"
            >
              <span className="font-semibold">{m.nome}</span>{' '}
              <span className="text-gray-500">— {m.chapa}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
