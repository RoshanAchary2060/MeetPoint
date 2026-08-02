import { BadgeCheck, Eye, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom"; // 🟢 Import useNavigate
import api from "../api/axios";

const StoryViewer = ({ viewStory, setViewStory }) => {
  const { getToken } = useAuth();
  const navigate = useNavigate(); // 🟢 Hook for navigation
  const currentUser = useSelector((state) => state.user.value);
  const [progress, setProgress] = useState(0);
  const [showViewersList, setShowViewersList] = useState(false); // 🟢 Toggle viewers modal

  useEffect(() => {
    const handleView = async () => {
      try {
        const token = await getToken();
        await api.post(
          "/api/story/view",
          { storyId: viewStory?._id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (err) {
        console.error("Failed to register view", err);
      }
    };

    if (viewStory?._id) {
      handleView();
    }
  }, [viewStory]);

  // Pause progress when viewing the viewers list modal
  useEffect(() => {
    if (!viewStory || viewStory.media_type === "video" || showViewersList) return;

    const duration = 5000;
    const interval = 50;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setViewStory(null);
          return 100;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [viewStory, showViewersList]);

  if (!viewStory) return null;

  const storyOwnerId = typeof viewStory.user === "object" ? viewStory.user?._id : viewStory.user;
  const isOwner = currentUser?._id === storyOwnerId;
  const viewers = viewStory?.viewers || [];

  const handleOpenProfile = (viewerId) => {
    setViewStory(null); // Close story viewer
    navigate(`/profile/${viewerId}`); // Navigate to viewer profile
  };

  return (
    <div
      className="fixed inset-0 h-screen bg-black bg-opacity-90 z-50 flex items-center justify-center"
      style={{
        backgroundColor:
          viewStory.media_type === "text"
            ? viewStory.background_color || "#4f46e5"
            : "#000000",
      }}
    >
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gray-700/50 z-20">
        <div
          style={{ width: `${progress}%` }}
          className="h-full bg-white transition-all duration-75 linear"
        />
      </div>

      {/* User Info Header */}
      <div className="absolute top-4 left-4 z-20 flex items-center space-x-3 p-2 px-4 sm:p-3 sm:px-6 backdrop-blur-2xl rounded-full bg-black/40">
        <img
          className="size-7 sm:size-8 rounded-full object-cover border border-white"
          src={viewStory.user?.profile_picture}
          alt={viewStory.user?.full_name}
        />
        <div className="text-white font-medium flex items-center gap-1.5 text-sm sm:text-base">
          <span>{viewStory.user?.full_name || viewStory.user?.username}</span>
          <BadgeCheck size={18} className="text-blue-500 fill-blue-500/20" />
        </div>
      </div>

      {/* Close Button */}
      <button
        onClick={() => setViewStory(null)}
        className="absolute top-4 right-4 z-20 text-white focus:outline-none"
      >
        <X className="w-8 h-8 hover:scale-110 transition cursor-pointer" />
      </button>

      {/* Media Content */}
      <div className="max-w-[90vw] max-h-[90vh] flex items-center justify-center">
        {viewStory.media_type === "image" && (
          <img src={viewStory.media_url} className="max-w-full max-h-screen object-contain" alt="story" />
        )}
        {viewStory.media_type === "video" && (
          <video controls autoPlay onEnded={() => setViewStory(null)} src={viewStory.media_url} className="max-h-screen" />
        )}
        {viewStory.media_type === "text" && (
          <div className="w-full h-full flex items-center justify-center p-8 text-white text-2xl text-center">
            {viewStory.content}
          </div>
        )}
      </div>

      {/* 🟢 Clickable Eye Button for Story Owner */}
      {isOwner && (
        <button
          onClick={() => setShowViewersList(true)}
          className="absolute bottom-6 left-6 z-20 flex items-center gap-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-medium border border-white/20 transition cursor-pointer active:scale-95"
        >
          <Eye className="w-4 h-4 text-gray-300" />
          <span>
            {viewers.length} {viewers.length === 1 ? "view" : "views"}
          </span>
        </button>
      )}

      {/* 🟢 Viewers Popup Modal */}
      {showViewersList && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800 text-white w-full max-w-sm rounded-2xl p-4 max-h-[60vh] flex flex-col shadow-2xl animate-in fade-in slide-in-from-bottom duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Eye className="w-4 h-4 text-indigo-400" /> Viewers ({viewers.length})
              </h3>
              <button
                onClick={() => setShowViewersList(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Viewers List */}
            <div className="overflow-y-auto flex-1 mt-3 space-y-2 pr-1 custom-scrollbar">
              {viewers.length > 0 ? (
                viewers.map((viewer) => (
                  <div
                    key={viewer._id}
                    onClick={() => handleOpenProfile(viewer._id)}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-800/80 cursor-pointer transition"
                  >
                    <img
                      src={viewer.profile_picture}
                      alt={viewer.full_name}
                      className="w-10 h-10 rounded-full object-cover border border-gray-700"
                    />
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-medium text-white line-clamp-1">
                        {viewer.full_name || viewer.username}
                      </span>
                      <span className="text-xs text-gray-400">
                        @{viewer.username}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 text-xs py-6">
                  No views yet
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryViewer;
