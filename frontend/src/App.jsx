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
import Pusher from "pusher-js";

import { useUser, useAuth } from "@clerk/clerk-react";
import { Toaster } from "react-hot-toast";
import { useDispatch } from "react-redux";
import { fetchUser } from "./features/user/usersSlice";
import { fetchConnections } from "./features/connections/connectionsSlice";
import { setSSEEvent } from "./features/sse/sseSlice"; // Import Redux action
import { addMessages } from "./features/messages/messagesSlice";
import Post from "./pages/Post.jsx";

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

  // ...inside App component...

  useEffect(() => {
    if (!user) return;
    let pusherClient;
    let channel;

    const connectPusher = async () => {
      const token = await getToken();

      pusherClient = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
        cluster: import.meta.env.VITE_PUSHER_CLUSTER,
        authEndpoint: `${import.meta.env.VITE_BASEURL}/api/pusher/auth`,
        auth: {
          headers: { Authorization: `Bearer ${token}` },
        },
      });

      channel = pusherClient.subscribe(`private-user-${user.id}`);

      channel.bind("app-event", (data) => {
        if (data.type === "NEW_MESSAGE") {
          const senderId =
            data.message.from_user_id?._id || data.message.from_user_id;
          if (pathnameRef.current === `/messages/${senderId}`) {
            dispatch(addMessages(data.message));
          } else {
            dispatch(setSSEEvent(data));
          }
        } else {
          dispatch(setSSEEvent(data));
        }
      });

      pusherClient.connection.bind("connected", () => {
        console.log("✅ Pusher CONNECTED");
      });

      pusherClient.connection.bind("error", (err) => {
        console.log("❌ Pusher error", err);
      });
    };

    connectPusher();

    return () => {
      if (channel) channel.unbind_all();
      if (pusherClient) pusherClient.disconnect();
    };
  }, [user, dispatch]);

  return (
    <CallManager>
      <Toaster />
      {/* <Routes>
        <Route path="/" element={!user ? <Login /> : <Layout />}>
          <Route index element={<Feed />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:userId" element={<Chatbox />} />
          <Route path="/connections" element={<Connections />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:profileId" element={<Profile />} />
          <Route path="/create-post" element={<CreatePost />} />
          <Route path="/post/:postId" element={<Post />} />
        </Route>
      </Routes>*/}

      <Routes>
        {/* Public Post Route */}
        <Route path="/post/:postId" element={<Post />} />

        {/* Protected Routes */}
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
