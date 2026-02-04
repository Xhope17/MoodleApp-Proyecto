import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

export const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!API_BASE) {
  throw new Error("EXPO_PUBLIC_API_BASE_URL no está definida en .env");
}

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
});

// Interceptor: mete token automáticamente en cada request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("userToken");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
    // Alternativa (si quieres): config.headers["x-moodle-token"] = token;
  }
  return config;
});
