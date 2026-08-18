import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

const ThemeContext = createContext();

const THEME_KEY = "meetpoint-theme";

export const ThemeProvider = ({ children }) => {
  // ============================================================
  // INITIAL THEME
  // ============================================================

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem(THEME_KEY) === "dark";
  });

  // ============================================================
  // APPLY THEME TO HTML
  // ============================================================

  useEffect(() => {
    const root = document.documentElement;

    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [darkMode]);

  // ============================================================
  // CROSS-TAB THEME CHANNEL
  // ============================================================

  useEffect(() => {
    // BroadcastChannel allows tabs from the same origin
    // to communicate immediately.
    const channel = new BroadcastChannel("meetpoint-theme-channel");

    // ----------------------------------------------------------
    // RECEIVE FROM ANOTHER TAB
    // ----------------------------------------------------------

    const handleBroadcast = (event) => {
      console.log(
        "🌗 Theme received from another tab:",
        event.data,
      );

      if (event.data === "dark") {
        setDarkMode(true);
      }

      if (event.data === "light") {
        setDarkMode(false);
      }
    };

    channel.addEventListener("message", handleBroadcast);

    // ----------------------------------------------------------
    // STORAGE FALLBACK
    // ----------------------------------------------------------

    const handleStorage = (event) => {
      if (event.key !== THEME_KEY) {
        return;
      }

      console.log(
        "💾 Theme storage event received:",
        event.newValue,
      );

      if (event.newValue === "dark") {
        setDarkMode(true);
      }

      if (event.newValue === "light") {
        setDarkMode(false);
      }
    };

    window.addEventListener("storage", handleStorage);

    // ----------------------------------------------------------
    // CLEANUP
    // ----------------------------------------------------------

    return () => {
      channel.removeEventListener("message", handleBroadcast);
      channel.close();

      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // ============================================================
  // TOGGLE THEME
  // ============================================================

  const toggleDarkMode = () => {
    setDarkMode((previous) => {
      const newDarkMode = !previous;

      const newTheme = newDarkMode ? "dark" : "light";

      // --------------------------------------------------------
      // SAVE TO LOCAL STORAGE
      // --------------------------------------------------------

      localStorage.setItem(THEME_KEY, newTheme);

      // --------------------------------------------------------
      // BROADCAST TO OTHER TABS
      // --------------------------------------------------------

      const channel = new BroadcastChannel(
        "meetpoint-theme-channel",
      );

      channel.postMessage(newTheme);

      channel.close();

      console.log(
        "📡 Theme broadcasted:",
        newTheme,
      );

      return newDarkMode;
    });
  };

  // ============================================================
  // CONTEXT
  // ============================================================

  return (
    <ThemeContext.Provider
      value={{
        darkMode,
        toggleDarkMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// ============================================================
// CUSTOM HOOK
// ============================================================

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used inside ThemeProvider",
    );
  }

  return context;
};
