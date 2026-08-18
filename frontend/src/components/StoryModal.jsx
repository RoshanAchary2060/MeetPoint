import { useAuth } from "@clerk/clerk-react";
import { ArrowLeft, Sparkle, TextIcon, Upload } from "lucide-react";
import React, { useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios";

const StoryModal = ({ setShowModal, fetchStories }) => {
  const bgColors = [
    "#4f46e5",
    "#7c3aed",
    "#db2777",
    "#e11d48",
    "#ca8a04",
    "#0d9488",
  ];

  const [mode, setMode] = useState("text");
  const [background, setBackground] = useState(bgColors[0]);
  const [text, setText] = useState("");
  const [media, setMedia] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const { getToken } = useAuth();

  const MAX_VIDEO_DURATION = 60;
  const MAX_VIDEO_SIZE_MB = 100;

  // ============================================================
  // MEDIA UPLOAD
  // ============================================================

  const handleMediaUpload = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (file.type.startsWith("video")) {
      if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
        toast.error(`Video file size cannot exceed ${MAX_VIDEO_SIZE_MB} MB`);

        setMedia(null);
        setPreviewUrl(null);

        return;
      }

      const video = document.createElement("video");

      video.preload = "metadata";

      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);

        if (video.duration > MAX_VIDEO_DURATION) {
          toast.error(
            `Video duration cannot exceed ${MAX_VIDEO_DURATION} seconds`,
          );

          setMedia(null);
          setPreviewUrl(null);

          return;
        }

        setMedia(file);
        setPreviewUrl(URL.createObjectURL(file));
        setText("");
        setMode("media");
      };

      video.src = URL.createObjectURL(file);
    } else if (file.type.startsWith("image")) {
      setMedia(file);
      setPreviewUrl(URL.createObjectURL(file));
      setText("");
      setMode("media");
    }
  };

  // ============================================================
  // CREATE STORY
  // ============================================================

  const handleCreateStory = async () => {
    const media_type =
      mode === "media"
        ? media?.type.startsWith("image")
          ? "image"
          : "video"
        : "text";

    if (media_type === "text" && !text.trim()) {
      throw new Error("Please enter some text");
    }

    const formData = new FormData();

    formData.append("content", text);
    formData.append("media_type", media_type);

    if (media) {
      formData.append("media", media);
    }

    formData.append("background_color", background);

    try {
      const token = await getToken();

      const { data } = await api.post("/api/story/create", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (data.success) {
        setShowModal(false);

        toast.success("Story created successfully");

        fetchStories();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ============================================================
  // CLEAR MEDIA
  // ============================================================

  const switchToText = () => {
    setMode("text");
    setMedia(null);
    setPreviewUrl(null);
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      className="
        fixed
        inset-0
        z-[110]
        min-h-screen

        bg-black/80
        backdrop-blur

        text-white

        flex
        items-center
        justify-center

        p-4
      "
    >
      <div className="w-full max-w-md">
        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="text-center mb-4 flex items-center justify-between">
          <button
            onClick={() => setShowModal(false)}
            className="
              text-white
              p-2
              cursor-pointer
              rounded-full

              hover:bg-white/10
              transition
              active:scale-90
            "
          >
            <ArrowLeft />
          </button>

          <h2 className="text-lg font-semibold">Create Story</h2>

          <span className="w-10"></span>
        </div>

        {/* ======================================================
            STORY PREVIEW
        ====================================================== */}

        <div
          className="
            rounded-lg
            h-96

            flex
            items-center
            justify-center

            relative
            overflow-hidden

            shadow-2xl
          "
          style={{ backgroundColor: background }}
        >
          {/* TEXT MODE */}

          {mode === "text" && (
            <textarea
              placeholder="What's on your mind?"
              onChange={(e) => setText(e.target.value)}
              value={text}
              className="
                bg-transparent
                text-white

                placeholder:text-white/60

                w-full
                h-full
                p-6

                text-lg
                resize-none

                focus:outline-none
              "
            />
          )}

          {/* MEDIA MODE */}

          {mode === "media" &&
            previewUrl &&
            (media?.type.startsWith("image") ? (
              <img
                src={previewUrl}
                className="
                  object-contain
                  max-h-full
                  max-w-full
                "
                alt="Story preview"
              />
            ) : (
              <video
                src={previewUrl}
                className="
                  object-contain
                  max-h-full
                  max-w-full
                "
                controls
              />
            ))}
        </div>

        {/* ======================================================
            BACKGROUND COLORS
        ====================================================== */}

        <div className="flex mt-4 gap-2">
          {bgColors.map((color) => (
            <button
              key={color}
              className="
                w-6
                h-6
                rounded-full
                ring-1
                ring-white/50

                cursor-pointer

                hover:scale-110
                transition
                active:scale-95
              "
              style={{ backgroundColor: color }}
              onClick={() => setBackground(color)}
            />
          ))}
        </div>

        {/* ======================================================
            MODE BUTTONS
        ====================================================== */}

        <div className="flex gap-2 mt-4">
          {/* TEXT */}

          <button
            onClick={switchToText}
            className={`
              flex-1
              flex
              items-center
              justify-center
              gap-2

              p-2
              rounded

              cursor-pointer

              transition
              active:scale-95

              ${
                mode === "text"
                  ? "bg-white text-black"
                  : "bg-zinc-800 text-white hover:bg-zinc-700"
              }
            `}
          >
            <TextIcon size={18} />
            Text
          </button>

          {/* PHOTO / VIDEO */}

          <label
            className={`
              flex-1
              flex
              items-center
              justify-center
              gap-2

              p-2
              rounded

              cursor-pointer

              transition
              active:scale-95

              ${
                mode === "media"
                  ? "bg-white text-black"
                  : "bg-zinc-800 text-white hover:bg-zinc-700"
              }
            `}
          >
            <input
              type="file"
              accept="image/*, video/*"
              className="hidden"
              onChange={handleMediaUpload}
            />
            <Upload size={18} />
            Photo/Video
          </label>
        </div>

        {/* ======================================================
            CREATE BUTTON
        ====================================================== */}

        <button
          onClick={() =>
            toast.promise(handleCreateStory(), {
              loading: "Saving...",
            })
          }
          className="
            flex
            items-center
            justify-center
            gap-2

            text-white

            py-3
            mt-4
            w-full

            rounded

            bg-gradient-to-r
            from-indigo-500
            to-purple-600

            hover:from-indigo-600
            hover:to-purple-700

            active:scale-95
            transition

            cursor-pointer
          "
        >
          <Sparkle size={18} />
          Create Story
        </button>
      </div>
    </div>
  );
};

export default StoryModal;
