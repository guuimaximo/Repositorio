import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Navbar() {
  const loc = useLocation()
  async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }
  const active = (p) => loc.pathname === p ? 'text-sky-600 font-semibold' : 'text-slate-600'

  return (
    <div className="w-full bg-white border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="text-xl font-bold text-sky-600">INOVEQUATAI</span>
          <Link className={active('/')} to="/">Dashboard</Link>
          <Link className={active('/tratativas')} to="/tratativas">Tratativas</Link>
        </div>
        <button onClick={logout} className="px-3 py-1.5 rounded-md bg-sky-600 text-white hover:opacity-90">
          Sair
        </button>
      </div>
    </div>
  )
}
