// src/components/CampoPrefixo.jsx
// (Correção no useMemo e verificação da consulta)

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'

export default function CampoPrefixo({ value, onChange, label = 'Prefixo' }) {
  const [todos, setTodos] = useState([])
  const [q, setQ] = useState('') // Inicia como string vazia
  const [open, setOpen] = useState(false)
  const [errorLoading, setErrorLoading] = useState(null); // Para mostrar erro de carregamento

  // 1. Carrega todos os prefixos
  useEffect(() => {
    setErrorLoading(null); // Limpa erro anterior
    (async () => {
      // Confirme se o nome da tabela 'prefixos' e coluna 'codigo_prefixo' estão corretos
      const { data, error } = await supabase
        .from('prefixos') 
        .select('id, codigo_prefixo') 
        .order('codigo_prefixo', { ascending: true }); // A ordenação pode causar o erro 400 se a coluna não existir

      if (error) {
        console.error("Erro ao buscar prefixos:", error);
        setErrorLoading("Falha ao carregar prefixos. Verifique o console.");
        setTodos([]); // Garante que 'todos' seja um array vazio em caso de erro
      } else {
        setTodos(data || []);
      }
    })()
  }, [])

  // 2. Abre o dropdown se houver texto
  useEffect(() => {
    // Garante que q seja string antes de verificar
    if (!String(q || '')) {
      setOpen(false);
      return;
    }
    // Abre apenas se houver resultados filtrados
    setOpen(filtrados.length > 0); 
  }, [q]) // Removido 'filtrados' da dependência para evitar loops

  // 3. Filtra os prefixos
  const filtrados = useMemo(() => {
    // --- CORREÇÃO AQUI ---
    // Garante que 'q' seja tratado como string
    const s = String(q || '').trim().toLowerCase(); 
    // --- FIM CORREÇÃO ---
    if (!s) return [];
    
    // Garante que 'todos' seja um array antes de filtrar
    if (!Array.isArray(todos)) return []; 

    return todos
      .filter(
        (p) =>
          // Garante que 'codigo_prefixo' seja tratado como string
          String(p.codigo_prefixo || '').toLowerCase().startsWith(s)
      )
      .slice(0, 8)
  }, [q, todos])

  // 4. Aplica a seleção
  function aplicar(p) {
    onChange?.(p.codigo_prefixo);
    setQ(p.codigo_prefixo);
    setOpen(false);
  }

  // 5. Sincroniza o input
  useEffect(() => {
    // Define como string vazia se 'value' for null/undefined
    setQ(String(value || '')); 
  }, [value])

  return (
    <div className="relative">
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <input
        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={errorLoading ? "Erro ao carregar" : "Digite o prefixo…"}
        value={q}
        onChange={(e) => setQ(e.target.value)} // Atualiza 'q' diretamente
        onFocus={() => { if (q && filtrados.length > 0) setOpen(true) }}
        onBlur={() => setTimeout(() => setOpen(false), 150)} 
        required
        disabled={!!errorLoading} // Desabilita se houver erro no carregamento
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
              <div className="text-sm font-medium">{p.codigo_prefixo}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
