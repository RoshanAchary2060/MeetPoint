import React from "react";

const Loading = ({ height = "100vh" }) => {
  return (
    <div
      style={{ height }}
      className="flex justify-center items-center bg-gray-50 dark:bg-slate-950 transition-colors"
    >
      <div
        className="
          animate-spin
          rounded-full
          h-10
          w-10
          border-4
          border-indigo-500
          dark:border-indigo-400
          border-t-transparent
        "
      />
    </div>
  );
};

export default Loading;
