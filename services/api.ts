import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Usa la IP de tu PC en la red (la misma que usas para el backend).
export const API_BASE = "http://192.168.100.67:3000";

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
