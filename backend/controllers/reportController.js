import imagekit from "../configs/imageKit.js";
import Post from "../models/Post.js";
import Report from "../models/Report.js";
import { inngest } from "../inngest/index.js";

// ============================================================
// REPORT POST
// ============================================================

export const reportPost = async (req, res) => {
  try {
    const { userId } = req.auth();

    const { postId, subject, description } = req.body;

    const images = req.files || [];

    // ----------------------------------------------------------
    // VALIDATION
    // ----------------------------------------------------------

    if (!postId) {
      return res.json({
        success: false,
        message: "Post ID is required",
      });
    }

    if (!subject?.trim()) {
      return res.json({
        success: false,
        message: "Report subject is required",
      });
    }

    if (!description?.trim()) {
      return res.json({
        success: false,
        message: "Report description is required",
      });
    }

    // ----------------------------------------------------------
    // CHECK POST
    // ----------------------------------------------------------

    const post = await Post.findById(postId);

    if (!post) {
      return res.json({
        success: false,
        message: "Post not found",
      });
    }

    // ----------------------------------------------------------
    // DON'T ALLOW USER TO REPORT THEIR OWN POST
    // ----------------------------------------------------------

    if (post.user === userId) {
      return res.json({
        success: false,
        message: "You cannot report your own post",
      });
    }

    // ----------------------------------------------------------
    // CHECK DUPLICATE REPORT
    // ----------------------------------------------------------

    const existingReport = await Report.findOne({
      reporter: userId,
      post: postId,
    });

    if (existingReport) {
      return res.json({
        success: false,
        message: "You have already reported this post",
      });
    }

    // ----------------------------------------------------------
    // UPLOAD EVIDENCE IMAGES TO IMAGEKIT
    // ----------------------------------------------------------

    let image_urls = [];

    if (images.length > 0) {
      image_urls = await Promise.all(
        images.map(async (image) => {
          const base64File = image.buffer.toString("base64");

          const response = await imagekit.files.upload({
            file: base64File,
            fileName: image.originalname || `report_${Date.now()}.jpg`,
            folder: "reports",
          });

          const url = imagekit.url
            ? imagekit.url({
                path: response.filePath,
                transformation: [
                  { quality: "auto" },
                  { format: "webp" },
                  { width: "1280" },
                ],
              })
            : response.url;

          return url;
        }),
      );
    }

    // ----------------------------------------------------------
    // CREATE REPORT
    // ----------------------------------------------------------

    // ----------------------------------------------------------
    // CREATE REPORT
    // ----------------------------------------------------------

    const report = await Report.create({
      reporter: userId,
      post: postId,
      subject: subject.trim(),
      description: description.trim(),
      image_urls,
    });

    // ----------------------------------------------------------
    // SEND REPORT EVENT TO INNGEST
    // ----------------------------------------------------------

    await inngest.send({
      name: "app/post.reported",
      data: {
        reportId: report._id.toString(),
      },
    });

    return res.json({
      success: true,
      message: "Report submitted successfully",
    });
  } catch (error) {
    console.error("Report post error:", error);

    // Handle duplicate index race condition
    if (error.code === 11000) {
      return res.json({
        success: false,
        message: "You have already reported this post",
      });
    }

    return res.json({
      success: false,
      message: error.message,
    });
  }
};
