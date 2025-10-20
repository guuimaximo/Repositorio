import { NavLink } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Navbar() {
  async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const Item = ({ to, children }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-1 ${isActive ? 'text-sky-600 font-semibold' : 'text-slate-600 hover:text-sky-600'}`
      }
    >
      {children}
    </NavLink>
  )

  return (
    <header className="w-full bg-white border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="text-xl font-bold text-sky-600">INOVEQUATAI</span>
          <Item to="/">Dashboard</Item>
          <Item to="/solicitacao">Solicitação</Item>
          <Item to="/resolucao">Central de Resolução</Item>
          <Item to="/tratativas">Tratativas</Item>
        </div>
        <button
          onClick={logout}
          className="px-3 py-1.5 rounded-md bg-sky-600 text-white hover:opacity-90"
        >
          Sair
        </button>
      </div>
    </header>
  )
}
