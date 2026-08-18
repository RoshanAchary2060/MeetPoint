import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import store from "./app/store.js";
import { ClerkProvider } from "@clerk/clerk-react";
import { CallProvider } from "./context/callContext.jsx";
import { ThemeProvider } from "./context/ThemeContext";

createRoot(document.getElementById("root")).render(
  <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
    <ThemeProvider>
      <BrowserRouter>
        <Provider store={store}>
          <CallProvider>
            <App />
          </CallProvider>
        </Provider>
      </BrowserRouter>
    </ThemeProvider>
  </ClerkProvider>,
);
