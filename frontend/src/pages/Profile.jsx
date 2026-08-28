import { useEffect, useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import Loading from "../components/Loading";
import UserProfileInfo from "../components/UserProfileInfo";
import PostCard from "../components/PostCard";
import moment from "moment";
import ProfileModal from "../components/ProfileModal";
import { useAuth } from "@clerk/clerk-react";
import api from "../api/axios";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import { Heart } from "lucide-react";

const Profile = () => {
  const currentUser = useSelector((state) => state.user.value);

  const { getToken } = useAuth();
  const { profileId } = useParams();

  // If there is no profileId, this is the logged-in user's profile
  const isOwnProfile = !profileId || profileId === currentUser?._id;

  // Use Redux user immediately for own profile
  const [user, setUser] = useState(isOwnProfile ? currentUser || null : null);

  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState("posts");
  const [showEdit, setShowEdit] = useState(false);
  const [loading, setLoading] = useState(!isOwnProfile);

  const fetchUser = async (targetId) => {
    try {
      setLoading(true);

      const token = await getToken();

      const { data } = await api.post(
        "/api/user/profiles",
        { profileId: targetId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (data.success) {
        // Replace cached user with fresh backend data
        setUser(data.profile);

        // Fresh posts
        setPosts(data.posts || []);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const targetId = profileId || currentUser?._id;

    if (!targetId) return;

    fetchUser(targetId);
  }, [profileId, currentUser?._id]);

  useEffect(() => {
    if (isOwnProfile && currentUser) {
      setUser(currentUser);
    }
  }, [currentUser, isOwnProfile]);

  // Calculate total likes received across all user's posts
  const totalLikesCount = useMemo(() => {
    return posts.reduce((acc, post) => {
      const count = Array.isArray(post.likes)
        ? post.likes.length
        : post.likes_count || 0;

      return acc + count;
    }, 0);
  }, [posts]);

  // Filter posts that have at least 1 like
  const postsWithLikes = useMemo(() => {
    return posts.filter((post) => {
      if (Array.isArray(post.likes)) {
        return post.likes.length > 0;
      }

      return (post.likes_count || 0) > 0;
    });
  }, [posts]);

  /*
   * If we don't have any user data yet, show loading.
   *
   * For our own profile, currentUser is already used,
   * so this normally won't appear.
   */
  if (!user && loading) {
    return <Loading />;
  }

  // If API failed and we still don't have a user
  if (!user) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <p className="text-gray-500 dark:text-slate-400">
          Unable to load profile.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-y-scroll bg-gray-50 dark:bg-slate-950 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Profile Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow overflow-hidden">
          {/* Cover Photo */}
          <div className="h-40 md:h-56 bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 dark:from-indigo-950 dark:via-purple-950 dark:to-pink-950">
            {user.cover_photo && (
              <img
                src={user.cover_photo}
                alt="Cover"
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* User Info */}
          <UserProfileInfo
            user={user}
            posts={posts}
            profileId={profileId}
            setShowEdit={setShowEdit}
          />
        </div>

        {/* Tabs */}
        <div className="mt-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow p-1 flex max-w-md mx-auto">
            {["posts", "media", "likes"].map((tab) => (
              <button
                onClick={() => setActiveTab(tab)}
                key={tab}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                  activeTab === tab
                    ? "bg-indigo-600 text-white"
                    : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Posts Tab */}
          {activeTab === "posts" && (
            <div className="mt-6 flex flex-col items-center gap-6">
              {posts.length > 0 ? (
                posts.map((post) => <PostCard key={post._id} post={post} />)
              ) : (
                <p className="text-gray-500 dark:text-slate-400 py-8">
                  No posts created yet.
                </p>
              )}
            </div>
          )}

          {/* Media Tab */}
          {activeTab === "media" && (
            <div className="flex flex-wrap gap-4 mt-6 max-w-6xl justify-center">
              {posts
                .filter((post) => post.image_urls && post.image_urls.length > 0)
                .flatMap((post) =>
                  post.image_urls.map((image, index) => (
                    <Link
                      target="_blank"
                      to={image}
                      key={`${post._id}-${index}`}
                      className="relative group overflow-hidden rounded-lg shadow-sm"
                    >
                      <img
                        src={image}
                        alt="Media"
                        className="w-64 aspect-video object-cover"
                      />

                      <p className="absolute bottom-0 right-0 text-xs p-1 px-3 backdrop-blur-xl text-white opacity-0 group-hover:opacity-100 transition duration-300">
                        Posted {moment(post.createdAt).fromNow()}
                      </p>
                    </Link>
                  )),
                )}
            </div>
          )}

          {/* Likes Tab */}
          {activeTab === "likes" && (
            <div className="mt-6 flex flex-col items-center gap-6">
              {/* Summary Stats Card */}
              <div className="w-full bg-white dark:bg-slate-900 rounded-xl shadow p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-500 rounded-full">
                    <Heart className="w-6 h-6 fill-rose-500" />
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Total Likes Received
                    </h3>

                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      Sum of likes across all published posts
                    </p>
                  </div>
                </div>

                <span className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
                  {totalLikesCount}
                </span>
              </div>

              {/* List of Posts with Likes */}
              {postsWithLikes.length > 0 ? (
                postsWithLikes.map((post) => (
                  <PostCard key={post._id} post={post} />
                ))
              ) : (
                <p className="text-gray-500 dark:text-slate-400 py-6">
                  No liked posts to show yet.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEdit && <ProfileModal setShowEdit={setShowEdit} />}
    </div>
  );
};

export default Profile;
