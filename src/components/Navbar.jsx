import { Link, NavLink, useLocation } from 'react-router-dom'

export default function Navbar() {
  const { pathname } = useLocation()
  const link = ({ isActive }) =>
    `px-3 py-2 rounded-md text-sm font-medium ${
      isActive ? 'text-blue-700 underline' : 'text-gray-700 hover:text-blue-700'
    }`

  return (
    <nav className="bg-white sticky top-0 z-20 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-2xl font-semibold">
          <span role="img" aria-label="bus">🚌</span>
          <span>INOVEQUATAÍ</span>
        </Link>

        <div className="flex items-center gap-4">
          <NavLink to="/" className={link} end>Início</NavLink>
          <NavLink to="/solicitar" className={link}>Solicitar Tratativa</NavLink>
          <NavLink to="/central" className={link}>Central de Tratativas</NavLink>
        </div>
      </div>
      {/* linha fina para separar quando há navbar fixa */}
      <div className="h-px w-full bg-gray-100" />
    </nav>
  )
}
