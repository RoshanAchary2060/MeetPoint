import React, { useState } from "react";
import {
  Sparkles,
  MessageCircle,
  Lightbulb,
  ArrowRight,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import api from "../api/axios";

const MeetPointAI = () => {
  const { getToken } = useAuth();

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const [generatedImage, setGeneratedImage] = useState(null);

  // =====================================================
  // SEND MESSAGE TO MEETPOINT AI
  // =====================================================

  const sendToAI = async (customMessage = null) => {
    const userMessage = (customMessage || message).trim();

    if (!userMessage || loading) return;

    setMessage("");

    // ---------------------------------------------------
    // ADD USER MESSAGE
    // ---------------------------------------------------

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: userMessage,
      },
    ]);

    try {
      setLoading(true);

      const token = await getToken();

      const response = await api.post(
        "/api/ai",
        {
          message: userMessage,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "AI request failed");
      }

      const result = response.data;

      // =================================================
      // TEXT RESPONSE
      // =================================================

      if (result.reply) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: result.reply,
          },
        ]);
      }

      // =================================================
      // IMAGE RESPONSE
      // =================================================

      if (result.imageUrl) {
        setGeneratedImage(result.imageUrl);

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            type: "image",
            content: result.imageUrl,
          },
        ]);
      }
    } catch (error) {
      console.error("❌ MeetPoint AI error:", error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry boss 😅 I couldn't process that right now. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // SUGGESTION
  // =====================================================

  const useSuggestion = (text) => {
    setMessage(text);
  };

  // =====================================================
  // USE IMAGE IN POST
  // =====================================================

  const handleUseImage = (imageUrl) => {
    setGeneratedImage(imageUrl);

    // Later we can connect this directly
    // to the CreatePost component.
    console.log("🖼️ Image selected for post:", imageUrl);
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div
      className="
        h-full
        overflow-y-auto
        bg-slate-50
        dark:bg-slate-950
        transition-colors
        duration-300
        p-4
        sm:p-6
        lg:p-10
      "
    >
      <div className="max-w-5xl mx-auto">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="text-center mb-8">
          <div
            className="
              mx-auto
              w-16
              h-16
              rounded-2xl
              flex
              items-center
              justify-center
              bg-gradient-to-br
              from-indigo-500
              to-purple-600
              text-white
              shadow-lg
              shadow-indigo-500/20
              mb-5
            "
          >
            <Sparkles className="w-8 h-8" />
          </div>

          <h1
            className="
              text-3xl
              sm:text-4xl
              font-bold
              text-slate-800
              dark:text-white
            "
          >
            MeetPoint AI
          </h1>

          <p
            className="
              mt-3
              text-slate-500
              dark:text-slate-400
              max-w-xl
              mx-auto
            "
          >
            Your smart companion on MeetPoint. Ask questions, create ideas, or
            create images.
          </p>
        </div>

        {/* =====================================================
            CHAT
        ===================================================== */}

        {messages.length > 0 && (
          <div className="max-w-3xl mx-auto mb-6 space-y-4">
            {messages.map((item, index) => (
              <div
                key={index}
                className={`flex ${
                  item.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`
                    max-w-[85%]
                    rounded-2xl
                    px-4
                    py-3
                    text-sm
                    ${
                      item.role === "user"
                        ? `
                          bg-gradient-to-r
                          from-indigo-500
                          to-purple-600
                          text-white
                          rounded-br-md
                        `
                        : `
                          bg-white
                          dark:bg-slate-900
                          border
                          border-gray-200
                          dark:border-slate-800
                          text-slate-700
                          dark:text-slate-200
                          rounded-bl-md
                        `
                    }
                  `}
                >
                  {/* =================================================
                      IMAGE MESSAGE
                  ================================================= */}

                  {item.type === "image" ? (
                    <div>
                      <img
                        src={item.content}
                        alt="Generated by MeetPoint AI"
                        className="
                          rounded-xl
                          max-w-full
                          h-auto
                          shadow-sm
                        "
                      />

                      {/* IMAGE ACTIONS */}

                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleUseImage(item.content)}
                          className="
                            px-3
                            py-2
                            text-xs
                            rounded-lg
                            bg-indigo-50
                            dark:bg-indigo-950/50
                            text-indigo-600
                            dark:text-indigo-400
                            hover:bg-indigo-100
                            dark:hover:bg-indigo-900
                            transition
                          "
                        >
                          Use in Post
                        </button>

                        <button
                          onClick={() =>
                            useSuggestion(
                              "Generate another image with a different style",
                            )
                          }
                          className="
                            px-3
                            py-2
                            text-xs
                            rounded-lg
                            bg-slate-100
                            dark:bg-slate-800
                            text-slate-600
                            dark:text-slate-300
                            hover:bg-slate-200
                            dark:hover:bg-slate-700
                            transition
                            flex
                            items-center
                            gap-1
                          "
                        >
                          <RefreshCw className="w-3 h-3" />
                          Regenerate
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* =================================================
                       TEXT MESSAGE
                       ================================================= */

                    <div className="whitespace-pre-wrap">{item.content}</div>
                  )}
                </div>
              </div>
            ))}

            {/* =================================================
                LOADING
            ================================================= */}

            {loading && (
              <div className="flex justify-start">
                <div
                  className="
                    bg-white
                    dark:bg-slate-900
                    border
                    border-gray-200
                    dark:border-slate-800
                    rounded-2xl
                    rounded-bl-md
                    px-4
                    py-3
                    flex
                    items-center
                    gap-2
                  "
                >
                  <Sparkles
                    className="
                      w-4
                      h-4
                      text-indigo-500
                      animate-pulse
                    "
                  />

                  <span
                    className="
                      text-sm
                      text-slate-500
                      dark:text-slate-400
                    "
                  >
                    MeetPoint AI is thinking...
                  </span>

                  <Loader2
                    className="
                      w-4
                      h-4
                      animate-spin
                      text-purple-500
                    "
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================
            INPUT
        ===================================================== */}

        <div
          className="
            max-w-3xl
            mx-auto
            bg-white
            dark:bg-slate-900
            border
            border-gray-200
            dark:border-slate-800
            rounded-2xl
            shadow-sm
            p-3
            mb-8
          "
        >
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();

                sendToAI();
              }
            }}
            rows={2}
            placeholder="Ask MeetPoint AI anything..."
            className="
              w-full
              resize-none
              outline-none
              bg-transparent
              px-3
              py-2
              text-sm
              text-slate-700
              dark:text-slate-200
              placeholder:text-slate-400
            "
          />

          <div className="flex items-center justify-end mt-2">
            <button
              onClick={() => sendToAI()}
              disabled={!message.trim() || loading}
              className="
                w-11
                h-11
                shrink-0
                rounded-xl
                flex
                items-center
                justify-center
                bg-gradient-to-r
                from-indigo-500
                to-purple-600
                text-white
                hover:from-indigo-600
                hover:to-purple-700
                disabled:opacity-40
                disabled:cursor-not-allowed
                transition
                active:scale-95
              "
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ArrowRight className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* =====================================================
            QUICK ACTIONS
        ===================================================== */}

        <div
          className="
            grid
            grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-3
            gap-5
          "
        >
          {/* =================================================
              CHAT
          ================================================= */}

          <button
            onClick={() =>
              useSuggestion("Give me some creative ideas for a MeetPoint post")
            }
            className="
              text-left
              bg-white
              dark:bg-slate-900
              border
              border-gray-200
              dark:border-slate-800
              rounded-2xl
              p-6
              hover:border-indigo-300
              dark:hover:border-indigo-700
              transition
            "
          >
            <div
              className="
                w-11
                h-11
                rounded-xl
                bg-indigo-50
                dark:bg-indigo-950/50
                text-indigo-600
                dark:text-indigo-400
                flex
                items-center
                justify-center
                mb-4
              "
            >
              <MessageCircle className="w-5 h-5" />
            </div>

            <h2
              className="
                font-semibold
                text-slate-800
                dark:text-white
              "
            >
              Ask MeetPoint AI
            </h2>

            <p
              className="
                text-sm
                text-slate-500
                dark:text-slate-400
                mt-2
              "
            >
              Chat with your AI companion and get useful answers.
            </p>
          </button>

          {/* =================================================
              IDEAS
          ================================================= */}

          <button
            onClick={() =>
              useSuggestion(
                "Give me 5 creative and engaging ideas for a MeetPoint post",
              )
            }
            className="
              text-left
              bg-white
              dark:bg-slate-900
              border
              border-gray-200
              dark:border-slate-800
              rounded-2xl
              p-6
              hover:border-purple-300
              dark:hover:border-purple-700
              transition
            "
          >
            <div
              className="
                w-11
                h-11
                rounded-xl
                bg-purple-50
                dark:bg-purple-950/50
                text-purple-600
                dark:text-purple-400
                flex
                items-center
                justify-center
                mb-4
              "
            >
              <Lightbulb className="w-5 h-5" />
            </div>

            <h2
              className="
                font-semibold
                text-slate-800
                dark:text-white
              "
            >
              Get Ideas
            </h2>

            <p
              className="
                text-sm
                text-slate-500
                dark:text-slate-400
                mt-2
              "
            >
              Get creative ideas for posts and conversations.
            </p>
          </button>

          {/* =================================================
              IMAGE
          ================================================= */}

          <button
            onClick={() =>
              useSuggestion(
                "Create a beautiful futuristic social media image for MeetPoint",
              )
            }
            className="
              text-left
              bg-white
              dark:bg-slate-900
              border
              border-gray-200
              dark:border-slate-800
              rounded-2xl
              p-6
              hover:border-pink-300
              dark:hover:border-pink-700
              transition
            "
          >
            <div
              className="
                w-11
                h-11
                rounded-xl
                bg-pink-50
                dark:bg-pink-950/50
                text-pink-600
                dark:text-pink-400
                flex
                items-center
                justify-center
                mb-4
              "
            >
              <ImageIcon className="w-5 h-5" />
            </div>

            <h2
              className="
                font-semibold
                text-slate-800
                dark:text-white
              "
            >
              Generate Image
            </h2>

            <p
              className="
                text-sm
                text-slate-500
                dark:text-slate-400
                mt-2
              "
            >
              Create unique images for your MeetPoint posts.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MeetPointAI;
