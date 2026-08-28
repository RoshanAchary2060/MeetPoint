import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 2525,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

const sendEmail = async ({ to, subject, body }) => {
  try {
    console.log("📨 SENDING EMAIL...");
    console.log("📨 FROM:", process.env.SENDER_EMAIL);
    console.log("📨 TO:", to);

    const response = await transporter.sendMail({
      from: process.env.SENDER_EMAIL,
      to,
      subject,
      html: body,
    });

    console.log("✅ NODEMAILER SUCCESS:", response.messageId);

    return response;
  } catch (error) {
    console.error("❌ NODEMAILER ERROR:", error);
    throw error;
  }
};

export default sendEmail;
