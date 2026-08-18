import { Eye, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

const Messages = () => {
  const { connections } = useSelector((state) => state.connections);
  const navigate = useNavigate();

  return (
    <div
      className="
        h-full
        overflow-y-auto
        no-scrollbar
        bg-slate-50
        dark:bg-slate-950
      "
    >
      <div className="max-w-6xl mx-auto p-6">
        {/* =====================================================
            TITLE
        ===================================================== */}

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Messages
          </h1>

          <p className="text-slate-600 dark:text-slate-400">
            Talk to your friends and family
          </p>
        </div>

        {/* =====================================================
            CONNECTED USERS
        ===================================================== */}

        <div className="flex flex-col gap-3">
          {connections.map((user) => (
            <div
              key={user._id}
              className="
                max-w-xl
                flex
                items-start
                gap-4
                p-5
                bg-white
                dark:bg-slate-900
                rounded-lg
                shadow-sm
                dark:shadow-black/20
                border
                border-transparent
                dark:border-slate-800
              "
            >
              {/* Profile Picture */}

              <img
                src={user.profile_picture}
                alt={user.full_name}
                className="
                  w-12
                  h-12
                  rounded-full
                  object-cover
                  flex-shrink-0
                "
              />

              {/* User Information */}

              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-700 dark:text-slate-200">
                  {user.full_name}
                </p>

                <p className="text-slate-500 dark:text-slate-400">
                  @{user.username}
                </p>

                <p className="text-sm text-gray-600 dark:text-slate-400">
                  {user.bio}
                </p>
              </div>

              {/* Actions */}

              <div className="flex flex-col gap-2 mt-4">
                {/* Message */}

                <button
                  onClick={() => navigate(`/messages/${user._id}`)}
                  className="
                    size-10
                    flex
                    items-center
                    justify-center
                    rounded
                    bg-slate-100
                    dark:bg-slate-800
                    hover:bg-slate-200
                    dark:hover:bg-slate-700
                    text-slate-800
                    dark:text-slate-200
                    active:scale-95
                    transition
                    cursor-pointer
                  "
                  title="Message"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>

                {/* Profile */}

                <button
                  onClick={() => navigate(`/profile/${user._id}`)}
                  className="
                    size-10
                    flex
                    items-center
                    justify-center
                    rounded
                    bg-slate-100
                    dark:bg-slate-800
                    hover:bg-slate-200
                    dark:hover:bg-slate-700
                    text-slate-800
                    dark:text-slate-200
                    active:scale-95
                    transition
                    cursor-pointer
                  "
                  title="View Profile"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Messages;
