import { useAuth } from "@clerk/clerk-react";
import { MapPin, MessageCircle, UserPlus, Plus } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import toast from "react-hot-toast";
import { fetchUser } from "../features/user/usersSlice";

const UserCard = ({ user }) => {
  const currentUser = useSelector((state) => state.user.value);

  const { getToken } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // =====================================================
  // FOLLOW USER
  // =====================================================

  const handleFollow = async (e) => {
    e.stopPropagation();

    try {
      const token = await getToken();

      const { data } = await api.post(
        "/api/user/follow",
        { id: user._id },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (data.success) {
        toast.success(data.message);

        dispatch(fetchUser(token));
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  // =====================================================
  // CONNECTION / MESSAGE
  // =====================================================

  const handleConnectionRequest = async (e) => {
    e.stopPropagation();

    // Already connected → open messages
    if (currentUser?.connections?.includes(user._id)) {
      return navigate("/messages/" + user._id);
    }

    try {
      const token = await getToken();

      const { data } = await api.post(
        "/api/user/connect",
        { id: user._id },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  return (
    <div
      className="
        p-4
        pt-6
        flex
        flex-col
        justify-between
        w-72

        bg-white
        dark:bg-slate-900

        shadow
        dark:shadow-black/20

        border
        border-gray-200
        dark:border-slate-800

        rounded-md

        hover:shadow-lg
        dark:hover:shadow-black/40

        transition-all
      "
    >
      {/* =====================================================
          USER INFO
      ===================================================== */}

      <div className="text-center">
        <img
          className="
            rounded-full
            w-16
            h-16
            object-cover
            shadow-md
            mx-auto
          "
          src={user.profile_picture}
          alt={user.full_name}
        />

        <p
          className="
            mt-4
            font-semibold
            text-slate-800
            dark:text-white
          "
        >
          {user.full_name}
        </p>

        {user.username && (
          <p
            className="
              text-gray-500
              dark:text-slate-400
              font-light
            "
          >
            @{user.username}
          </p>
        )}

        {user.bio && (
          <p
            className="
              text-gray-600
              dark:text-slate-400
              mt-2
              text-center
              text-sm
              line-clamp-2
            "
          >
            {user.bio}
          </p>
        )}
      </div>

      {/* =====================================================
          USER DETAILS
      ===================================================== */}

      <div className="mt-4">

        {/* LOCATION + FOLLOWERS */}

        <div
          className="
            flex
            items-center
            justify-center
            gap-2
            text-xs
            text-gray-600
            dark:text-slate-400
          "
        >
          {/* LOCATION */}

          {user.location && (
            <div
              className="
                flex
                items-center
                gap-1
                border
                border-gray-300
                dark:border-slate-700
                rounded-full
                px-3
                py-1
                bg-white
                dark:bg-slate-800
              "
            >
              <MapPin className="w-4 h-4" />

              <span className="max-w-[110px] truncate">
                {user.location}
              </span>
            </div>
          )}

          {/* FOLLOWERS */}

          <div
            className="
              flex
              items-center
              gap-1
              border
              border-gray-300
              dark:border-slate-700
              rounded-full
              px-3
              py-1
              bg-white
              dark:bg-slate-800
            "
          >
            <span>
              {user.followers?.length || 0} Followers
            </span>
          </div>
        </div>

        {/* =====================================================
            RECOMMENDATION REASON
        ===================================================== */}

        {/* MUTUAL CONNECTION */}

        {user.recommendation?.type === "mutual" && (
          <div
            className="
              flex
              items-center
              justify-center
              gap-1
              mt-3
              text-xs
              text-indigo-600
              dark:text-indigo-400
              font-medium
            "
          >
            <span>👥</span>

            <span>
              {user.recommendation.count}{" "}
              {user.recommendation.count === 1
                ? "mutual connection"
                : "mutual connections"}
            </span>
          </div>
        )}

        {/* SAME LOCATION */}

        {user.recommendation?.type === "location" && (
          <div
            className="
              flex
              items-center
              justify-center
              gap-1
              mt-3
              text-xs
              text-emerald-600
              dark:text-emerald-400
              font-medium
            "
          >
            <span>📍</span>

            <span>Same location</span>
          </div>
        )}
      </div>

      {/* =====================================================
          BUTTONS
      ===================================================== */}

      <div className="flex mt-4 gap-2">

        {/* =====================================================
            FOLLOW
        ===================================================== */}

        <button
          onClick={handleFollow}
          disabled={currentUser?.following?.includes(user._id)}
          className="
            w-full
            py-2
            rounded-md

            flex
            justify-center
            items-center
            gap-2

            bg-gradient-to-r
            from-indigo-500
            to-purple-600

            hover:from-indigo-600
            hover:to-purple-700

            active:scale-95
            transition

            text-white
            cursor-pointer

            disabled:opacity-60
            disabled:cursor-not-allowed
          "
        >
          <UserPlus className="w-4 h-4" />

          {currentUser?.following?.includes(user._id)
            ? "Following"
            : "Follow"}
        </button>

        {/* =====================================================
            CONNECTION / MESSAGE
        ===================================================== */}

        <button
          onClick={handleConnectionRequest}
          className="
            flex
            items-center
            justify-center

            w-16

            border
            border-gray-300
            dark:border-slate-700

            text-slate-500
            dark:text-slate-300

            bg-white
            dark:bg-slate-800

            group
            rounded-md
            cursor-pointer

            active:scale-95
            transition

            hover:bg-slate-50
            dark:hover:bg-slate-700
          "
        >
          {currentUser?.connections?.includes(user._id) ? (
            <MessageCircle
              className="
                w-5
                h-5
                group-hover:scale-105
                transition
              "
            />
          ) : (
            <Plus
              className="
                w-5
                h-5
                group-hover:scale-105
                transition
              "
            />
          )}
        </button>
      </div>
    </div>
  );
};

export default UserCard;
