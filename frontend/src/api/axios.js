import axios from "axios";

const api = axios.create({
  baseURL: "https://meetpoint-server.vercel.app"
});

export default api;
