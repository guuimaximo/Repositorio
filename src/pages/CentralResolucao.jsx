import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'

const corStatus = (s) => s === 'Concluído' ? 'bg-green-100 text-green-700'
  : s === 'Em andamento' ? 'bg-amber-100 text-amber-700'
  : 'bg-yellow-100 text-yellow-700'

export default function CentralResolucao() {
  const [lista, setLista] = useState([])
  const [imgs, setImgs] = useState({})
  const [filtroStatus, setFiltroStatus] = useState('Todos')
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)

  async function carregar() {
    setLoading(true)
    const { data, error } = await supabase
      .from('tratativas')
      .select('id, motorista, tipo, prioridade, status, setor_origem, descricao, criado_em, created_by_email')
      .order('criado_em', { ascending: false })
    if (!error) setLista(data || [])

    // pega imagens por tratativa em lote
    if (data?.length) {
      const ids = data.map(d=>d.id)
      const { data: imgsAll } = await supabase
        .from('tratativa_imagens')
        .select('tratativa_id, url')
        .in('tratativa_id', ids)
      const map = {}
      imgsAll?.forEach(i => {
        map[i.tratativa_id] = (map[i.tratativa_id] || []).concat(i.url)
      })
      setImgs(map)
    } else {
      setImgs({})
    }
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  const filtrados = useMemo(() => {
    let arr = [...lista]
    if (filtroStatus !== 'Todos') arr = arr.filter(x => x.status === filtroStatus)
    if (busca.trim()) {
      const t = busca.toLowerCase()
      arr = arr.filter(x =>
        (x.motorista||'').toLowerCase().includes(t) ||
        (x.tipo||'').toLowerCase().includes(t) ||
        (x.setor_origem||'').toLowerCase().includes(t)
      )
    }
    return arr
  }, [lista, filtroStatus, busca])

  async function mudarStatus(id, atual, novo) {
    if (atual === novo) return
    const { error } = await supabase.from('tratativas').update({ status: novo }).eq('id', id)
    if (!error) {
      // registra histórico
      const u = await supabase.auth.getUser()
      await supabase.from('tratativa_historico').insert({
        tratativa_id: id, status_de: atual, status_para: novo, user_email: u.data.user?.email || null
      })
      // atualiza a lista local
      setLista(prev => prev.map(r => r.id === id ? { ...r, status: novo } : r))
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-4 grid gap-4">
      <div className="bg-white border rounded-xl p-4">
        <div className="flex gap-3 items-center">
          <input className="border rounded-md px-3 py-2 w-64" placeholder="Buscar motorista/tipo/setor" value={busca} onChange={e=>setBusca(e.target.value)} />
          <select className="border rounded-md px-3 py-2" value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)}>
            <option>Todos</option>
            <option>Pendente</option>
            <option>Em andamento</option>
            <option>Concluído</option>
          </select>
          <button onClick={carregar} className="ml-auto px-3 py-2 rounded-md border">Atualizar</button>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-2">Motorista</th>
              <th>Tipo</th>
              <th>Prioridade</th>
              <th>Setor origem</th>
              <th>Status</th>
              <th>Imagens</th>
              <th>Abertura</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="py-8 text-center text-slate-400">Carregando...</td></tr>
            ) : filtrados.length ? (
              filtrados.map(r=>(
                <tr key={r.id} className="border-t align-top">
                  <td className="py-2">{r.motorista}</td>
                  <td>{r.tipo}</td>
                  <td className="capitalize">{r.prioridade}</td>
                  <td>{r.setor_origem}</td>
                  <td>
                    <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-md ${corStatus(r.status)}`}>
                      <span>{r.status}</span>
                      <select
                        className="border rounded px-1 py-0.5 bg-white text-slate-700"
                        value={r.status}
                        onChange={e=>mudarStatus(r.id, r.status, e.target.value)}
                      >
                        <option>Pendente</option>
                        <option>Em andamento</option>
                        <option>Concluído</option>
                      </select>
                    </div>
                  </td>
                  <td>
                    <div className="flex gap-2 flex-wrap max-w-64">
                      {(imgs[r.id] || []).map((u, i)=>(
                        <a key={i} href={u} target="_blank" rel="noreferrer">
                          <img src={u} alt="img" className="w-16 h-16 object-cover rounded-md border" />
                        </a>
                      ))}
                      {(!imgs[r.id] || imgs[r.id].length===0) && <span className="text-slate-400">—</span>}
                    </div>
                  </td>
                  <td title={r.descricao || ''}>{new Date(r.criado_em).toLocaleString('pt-BR')}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="7" className="py-8 text-center text-slate-400">Nenhuma tratativa encontrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
