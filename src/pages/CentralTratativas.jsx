import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { FaSync, FaSearch } from 'react-icons/fa'

export default function CentralTratativas() {
  const nav = useNavigate()
  const [lista, setLista] = useState([])
  const [filtro, setFiltro] = useState({
    q: '',
    de: '',
    ate: '',
    setor: '',
    status: '',
  })

  async function carregar() {
    let query = supabase.from('tratativas').select('*').order('created_at', { ascending: false })

    if (filtro.q) {
      // busca textual básica (nome, chapa, descricao)
      query = query.ilike('motorista_nome', `%${filtro.q}%`)
        .or(`motorista_chapa.ilike.%${filtro.q}%,descricao.ilike.%${filtro.q}%`)
    }
    if (filtro.de) query = query.gte('created_at', `${filtro.de}T00:00:00`)
    if (filtro.ate) query = query.lte('created_at', `${filtro.ate}T23:59:59`)
    if (filtro.setor) query = query.eq('setor_origem', filtro.setor)
    if (filtro.status) query = query.eq('status', filtro.status)

    const { data } = await query
    setLista(data || [])
  }

  useEffect(() => { carregar() }, []) // inicial
  useEffect(() => { carregar() }, [JSON.stringify(filtro)]) // re-carrega em filtro

  const setores = useMemo(() => {
    return [...new Set(lista.map(l => l.setor_origem).filter(Boolean))].sort()
  }, [lista])

  const status = ['Pendente', 'Concluída', 'Atrasada']

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <h2 className="font-semibold mb-3">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div className="col-span-2">
            <label className="block text-sm text-gray-600 mb-1">Buscar</label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                className="w-full pl-9 rounded-md border px-3 py-2"
                placeholder="nome, chapa, descrição…"
                value={filtro.q}
                onChange={(e) => setFiltro({ ...filtro, q: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">De</label>
            <input type="date" className="w-full rounded-md border px-3 py-2"
              value={filtro.de} onChange={e => setFiltro({ ...filtro, de: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Até</label>
            <input type="date" className="w-full rounded-md border px-3 py-2"
              value={filtro.ate} onChange={e => setFiltro({ ...filtro, ate: e.target.value })} />
          </div>

          <div className="flex gap-2">
            <select
              className="w-full rounded-md border px-3 py-2"
              value={filtro.setor}
              onChange={e => setFiltro({ ...filtro, setor: e.target.value })}
            >
              <option value="">Setor</option>
              {setores.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select
              className="w-full rounded-md border px-3 py-2"
              value={filtro.status}
              onChange={e => setFiltro({ ...filtro, status: e.target.value })}
            >
              <option value="">Status</option>
              {status.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-3">
          <button
            onClick={() => { setFiltro({ q: '', de: '', ate: '', setor: '', status: '' }) }}
            className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-sm"
          >
            <FaSync /> Limpar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-blue-700 text-white">
            <tr>
              <th className="px-4 py-3 text-left">Motorista</th>
              <th className="px-4 py-3 text-left">Ocorrência</th>
              <th className="px-4 py-3 text-left">Prioridade</th>
              <th className="px-4 py-3 text-left">Setor</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Imagem</th>
              <th className="px-4 py-3 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((t) => (
              <tr key={t.id} className="odd:bg-white even:bg-gray-50">
                <td className="px-4 py-3">{t.motorista_nome || t.motorista_chapa}</td>
                <td className="px-4 py-3">{t.tipo_ocorrencia || t.tipo}</td>
                <td className="px-4 py-3">{t.prioridade || '-'}</td>
                <td className="px-4 py-3">{t.setor_origem || '-'}</td>
                <td className="px-4 py-3">
                  {t.status === 'Pendente' && <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-700">Pendente</span>}
                  {(t.status === 'Concluída' || t.status === 'Resolvido' || t.status === 'Concluida') &&
                    <span className="px-2 py-1 rounded bg-green-100 text-green-700">Resolvido</span>}
                </td>
                <td className="px-4 py-3">
                  {t.imagem_url ? (
                    <img src={t.imagem_url} alt="" className="h-12 w-12 object-cover rounded" />
                  ) : <span className="text-gray-400">Sem imagem</span>}
                </td>
                <td className="px-4 py-3">
                  {t.status === 'Pendente' ? (
                    <button
                      onClick={() => nav(`/tratar/${t.id}`)}
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700"
                    >
                      Tratar
                    </button>
                  ) : (
                    <button
                      onClick={() => nav(`/consultar/${t.id}`)}
                      className="rounded-md bg-gray-700 px-3 py-1.5 text-white hover:bg-gray-800"
                    >
                      Consultar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {lista.length === 0 && (
          <div className="p-6 text-center text-gray-500">Nenhuma tratativa encontrada.</div>
        )}
      </div>
    </div>
  )
}
