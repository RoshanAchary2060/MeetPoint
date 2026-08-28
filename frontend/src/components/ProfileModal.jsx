import { useState } from "react";
import { Pencil } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { updateUser } from "../features/user/usersSlice";
import toast from "react-hot-toast";
import { useAuth } from "@clerk/clerk-react";

const ProfileModal = ({ setShowEdit }) => {
  const dispatch = useDispatch();
  const { getToken } = useAuth();
  const user = useSelector((state) => state.user.value);

  const [editForm, setEditForm] = useState({
    username: user.username,
    bio: user.bio,
    location: user.location,
    profile_picture: null,
    cover_photo: null,
    full_name: user.full_name,
  });

  const handleSaveProfile = async (e) => {
    e.preventDefault();

    try {
      const userData = new FormData();

      const {
        full_name,
        username,
        bio,
        location,
        profile_picture,
        cover_photo,
      } = editForm;

      userData.append("username", username);
      userData.append("bio", bio);
      userData.append("location", location);
      userData.append("full_name", full_name);

      if (profile_picture) {
        userData.append("profile", profile_picture);
      }

      if (cover_photo) {
        userData.append("cover", cover_photo);
      }

      const token = await getToken();

      await dispatch(updateUser({ userData, token })).unwrap();

      setShowEdit(false);
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="fixed top-0 left-0 bottom-0 right-0 z-110 h-screen overflow-y-scroll bg-black/50 dark:bg-black/70">
      <div className="max-w-2xl sm:py-6 mx-auto">
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl p-6 transition-colors">
          {/* Heading */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Edit Profile
          </h1>

          <form
            className="space-y-4"
            onSubmit={(e) =>
              toast.promise(handleSaveProfile(e), {
                loading: "Saving...",
              })
            }
          >
            {/* Profile Picture */}
            <div className="flex flex-col items-start gap-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                Profile Picture
              </label>

              <input
                hidden
                type="file"
                accept="image/*"
                id="profile_picture"
                onChange={(e) => {
                  if (e.target.files[0]) {
                    setEditForm({
                      ...editForm,
                      profile_picture: e.target.files[0],
                    });
                  }
                }}
              />

              <label
                htmlFor="profile_picture"
                className="group/profile relative w-24 h-24 rounded-full overflow-hidden shrink-0 cursor-pointer border-2 border-gray-200 dark:border-slate-700 shadow-sm"
              >
                <img
                  src={
                    editForm.profile_picture
                      ? URL.createObjectURL(editForm.profile_picture)
                      : user.profile_picture
                  }
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover object-center aspect-square"
                />

                <div
                  className="absolute inset-0 hidden group-hover/profile:flex
                  items-center justify-center rounded-full bg-black/40 transition-all"
                >
                  <Pencil className="w-5 h-5 text-white" />
                </div>
              </label>
            </div>

            {/* Cover Photo */}
            <div className="flex flex-col items-start gap-3">
              <label
                htmlFor="cover_photo"
                className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 cursor-pointer"
              >
                Cover Photo
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  id="cover_photo"
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      setEditForm({
                        ...editForm,
                        cover_photo: e.target.files[0],
                      });
                    }
                  }}
                />
                <div className="group/cover relative overflow-hidden rounded-lg mt-2">
                  <img
                    src={
                      editForm.cover_photo
                        ? URL.createObjectURL(editForm.cover_photo)
                        : user.cover_photo
                    }
                    alt="Cover"
                    className="w-80 h-40 rounded-lg bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 dark:from-indigo-950 dark:via-purple-950 dark:to-pink-950 object-cover"
                  />

                  <div className="absolute hidden group-hover/cover:flex inset-0 bg-black/20 dark:bg-black/30 rounded-lg items-center justify-center">
                    <Pencil className="w-5 h-5 text-white" />
                  </div>
                </div>
              </label>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Name
              </label>

              <input
                type="text"
                className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-lg
                bg-white dark:bg-slate-800
                text-gray-900 dark:text-white
                placeholder-gray-400 dark:placeholder-slate-500
                focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Please enter your full name"
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    full_name: e.target.value,
                  })
                }
                value={editForm.full_name || ""}
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Username
              </label>

              <input
                type="text"
                className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-lg
                bg-white dark:bg-slate-800
                text-gray-900 dark:text-white
                placeholder-gray-400 dark:placeholder-slate-500
                focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Please enter your username"
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    username: e.target.value,
                  })
                }
                value={editForm.username || ""}
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Bio
              </label>

              <textarea
                rows={3}
                className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-lg
                bg-white dark:bg-slate-800
                text-gray-900 dark:text-white
                placeholder-gray-400 dark:placeholder-slate-500
                focus:outline-none focus:ring-2 focus:ring-indigo-500
                resize-none"
                placeholder="Please enter a short bio"
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    bio: e.target.value,
                  })
                }
                value={editForm.bio || ""}
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Location
              </label>

              <input
                type="text"
                className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-lg
                bg-white dark:bg-slate-800
                text-gray-900 dark:text-white
                placeholder-gray-400 dark:placeholder-slate-500
                focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Please enter your location"
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    location: e.target.value,
                  })
                }
                value={editForm.location || ""}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-6">
              {/* Cancel */}
              <button
                type="button"
                onClick={() => setShowEdit(false)}
                className="px-4 py-2
                border border-gray-300 dark:border-slate-700
                rounded-lg
                text-gray-700 dark:text-slate-300
                bg-white dark:bg-slate-800
                hover:bg-gray-50 dark:hover:bg-slate-700
                transition-colors cursor-pointer"
              >
                Cancel
              </button>

              {/* Save */}
              <button
                type="submit"
                className="px-4 py-2
                bg-gradient-to-r from-indigo-500 to-purple-600
                text-white rounded-lg
                hover:from-indigo-600 hover:to-purple-700
                transition cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
