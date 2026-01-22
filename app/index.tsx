import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useGoogleAuth } from "../services/googleAuth"; // ajusta ruta



// ✅ tu backend (NO localhost en Expo Go)
const API_BASE = "http://192.168.100.67:3000";

// ✅ tu Web Client ID (Google Cloud)
const GOOGLE_WEB_CLIENT_ID =
  "804526717040-4djo8lau6q1dsfur3d8p8s7phn7fcejh.apps.googleusercontent.com";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  // ✅ redirectUri usando PROXY de Expo (Expo Go)
 const { request, response, promptAsync, redirectUri } = useGoogleAuth();


  useEffect(() => {
    //checkToken();
    console.log("✅ redirectUri usado:", redirectUri);
  }, []);

  const checkToken = async () => {
    try {
      const tokenGuardado = await AsyncStorage.getItem("userToken");
      if (tokenGuardado) {
        router.replace("/cursos");
        return;
      }
    } finally {
      setVerificando(false);
    }
  };

  const saveSession = async (payload: { token: string; userId: number | string; username: string; fullName: string }) => {
    await AsyncStorage.multiSet([
      ["userToken", payload.token],
      ["userId", String(payload.userId)],
      ["userName", payload.username || ""],
      ["fullName", payload.fullName || ""],
    ]);
  };

  // ✅ LOGIN NORMAL vía backend
  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Error", "Ingresa usuario y contraseña");
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post(`${API_BASE}/auth/login`, { username, password });

      if (!data?.ok) throw new Error(data?.error || "No se pudo iniciar sesión");

      await saveSession({
        token: data.token,
        userId: data.userId,
        username: data.username,
        fullName: data.fullName,
      });

      router.replace("/cursos");
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.error || e.message || "Error de login");
    } finally {
      setLoading(false);
    }
  };

  // ✅ cuando Google responda
  useEffect(() => {
    (async () => {
      if (response?.type !== "success") return;

      try {
        setLoadingGoogle(true);

        const accessToken = response.authentication?.accessToken;
        if (!accessToken) throw new Error("Google no devolvió accessToken");

        // 1) obtener email desde Google
        const { data: gUser } = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        const email = gUser?.email;
        if (!email) throw new Error("No se pudo obtener el email desde Google");

        // 2) validar si existe usuario Moodle con ese email
        const { data: link } = await axios.post(`${API_BASE}/auth/google-link`, { email });

        if (!link?.ok) {
          Alert.alert(
            "No encontrado",
            "Ese correo de Google no está registrado en Moodle. Crea un usuario en Moodle con ese mismo correo."
          );
          return;
        }

        // 3) Autocompletamos username Moodle y pedimos contraseña Moodle
        setUsername(link.username || "");
        Alert.alert(
          "Google OK ✅",
          `Correo validado: ${email}\n\nAhora ingresa tu contraseña de Moodle para terminar el inicio de sesión.`
        );
      } catch (e: any) {
        Alert.alert("Error Google", e?.response?.data?.error || e.message || "Error con Google");
      } finally {
        setLoadingGoogle(false);
      }
    })();
  }, [response]);

  const handleGoogle = async () => {
    try {
      setLoadingGoogle(true);

      // ✅ En algunas versiones TS se queja de useProxy
      // ✅ Con redirectUri ya es suficiente, pero si quieres forzar proxy:
      // await promptAsync({ useProxy: true } as any);

      await promptAsync(); // ✅ OK (ya tenemos redirectUri con proxy)
    } catch (e: any) {
      Alert.alert("Error", e.message || "No se pudo abrir Google");
    } finally {
      setLoadingGoogle(false);
    }
  };

  if (verificando) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Verificando sesión...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.titulo}>🎓 Aula Virtual</Text>
        <Text style={styles.subtitulo}>Ingeniería de Software</Text>

        {/* ✅ BOTÓN GOOGLE */}
        <TouchableOpacity
          style={[styles.botonGoogle, (!request || loadingGoogle) && styles.botonDesactivado]}
          onPress={handleGoogle}
          disabled={!request || loadingGoogle}
        >
          {loadingGoogle ? <ActivityIndicator color="#000" /> : <Text style={styles.textoGoogle}>Continuar con Google</Text>}
        </TouchableOpacity>

        <View style={{ height: 10 }} />
        <Text style={{ textAlign: "center", color: "#999" }}>— o —</Text>
        <View style={{ height: 10 }} />

        <Text style={styles.label}>Usuario</Text>
        <TextInput
          style={styles.input}
          placeholder="ej. estudiante1"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput style={styles.input} placeholder="••••••••" value={password} onChangeText={setPassword} secureTextEntry />

        <TouchableOpacity style={[styles.boton, loading && styles.botonDesactivado]} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.textoBoton}>Iniciar Sesión 🚀</Text>}
        </TouchableOpacity>

        {/* Opcional: para debug rápido */}
        {/* <Text style={{ marginTop: 10, color: "#999", fontSize: 12 }}>redirectUri: {redirectUri}</Text> */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0056b3", justifyContent: "center", padding: 20 },
  loadingText: { color: "white", marginTop: 10, fontSize: 14 },
  card: {
    backgroundColor: "white",
    padding: 30,
    borderRadius: 20,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  titulo: { fontSize: 28, fontWeight: "bold", color: "#333", textAlign: "center", marginBottom: 5 },
  subtitulo: { fontSize: 16, color: "#666", textAlign: "center", marginBottom: 20 },

  botonGoogle: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  textoGoogle: { color: "#111", fontWeight: "700", fontSize: 16 },

  label: { fontSize: 14, fontWeight: "600", color: "#444", marginBottom: 5, marginLeft: 5 },
  input: {
    backgroundColor: "#f0f2f5",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  boton: { backgroundColor: "#0056b3", padding: 15, borderRadius: 10, alignItems: "center", marginTop: 10, elevation: 3 },
  botonDesactivado: { opacity: 0.6 },
  textoBoton: { color: "white", fontWeight: "bold", fontSize: 18 },
});
