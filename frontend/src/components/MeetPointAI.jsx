import React, { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  MessageCircle,
  Lightbulb,
  ArrowRight,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Paperclip,
  X,
} from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import api from "../api/axios";

const MeetPointAI = () => {
  const { getToken } = useAuth();

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef(null);

  // =====================================================
  // IMAGE SELECT
  // =====================================================

  const handleImageSelect = (file) => {
    if (!file) return;

    // ---------------------------------------------------
    // IMAGE CHECK
    // ---------------------------------------------------

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    // ---------------------------------------------------
    // 20MB LIMIT
    // ---------------------------------------------------

    if (file.size > 20 * 1024 * 1024) {
      alert("Image must be smaller than 20MB.");
      return;
    }

    // ---------------------------------------------------
    // CLEAN PREVIOUS PREVIEW
    // ---------------------------------------------------

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    // ---------------------------------------------------
    // SET IMAGE
    // ---------------------------------------------------

    setSelectedImage(file);

    const previewUrl = URL.createObjectURL(file);

    setImagePreview(previewUrl);
  };

  // =====================================================
  // REMOVE IMAGE
  // =====================================================

  const removeSelectedImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setSelectedImage(null);
    setImagePreview(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // =====================================================
  // CLIPBOARD IMAGE PASTE
  // =====================================================

  useEffect(() => {
    const handlePaste = (event) => {
      const items = event.clipboardData?.items;

      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();

          if (file) {
            handleImageSelect(file);
          }

          event.preventDefault();

          break;
        }
      }
    };

    window.addEventListener("paste", handlePaste);

    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [imagePreview]);

  // =====================================================
  // CLEANUP IMAGE PREVIEW
  // =====================================================

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // =====================================================
  // DRAG EVENTS
  // =====================================================

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!loading) {
      setDragActive(true);
    }
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();

    setDragActive(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();

    setDragActive(false);

    if (loading) return;

    const file = event.dataTransfer.files?.[0];

    if (file) {
      handleImageSelect(file);
    }
  };

  // =====================================================
  // SEND MESSAGE TO MEETPOINT AI
  // =====================================================

  const sendToAI = async (customMessage = null) => {
    const userMessage = (customMessage || message).trim();

    // ---------------------------------------------------
    // ALLOW IMAGE ONLY
    // ---------------------------------------------------

    if (!userMessage && !selectedImage) {
      return;
    }

    if (loading) return;

    const imageToSend = selectedImage;
    const imageToShow = imagePreview;

    // ---------------------------------------------------
    // CLEAR INPUT
    // ---------------------------------------------------

    setMessage("");

    // ---------------------------------------------------
    // ADD USER MESSAGE
    // ---------------------------------------------------

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: userMessage,
        image: imageToShow,
      },
    ]);

    try {
      setLoading(true);

      // -------------------------------------------------
      // CLERK TOKEN
      // -------------------------------------------------

      const token = await getToken();

      // -------------------------------------------------
      // FORM DATA
      // -------------------------------------------------

      const formData = new FormData();

      formData.append("message", userMessage);

      if (imageToSend) {
        formData.append("image", imageToSend);
      }

      // -------------------------------------------------
      // API REQUEST
      // -------------------------------------------------

      const response = await api.post("/api/ai", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // -------------------------------------------------
      // CHECK RESPONSE
      // -------------------------------------------------

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
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            type: "image",
            content: result.imageUrl,
          },
        ]);
      }

      // -------------------------------------------------
      // REMOVE ATTACHED IMAGE
      // -------------------------------------------------

      removeSelectedImage();
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
  // RENDER
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
                      USER ATTACHED IMAGE
                  ================================================= */}

                  {item.image && (
                    <img
                      src={item.image}
                      alt="Attached"
                      className="
                        rounded-xl
                        max-w-[280px]
                        max-h-[280px]
                        object-cover
                        mb-2
                      "
                    />
                  )}

                  {/* =================================================
                      GENERATED IMAGE
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

                      <div className="flex gap-2 mt-3">
                        {/* <button
                          onClick={() =>
                            console.log("Use image in post", item.content)
                          }
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
                        </button>*/}

                        {/* <button
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
                        </button>*/}
                      </div>
                    </div>
                  ) : (
                    /* =================================================
                       TEXT
                    ================================================= */

                    item.content && (
                      <div className="whitespace-pre-wrap">{item.content}</div>
                    )
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
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            max-w-3xl
            mx-auto
            bg-white
            dark:bg-slate-900
            border
            rounded-2xl
            shadow-sm
            p-3
            mb-8
            transition

            ${
              dragActive
                ? `
                  border-indigo-500
                  ring-2
                  ring-indigo-500/20
                `
                : `
                  border-gray-200
                  dark:border-slate-800
                `
            }
          `}
        >
          {/* =================================================
              DRAG OVER MESSAGE
          ================================================= */}

          {dragActive && (
            <div
              className="
                mb-3
                rounded-xl
                border-2
                border-dashed
                border-indigo-400
                bg-indigo-50
                dark:bg-indigo-950/30
                px-4
                py-6
                text-center
                text-sm
                text-indigo-600
                dark:text-indigo-400
              "
            >
              Drop your image here 📸
            </div>
          )}

          {/* =================================================
              IMAGE PREVIEW
          ================================================= */}

          {imagePreview && (
            <div className="px-3 pt-2 pb-3">
              <div className="relative inline-block">
                <img
                  src={imagePreview}
                  alt="Selected"
                  className="
                    w-24
                    h-24
                    object-cover
                    rounded-xl
                    border
                    border-gray-200
                    dark:border-slate-700
                  "
                />

                <button
                  type="button"
                  onClick={removeSelectedImage}
                  className="
                    absolute
                    -top-2
                    -right-2
                    w-6
                    h-6
                    rounded-full
                    bg-slate-800
                    text-white
                    flex
                    items-center
                    justify-center
                    hover:bg-red-500
                    transition
                  "
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* =================================================
              TEXTAREA
          ================================================= */}

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
            placeholder={
              selectedImage
                ? "Ask something about this image..."
                : "Ask MeetPoint AI anything..."
            }
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

          {/* =================================================
              INPUT ACTIONS
          ================================================= */}

          <div
            className="
              flex
              items-center
              justify-between
              mt-2
            "
          >
            {/* =================================================
                IMAGE INPUT
            ================================================= */}

            <div className="flex items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  handleImageSelect(e.target.files?.[0]);

                  e.target.value = "";
                }}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                title="Attach image"
                className="
                  w-11
                  h-11
                  shrink-0
                  rounded-xl
                  flex
                  items-center
                  justify-center
                  text-slate-500
                  dark:text-slate-400
                  hover:bg-slate-100
                  dark:hover:bg-slate-800
                  transition
                  disabled:opacity-40
                "
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <span
                className="
                  hidden
                  sm:block
                  ml-1
                  text-xs
                  text-slate-400
                "
              >
                Paste or attach image
              </span>
            </div>

            {/* =================================================
                SEND
            ================================================= */}

            <button
              onClick={() => sendToAI()}
              disabled={(!message.trim() && !selectedImage) || loading}
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
                <Loader2
                  className="
                    w-5
                    h-5
                    animate-spin
                  "
                />
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
