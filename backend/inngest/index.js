import { Inngest } from "inngest";
import User from "../models/User.js";
import Connection from "../models/Connection.js";
import sendEmail from "../configs/nodeMailer.js";
import Story from "../models/Story.js";
import Message from "../models/Message.js";
import Report from "../models/Report.js";
// Create a client to send and receive events
export const inngest = new Inngest({
  id: "meetpoint-app",
});

// Inngest Functions to save user data to a database
const syncUserCreation = inngest.createFunction(
  {
    id: "sync-user-from-clerk",
    triggers: [{ event: "clerk/user.created" }],
  },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } =
      event.data;

    let username = email_addresses[0].email_address.split("@")[0];

    // Check availability of username
    const user = await User.findOne({ username });
    if (user) {
      username = username + Math.floor(Math.random() * 10000);
    }

    const userData = {
      _id: id,
      email: email_addresses[0].email_address,
      full_name: (first_name || "") + " " + (last_name || ""),
      profile_picture: image_url,
      username: username,
    };

    await User.create(userData);
  },
);

const syncUserUpdation = inngest.createFunction(
  {
    id: "update-user-from-clerk",
    triggers: [{ event: "clerk/user.updated" }],
  },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } =
      event.data;

    const updatedUserData = {
      email: email_addresses[0]?.email_address,
      full_name: (first_name || "") + " " + (last_name || ""),
      profile_picture: image_url,
    };

    await User.findByIdAndUpdate(id, updatedUserData);
  },
);

const syncUserDeletion = inngest.createFunction(
  {
    id: "delete-user-with-clerk",
    triggers: [{ event: "clerk/user.deleted" }],
  },
  async ({ event }) => {
    const { id } = event.data;
    await User.findByIdAndDelete(id);
  },
);

// INNGEST FUNCTION TO SEND REMINDER WHEN A NEW CONNECTION REQUEST IS ADDED
const sendNewConnectionRequestReminder = inngest.createFunction(
  {
    id: "send-new-connection-request-reminder",
    triggers: [{ event: "app/connection-request" }],
  },

  async ({ event, step }) => {
    const { connectionId } = event.data;

    // Immediate email when the request is sent
    await step.run("send-connection-request-mail", async () => {
      const connection = await Connection.findById(connectionId).populate(
        "from_user_id to_user_id",
      );
      if (!connection) {
        return { message: "Connection no longer exists" };
      }
      const subject = `👋 New Connection Request`;
      const body = `<div style='font-family: Arial, sans-serif; padding: 20px;'>
        <h2>Hi ${connection.to_user_id.full_name},<h2>
        <p>You have a new connection request from ${connection.from_user_id.full_name} -
        @${connection.from_user_id.full_name}</p>
        <p>Click <a href='${process.env.FRONTEND_URL}/connections' style='color:
        #10b981;'>here</a> to accept or reject the request</p>
        <br/>
        <p>Thanks, <br/>MeetPoint - Stay Connected</p>
        </div>`;

      await sendEmail({
        to: connection.to_user_id.email,
        subject,
        body,
      });
    });

    const in24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await step.sleepUntil("wait-for-24-hours", in24Hours);

    // Reminder email 24 hours later, if still pending
    await step.run("send-connection-request-reminder", async () => {
      const connection = await Connection.findById(connectionId).populate(
        "from_user_id to_user_id",
      );
      if (!connection) {
        return { message: "Connection no longer exists" };
      }
      if (connection.status === "accepted") {
        return { message: "Already accepted" };
      }
      const subject = `👋 New Connection Request`;
      const body = `<div style='font-family: Arial, sans-serif; padding: 20px;'>
        <h2>Hi ${connection.to_user_id.full_name},<h2>
        <p>You have a new connection request from ${connection.from_user_id.full_name} -
        @${connection.from_user_id.full_name}</p>
        <p>Click <a href='${process.env.FRONTEND_URL}/connections' style='color:
        #10b981;'>here</a> to accept or reject the request</p>
        <br/>
        <p>Thanks, <br/>MeetPoint - Stay Connected</p>
        </div>`;
      await sendEmail({
        to: connection.to_user_id.email,
        subject,
        body,
      });
      return { message: "Reminder sent" };
    });
  },
);

// INNGEST FUNCTION TO DELETE STORY AFTER 24 HOURS
const deleteStory = inngest.createFunction(
  {
    id: "story-delete",
    triggers: [{ event: "app/story.delete" }],
  },
  async ({ event, step }) => {
    const { storyId } = event.data;
    const in24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await step.sleepUntil("wait-for-24-hours", in24Hours);
    await step.run("delete-story", async () => {
      await Story.findByIdAndDelete(storyId);
      return { message: "Story deleted" };
    });
  },
);

const sendNotificationOfUnseenMessages = inngest.createFunction(
  {
    id: "send-unseen-messages-notification",
    triggers: [
      {
        cron: "TZ=Asia/Kathmandu 0 21 * * *",
      },
    ],
  },
  async ({ step }) => {
    const messages = await Message.find({ seen: false }).populate("to_user_id");
    const unseenCount = {};
    messages.map((message) => {
      unseenCount[message.to_user_id] =
        (unseenCount[message.to_user_id] || 0) + 1;
    });
    for (const userId in unseenCount) {
      const user = await User.findById(userId);
      if (!user) continue;
      const subject = `📩 You have ${unseenCount[userId]} unseen messages`;
      const body = `
        <div>
        <h2>Hi ${user.full_name},</h2>
        <p>You have ${unseenCount[userId]} unseen messages.</p>
        <p>Click <a href="${process.env.FRONTEND_URL}/messages" style='color:#10b981;">here</a> to view them.</p>
        <br />
        <p>Thanks, <br/>MeetPoint- Stay Connected</p>
        </div>
        `;
      await sendEmail({
        to: user.email,
        subject,
        body,
      });
    }
    return { message: "Unseen messages notification sent" };
  },
);

// INNGEST FUNCTION TO NOTIFY ADMIN WHEN A POST IS REPORTED
const sendPostReportNotification = inngest.createFunction(
  {
    id: "send-post-report-notification",
    triggers: [{ event: "app/post.reported" }],
  },

  async ({ event, step }) => {
    console.log("🚨 REPORT EVENT RECEIVED:", event.data);

    const { reportId } = event.data;

    await step.run("send-post-report-email", async () => {
      console.log("📧 STARTING REPORT EMAIL:", reportId);

      const report = await Report.findById(reportId)
        .populate("reporter")
        .populate({
          path: "post",
          populate: {
            path: "user",
          },
        });

      console.log("📋 REPORT FOUND:", !!report);

      if (!report) {
        console.log("❌ REPORT NOT FOUND:", reportId);
        return { message: "Report no longer exists" };
      }

      console.log("📧 ADMIN EMAIL:", process.env.ADMIN_EMAIL);

      const subject = `🚨 New Post Report - MeetPoint`;

      const body = `
        <div style="
          font-family: Arial, sans-serif;
          max-width: 650px;
          margin: 0 auto;
          padding: 25px;
          color: #1f2937;
        ">

          <h2 style="color: #dc2626;">
            🚨 New Post Report
          </h2>

          <p>
            A new post has been reported on <strong>MeetPoint</strong>.
          </p>

          <hr style="border: 0; border-top: 1px solid #e5e7eb;" />

          <h3>Report Details</h3>

          <p>
            <strong>Subject:</strong> ${report.subject}
          </p>

          <p>
            <strong>Description:</strong><br />
            ${report.description}
          </p>

          <h3>Reporter</h3>

          <p>
            <strong>Name:</strong>
            ${report.reporter?.full_name || "Unknown"}
          </p>

          <p>
            <strong>Username:</strong>
            @${report.reporter?.username || "Unknown"}
          </p>

          <h3>Reported Post</h3>

          <p>
            <strong>Post Owner:</strong>
            ${report.post?.user?.full_name || "Unknown"}
          </p>

          <p>
            <strong>Username:</strong>
            @${report.post?.user?.username || "Unknown"}
          </p>

          <p>
            <strong>Report ID:</strong>
            ${report._id}
          </p>

          <p>
            <strong>Reported At:</strong>
            ${new Date(report.createdAt).toLocaleString("en-NP")}
          </p>

          ${
            report.image_urls?.length
              ? `
                <h3>Evidence Images</h3>

                ${report.image_urls
                  .map(
                    (url, index) => `
                      <p>
                        <a
                          href="${url}"
                          target="_blank"
                          style="color: #4f46e5;"
                        >
                          View Evidence Image ${index + 1}
                        </a>
                      </p>
                    `,
                  )
                  .join("")}
              `
              : `
                <p>
                  <strong>Evidence Images:</strong> None
                </p>
              `
          }

          <hr style="border: 0; border-top: 1px solid #e5e7eb;" />

          <p>
            Please review this report from the MeetPoint Admin Dashboard.
          </p>

          <br />

          <p>
            Thanks,<br />
            <strong>MeetPoint - Stay Connected</strong>
          </p>

        </div>
      `;

      const response = await sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject,
        body,
      });

      console.log("✅ EMAIL SENT:", response.messageId);

      return {
        message: "Admin report notification sent",
      };
    });
  },
);
// Export Inngest functions array
export const functions = [
  syncUserCreation,
  syncUserUpdation,
  syncUserDeletion,
  sendNewConnectionRequestReminder,
  deleteStory,
  sendNotificationOfUnseenMessages,
  sendPostReportNotification,
];
