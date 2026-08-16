import { useEffect, useRef, useState } from "react";
import { ImageIcon, SendHorizonal, Phone, Video } from "lucide-react";

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
  const connections = useSelector((state) => state.connections.connections);

  const { userId } = useParams();
  const { getToken } = useAuth();
  const dispatch = useDispatch();

  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [user, setUser] = useState(null);

  const messagesEndRef = useRef(null);

  const { setCallState, setRemoteUser, setCallType } = useCall();

  // --------------------------------------------------
  // FETCH MESSAGES
  // --------------------------------------------------

  const fetchUserMessages = async () => {
    try {
      const token = await getToken();

      dispatch(
        fetchMessages({
          token,
          userId,
        }),
      );
    } catch (error) {
      toast.error(error.message);
    }
  };

  // --------------------------------------------------
  // SEND MESSAGE
  // --------------------------------------------------

  const sendMessage = async () => {
    try {
      if (!text && !image) {
        return;
      }

      const token = await getToken();

      const formData = new FormData();

      formData.append("to_user_id", userId);
      formData.append("text", text);

      if (image) {
        formData.append("image", image);
      }

      const { data } = await api.post("/api/message/send", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (data.success) {
        setText("");
        setImage(null);

        dispatch(addMessages(data.message));
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Send message error:", error);

      toast.error(error.message || "Failed to send message");
    }
  };

  // --------------------------------------------------
  // LOAD CHAT
  // --------------------------------------------------

  useEffect(() => {
    fetchUserMessages();

    return () => {
      dispatch(resetMessages());
    };
  }, [userId]);

  // --------------------------------------------------
  // FIND CHAT USER
  // --------------------------------------------------

  useEffect(() => {
    if (connections.length > 0) {
      const foundUser = connections.find(
        (connection) => connection._id === userId,
      );

      setUser(foundUser);
    }
  }, [connections, userId]);

  // --------------------------------------------------
  // AUTO SCROLL
  // --------------------------------------------------

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // --------------------------------------------------
  // START AUDIO / VIDEO CALL
  // --------------------------------------------------


  const startCall = async (type) => {
    try {
      if (!user || !currentUser) {
        toast.error(
          "User information not available"
        );

        return;
      }

      if (type !== "audio" && type !== "video") {
        return;
      }

      const callerId = currentUser._id;
      const receiverId = user._id;

      console.log("=================================");
      console.log("📞 STARTING CALL");
      console.log("caller:", callerId);
      console.log("receiver:", receiverId);
      console.log("callerName:", currentUser.full_name);
      console.log("receiverName:", user.full_name);
      console.log("type:", type);
      console.log("=================================");

      setCallType(type);

      setRemoteUser({
        id: receiverId,
        username: user.username,
        full_name: user.full_name,
        profile_picture:
          user.profile_picture,
      });

      // setCallState("calling");

      socket.emit("call-user", {
        callerId,
        receiverId,
        callType: type,

        caller: {
          id: callerId,
          full_name: currentUser.full_name,
          username: currentUser.username,
          profile_picture: currentUser.profile_picture,
        },

        receiver: {
          id: receiverId,
          full_name: user.full_name,
          username: user.username,
          profile_picture: user.profile_picture,
        },
      });

      console.log(
        "📤 CALL SIGNAL SENT"
      );
    } catch (error) {
      console.error(
        "Start call error:",
        error
      );

      toast.error(
        error.message ||
          "Failed to start call"
      );

      setCallState("idle");
    }
  };

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        Loading user...
      </div>
    );
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <img
            src={user.profile_picture || "https://placehold.co/50x50?text=User"}
            alt={user.full_name}
            className="w-10 h-10 rounded-full object-cover"
          />

          <div>
            <h2 className="font-semibold text-gray-800">{user.full_name}</h2>

            <p className="text-xs text-gray-500">@{user.username}</p>
          </div>
        </div>

        {/* ==================================================
            CALL BUTTONS
        ================================================== */}

        <div className="flex items-center gap-1">
          {/* AUDIO CALL */}

          <button
            onClick={() => startCall("audio")}
            className="
              p-2.5
              rounded-full
              hover:bg-indigo-50
              text-indigo-600
              transition
              active:scale-95
            "
            title="Audio Call"
          >
            <Phone className="w-5 h-5" />
          </button>

          {/* VIDEO CALL */}

          <button
            onClick={() => startCall("video")}
            className="
              p-2.5
              rounded-full
              hover:bg-indigo-50
              text-indigo-600
              transition
              active:scale-95
            "
            title="Video Call"
          >
            <Video className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ==================================================
          MESSAGES
      ================================================== */}

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

      {/* ==================================================
          MESSAGE INPUT
      ================================================== */}

      <div className="p-4 bg-white border-t border-gray-200">
        <div
          className="
            flex
            items-center
            gap-3
            px-4
            py-2
            bg-slate-100
            w-full
            max-w-5xl
            mx-auto
            rounded-full
            border
            border-gray-200
            focus-within:border-indigo-400
            focus-within:bg-white
            transition-all
          "
        >
          <input
            type="text"
            className="
              flex-1
              outline-none
              text-slate-800
              text-sm
              bg-transparent
              px-1
            "
            placeholder="Type a message..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                sendMessage();
              }
            }}
            onChange={(e) => setText(e.target.value)}
            value={text}
          />

          <label
            htmlFor="image"
            className="
              cursor-pointer
              p-1
              hover:opacity-80
              transition
            "
          >
            {image ? (
              <img
                src={URL.createObjectURL(image)}
                className="h-7 w-7 object-cover rounded-md"
                alt="Preview"
              />
            ) : (
              <ImageIcon
                className="
                  w-5
                  h-5
                  text-gray-400
                  hover:text-indigo-600
                  transition
                "
              />
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
            className="
              bg-indigo-600
              hover:bg-indigo-700
              active:scale-95
              transition
              cursor-pointer
              text-white
              p-2
              rounded-full
              shadow-sm
            "
          >
            <SendHorizonal size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbox;
