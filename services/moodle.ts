import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, API_BASE } from "./api";

// Google -> verificar si existe en Moodle por email (usa token admin en backend)
export async function googleLink(email: string) {
  const { data } = await api.post("/auth/google-link", { email });
  return data; // { ok, userid, username, email, fullname } o { ok:false, error }
}

// Login normal (multiusuario) -> obtener token real del usuario
export async function loginBackend(username: string, password: string) {
  const { data } = await api.post("/auth/login", { username, password });
  return data; // { ok:true, token, userId, username, fullName... }
}

export async function getCourses() {
  const { data } = await api.get("/courses");
  return data.courses;
}

export async function getCourseContents(courseId: number) {
  const { data } = await api.get(`/course/${courseId}/contents`);
  return data.contents;
}

// ✅ TAREAS
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

// ✅ FOROS
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

// ✅ Archivos (tarea tipo file) - usando fetch pero con Authorization
export async function saveAssignFile(assignId: number, file: { uri: string; name: string; type?: string }) {
  const form = new FormData();
  form.append("file", { uri: file.uri, name: file.name, type: file.type || "application/octet-stream" } as any);

  const token = await AsyncStorage.getItem("userToken");

  const res = await fetch(`http://192.168.100.67:3000/assign/${assignId}/save-file`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });

  return await res.json();
}


export async function getCourseGrades(courseId: number) {
  const { data } = await api.get(`/course/${courseId}/grades`);
  return data.grades;
}
