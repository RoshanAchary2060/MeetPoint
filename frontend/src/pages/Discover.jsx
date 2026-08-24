import { Search, ChevronDown } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";

import UserCard from "../components/UserCard";
import Loading from "../components/Loading";
import api from "../api/axios";
import { fetchUser } from "../features/user/usersSlice";

const Discover = () => {
  const [input, setInput] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filter, setFilter] = useState("full_name");
  const [showFilters, setShowFilters] = useState(false);

  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);

  const { getToken } = useAuth();
  const dispatch = useDispatch();

  const filterOptions = [
    {
      value: "full_name",
      label: "Full Name",
    },
    {
      value: "username",
      label: "Username",
    },
    {
      value: "location",
      label: "Location",
    },
    {
      value: "joined_days",
      label: "Joined Days",
    },
  ];

  const selectedFilter = filterOptions.find(
    (option) => option.value === filter,
  );

  const getPlaceholder = () => {
    switch (filter) {
      case "full_name":
        return "Search by full name...";

      case "username":
        return "Search by username...";

      case "location":
        return "Search by location...";

      case "joined_days":
        return "Enter number of days, e.g. 5...";

      default:
        return "Search people...";
    }
  };

  // =========================================================
  // SEARCH PEOPLE
  // =========================================================

  const handleSearch = async (e) => {
    if (e.key !== "Enter") return;

    const trimmedInput = input.trim();

    if (!trimmedInput) {
      toast.error("Please enter something to search");
      return;
    }

    if (filter === "joined_days") {
      const days = Number(trimmedInput);

      if (!Number.isInteger(days) || days < 0) {
        toast.error("Please enter a valid number of days");
        return;
      }
    }

    try {
      setUsers([]);
      setLoading(true);

      const token = await getToken();

      if (!token) {
        toast.error("Authentication token not available");
        return;
      }

      const { data } = await api.post(
        "/api/user/discover",
        {
          filter,
          input: trimmedInput,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      console.log("🔎 Discover search response:", data);

      if (data.success) {
        setUsers(data.users || []);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("❌ Discover search error:", error);

      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to search users",
      );
    } finally {
      setLoading(false);
      setInput("");
    }
  };

  // =========================================================
  // PEOPLE YOU MAY KNOW
  // =========================================================

  const fetchSuggestions = async () => {
    try {
      setSuggestionsLoading(true);

      const token = await getToken();

      if (!token) {
        console.error("❌ No Clerk token available");
        return;
      }

      console.log("✨ Fetching People You May Know...");

      const { data } = await api.get("/api/user/suggestions", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("✨ People You May Know response:", data);
      console.log("✨ Suggested users:", data.users);

      if (data.success) {
        setSuggestions(data.users || []);
      } else {
        console.error("❌ Suggestions API failed:", data.message);
        toast.error(data.message);
      }
    } catch (error) {
      console.error("❌ Suggestions request error:", error);

      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to load suggestions",
      );
    } finally {
      setSuggestionsLoading(false);
    }
  };

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    const loadDiscoverData = async () => {
      try {
        const token = await getToken();

        if (!token) {
          console.error("❌ No authentication token");
          return;
        }

        console.log("👤 Loading current user...");

        dispatch(fetchUser(token));

        await fetchSuggestions();
      } catch (error) {
        console.error("❌ Discover initialization error:", error);
      }
    };

    loadDiscoverData();
  }, [getToken, dispatch]);

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
            Find people by name, username, location, or when they joined
            MeetPoint.
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
            <div
              className="
                flex
                flex-col
                sm:flex-row
                gap-3
              "
            >
              {/* SEARCH INPUT */}

              <div className="relative flex-1">
                <Search
                  className="
                    absolute
                    left-3
                    top-1/2
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
                  onKeyDown={handleSearch}
                  type={filter === "joined_days" ? "number" : "text"}
                  min={filter === "joined_days" ? "0" : undefined}
                  className="
                    pl-10
                    sm:pl-12
                    pr-4
                    py-3
                    w-full
                    border
                    border-gray-300
                    dark:border-slate-700
                    rounded-md

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
                  placeholder={getPlaceholder()}
                />
              </div>

              {/* FILTER */}

              <div className="relative sm:w-48">
                <button
                  type="button"
                  onClick={() => setShowFilters((prev) => !prev)}
                  className="
                    w-full
                    h-full
                    min-h-[46px]
                    px-4
                    flex
                    items-center
                    justify-between
                    gap-3

                    border
                    border-gray-300
                    dark:border-slate-700

                    rounded-md

                    bg-white
                    dark:bg-slate-800

                    text-slate-700
                    dark:text-slate-200

                    hover:bg-slate-50
                    dark:hover:bg-slate-700

                    transition
                  "
                >
                  <span className="truncate">{selectedFilter?.label}</span>

                  <ChevronDown
                    className={`
                      w-4
                      h-4
                      transition-transform
                      ${showFilters ? "rotate-180" : ""}
                    `}
                  />
                </button>

                {showFilters && (
                  <div
                    className="
                      absolute
                      z-20
                      top-full
                      left-0
                      right-0
                      mt-2

                      bg-white
                      dark:bg-slate-800

                      border
                      border-slate-200
                      dark:border-slate-700

                      rounded-md
                      shadow-lg

                      overflow-hidden
                    "
                  >
                    {filterOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setFilter(option.value);
                          setInput("");
                          setShowFilters(false);
                          setUsers([]);
                        }}
                        className={`
                          w-full
                          text-left
                          px-4
                          py-3
                          text-sm
                          transition

                          ${
                            filter === option.value
                              ? `
                                bg-indigo-50
                                dark:bg-indigo-500/10
                                text-indigo-600
                                dark:text-indigo-400
                                font-medium
                              `
                              : `
                                text-slate-700
                                dark:text-slate-200
                                hover:bg-slate-50
                                dark:hover:bg-slate-700
                              `
                          }
                        `}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* JOINED DAYS HELPER */}

            {filter === "joined_days" && (
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Example: entering <strong>5</strong> shows users who joined
                within the last 5 calendar days, including the 5th day.
              </p>
            )}
          </div>
        </div>

        {/* =====================================================
            PEOPLE YOU MAY KNOW
        ===================================================== */}

        {suggestionsLoading && (
          <div className="mb-10">
            <Loading height="220px" />
          </div>
        )}

        {!suggestionsLoading && suggestions.length > 0 && (
          <div className="mb-10">
            <div className="mb-5">
              <h2
                className="
                  text-xl
                  font-bold
                  text-slate-900
                  dark:text-white
                "
              >
                ✨ People You May Know
              </h2>

              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                People connected to your network or from your location
              </p>
            </div>

            <div className="flex flex-wrap gap-6">
              {suggestions.map((user) => (
                <UserCard user={user} key={user._id} />
              ))}
            </div>
          </div>
        )}

        {/* =====================================================
            NO SUGGESTIONS
        ===================================================== */}

        {!suggestionsLoading &&
          suggestions.length === 0 &&
          users.length === 0 &&
          !loading && (
            <div className="mb-10 text-center py-10">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No people you may know right now.
              </p>

              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Suggestions appear when you have mutual connections or people
                from the same location.
              </p>
            </div>
          )}

        {/* =====================================================
            SEARCH RESULTS TITLE
        ===================================================== */}

        {users.length > 0 && (
          <div className="mb-4">
            <h2
              className="
                text-lg
                font-semibold
                text-slate-800
                dark:text-white
              "
            >
              Search Results
            </h2>

            <p className="text-sm text-slate-500 dark:text-slate-400">
              {users.length} {users.length === 1 ? "person" : "people"} found
            </p>
          </div>
        )}

        {/* =====================================================
            SEARCH RESULTS
        ===================================================== */}

        <div className="flex flex-wrap gap-6">
          {users.map((user) => (
            <UserCard user={user} key={user._id} />
          ))}
        </div>

        {/* =====================================================
            SEARCH LOADING
        ===================================================== */}

        {loading && <Loading height="60vh" />}

        {/* =====================================================
            SEARCH EMPTY
        ===================================================== */}

        {!loading &&
          users.length === 0 &&
          input === "" &&
          suggestions.length === 0 &&
          !suggestionsLoading && (
            <div className="text-center py-16">
              <Search
                className="
                  w-10
                  h-10
                  mx-auto
                  mb-4
                  text-slate-300
                  dark:text-slate-700
                "
              />

              <p className="text-slate-500 dark:text-slate-400">
                Search for people to discover new connections.
              </p>
            </div>
          )}
      </div>
    </div>
  );
};

export default Discover;
