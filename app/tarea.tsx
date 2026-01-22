import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { getAssignStatus, saveAssignText, saveAssignFile } from "../services/moodle";
import { useFocusEffect } from "@react-navigation/native";


type EstadoEntrega = "pendiente" | "enviado";

export default function PantallaTarea() {
  const params = useLocalSearchParams();

  const assignIdStr = Array.isArray(params.assignId) ? params.assignId[0] : (params.assignId as string) || "";
  const nombre = Array.isArray(params.nombre) ? params.nombre[0] : (params.nombre as string) || "Tarea";
  const assignId = Number(assignIdStr);
  console.log("ASSIGN ID (instance):", assignId);


  const [loading, setLoading] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [estadoEntrega, setEstadoEntrega] = useState<EstadoEntrega>("pendiente");

  // status para detectar tipo de tarea
  const [plugins, setPlugins] = useState<any[]>([]);
  const [ultimoTexto, setUltimoTexto] = useState<string>("");

  // Texto online
  const [textoEntrega, setTextoEntrega] = useState("<p>Entrega desde Expo ✅</p>");

  // Archivo
  const [archivo, setArchivo] = useState<any>(null);

  const soportaTexto = useMemo(() => plugins?.some((p: any) => p.type === "onlinetext"), [plugins]);
  const soportaArchivo = useMemo(() => plugins?.some((p: any) => p.type === "file"), [plugins]);

  useEffect(() => {
  verificarEstado();
}, []);

useFocusEffect(
  React.useCallback(() => {
    verificarEstado();
  }, [assignId])
);


const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const verificarEstado = async () => {
  setLoading(true);

  try {
    if (!assignId) {
      Alert.alert("Error", "No se recibió el assignId");
      return;
    }

    let lastError: any = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const status = await getAssignStatus(assignId);
        const submission = status?.lastattempt?.submission;

        const p = submission?.plugins ?? [];
        setPlugins(p);

        const textSaved =
          p?.find((x: any) => x.type === "onlinetext")?.editorfields?.[0]?.text || "";
        setUltimoTexto(textSaved);

        setEstadoEntrega(submission?.status === "submitted" ? "enviado" : "pendiente");

        // Si ya detectamos tipo, terminamos
        const tieneTipo = p.some((x: any) => x.type === "onlinetext" || x.type === "file");
        if (tieneTipo) return;

        // Si aún no hay tipo, esperamos y reintentamos
        if (attempt < 3) await sleep(700);
      } catch (e: any) {
        lastError = e;

        // ✅ si es 500 temporal, reintenta sin ensuciar consola
        const statusCode = e?.response?.status;
        if (statusCode === 500 && attempt < 3) {
          await sleep(700);
          continue;
        }

        // si no es 500, o ya fue el último intento, rompemos
        break;
      }
    }

    // Solo aquí mostramos error si falló todo
    if (lastError) {
      console.log("Status error (final):", lastError?.response?.data || lastError?.message);
      // Si quieres, muestra alert:
      // Alert.alert("Error", "No se pudo cargar el estado de la tarea.");
    }
  } finally {
    setLoading(false);
  }
};


  const stripHtml = (html: string) => (html ? html.replace(/<[^>]+>/g, "") : "");

  // ========= TEXTO =========
  const enviarTexto = async () => {
    try {
      if (!assignId) return Alert.alert("Error", "No se recibió el assignId");
      if (!soportaTexto) return Alert.alert("No disponible", "Esta tarea no acepta entrega por texto.");
      if (!textoEntrega.trim()) return Alert.alert("Atención", "Escribe tu entrega antes de enviar.");

      setSubiendo(true);

      const resp = await saveAssignText(assignId, textoEntrega);
      if (!resp?.ok) throw new Error(resp?.error || "No se pudo guardar la entrega");

      Alert.alert("¡Éxito!", "Entrega guardada ✅");
      await verificarEstado();
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", e.message);
    } finally {
      setSubiendo(false);
    }
  };

  // ========= ARCHIVO =========
  const seleccionarArchivo = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (!r.canceled && r.assets?.length) {
        setArchivo(r.assets[0]);
      }
    } catch (e: any) {
      Alert.alert("Error", "No se pudo seleccionar el archivo");
    }
  };

  const enviarArchivo = async () => {
    try {
      if (!assignId) return Alert.alert("Error", "No se recibió el assignId");
      if (!soportaArchivo) return Alert.alert("No disponible", "Esta tarea no acepta entrega por archivo.");
      if (!archivo) return Alert.alert("Atención", "Selecciona un archivo");

      setSubiendo(true);

      const resp = await saveAssignFile(assignId, {
        uri: archivo.uri,
        name: archivo.name,
        type: archivo.mimeType,
      });

      if (!resp?.ok) throw new Error(resp?.error || "No se pudo subir el archivo");

      Alert.alert("¡Éxito!", "Archivo entregado ✅");
      setArchivo(null);
      await verificarEstado();
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", e.message);
    } finally {
      setSubiendo(false);
    }
  };

  // ========= UI =========
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0056b3" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: "Entrega de Tarea" }} />

      <View style={styles.card}>
        <Text style={styles.titulo}>{nombre}</Text>

        <Text style={{ color: "#666", marginTop: 6 }}>
          Último texto guardado:{" "}
          {ultimoTexto ? `"${stripHtml(ultimoTexto).slice(0, 60)}..."` : "(vacío)"}
        </Text>

        <Text style={{ color: "#666", marginTop: 6 }}>
          Tipo de entrega:{" "}
          {soportaTexto && soportaArchivo
            ? "Texto + Archivo"
            : soportaArchivo
            ? "Archivo"
            : soportaTexto
            ? "Texto"
            : "No detectado"}
        </Text>

        <View style={styles.separator} />

        {estadoEntrega === "enviado" ? (
          <View style={styles.zonaExito}>
            <Text style={styles.iconoExito}>✅</Text>
            <Text style={styles.textoExito}>Tarea enviada</Text>
            <Text style={styles.subtexto}>Tu entrega ya quedó registrada en Moodle.</Text>

            <TouchableOpacity
              style={styles.botonReenviar}
              onPress={() => setEstadoEntrega("pendiente")}
            >
              <Text style={styles.textoBotonReenviar}>Editar / reenviar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ====== TEXTO ====== */}
            {soportaTexto && (
              <>
                <Text style={styles.label}>Entrega (texto online):</Text>

                <TextInput
                  value={textoEntrega}
                  onChangeText={setTextoEntrega}
                  multiline
                  style={styles.textArea}
                  placeholder="Escribe aquí tu entrega..."
                />

                <TouchableOpacity
                  style={[styles.botonEnviar, subiendo && styles.botonDesactivado]}
                  onPress={enviarTexto}
                  disabled={subiendo}
                >
                  {subiendo ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.textoBoton}>Guardar texto 🚀</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* ====== ARCHIVO ====== */}
            {soportaArchivo && (
              <View style={{ marginTop: 22 }}>
                <Text style={styles.label}>Entrega por archivo:</Text>

                {archivo ? (
                  <View style={styles.fileCard}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      📄 {archivo.name}
                    </Text>
                    <TouchableOpacity onPress={() => setArchivo(null)}>
                      <Text style={styles.removeText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.uploadButton} onPress={seleccionarArchivo}>
                    <Text style={styles.uploadText}>📂 Seleccionar Archivo</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.botonEnviar,
                    { backgroundColor: "#0056b3" },
                    subiendo && styles.botonDesactivado,
                  ]}
                  onPress={enviarArchivo}
                  disabled={subiendo}
                >
                  {subiendo ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.textoBoton}>Entregar archivo 🚀</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {!soportaTexto && !soportaArchivo && (
              <Text style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
                No se detectó tipo de entrega. Revisa el status del assign.
              </Text>
            )}

            <Text style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
              Nota: En tu Moodle, guardar la entrega puede marcarla como "submitted".
            </Text>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: "#f4f6f8" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, color: "#666", fontSize: 14 },

  card: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 15,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  titulo: { fontSize: 22, fontWeight: "bold", color: "#333", marginBottom: 10 },
  separator: { height: 1, backgroundColor: "#eee", marginVertical: 20 },

  label: { fontSize: 16, fontWeight: "bold", marginBottom: 8, color: "#333" },

  textArea: {
    borderWidth: 1,
    borderColor: "#cbd3da",
    borderRadius: 10,
    padding: 12,
    minHeight: 140,
    textAlignVertical: "top",
    backgroundColor: "#fff",
  },

  uploadButton: {
    backgroundColor: "#e9ecef",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    borderStyle: "dashed",
    borderWidth: 2,
    borderColor: "#cbd3da",
    marginTop: 10,
  },
  uploadText: { color: "#495057", fontWeight: "bold" },

  fileCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#e3f2fd",
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  fileName: { color: "#0056b3", fontWeight: "bold", maxWidth: "85%" },
  removeText: { color: "#d32f2f", fontWeight: "bold", padding: 5, fontSize: 18 },

  botonEnviar: {
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
    elevation: 2,
  },
  botonDesactivado: { backgroundColor: "#a5d6a7" },
  textoBoton: { color: "white", fontWeight: "bold", fontSize: 16 },

  zonaExito: { alignItems: "center", padding: 20, backgroundColor: "#d4edda", borderRadius: 10 },
  iconoExito: { fontSize: 50, marginBottom: 10 },
  textoExito: { color: "#155724", fontWeight: "bold", fontSize: 18 },
  subtexto: { color: "#155724", marginTop: 5, fontSize: 14, textAlign: "center" },

  botonReenviar: {
    marginTop: 15,
    padding: 10,
    backgroundColor: "#fff3cd",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ffc107",
  },
  textoBotonReenviar: { color: "#856404", fontWeight: "bold" },
});
