import { useEffect, useRef } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Messages from "./pages/Messages";
import Login from "./pages/Login";
import Feed from "./pages/Feed";
import Chatbox from "./pages/Chatbox";
import Connections from "./pages/Connections";
import Discover from "./pages/Discover";
import Profile from "./pages/Profile";
import CreatePost from "./pages/CreatePost";
import Layout from "./pages/Layout";
import CallManager from "./components/CallManager";

import { useUser, useAuth } from "@clerk/clerk-react";
import { Toaster } from "react-hot-toast";
import { useDispatch } from "react-redux";
import { fetchUser } from "./features/user/usersSlice";
import { fetchConnections } from "./features/connections/connectionsSlice";
import { setSSEEvent } from "./features/sse/sseSlice"; // Import Redux action
import { addMessages } from "./features/messages/messagesSlice";

const App = () => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const dispatch = useDispatch();
  const location = useLocation();

  const pathnameRef = useRef(location.pathname);

  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  // Fetch initial user and connections data
  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        const token = await getToken();
        dispatch(fetchUser(token));
        dispatch(fetchConnections(token));
      }
    };
    fetchData();
  }, [user, dispatch, getToken]);

  // Single Consolidated Global SSE Listener
  useEffect(() => {
    if (!user) return;

    const sseUrl = `${import.meta.env.VITE_BASEURL}/api/message/sse/${user.id}`;
    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      console.log(
        "SSE CALLBACK FIRED",
        performance.now(),
        document.visibilityState,
      );

      try {
        const data = JSON.parse(event.data);
        console.log("⚡ SSE Event Received:", data);
        console.log("EVENT TYPE", data.type);

        // 1. Dispatch event to Redux so CallManager catches call signals
        dispatch(setSSEEvent(data));

        // 2. Dispatch real-time chat messages to Redux store
        if (data.type === "NEW_MESSAGE") {
          dispatch(addMessages(data.message));
        }
      } catch (err) {
        console.error("Error parsing SSE data:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE Connection error:", err);
    };

    return () => {
      eventSource.close();
    };
  }, [user, dispatch]);

  return (
    <CallManager>
      <Toaster />
      <Routes>
        <Route path="/" element={!user ? <Login /> : <Layout />}>
          <Route index element={<Feed />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:userId" element={<Chatbox />} />
          <Route path="/connections" element={<Connections />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:profileId" element={<Profile />} />
          <Route path="/create-post" element={<CreatePost />} />
        </Route>
      </Routes>
    </CallManager>
  );
};

export default App;
