import React, { useState } from "react";
import { dummyConnectionsData, dummyUserData } from "../assets/assets";
import { Search } from "lucide-react";
import UserCard from "../components/UserCard";
import Loading from "../components/Loading";
import api from "../api/axios";
import { useAuth } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { fetchUser } from "../features/user/usersSlice";

const Discover = () => {
  const [input, setInput] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const { getToken } = useAuth();

  const handleSearch = async (e) => {
    if (e.key == "Enter") {
      try {
        setUsers([]);
        setLoading(true);

        const { data } = await api.post(
          "/api/user/discover",
          { input },
          {
            headers: {
              Authorization: `Bearer ${await getToken()}`,
            },
          },
        );

        data.success
          ? setUsers(data.users)
          : toast.error(data.message);

        setLoading(false);
        setInput("");
      } catch (error) {
        toast.error(error.message);
      }

      setLoading(false);
    }
  };

  const dispatch = useDispatch();

  useEffect(() => {
    getToken().then((token) => {
      dispatch(fetchUser(token));
    });
  }, []);

  return (
    <div
      className="
        min-h-screen
        bg-gradient-to-b
        from-slate-50
        to-white
        dark:from-slate-950
        dark:to-slate-900
      "
    >
      <div className="max-w-6xl mx-auto p-6">

        {/* =====================================================
            TITLE
        ===================================================== */}

        <div className="mb-8">
          <h1
            className="
              text-3xl
              font-bold
              text-slate-900
              dark:text-white
              mb-2
            "
          >
            Discover People
          </h1>

          <p className="text-slate-500 dark:text-slate-400">
            Connect with amazing people and grow your network
          </p>
        </div>

        {/* =====================================================
            SEARCH
        ===================================================== */}

        <div
          className="
            mb-8
            shadow-md
            rounded-md
            border
            border-slate-200/60
            dark:border-slate-700
            bg-white/80
            dark:bg-slate-900/80
            backdrop-blur
          "
        >
          <div className="p-6">
            <div className="relative">

              <Search
                className="
                  absolute
                  left-3
                  top-1/2
                  transform
                  -translate-y-1/2
                  text-slate-400
                  dark:text-slate-500
                  w-5
                  h-5
                "
              />

              <input
                onChange={(e) => setInput(e.target.value)}
                value={input}
                onKeyUp={handleSearch}
                type="text"
                className="
                  pl-10
                  sm:pl-12
                  py-2
                  w-full
                  border
                  border-gray-300
                  dark:border-slate-700
                  rounded-md
                  max-sm:text-sm

                  bg-white
                  dark:bg-slate-800

                  text-slate-800
                  dark:text-white

                  placeholder:text-slate-400
                  dark:placeholder:text-slate-500

                  focus:outline-none
                  focus:ring-2
                  focus:ring-indigo-500/30
                  focus:border-indigo-500

                  transition
                "
                placeholder="Search people by name, username, bio, or location..."
              />

            </div>
          </div>
        </div>

        {/* =====================================================
            USERS
        ===================================================== */}

        <div className="flex flex-wrap gap-6">
          {users.map((user) => (
            <UserCard
              user={user}
              key={user._id}
            />
          ))}
        </div>

        {/* =====================================================
            LOADING
        ===================================================== */}

        {loading && <Loading height="60vh" />}

      </div>
    </div>
  );
};

export default Discover;
