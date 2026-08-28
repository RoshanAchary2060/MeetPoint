import { useState } from "react";
import { X, ImagePlus, Trash2 } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import api from "../api/axios";

const ReportModal = ({ post, onClose }) => {
  const { getToken } = useAuth();

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e) => {
    const selectedFiles = Array.from(e.target.files);

    if (selectedFiles.length > 5) {
      toast.error("You can upload a maximum of 5 images.");
      return;
    }

    setImages(selectedFiles);
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!subject.trim()) {
      toast.error("Please enter a report subject.");
      return;
    }

    if (!description.trim()) {
      toast.error("Please enter a description.");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();

      formData.append("postId", post._id);
      formData.append("subject", subject.trim());
      formData.append("description", description.trim());

      images.forEach((image) => {
        formData.append("images", image);
      });

      const { data } = await api.post("/api/report/post", formData, {
        headers: {
          Authorization: `Bearer ${await getToken()}`,
        },
      });

      if (data.success) {
        toast.success(data.message || "Report submitted successfully.");
        onClose();
      } else {
        toast.error(data.message || "Unable to submit report.");
      }
    } catch (error) {
      console.error("Report error:", error);

      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Unable to submit report.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="
        fixed
        inset-0
        `z-[9999]`
        bg-black/60
        backdrop-blur-sm
        flex
        items-center
        justify-center
        p-4
      "
      onClick={onClose}
    >
      <div
        className="
          w-full
          max-w-lg
          bg-white
          dark:bg-slate-900
          rounded-2xl
          shadow-2xl
          border
          border-gray-200
          dark:border-slate-700
          overflow-hidden
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}

        <div
          className="
            flex
            items-center
            justify-between
            px-5
            py-4
            border-b
            border-gray-200
            dark:border-slate-700
          "
        >
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
              Report Post
            </h2>

            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              Tell us why you are reporting this post.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              p-2
              rounded-full
              hover:bg-gray-100
              dark:hover:bg-slate-800
              transition
              cursor-pointer
            "
          >
            <X className="w-5 h-5 text-gray-500 dark:text-slate-400" />
          </button>
        </div>

        {/* FORM */}

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* SUBJECT */}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
              Report Subject
            </label>

            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Harassment, Spam, Fake information..."
              maxLength={100}
              className="
                w-full
                px-4
                py-3
                rounded-xl
                border
                border-gray-300
                dark:border-slate-700
                bg-white
                dark:bg-slate-800
                text-slate-800
                dark:text-white
                outline-none
                focus:ring-2
                focus:ring-indigo-500
                transition
              "
            />
          </div>

          {/* DESCRIPTION */}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
              Description
            </label>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please explain why this post should be reviewed..."
              rows={5}
              maxLength={1000}
              className="
                w-full
                px-4
                py-3
                rounded-xl
                border
                border-gray-300
                dark:border-slate-700
                bg-white
                dark:bg-slate-800
                text-slate-800
                dark:text-white
                outline-none
                resize-none
                focus:ring-2
                focus:ring-indigo-500
                transition
              "
            />

            <div className="text-right text-xs text-gray-400 mt-1">
              {description.length}/1000
            </div>
          </div>

          {/* IMAGES */}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
              Evidence Images
              <span className="text-gray-400 font-normal ml-1">(Optional)</span>
            </label>

            <label
              className="
                flex
                items-center
                justify-center
                gap-2
                w-full
                py-3
                border-2
                border-dashed
                border-gray-300
                dark:border-slate-700
                rounded-xl
                cursor-pointer
                hover:border-indigo-500
                hover:bg-indigo-50
                dark:hover:bg-slate-800
                transition
              "
            >
              <ImagePlus className="w-5 h-5 text-indigo-500" />

              <span className="text-sm text-gray-600 dark:text-slate-300">
                Add screenshots or evidence
              </span>

              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={handleImageChange}
              />
            </label>

            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {images.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(image)}
                      alt=""
                      className="
                        w-full
                        h-24
                        object-cover
                        rounded-lg
                      "
                    />

                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="
                        absolute
                        top-1
                        right-1
                        p-1
                        rounded-full
                        bg-black/60
                        text-white
                        opacity-0
                        group-hover:opacity-100
                        transition
                        cursor-pointer
                      "
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-400 mt-2">
              You can upload up to 5 images.
            </p>
          </div>

          {/* BUTTONS */}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="
                px-5
                py-2.5
                rounded-xl
                border
                border-gray-300
                dark:border-slate-700
                text-gray-700
                dark:text-slate-300
                hover:bg-gray-100
                dark:hover:bg-slate-800
                transition
                cursor-pointer
              "
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="
                px-5
                py-2.5
                rounded-xl
                bg-indigo-600
                hover:bg-indigo-700
                text-white
                transition
                cursor-pointer
                disabled:opacity-50
                disabled:cursor-not-allowed
              "
            >
              {loading ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportModal;
