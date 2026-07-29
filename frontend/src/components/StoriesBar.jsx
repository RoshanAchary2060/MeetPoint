import React, { useEffect, useState, useRef } from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import moment from "moment";
import { dummyStoriesData } from "../assets/assets";
import StoryModal from "./StoryModal";
import StoryViewer from "./StoryViewer";
import { useAuth } from "@clerk/clerk-react";
import api from "../api/axios";
import toast from "react-hot-toast";

const StoriesBar = () => {
  const { getToken } = useAuth();
  const [stories, setStories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [viewStory, setViewStory] = useState(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const scrollContainerRef = useRef(null);

  const fetchStories = async () => {
    try {
      const token = await getToken();
      const { data } = await api.get("/api/story/get", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (data.success) {
        setStories(data.stories);
      } else {
        toast(data.message);
      }
    } catch (error) {
      console.error(error)
      toast.error(error.message);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  // Check scroll position
  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;

    setCanScrollLeft(scrollLeft > 10); // Show left button only if scrolled a bit
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10); // Show right if not at end
  };

  // Scroll Functions
  const scrollLeft = () => {
    scrollContainerRef.current?.scrollBy({ left: -220, behavior: "smooth" });
  };

  const scrollRight = () => {
    scrollContainerRef.current?.scrollBy({ left: 220, behavior: "smooth" });
  };

  // Attach scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", checkScroll);
      // Initial check
      setTimeout(checkScroll, 100);
    }

    return () => container?.removeEventListener("scroll", checkScroll);
  }, [stories]);

  return (
    <div className="relative w-full max-w-2xl mx-auto px-4">
      {/* Left Scroll Button */}
      {canScrollLeft && (
        <button
          onClick={scrollLeft}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-all active:scale-95 hidden md:block"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
      )}

      {/* Right Scroll Button */}
      {canScrollRight && (
        <button
          onClick={scrollRight}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-all active:scale-95 hidden md:block"
        >
          <ChevronRight className="w-5 h-5 text-gray-700" />
        </button>
      )}

      {/* Stories Container */}
      <div
        ref={scrollContainerRef}
        className="no-scrollbar overflow-x-auto flex gap-4 pb-5 scroll-smooth"
        onScroll={checkScroll}
      >
        {/* Create Story Card */}
        <div
          onClick={() => setShowModal(true)}
          className="rounded-xl shadow-sm min-w-[118px] aspect-[3/4] cursor-pointer hover:shadow-lg transition-all duration-200 border-2 border-dashed border-indigo-300 bg-gradient-to-b from-indigo-50 to-white flex-shrink-0"
        >
          <div className="h-full flex flex-col items-center justify-center p-4">
            <div className="size-11 bg-indigo-500 rounded-full flex items-center justify-center mb-3">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <p className="text-sm font-medium text-slate-700 text-center">
              Create Story
            </p>
          </div>
        </div>

        {/* Story Cards */}
        {stories.map((story, index) => (
          <div
            key={index}
            onClick={() => setViewStory(story)}
            className="relative rounded-xl shadow min-w-[118px] aspect-[3/4] cursor-pointer hover:shadow-lg transition-all duration-200 bg-gradient-to-b from-indigo-500 to-purple-600 hover:from-indigo-700 hover:to-purple-800 active:scale-95 flex-shrink-0 overflow-hidden"
          >
            <img
              src={story.user.profile_picture}
              className="absolute size-8 top-3 left-3 z-10 rounded-full ring-2 ring-white shadow"
              alt=""
            />
            <p className="absolute top-16 left-3 text-white/75 text-sm truncate max-w-24 font-medium">
              {story.content}
            </p>
            <p className="text-white absolute bottom-2 right-2 z-10 text-xs font-medium">
              {moment(story.createdAt).fromNow()}
            </p>

            {story.media_type !== "text" && (
              <div className="absolute inset-0 z-0 bg-black">
                {story.media_type === "image" ? (
                  <img
                    src={story.media_url}
                    className="h-full w-full object-cover opacity-75 hover:opacity-90 transition"
                    alt=""
                  />
                ) : (
                  <video
                    src={story.media_url}
                    className="h-full w-full object-cover opacity-75 hover:opacity-90 transition"
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <StoryModal setShowModal={setShowModal} fetchStories={fetchStories} />
      )}
      {viewStory && (
        <StoryViewer viewStory={viewStory} setViewStory={setViewStory} />
      )}
    </div>
  );
};

export default StoriesBar;
