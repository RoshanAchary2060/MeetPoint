import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./configs/db.js";
import { functions } from "./inngest/index.js";
import { inngest } from "./inngest/index.js";
import { serve } from "inngest/express";
import { clerkMiddleware } from "@clerk/express";
import userRouter from "./routes/userRoutes.js";
import User from "./models/User.js";

const app = express();

await connectDB();

app.use(express.json());
app.use(cors());
app.use(clerkMiddleware());

app.get("/", (req, resp) => resp.send("Server is running"));
app.get("/test", async (req, res) => {
  const user = await User.create({
    _id: "test123",
    email: "test@test.com",
    full_name: "Test User",
    username: "test123",
  });

  console.log(user);

  res.json(user);
});
app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/user", userRouter);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => console.log("Server is running on port ", PORT));
