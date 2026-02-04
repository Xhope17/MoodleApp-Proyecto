import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const API_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!API_URL) {
  throw new Error("EXPO_PUBLIC_API_BASE_URL no est\u00e1 definida en .env");
}

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// Agrega el token de autenticación a todas las peticiones
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("userToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Autenticación
export async function loginBackend(username: string, password: string) {
  try {
    const { data } = await api.post("/auth/login", { username, password });
    return data;
  } catch (error: any) {
    return {
      ok: false,
      error: error.response?.data?.error || "Credenciales incorrectas",
    };
  }
}

// Cursos
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

export async function getCourseAssignments(courseId: number) {
  const { data } = await api.get(`/course/${courseId}/assignments`);
  return data.assignments || [];
}

export async function getCourseForums(courseId: number) {
  const { data } = await api.get(`/course/${courseId}/forums`);
  return data.forums || [];
}

// Tareas
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

export async function saveAssignFile(
  assignId: number,
  file: { uri: string; name: string; type?: string },
) {
  try {
    const token = await AsyncStorage.getItem("userToken");
    if (!token) {
      return { ok: false, error: "No hay token de autenticación" };
    }

    let formData = new FormData();

    // Convierte blob para web, usa URI directamente en nativo
    if (file.uri.startsWith("http") || file.uri.startsWith("blob:")) {
      const response = await fetch(file.uri);
      const blob = await response.blob();
      formData.append("file", blob, file.name);
    } else {
      formData.append("file", {
        uri: file.uri,
        name: file.name,
        type: file.type || "application/octet-stream",
      } as any);
    }

    const uploadResult = await fetch(
      `${API_URL}/assign/${assignId}/save-file`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      },
    );

    if (uploadResult.ok) {
      const response = await uploadResult.json();
      return response;
    } else {
      try {
        const errorResponse = await uploadResult.json();
        return {
          ok: false,
          error: errorResponse.error || "Error al subir archivo",
        };
      } catch (e) {
        const errorText = await uploadResult.text();
        return {
          ok: false,
          error: `Error ${uploadResult.status}: ${errorText}`,
        };
      }
    }
  } catch (error: any) {
    return {
      ok: false,
      error: error.message || "Error al subir el archivo",
    };
  }
}

// Foros
export async function getForumDiscussions(forumId: number) {
  const { data } = await api.get(`/forum/${forumId}/discussions`);
  return data.discussions?.discussions ?? data.discussions ?? [];
}

export async function getDiscussionPosts(discussionId: number) {
  const { data } = await api.get(`/discussion/${discussionId}/posts`);
  return data.posts?.posts ?? data.posts ?? [];
}

export async function loginWithGoogle(idToken: string) {
  try {
    const { data } = await api.post("/auth/google", { idToken });
    return data;
  } catch (error: any) {
    return {
      ok: false,
      error: error.response?.data?.error || "Error en autenticación con Google",
    };
  }
}

export async function linkGoogleMoodle(
  idToken: string,
  username: string,
  password: string,
) {
  try {
    const { data } = await api.post("/auth/link-google-moodle", {
      idToken,
      username,
      password,
    });
    return data;
  } catch (error: any) {
    return {
      ok: false,
      error: error.response?.data?.error || "Error vinculando cuentas",
    };
  }
}

export async function replyToPost(
  postid: number,
  subject: string,
  messageHtml: string,
) {
  const { data } = await api.post(`/forum/reply`, {
    postid,
    subject,
    message: messageHtml,
  });
  return data;
}

export default api;
