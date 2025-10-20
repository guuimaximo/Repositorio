import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import CardIndicador from '../components/CardIndicador'

export default function Dashboard() {
  const [stats, setStats] = useState({ pend: 0, andamento: 0, concl: 0, total: 0 })

  useEffect(() => {
    async function load() {
      const q1 = supabase.from('tratativas').select('*', { count: 'exact', head: true })
      const qPend = supabase.from('tratativas').select('*', { count: 'exact', head: true }).eq('status','pendente')
      const qAnd = supabase.from('tratativas').select('*', { count: 'exact', head: true }).eq('status','em_andamento')
      const qCon = supabase.from('tratativas').select('*', { count: 'exact', head: true }).eq('status','concluida')

      const [t1, t2, t3, t4] = await Promise.all([q1, qPend, qAnd, qCon])
      setStats({
        total: t1.count ?? 0,
        pend: t2.count ?? 0,
        andamento: t3.count ?? 0,
        concl: t4.count ?? 0
      })
    }
    load()
  }, [])

  return (
    <div className="max-w-6xl mx-auto p-4 grid gap-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <CardIndicador title="Pendentes" value={stats.pend} />
        <CardIndicador title="Em andamento" value={stats.andamento} />
        <CardIndicador title="Concluídas" value={stats.concl} />
        <CardIndicador title="Total" value={stats.total} />
      </div>
      <div className="bg-white border rounded-xl p-4">
        <div className="text-slate-600">Bem-vindo ao painel do INOVEQUATAI. Use o menu para acessar as tratativas.</div>
      </div>
    </div>
  )
}
