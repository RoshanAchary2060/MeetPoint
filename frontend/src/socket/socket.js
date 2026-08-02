import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_BASEURL, {
  autoConnect: false,
  transports: ["websocket"],
});

export default socket;
