import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// AJUSTA TU IP AQUÍ
const API_URL = "http://192.168.100.67:3000";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("userToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// AUTENTICACIÓN
export async function loginBackend(username: string, password: string) {
  try {
    const { data } = await api.post("/auth/login", { username, password });
    return data; 
  } catch (error: any) {
    return { ok: false, error: error.response?.data?.error || "Credenciales incorrectas" };
  }
}

// CURSOS Y CONTENIDOS
export async function getCourses() {
  const { data } = await api.get("/courses");
  return data.courses || [];
}

export async function getCourseContents(courseId: number) {
  const { data } = await api.get(`/course/${courseId}/contents`);
  return data.contents || [];
}

export async function getCourseGrades(courseId: number) {
  const { data } = await api.get(`/course/${courseId}/grades`);
  return data.grades || [];
}

// 3. TAREAS
export async function getAssignStatus(assignId: number) {
  const { data } = await api.get(`/assign/${assignId}/status`);
  return data.status;
}

export async function saveAssignText(assignId: number, text: string) {
  const { data } = await api.post(`/assign/${assignId}/save-text`, { text });
  return data;
}

export async function submitAssign(assignId: number) {
  const { data } = await api.post(`/assign/${assignId}/submit`);
  return data;
}

export async function saveAssignFile(assignId: number, file: { uri: string; name: string; type?: string }) {
  const form = new FormData();
  // @ts-ignore
  form.append("file", { 
    uri: file.uri, 
    name: file.name, 
    type: file.type || "application/octet-stream" 
  });

  const token = await AsyncStorage.getItem("userToken");
  
  const res = await fetch(`${API_URL}/assign/${assignId}/save-file`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });

  return await res.json();
}

// FOROS
export async function getForumDiscussions(forumId: number) {
  const { data } = await api.get(`/forum/${forumId}/discussions`);
  return data.discussions?.discussions ?? data.discussions ?? [];
}

export async function getDiscussionPosts(discussionId: number) {
  const { data } = await api.get(`/discussion/${discussionId}/posts`);
  return data.posts?.posts ?? data.posts ?? [];
}

export async function replyToPost(postid: number, subject: string, messageHtml: string) {
  const { data } = await api.post(`/forum/reply`, {
    postid,
    subject,
    message: messageHtml,
  });
  return data;
}

export default api;