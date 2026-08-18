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

import {
  addRecentMessage,
  markConversationRead,
} from "../features/recentMessages/recentMessagesSlice.js";

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
  // FORMAT MESSAGE TIME
  // --------------------------------------------------

  const formatMessageTime = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatCallDuration = (seconds = 0) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

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

        dispatch(
          addRecentMessage({
            message: data.message,
            incrementUnread: false,
          }),
        );
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

    dispatch(markConversationRead(userId));

    return () => {
      dispatch(resetMessages());
    };
  }, [userId]);

  // --------------------------------------------------
  // FIND CHAT USER
  // --------------------------------------------------

  useEffect(() => {
    if (!userId || !connections) return;

    const foundUser = connections.find(
      (connection) => connection._id === userId,
    );

    if (foundUser) {
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
  // RECEIVE REAL-TIME MESSAGES
  // --------------------------------------------------

  useEffect(() => {
    const handleNewMessage = (message) => {
      if (!message) {
        return;
      }

      console.log("📩 NEW MESSAGE RECEIVED:", message);

      const fromId = message.from_user_id?._id || message.from_user_id;

      const toId = message.to_user_id?._id || message.to_user_id;

      console.log("📩 CALL DEBUG", {
        currentChat: userId,
        currentUser: currentUser?._id,
        fromId,
        toId,
        belongsToCurrentChat:
          (fromId === userId && toId === currentUser?._id) ||
          (fromId === currentUser?._id && toId === userId),
      });

      // Only add messages belonging to this conversation
      if (
        (fromId === userId && toId === currentUser?._id) ||
        (fromId === currentUser?._id && toId === userId)
      ) {
        dispatch(addMessages(message));
      }
    };

    socket.on("new-message", handleNewMessage);

    return () => {
      socket.off("new-message", handleNewMessage);
    };
  }, [userId, currentUser?._id, dispatch]);

  // --------------------------------------------------
  // START AUDIO / VIDEO CALL
  // --------------------------------------------------

  const startCall = async (type) => {
    try {
      if (!user || !currentUser) {
        toast.error("User information not available");

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
        profile_picture: user.profile_picture,
      });

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

      console.log("📤 CALL SIGNAL SENT");
    } catch (error) {
      console.error("Start call error:", error);

      toast.error(error.message || "Failed to start call");

      setCallState("idle");
    }
  };

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (!user) {
    return (
      <div
        className="
        flex-1
        flex
        items-center
        justify-center
        bg-slate-50
        dark:bg-slate-950
        text-slate-500
        dark:text-slate-400
        transition-colors
        duration-300
      "
      >
        Loading user...
      </div>
    );
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div
      className="
        flex
        flex-col
        h-full
        bg-slate-50
        dark:bg-slate-950
        transition-colors
        duration-300
      "
    >
      {/* ==================================================
          HEADER
      ================================================== */}

      <div
        className="
          flex
          items-center
          justify-between
          px-5
          py-4
          bg-white
          dark:bg-slate-900
          border-b
          border-gray-200
          dark:border-slate-800
          transition-colors
          duration-300
        "
      >
        {/* USER INFO */}

        <div className="flex items-center gap-3">
          <img
            src={user.profile_picture || "https://placehold.co/50x50?text=User"}
            alt={user.full_name}
            className="
              w-10
              h-10
              rounded-full
              object-cover
              ring-2
              ring-transparent
              dark:ring-slate-700
            "
          />

          <div>
            <h2
              className="
                font-semibold
                text-gray-800
                dark:text-white
                transition-colors
              "
            >
              {user.full_name}
            </h2>

            <p
              className="
                text-xs
                text-gray-500
                dark:text-slate-400
              "
            >
              @{user.username}
            </p>
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
              dark:hover:bg-indigo-950/50
              text-indigo-600
              dark:text-indigo-400
              transition
              active:scale-95
              cursor-pointer
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
              dark:hover:bg-indigo-950/50
              text-indigo-600
              dark:text-indigo-400
              transition
              active:scale-95
              cursor-pointer
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

      <div
        className="
          flex-1
          p-4
          md:p-6
          overflow-y-auto
          bg-slate-50
          dark:bg-slate-950
          transition-colors
          duration-300
        "
      >
        <div
          className="
            flex
            flex-col
            space-y-3
            w-full
            max-w-5xl
            mx-auto
          "
        >
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
                      className={`p-3.5 text-sm max-w-[75%] md:max-w-[60%] shadow-sm transition-colors duration-300 ${
                        isFromCurrentUser
                          ? "bg-indigo-600 text-white rounded-2xl rounded-tr-none"
                          : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-2xl rounded-tl-none border border-gray-100 dark:border-slate-800"
                      }`}
                    >
                      {/* ================================
                          CALL MESSAGE
                      ================================= */}

                      {message.message_type === "call" ? (
                        <div className="flex items-center gap-3 min-w-[220px]">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              message.call_status === "declined" ||
                              message.call_status === "missed"
                                ? "bg-red-100 dark:bg-red-950/50 text-red-500"
                                : "bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-400"
                            }`}
                          >
                            {message.call_type === "video" ? (
                              <Video className="w-5 h-5" />
                            ) : (
                              <Phone className="w-5 h-5" />
                            )}
                          </div>

                          <div>
                            <p className="font-semibold">
                              {message.call_status === "missed"
                                ? "Missed call"
                                : message.call_status === "declined"
                                  ? "Call declined"
                                  : "Call ended"}
                            </p>

                            <p className="text-xs opacity-70">
                              {message.call_type === "video"
                                ? "Video call"
                                : "Audio call"}

                              {message.call_status === "completed" &&
                                ` • ${formatCallDuration(
                                  message.call_duration,
                                )}`}
                            </p>

                            <p
                              className={`text-[10px] mt-1 ${
                                isFromCurrentUser
                                  ? "text-white/70"
                                  : "text-gray-400 dark:text-slate-500"
                              }`}
                            >
                              {formatMessageTime(message.createdAt)}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* ================================
                              IMAGE MESSAGE
                          ================================= */}

                          {message.message_type === "image" && (
                            <img
                              src={message.media_url}
                              className="
                                w-full
                                max-h-80
                                object-cover
                                rounded-lg
                                mb-2
                              "
                              alt="Attachment"
                            />
                          )}

                          {/* ================================
                              TEXT MESSAGE
                          ================================= */}

                          {message.text && (
                            <p className="break-words leading-relaxed whitespace-pre-wrap">
                              {message.text}
                            </p>
                          )}

                          <p
                            className={`text-[10px] mt-1 text-right ${
                              isFromCurrentUser
                                ? "text-white/70"
                                : "text-gray-400 dark:text-slate-500"
                            }`}
                          >
                            {formatMessageTime(message.createdAt)}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
          ) : (
            <div
              className="
                flex
                flex-col
                items-center
                justify-center
                text-gray-400
                dark:text-slate-500
                py-30
              "
            >
              <p className="font-medium text-base">No messages yet</p>

              <p className="text-xs mt-1">Say hello to {user.full_name}!</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ==================================================
          MESSAGE INPUT
      ================================================== */}

      <div
        className="
          p-4
          bg-white
          dark:bg-slate-900
          border-t
          border-gray-200
          dark:border-slate-800
          transition-colors
          duration-300
        "
      >
        <div
          className="
            flex
            items-center
            gap-3
            px-4
            py-2
            bg-slate-100
            dark:bg-slate-800
            w-full
            max-w-5xl
            mx-auto
            rounded-full
            border
            border-gray-200
            dark:border-slate-700
            focus-within:border-indigo-400
            dark:focus-within:border-indigo-500
            focus-within:bg-white
            dark:focus-within:bg-slate-800
            transition-all
          "
        >
          {/* TEXT INPUT */}

          <input
            type="text"
            className="
              flex-1
              outline-none
              text-slate-800
              dark:text-white
              placeholder:text-slate-400
              dark:placeholder:text-slate-500
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

          {/* IMAGE */}

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
                className="
                  h-7
                  w-7
                  object-cover
                  rounded-md
                  ring-1
                  ring-slate-300
                  dark:ring-slate-600
                "
                alt="Preview"
              />
            ) : (
              <ImageIcon
                className="
                  w-5
                  h-5
                  text-gray-400
                  dark:text-slate-500
                  hover:text-indigo-600
                  dark:hover:text-indigo-400
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

          {/* SEND */}

          <button
            onClick={sendMessage}
            className="
              bg-indigo-600
              hover:bg-indigo-700
              dark:bg-indigo-600
              dark:hover:bg-indigo-500
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
