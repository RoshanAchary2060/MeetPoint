import { useEffect, useRef } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useDispatch } from "react-redux";
import { Toaster } from "react-hot-toast";

import Messages from "./pages/Messages";
import Login from "./pages/Login";
import Feed from "./pages/Feed";
import Chatbox from "./pages/Chatbox";
import Connections from "./pages/Connections";
import Discover from "./pages/Discover";
import Profile from "./pages/Profile";
import CreatePost from "./pages/CreatePost";
import Layout from "./pages/Layout";
import Post from "./pages/Post";
import MeetPointAI from "./components/MeetPointAI";

import CallManager from "./components/CallManager";
import socket from "./socket/socket";

import { fetchUser } from "./features/user/usersSlice";
import { fetchConnections } from "./features/connections/connectionsSlice";
import { setSSEEvent } from "./features/sse/sseSlice";
import { addMessages } from "./features/messages/messagesSlice";
import { addRecentMessage } from "./features/recentMessages/recentMessagesSlice.js";
import { updatePost } from "./features/posts/postSlice.js";

const App = () => {
  const { user } = useUser();
  const { getToken } = useAuth();

  const dispatch = useDispatch();
  const location = useLocation();

  const pathnameRef = useRef(location.pathname);

  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  // Initial user data fetching
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      const token = await getToken();
      dispatch(fetchUser(token));
      dispatch(fetchConnections(token));
    };

    fetchData();
  }, [user, getToken, dispatch]);

  // ==========================
  // SOCKET.IO LIFECYCLE
  // ==========================
  useEffect(() => {
    if (!user) {
      if (socket.connected) socket.disconnect();
      return;
    }

    // Connect & Register
    if (!socket.connected) {
      socket.connect();
    } else {
      socket.emit("register", user.id);
    }

    const onConnect = () => {
      console.log("🟢 Socket Connected:", socket.id);
      socket.emit("register", user.id);
    };

    const onIncomingCall = (data) => {
      dispatch(
        setSSEEvent({
          type: "INCOMING_AUDIO_CALL",
          from_user_id: data.callerId,
          caller: data.caller,
        }),
      );
    };

    const onCallRinging = () => {
      dispatch(setSSEEvent({ type: "CALL_RINGING" }));
    };

    const onPostLiked = (updatedPost) => {
      console.log("❤️ POST_LIKED received:", updatedPost);

      dispatch(updatePost(updatedPost));
    };

    const onCallAccepted = () => {
      dispatch(setSSEEvent({ type: "CALL_ACCEPTED" }));
    };

    const onCallRejected = () => {
      dispatch(setSSEEvent({ type: "CALL_REJECTED" }));
    };

    const onOffer = ({ offer }) => {
      dispatch(setSSEEvent({ type: "WEBRTC_OFFER", offer }));
    };

    const onAnswer = ({ answer }) => {
      dispatch(setSSEEvent({ type: "WEBRTC_ANSWER", answer }));
    };

    const onIce = ({ candidate }) => {
      dispatch(setSSEEvent({ type: "WEBRTC_ICE_CANDIDATE", candidate }));
    };

    const onEnd = () => {
      dispatch(setSSEEvent({ type: "CALL_ENDED" }));
    };

    const onOffline = () => {
      dispatch(setSSEEvent({ type: "CALL_RECEIVER_OFFLINE" }));
    };

    const onConnectionRequestReceived = (data) => {
      dispatch(
        setSSEEvent({
          type: "CONNECTION_REQUEST_RECEIVED",
          fromUser: data.fromUser,
        }),
      );
    };

    const onNewFollowerReceived = (data) => {
      dispatch(
        setSSEEvent({
          type: "NEW_FOLLOWER_RECEIVED",
          follower: data.follower,
        }),
      );
    };

    const onRelationshipUpdate = () => {
      dispatch(
        setSSEEvent({
          type: "RELATIONSHIP_UPDATE",
        }),
      );
    };

    // Attach listeners
    socket.on("connect", onConnect);
    socket.on("incoming-call", onIncomingCall);
    socket.on("call-ringing", onCallRinging);
    socket.on("call-accepted", onCallAccepted);
    const onCallCancelled = () => {
      dispatch(
        setSSEEvent({
          type: "CALL_CANCELLED",
        }),
      );
    };

    // Attach listener:
    socket.on("call-cancelled", onCallCancelled);
    socket.on("call-rejected", onCallRejected);
    socket.on("webrtc-offer", onOffer);
    socket.on("webrtc-answer", onAnswer);
    socket.on("ice-candidate", onIce);
    socket.on("call-ended", onEnd);
    socket.on("user-offline", onOffline);
    socket.on("connection-request-received", onConnectionRequestReceived);
    socket.on("new-follower-received", onNewFollowerReceived);
    socket.on("relationship-update", onRelationshipUpdate);
    socket.on("POST_LIKED", onPostLiked);
    const onPostUpdated = (updatedPost) => {
      console.log("📢 POST UPDATED FROM SERVER:", updatedPost);

      dispatch(updatePost(updatedPost));
    };

    const onCommentUpdated = (data) => {
      console.log("💬 COMMENT UPDATED FROM SERVER:", data);

      // Update post in Redux so comments_count changes everywhere
      dispatch(updatePost(data.post));
    };
    socket.on("post-updated", onPostUpdated);

    socket.on("comment-updated", onCommentUpdated);

    const onNewMessage = (message) => {
      console.log("📩 Incoming real-time message received:", message);

      // --------------------------------------------------
      // CHAT MESSAGES
      // --------------------------------------------------

      dispatch(addMessages(message));

      // --------------------------------------------------
      // RECENT MESSAGES
      // --------------------------------------------------

      dispatch(
        addRecentMessage({
          message,
          incrementUnread: true,
        }),
      );

      // --------------------------------------------------
      // CALL HISTORY
      // --------------------------------------------------

      if (message.message_type === "call") {
        return;
      }

      // --------------------------------------------------
      // NORMAL MESSAGE NOTIFICATION
      // --------------------------------------------------

      dispatch(
        setSSEEvent({
          type: "NEW_MESSAGE",
          message,
        }),
      );
    };

    // Attach socket listener
    socket.on("new-message", onNewMessage);

    // Cleanup listeners & disconnect socket on unmount/logout
    return () => {
      socket.off("connect", onConnect);
      socket.off("incoming-call", onIncomingCall);
      socket.off("call-ringing", onCallRinging);
      socket.off("call-accepted", onCallAccepted);
      socket.off("call-cancelled", onCallCancelled);
      socket.off("call-rejected", onCallRejected);
      socket.off("webrtc-offer", onOffer);
      socket.off("webrtc-answer", onAnswer);
      socket.off("ice-candidate", onIce);
      socket.off("call-ended", onEnd);
      socket.off("user-offline", onOffline);
      socket.off("new-message", onNewMessage);
      socket.off("connection-request-received", onConnectionRequestReceived);
      socket.off("new-follower-received", onNewFollowerReceived);
      socket.off("relationship-update", onRelationshipUpdate);
      socket.off("POST_LIKED", onPostLiked);
      socket.off("post-updated", onPostUpdated);
      socket.off("comment-updated", onCommentUpdated);

      // Disconnect socket if user signs out
      if (!user && socket.connected) {
        socket.disconnect();
      }
    };
  }, [user, dispatch]);

  return (
    <CallManager>
      <Toaster />

      <Routes>
        {/* Public */}
        <Route path="/post/:postId" element={<Post />} />

        {/* Protected */}
        <Route path="/" element={!user ? <Login /> : <Layout />}>
          <Route index element={<Feed />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:userId" element={<Chatbox />} />
          <Route path="/connections" element={<Connections />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:profileId" element={<Profile />} />
          <Route path="/create-post" element={<CreatePost />} />
          <Route path="/ai" element={<MeetPointAI />} />
        </Route>
      </Routes>
    </CallManager>
  );
};

export default App;
