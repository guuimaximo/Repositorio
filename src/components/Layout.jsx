import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function Layout() {
  const location = useLocation();
  const hideLayout = location.pathname === "/login";

  return (
    <div className="flex min-h-screen bg-gray-50">
      {!hideLayout && <Sidebar />}
      <div className="flex flex-col flex-1">
        {!hideLayout && <Navbar />}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
