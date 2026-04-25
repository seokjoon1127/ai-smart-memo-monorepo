import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const userId = import.meta.env.VITE_DEMO_USER_ID ?? "demo-user";

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

export const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
    "X-User-Id": userId,
  },
});
