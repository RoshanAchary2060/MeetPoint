import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import moment from "moment";
import { MessageCircle } from "lucide-react";

import { useAuth, useUser } from "@clerk/clerk-react";
import { useDispatch, useSelector } from "react-redux";

import api from "../api/axios";
import toast from "react-hot-toast";

import {
  setRecentMessages,
  addRecentMessage,
} from "../features/recentMessages/recentMessagesSlice";

const RecentMessages = () => {
  const { user } = useUser();
  const { getToken } = useAuth();

  const dispatch = useDispatch();

  const messages = useSelector((state) => state.recentMessages.messages);

  // ============================================================
  // FETCH RECENT MESSAGES
  // ============================================================

  const fetchRecentMessages = async () => {
    try {
      const token = await getToken();

      const { data } = await api.get("/api/user/recent-messages", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!data.success) {
        toast.error(data.message);
        return;
      }

      // --------------------------------------------------------
      // GROUP BY CONVERSATION
      // --------------------------------------------------------

      const groupedMessages = {};

      data.messages.forEach((message) => {
        const fromId = message.from_user_id?._id || message.from_user_id;
        const toId = message.to_user_id?._id || message.to_user_id;

        const otherUserId = fromId === user.id ? toId : fromId;

        if (!groupedMessages[otherUserId]) {
          groupedMessages[otherUserId] = {
            ...message,
            unreadCount: 0,
          };
        }

        // Count unread messages received by current user
        if (toId === user.id && !message.seen) {
          groupedMessages[otherUserId].unreadCount += 1;
        }

        // Keep latest message
        if (
          new Date(message.createdAt) >
          new Date(groupedMessages[otherUserId].createdAt)
        ) {
          const unreadCount =
            groupedMessages[otherUserId].unreadCount || 0;

          groupedMessages[otherUserId] = {
            ...message,
            unreadCount,
          };
        }
      });

      // --------------------------------------------------------
      // SORT NEWEST FIRST
      // --------------------------------------------------------

      const sortedMessages = Object.values(groupedMessages).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      );

      dispatch(setRecentMessages(sortedMessages));
    } catch (error) {
      console.error("❌ Recent messages error:", error);

      toast.error(error.message);
    }
  };

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    if (!user) return;

    fetchRecentMessages();
  }, [user]);

  // ============================================================
  // GET OTHER USER
  // ============================================================

  const getOtherUser = (message) => {
    const fromId = message.from_user_id?._id || message.from_user_id;

    return fromId === user.id
      ? message.to_user_id
      : message.from_user_id;
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      className="
        bg-white
        dark:bg-slate-900
        max-w-xs
        mt-4
        rounded-2xl
        border
        border-slate-100
        dark:border-slate-800
        shadow-sm
        dark:shadow-black/20
        overflow-hidden
      "
    >
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div
        className="
          flex
          items-center
          gap-2
          px-4
          py-4
          border-b
          border-slate-100
          dark:border-slate-800
        "
      >
        <div
          className="
            w-9
            h-9
            rounded-xl
            bg-indigo-50
            dark:bg-indigo-950/50
            flex
            items-center
            justify-center
          "
        >
          <MessageCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>

        <div>
          <h3 className="font-semibold text-slate-800 dark:text-white text-sm">
            Recent Messages
          </h3>

          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Your latest conversations
          </p>
        </div>
      </div>

      {/* ======================================================
          MESSAGE LIST
      ====================================================== */}

      <div className="max-h-72 overflow-y-auto no-scrollbar">
        {messages.length > 0 ? (
          messages.map((message) => {
            const otherUser = getOtherUser(message);

            if (!otherUser) {
              return null;
            }

            const unreadCount = message.unreadCount || 0;
            const isUnread = unreadCount > 0;

            // --------------------------------------------------
            // CHECK IF MESSAGE WAS SENT BY ME
            // --------------------------------------------------

            const fromId =
              message.from_user_id?._id || message.from_user_id;

            const isSentByMe = fromId === user.id;

            // --------------------------------------------------
            // MESSAGE PREVIEW
            // --------------------------------------------------

            let preview;

            if (message.message_type === "image") {
              preview = "📷 Photo";
            } else if (message.message_type === "call") {
              if (message.call_status === "missed") {
                preview = "📞 Missed call";
              } else if (message.call_status === "declined") {
                preview = "📞 Declined call";
              } else {
                preview = "📞 Call";
              }
            } else {
              preview = message.text || "Message";
            }

            if (isSentByMe) {
              preview = `You: ${preview}`;
            }

            return (
              <Link
                to={`/messages/${otherUser._id}`}
                key={message._id}
                className="
                  flex
                  gap-3
                  px-4
                  py-3
                  hover:bg-slate-50
                  dark:hover:bg-slate-800/60
                  transition
                  border-b
                  border-slate-50
                  dark:border-slate-800
                "
              >
                {/* ==================================================
                    AVATAR
                ================================================== */}

                <div className="relative shrink-0">
                  <img
                    src={
                      otherUser.profile_picture ||
                      "https://placehold.co/50x50?text=User"
                    }
                    className="
                      w-10
                      h-10
                      rounded-full
                      object-cover
                    "
                    alt={otherUser.full_name}
                  />
                </div>

                {/* ==================================================
                    MESSAGE INFO
                ================================================== */}

                <div className="min-w-0 flex-1">
                  {/* NAME + TIME */}

                  <div className="flex items-center justify-between gap-2">
                    <p
                      className="
                        font-semibold
                        text-xs
                        text-slate-800
                        dark:text-white
                        truncate
                      "
                    >
                      {otherUser.full_name}
                    </p>

                    <p
                      className="
                        text-[10px]
                        text-slate-400
                        dark:text-slate-500
                        whitespace-nowrap
                      "
                    >
                      {moment(message.createdAt).fromNow()}
                    </p>
                  </div>

                  {/* MESSAGE + UNREAD */}

                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p
                      className={`
                        text-xs truncate
                        ${
                          isUnread
                            ? "text-slate-700 dark:text-slate-200 font-medium"
                            : "text-slate-400 dark:text-slate-500"
                        }
                      `}
                    >
                      {preview}
                    </p>

                    {/* UNREAD COUNT */}

                    {unreadCount > 0 && (
                      <span
                        className="
                          shrink-0
                          min-w-4
                          h-4
                          px-1
                          flex
                          items-center
                          justify-center
                          rounded-full
                          bg-indigo-600
                          dark:bg-indigo-500
                          text-white
                          text-[9px]
                          font-semibold
                        "
                      >
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          // ==================================================
          // EMPTY STATE
          // ==================================================

          <div className="flex flex-col items-center justify-center py-10 px-4">
            <div
              className="
                w-12
                h-12
                rounded-full
                bg-slate-50
                dark:bg-slate-800
                flex
                items-center
                justify-center
                mb-3
              "
            >
              <MessageCircle className="w-5 h-5 text-slate-300 dark:text-slate-600" />
            </div>

            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              No messages yet
            </p>

            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 text-center">
              Start a conversation with your connections.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentMessages;
