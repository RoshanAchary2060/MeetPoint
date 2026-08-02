import { useEffect, useRef, useState } from "react";
import { ImageIcon, SendHorizonal } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import api from "../api/axios";
import {
  addMessages,
  fetchMessages,
  resetMessages,
} from "../features/messages/messagesSlice.js";
import toast from "react-hot-toast";
import { useCall } from "../context/callContext";
import socket from "../socket/socket";

const Chatbox = () => {
  const { messages } = useSelector((state) => state.messages);
  const currentUser = useSelector((state) => state.user.value);
  const { userId } = useParams();
  const { getToken } = useAuth();
  const dispatch = useDispatch();

  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [user, setUser] = useState(null);

  const messagesEndRef = useRef(null);
  const { setCallState, setRemoteUser } = useCall();

  const connections = useSelector((state) => state.connections.connections);

  const fetchUserMessages = async () => {
    try {
      const token = await getToken();
      dispatch(fetchMessages({ token, userId }));
    } catch (error) {
      toast.error(error.message);
    }
  };

  const sendMessage = async () => {
    try {
      if (!text && !image) {
        return;
      }
      const token = await getToken();
      const formData = new FormData();
      formData.append("to_user_id", userId);
      formData.append("text", text);
      if (image) formData.append("image", image);

      const { data } = await api.post("/api/message/send", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (data.success) {
        setText("");
        setImage(null);
        // Add the message to the chat immediately
        dispatch(addMessages(data.message));
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Send message error:", error);
      toast.error(error.message || "Failed to send message");
    }
  };

  useEffect(() => {
    fetchUserMessages();
    return () => {
      dispatch(resetMessages());
    };
  }, [userId]);

  useEffect(() => {
    if (connections.length > 0) {
      const foundUser = connections.find(
        (connection) => connection._id === userId,
      );
      setUser(foundUser);
    }
  }, [connections, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startAudioCall = async () => {
    try {
      const token = await getToken();

      setRemoteUser({
        id: user._id,
        username: user.username,
        full_name: user.full_name,
        profile_picture: user.profile_picture,
      });

      setCallState("calling");

      socket.emit("call-user", {
        callerId: currentUser._id,
        receiverId: userId,
        caller: {
          id: currentUser._id,
          full_name: currentUser.full_name,
          username: currentUser.username,
          profile_picture: currentUser.profile_picture,
        },
      });
    } catch (error) {
      toast.error(error.message || "Failed to start call");
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <p className="text-gray-500 font-medium">Loading user...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50">
      {/* 🟢 Improved Header Layout */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <img
            src={user.profile_picture}
            className="w-10 h-10 rounded-full object-cover border border-gray-200"
            alt={user.full_name}
          />
          <div className="flex flex-col">
            <h2 className="font-semibold text-slate-800 leading-snug">{user.full_name}</h2>
            <p className="text-xs text-gray-500">@{user.username}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={startAudioCall}
            className="p-2.5 rounded-full hover:bg-indigo-50 text-indigo-600 transition active:scale-95"
            title="Audio Call"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
          </button>

          <button
            onClick={() => console.log("Video call clicked")}
            className="p-2.5 rounded-full hover:bg-indigo-50 text-indigo-600 transition active:scale-95"
            title="Video Call"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* 🟢 Improved Messages Container & Proper Left/Right Alignment */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto">
        <div className="flex flex-col space-y-3 w-full max-w-5xl mx-auto">
          {messages && messages.length > 0 ? (
            [...messages]
              .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
              .map((message) => {
                const isFromCurrentUser =
                  message.from_user_id?._id === currentUser?._id ||
                  message.from_user_id === currentUser?._id;

                return (
                  <div
                    key={message._id}
                    className={`flex w-full ${
                      isFromCurrentUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`p-3.5 text-sm max-w-[75%] md:max-w-[60%] shadow-sm ${
                        isFromCurrentUser
                          ? "bg-indigo-600 text-white rounded-2xl rounded-tr-none"
                          : "bg-white text-slate-800 rounded-2xl rounded-tl-none border border-gray-100"
                      }`}
                    >
                      {message.message_type === "image" && (
                        <img
                          src={message.media_url}
                          className="w-full max-h-80 object-cover rounded-lg mb-2"
                          alt="Attachment"
                        />
                      )}
                      {message.text && (
                        <p className="break-words leading-relaxed whitespace-pre-wrap">
                          {message.text}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-400 py-30">
              <p className="font-medium text-base">No messages yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Say hello to {user.full_name}!
              </p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 🟢 Improved Bottom Input Bar */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-100 w-full max-w-5xl mx-auto rounded-full border border-gray-200 focus-within:border-indigo-400 focus-within:bg-white transition-all">
          <input
            type="text"
            className="flex-1 outline-none text-slate-800 text-sm bg-transparent px-1"
            placeholder="Type a message..."
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            onChange={(e) => setText(e.target.value)}
            value={text}
          />
          <label htmlFor="image" className="cursor-pointer p-1 hover:opacity-80 transition">
            {image ? (
              <img src={URL.createObjectURL(image)} className="h-7 w-7 object-cover rounded-md" />
            ) : (
              <ImageIcon className="w-5 h-5 text-gray-400 hover:text-indigo-600 transition" />
            )}
            <input
              type="file"
              id="image"
              accept="image/*"
              hidden
              onChange={(e) => setImage(e.target.files[0])}
            />
          </label>
          <button
            onClick={sendMessage}
            className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition cursor-pointer text-white p-2 rounded-full shadow-sm"
          >
            <SendHorizonal size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbox;
