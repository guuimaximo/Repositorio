import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";

export default function Navbar() {
  const navigate = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "1rem 2rem",
        backgroundColor: "#007bff",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <div>
        <strong style={{ fontSize: "20px" }}>INOVEQUATAI</strong>
      </div>

      <div style={{ display: "flex", gap: "1.5rem" }}>
        <Link
          to="/"
          style={{
            color: "white",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          Dashboard
        </Link>

        <Link
          to="/solicitacao"
          style={{
            color: "white",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          Solicitação de Tratativas
        </Link>

        <Link
          to="/resolucao"
          style={{
            color: "white",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          Central de Resolução
        </Link>

        <button
          onClick={handleLogout}
          style={{
            backgroundColor: "#ff4d4f",
            border: "none",
            padding: "6px 14px",
            borderRadius: "5px",
            color: "white",
            cursor: "pointer",
          }}
        >
          Sair
        </button>
      </div>
    </nav>
  );
}
