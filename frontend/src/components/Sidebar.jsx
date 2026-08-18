import React from "react";
import { Link, useNavigate } from "react-router-dom";
import MenuItems from "./MenuItems";
import { assets } from "../assets/assets";
import { CirclePlus, LogOut, Sun, Moon } from "lucide-react";
import { UserButton, useClerk } from "@clerk/clerk-react";
import { useSelector } from "react-redux";
import { useTheme } from "../context/themeContext.jsx";

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const navigate = useNavigate();

  const user = useSelector((state) => state.user.value);

  const { signOut } = useClerk();

  const { darkMode, toggleDarkMode } = useTheme();

  return (
    <div
      className={`
        w-60 xl:w-72
        h-screen
        bg-white dark:bg-slate-900
        border-r border-gray-200 dark:border-slate-800
        flex flex-col
        max-sm:absolute
        top-0
        bottom-0
        z-20
        ${sidebarOpen ? "translate-x-0" : "max-sm:-translate-x-full"}
        transition-all
        duration-300
        ease-in-out
      `}
    >
      {/* =====================================================
          TOP / NAVIGATION
      ===================================================== */}

      <div className="flex-1 w-full overflow-y-auto">
        {/* LOGO + THEME TOGGLE */}

        <div className="flex items-center justify-between px-5 py-2">
          <img
            onClick={() => navigate("/")}
            src={assets.logo}
            alt="MeetPoint"
            className="w-26 cursor-pointer"
          />

          <button
            onClick={toggleDarkMode}
            className="
              w-9
              h-9
              rounded-full
              flex
              items-center
              justify-center
              bg-slate-100
              dark:bg-slate-800
              text-slate-600
              dark:text-yellow-400
              hover:bg-slate-200
              dark:hover:bg-slate-700
              transition
              active:scale-90
            "
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
        </div>

        <hr className="mb-8 border-gray-300 dark:border-slate-800" />

        {/* NAVIGATION */}

        <MenuItems setSidebarOpen={setSidebarOpen} />

        {/* CREATE POST */}

        <Link
          to="/create-post"
          className="
            flex
            items-center
            justify-center
            gap-2
            py-2.5
            mt-6
            mx-6
            rounded-lg
            bg-gradient-to-r
            from-indigo-500
            to-purple-600
            hover:from-indigo-700
            hover:to-purple-800
            active:scale-95
            transition
            text-white
            cursor-pointer
          "
        >
          <CirclePlus className="w-5 h-5" />
          Create Post
        </Link>
      </div>

      {/* =====================================================
          FIXED BOTTOM USER AREA
      ===================================================== */}

      <div
        className="
          w-full
          shrink-0
          border-t
          border-gray-200
          dark:border-slate-800
          bg-white
          dark:bg-slate-900
          px-5
          py-3
        "
      >
        <div className="flex items-center gap-2">
          {/* USER AVATAR */}

          <UserButton />

          {/* USER INFO */}

          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-medium text-slate-800 dark:text-white truncate">
              {user?.full_name}
            </h1>

            <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
              @{user?.username}
            </p>
          </div>

          {/* LOGOUT */}

          <button
            onClick={signOut}
            className="
              w-9
              h-9
              rounded-full
              flex
              items-center
              justify-center
              text-gray-400
              dark:text-slate-500
              hover:text-red-500
              hover:bg-red-50
              dark:hover:bg-red-950/30
              transition
              cursor-pointer
              shrink-0
            "
            title="Logout"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
