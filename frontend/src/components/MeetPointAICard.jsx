import React from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const MeetPointAICard = () => {
  const navigate = useNavigate();

  return (
    <div
      className="
        max-w-xs
        rounded-2xl
        p-5
        bg-gradient-to-br
        from-indigo-50
        via-white
        to-purple-50
        dark:from-indigo-950/60
        dark:via-slate-900
        dark:to-purple-950/50
        border
        border-indigo-100
        dark:border-indigo-900/60
        shadow-sm
        dark:shadow-black/20
        transition-colors
        duration-300
      "
    >
      {/* ICON + TITLE */}

      <div className="flex items-center gap-3">
        <div
          className="
            w-10
            h-10
            rounded-xl
            flex
            items-center
            justify-center
            text-white
            bg-gradient-to-br
            from-indigo-500
            to-purple-600
            shadow-md
          "
        >
          <Sparkles className="w-5 h-5" />
        </div>

        <div>
          <h3 className="font-semibold text-slate-800 dark:text-white">
            MeetPoint AI
          </h3>

          <p className="text-[11px] text-indigo-500 dark:text-indigo-400">
            Your smart companion
          </p>
        </div>
      </div>

      {/* DESCRIPTION */}

      <p
        className="
          mt-4
          text-xs
          leading-relaxed
          text-slate-600
          dark:text-slate-300
        "
      >
        Create better posts, get fresh ideas, and connect with people
        more naturally with MeetPoint AI.
      </p>

      {/* EXPLORE */}

      <button
        onClick={() => navigate("/ai")}
        className="
          mt-4
          w-full
          py-2.5
          rounded-xl
          flex
          items-center
          justify-center
          gap-2
          text-xs
          font-semibold
          text-white
          bg-gradient-to-r
          from-indigo-500
          to-purple-600
          hover:from-indigo-600
          hover:to-purple-700
          active:scale-[0.98]
          transition
          cursor-pointer
        "
      >
        Explore MeetPoint AI
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default MeetPointAICard;
