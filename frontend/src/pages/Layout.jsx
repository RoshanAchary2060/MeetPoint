import React from "react";
import Sidebar from "../components/Sidebar.jsx";
import { Outlet } from "react-router-dom";
import { Menu, X } from "lucide-react";
import Loading from "../components/Loading";
import { useSelector } from "react-redux";

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  const user = useSelector((state) => state.user.value);

  return user ? (
    <div className="flex w-full h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* =====================================================
          SIDEBAR
      ===================================================== */}
      <div className="h-full shrink-0">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      </div>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}
      <main className="flex-1 min-w-0 h-full overflow-hidden bg-slate-50 dark:bg-slate-950">
        <Outlet />
      </main>

      {/* =====================================================
          MOBILE SIDEBAR BUTTON
      ===================================================== */}

      {sidebarOpen ? (
        <X
          className="
            fixed
            top-3
            right-3
            p-2
            z-[100]
            bg-white
            dark:bg-slate-800
            rounded-md
            shadow
            w-10
            h-10
            text-gray-600
            dark:text-slate-200
            sm:hidden
            cursor-pointer
          "
          onClick={() => setSidebarOpen(false)}
        />
      ) : (
        <Menu
          className="
            fixed
            top-3
            right-3
            p-2
            z-[100]
            bg-white
            dark:bg-slate-800
            rounded-md
            shadow
            w-10
            h-10
            text-gray-600
            dark:text-slate-200
            sm:hidden
            cursor-pointer
          "
          onClick={() => setSidebarOpen(true)}
        />
      )}
    </div>
  ) : (
    <Loading />
  );
};

export default Layout;
