import express from "express";

import {
  startAudioCall,
  acceptAudioCall,
  rejectAudioCall,
  sendOffer,
  sendAnswer,
  sendIceCandidate,
  endCall,
  cancelCall,
  notifyRinging,
  getPendingCall,
} from "../controllers/callController.js";

import {
  requireAuth,
} from "@clerk/express";

const callRouter =
  express.Router();

callRouter.post(
  "/audio",
  requireAuth(),
  startAudioCall
);

callRouter.post(
  "/accept",
  requireAuth(),
  acceptAudioCall
);

callRouter.post(
  "/reject",
  requireAuth(),
  rejectAudioCall
);

callRouter.post(
  "/offer",
  requireAuth(),
  sendOffer
);

callRouter.post(
  "/answer",
  requireAuth(),
  sendAnswer
);

callRouter.post(
  "/ice-candidate",
  requireAuth(),
  sendIceCandidate
);

callRouter.post(
  "/end",
  requireAuth(),
  endCall
);

callRouter.post(
  "/cancel",
  requireAuth(),
  cancelCall
);

callRouter.post(
  "/ringing",
  requireAuth(),
  notifyRinging
);

callRouter.get(
  "/pending",
  requireAuth(),
  getPendingCall
);

export default callRouter;
