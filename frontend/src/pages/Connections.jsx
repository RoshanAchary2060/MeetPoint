import { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  UserCheck,
  UserRoundPen,
  MessageSquare,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import { fetchConnections } from "../features/connections/connectionsSlice";
import api from "../api/axios";
import toast from "react-hot-toast";

const Connections = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { getToken } = useAuth();

  const {
    connections = [],
    sentConnections = [],
    pendingConnections = [],
    followers = [],
    following = [],
  } = useSelector((state) => state.connections);

  const [currentTab, setCurrentTab] = useState("Connections");

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    const token = await getToken();
    dispatch(fetchConnections(token));
  };

  const dataArray = [
    {
      label: "Connections",
      value: connections,
      icon: UserPlus,
    },
    {
      label: "Received",
      value: pendingConnections,
      icon: UserRoundPen,
    },
    {
      label: "Sent",
      value: sentConnections,
      icon: UserRoundPen,
    },
    {
      label: "Followers",
      value: followers,
      icon: Users,
    },
    {
      label: "Following",
      value: following,
      icon: UserCheck,
    },
  ];

  const activeTabData =
    dataArray.find((tab) => tab.label === currentTab)?.value || [];

  // -----------------------------
  // API FUNCTIONS
  // -----------------------------

  const refreshConnections = async () => {
    const token = await getToken();
    dispatch(fetchConnections(token));
  };

  const handleFollow = async (userId) => {
    try {
      const { data } = await api.post(
        "/api/user/follow",
        { id: userId },
        {
          headers: {
            Authorization: `Bearer ${await getToken()}`,
          },
        },
      );

      if (data.success) {
        toast.success(data.message);
        refreshConnections();
      } else {
        toast(data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const handleUnfollow = async (userId) => {
    try {
      const { data } = await api.post(
        "/api/user/unfollow",
        { id: userId },
        {
          headers: {
            Authorization: `Bearer ${await getToken()}`,
          },
        },
      );

      if (data.success) {
        toast.success(data.message);
        refreshConnections();
      } else {
        toast(data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const acceptConnection = async (userId) => {
    try {
      const { data } = await api.post(
        "/api/user/accept",
        { id: userId },
        {
          headers: {
            Authorization: `Bearer ${await getToken()}`,
          },
        },
      );

      if (data.success) {
        toast.success(data.message);
        refreshConnections();
      } else {
        toast(data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const handleDecline = async (userId) => {
    try {
      const { data } = await api.post(
        "/api/user/decline",
        { id: userId },
        {
          headers: {
            Authorization: `Bearer ${await getToken()}`,
          },
        },
      );

      if (data.success) {
        toast.success(data.message);
        refreshConnections();
      } else {
        toast(data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const handleDisconnect = async (userId) => {
    try {
      const { data } = await api.post(
        "/api/user/disconnect",
        { userId },
        {
          headers: {
            Authorization: `Bearer ${await getToken()}`,
          },
        },
      );

      if (data.success) {
        toast.success(data.message);
        refreshConnections();
      } else {
        toast(data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const handleCancelRequest = async (userId) => {
    try {
      const { data } = await api.post(
        "/api/user/cancel-request",
        { userId },
        {
          headers: {
            Authorization: `Bearer ${await getToken()}`,
          },
        },
      );

      if (data.success) {
        toast.success(data.message);
        refreshConnections();
      } else {
        toast(data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  // -----------------------------
  // BUTTON RENDERER
  // -----------------------------

  const renderButtons = (user) => {
    switch (currentTab) {
      case "Connections":
        return (
          <>
            <button
              onClick={() => navigate(`/messages/${user._id}`)}
              className="w-full p-2 rounded bg-slate-100 hover:bg-slate-200 flex justify-center items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Message
            </button>

            <button
              onClick={() => handleDisconnect(user._id)}
              className="w-full p-2 rounded bg-red-50 hover:bg-red-100 text-red-600"
            >
              Disconnect
            </button>
          </>
        );

      case "Following":
        return (
          <button
            onClick={() => handleUnfollow(user._id)}
            className="w-full p-2 rounded bg-slate-100 hover:bg-slate-200"
          >
            Unfollow
          </button>
        );

      case "Followers":
        return (
          <button
            onClick={() =>
              following.some((u) => u._id === user._id)
                ? handleUnfollow(user._id)
                : handleFollow(user._id)
            }
            className="w-full p-2 rounded bg-slate-100 hover:bg-slate-200"
          >
            {following.some((u) => u._id === user._id) ? "Unfollow" : "Follow"}
          </button>
        );

      case "Sent":
        return (
          <button
            onClick={() => handleCancelRequest(user._id)}
            className="w-full p-2 rounded bg-red-50 hover:bg-red-100 text-red-600"
          >
            Cancel Request
          </button>
        );

      case "Received":
        return (
          <div className="flex gap-2">
            <button
              onClick={() => acceptConnection(user._id)}
              className="flex-1 p-2 rounded bg-green-100 hover:bg-green-200 text-green-700"
            >
              Accept
            </button>

            <button
              onClick={() => handleDecline(user._id)}
              className="flex-1 p-2 rounded bg-red-50 hover:bg-red-100 text-red-600"
            >
              Decline
            </button>
          </div>
        );

      default:
        return null;
    } // <-- Closed the switch block here
  }; // <-- Closed renderButtons function here

  // -----------------------------
  // MAIN COMPONENT RETURN
  // -----------------------------

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Connections</h1>
          <p className="text-slate-600">
            Manage your network and discover new people
          </p>
        </div>

        {/* Stats */}
        <div className="mb-8 flex flex-wrap gap-6">
          {dataArray.map((item) => (
            <div
              key={item.label}
              className="w-40 h-20 rounded-md bg-white border border-gray-200 shadow flex flex-col justify-center items-center"
            >
              <b className="text-lg">{item.value.length}</b>
              <p className="text-slate-500 text-sm">{item.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="inline-flex flex-wrap bg-white border border-gray-200 rounded-md shadow-sm p-1">
          {dataArray.map((tab) => (
            <button
              key={tab.label}
              onClick={() => setCurrentTab(tab.label)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition cursor-pointer ${
                currentTab === tab.label
                  ? "bg-slate-100 text-black font-medium"
                  : "text-slate-500 hover:text-black"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Empty State */}
        {activeTabData.length === 0 && (
          <div className="text-center text-slate-500 mt-16">
            No users found.
          </div>
        )}

        {/* Cards */}
        <div className="flex flex-wrap gap-6 mt-6">
          {activeTabData.map((user) => (
            <div
              key={user._id}
              className="w-full max-w-[350px] bg-white rounded-xl shadow p-5 flex gap-4"
            >
              <img
                src={user.profile_picture}
                alt=""
                className="w-14 h-14 rounded-full object-cover shadow"
              />

              <div className="flex-1">
                <h2 className="font-semibold">{user.full_name}</h2>
                <p className="text-slate-500 text-sm">@{user.username}</p>

                <p className="text-sm text-gray-600 mt-2">
                  {user.bio?.slice(0, 45)}
                  {user.bio?.length > 45 && "..."}
                </p>

                <div className="mt-4 flex flex-col gap-2">
                  <button
                    onClick={() => navigate(`/profile/${user._id}`)}
                    className="w-full rounded bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-2 hover:from-indigo-600 hover:to-purple-700 transition"
                  >
                    View Profile
                  </button>

                  {renderButtons(user)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Connections;
