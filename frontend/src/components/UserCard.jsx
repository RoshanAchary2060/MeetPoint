import { useAuth } from "@clerk/clerk-react";
import { MapPin, MessageCircle, Plus, UserPlus } from "lucide-react";
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

  const handleFollow = async (e) => {
    e.stopPropagation();

    try {
      const { data } = await api.post(
        "/api/user/follow",
        { id: user._id },
        {
          headers: {
            Authorization: `Bearer ${await getToken()}`,
          },
        },
      );

      if (data.success) {
        toast.success(data.message);
        dispatch(fetchUser(await getToken()));
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleConnectionRequest = async (e) => {
    e.stopPropagation();

    if (currentUser?.connections.includes(user._id)) {
      return navigate("/messages/" + user._id);
    }

    try {
      const { data } = await api.post(
        "/api/user/connect",
        { id: user._id },
        {
          headers: {
            Authorization: `Bearer ${await getToken()}`,
          },
        },
      );

      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div
      onClick={() => navigate(`/profile/${user._id}`)}
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
        cursor-pointer

        hover:shadow-lg
        dark:hover:shadow-black/40

        transition-all
      "
    >
      {/* USER INFO */}

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
            hover:underline
          "
        >
          {user.full_name}
        </p>

        {user.username && (
          <p className="text-gray-500 dark:text-slate-400 font-light">
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

      {/* USER DETAILS */}

      <div
        className="
          flex
          items-center
          justify-center
          gap-2
          mt-4
          text-xs
          text-gray-600
          dark:text-slate-400
        "
      >
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
            {user.location}
          </div>
        )}

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
          <span>{user.followers?.length || 0} Followers</span>
        </div>
      </div>

      {/* BUTTONS */}

      <div className="flex mt-4 gap-2">
        {/* FOLLOW */}

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

        {/* CONNECTION / MESSAGE */}

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
            <MessageCircle className="w-5 h-5 group-hover:scale-105 transition" />
          ) : (
            <Plus className="w-5 h-5 group-hover:scale-105 transition" />
          )}
        </button>
      </div>
    </div>
  );
};

export default UserCard;
