import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { Outlet, useLocation } from "react-router-dom";

export default function Layout() {
  const location = useLocation();
  const hideNavbarPaths = ["/login"]; // onde o Navbar e Sidebar não aparecem

  const hideNavbar = hideNavbarPaths.includes(location.pathname);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {!hideNavbar && <Sidebar />}
      <div className="flex-1 flex flex-col">
        {!hideNavbar && <Navbar />}
        <main className="flex-1 p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
