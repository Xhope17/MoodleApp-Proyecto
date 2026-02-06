import { useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  getAssignStatus,
  saveAssignCombined,
  saveAssignFile,
  saveAssignText,
} from "../services/moodle";

type EstadoEntrega = "pendiente" | "enviado";

export default function PantallaTarea() {
  const params = useLocalSearchParams();

  const assignIdStr = Array.isArray(params.assignId)
    ? params.assignId[0]
    : (params.assignId as string) || "";
  const nombre = Array.isArray(params.nombre)
    ? params.nombre[0]
    : (params.nombre as string) || "Tarea";
  const assignId = Number(assignIdStr);

  const [loading, setLoading] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [estadoEntrega, setEstadoEntrega] =
    useState<EstadoEntrega>("pendiente");

  // status para detectar tipo de tarea
  const [plugins, setPlugins] = useState<any[]>([]);
  const [ultimoTexto, setUltimoTexto] = useState<string>("");

  //Area de texto online para tareas
  const [textoEntrega, setTextoEntrega] = useState("");

  // Archivo
  const [archivo, setArchivo] = useState<any>(null);
  const [archivosExistentes, setArchivosExistentes] = useState<any[]>([]);

  // Modal de confirmación
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);

  const soportaTexto = useMemo(
    () => plugins?.some((p: any) => p.type === "onlinetext"),
    [plugins],
  );
  const soportaArchivo = useMemo(
    () => plugins?.some((p: any) => p.type === "file"),
    [plugins],
  );

  useEffect(() => {
    verificarEstado();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      verificarEstado();
    }, [assignId]),
  );

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // Obtiene el estado actual de la tarea desde Moodle con reintentos automáticos
  const verificarEstado = async () => {
    setLoading(true);

    try {
      if (!assignId) {
        Alert.alert("Error", "No se recibió el assignId");
        return;
      }

      let lastError: any = null;

      // Reintenta hasta 3 veces en caso de error 500
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const status = await getAssignStatus(assignId);
          const submission = status?.lastattempt?.submission;

          const p = submission?.plugins ?? [];

          setPlugins(p);

          const textSaved =
            p?.find((x: any) => x.type === "onlinetext")?.editorfields?.[0]
              ?.text || "";
          setUltimoTexto(textSaved);
          // Establecer el texto guardado en el área de edición
          if (textSaved) {
            setTextoEntrega(textSaved);
          }

          const filePlugin = p?.find((x: any) => x.type === "file");
          const existingFiles = filePlugin?.fileareas?.[0]?.files || [];
          setArchivosExistentes(existingFiles);

          setEstadoEntrega(
            submission?.status === "submitted" ? "enviado" : "pendiente",
          );

          const tieneTipo = p.some(
            (x: any) => x.type === "onlinetext" || x.type === "file",
          );

          if (tieneTipo) break;

          if (attempt < 3) await sleep(700);
        } catch (e: any) {
          lastError = e;

          const statusCode = e?.response?.status;
          if (statusCode === 500 && attempt < 3) {
            await sleep(700);
            continue;
          }

          break;
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Elimina etiquetas HTML del texto
  const stripHtml = (html: string) =>
    html ? html.replace(/<[^>]+>/g, "") : "";

  // Guarda la entrega de texto en Moodle
  const enviarTexto = async () => {
    try {
      if (!assignId) return Alert.alert("Error", "No se recibió el assignId");
      if (!soportaTexto)
        return Alert.alert(
          "No disponible",
          "Esta tarea no acepta entrega por texto.",
        );
      if (!textoEntrega.trim())
        return Alert.alert("Atención", "Escribe tu entrega antes de enviar.");

      setSubiendo(true);

      const resp = await saveAssignText(assignId, textoEntrega);
      if (!resp?.ok)
        throw new Error(resp?.error || "No se pudo guardar la entrega");

      Alert.alert("Éxito", "Entrega guardada correctamente");
      await verificarEstado();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSubiendo(false);
    }
  };

  // Abre el selector de archivos del dispositivo
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

  // Limpia el archivo actual de la vista para permitir subir uno nuevo
  const confirmarEliminacion = () => {
    setMostrarModalEliminar(false);
    setArchivosExistentes([]);
  };

  // Sube el archivo seleccionado a Moodle
  const enviarArchivo = async () => {
    try {
      if (!assignId) return Alert.alert("Error", "No se recibió el assignId");
      if (!soportaArchivo)
        return Alert.alert(
          "No disponible",
          "Esta tarea no acepta entrega por archivo.",
        );
      if (!archivo) return Alert.alert("Atención", "Selecciona un archivo");

      setSubiendo(true);

      const resp = await saveAssignFile(assignId, {
        uri: archivo.uri,
        name: archivo.name,
        type: archivo.mimeType,
      });

      if (!resp?.ok)
        throw new Error(resp?.error || "No se pudo subir el archivo");

      Alert.alert("Éxito", "Archivo entregado correctamente");
      setArchivo(null);
      await verificarEstado();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSubiendo(false);
    }
  };

  // Envía texto y/o archivo según lo que esté disponible
  const enviarEntregaCombinada = async () => {
    try {
      if (!assignId) return Alert.alert("Error", "No se recibió el assignId");

      const tieneTexto = textoEntrega && textoEntrega.trim().length > 0;
      const tieneArchivo = archivo !== null;

      if (!tieneTexto && !tieneArchivo) {
        return Alert.alert(
          "Atención",
          "Escribe un texto o selecciona un archivo para entregar.",
        );
      }

      setSubiendo(true);

      const resp = await saveAssignCombined(assignId, {
        text: tieneTexto ? textoEntrega : undefined,
        file: tieneArchivo
          ? {
              uri: archivo.uri,
              name: archivo.name,
              type: archivo.mimeType,
            }
          : undefined,
      });

      if (!resp?.ok)
        throw new Error(resp?.error || "No se pudo guardar la entrega");

      Alert.alert("Éxito", "Entrega guardada correctamente");
      setArchivo(null);
      await verificarEstado();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSubiendo(false);
    }
  };

  // Muestra indicador de carga mientras se obtiene el estado
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

      {/* Modal de confirmación para eliminar */}
      <Modal
        transparent
        visible={mostrarModalEliminar}
        animationType="fade"
        onRequestClose={() => setMostrarModalEliminar(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cambiar archivo</Text>
            <Text style={styles.modalMessage}>
              Al seleccionar y entregar un nuevo archivo, este reemplazará al
              actual.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setMostrarModalEliminar(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDelete]}
                onPress={confirmarEliminacion}
              >
                <Text style={styles.modalButtonTextDelete}>Continuar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.card}>
        <Text style={styles.titulo}>{nombre}</Text>

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
            <Text style={styles.iconoExito}>✓</Text>
            <Text style={styles.textoExito}>Tarea enviada</Text>
            <Text style={styles.subtexto}>
              Tu entrega ya quedó registrada en Moodle.
            </Text>

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

                {/* Botón solo para texto cuando NO hay soporte de archivo */}
                {!soportaArchivo && (
                  <TouchableOpacity
                    style={[
                      styles.botonEnviar,
                      subiendo && styles.botonDesactivado,
                    ]}
                    onPress={enviarTexto}
                    disabled={subiendo}
                  >
                    {subiendo ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.textoBoton}>Guardar texto</Text>
                    )}
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* ====== ARCHIVO ====== */}
            {soportaArchivo && (
              <View style={{ marginTop: soportaTexto ? 22 : 0 }}>
                <Text style={styles.label}>Entrega por archivo:</Text>

                {archivosExistentes.length > 0 && (
                  <View style={{ marginBottom: 12 }}>
                    <Text
                      style={{ fontSize: 12, color: "#666", marginBottom: 6 }}
                    >
                      Archivo actual:
                    </Text>
                    {archivosExistentes.map((file, index) => (
                      <View
                        key={index}
                        style={[
                          styles.fileCard,
                          { backgroundColor: "#e7f5ff" },
                        ]}
                      >
                        <Text style={styles.fileName} numberOfLines={1}>
                          {file.filename}
                        </Text>
                        <TouchableOpacity
                          onPress={() => setMostrarModalEliminar(true)}
                        >
                          <Text
                            style={[styles.removeText, { color: "#d63031" }]}
                          >
                            ✕
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                    <Text style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
                      Para reemplazar, selecciona un nuevo archivo
                    </Text>
                  </View>
                )}

                {archivo ? (
                  <View style={styles.fileCard}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {archivo.name}
                    </Text>
                    <TouchableOpacity onPress={() => setArchivo(null)}>
                      <Text style={styles.removeText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={seleccionarArchivo}
                  >
                    <Text style={styles.uploadText}>Seleccionar archivo</Text>
                  </TouchableOpacity>
                )}

                {/* Botón solo para archivo cuando NO hay soporte de texto */}
                {!soportaTexto && (
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
                      <Text style={styles.textoBoton}>Entregar</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* ====== BOTÓN COMBINADO cuando soporta TEXTO Y ARCHIVO ====== */}
            {soportaTexto && soportaArchivo && (
              <TouchableOpacity
                style={[
                  styles.botonEnviar,
                  { backgroundColor: "#0056b3", marginTop: 25 },
                  subiendo && styles.botonDesactivado,
                ]}
                onPress={enviarEntregaCombinada}
                disabled={subiendo}
              >
                {subiendo ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.textoBoton}>Guardar entrega</Text>
                )}
              </TouchableOpacity>
            )}

            {!soportaTexto && !soportaArchivo && (
              <Text style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
                No se detectó tipo de entrega. Revisa el status del assign.
              </Text>
            )}

            <Text style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
              {soportaTexto && soportaArchivo
                ? "Nota: Puedes entregar texto, archivo o ambos."
                : "Nota: Presiona entregar una vez cargado el archivo."}
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
  removeText: {
    color: "#d32f2f",
    fontWeight: "bold",
    padding: 5,
    fontSize: 18,
  },

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

  zonaExito: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "#d4edda",
    borderRadius: 10,
  },
  iconoExito: { fontSize: 50, marginBottom: 10 },
  textoExito: { color: "#155724", fontWeight: "bold", fontSize: 18 },
  subtexto: {
    color: "#155724",
    marginTop: 5,
    fontSize: 14,
    textAlign: "center",
  },

  botonReenviar: {
    marginTop: 15,
    padding: 10,
    backgroundColor: "#fff3cd",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ffc107",
  },
  textoBotonReenviar: { color: "#856404", fontWeight: "bold" },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 25,
    width: "85%",
    maxWidth: 400,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: "#666",
    marginBottom: 25,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  modalButtonCancel: {
    backgroundColor: "#f0f0f0",
  },
  modalButtonDelete: {
    backgroundColor: "#d63031",
  },
  modalButtonTextCancel: {
    color: "#666",
    fontWeight: "bold",
    fontSize: 16,
  },
  modalButtonTextDelete: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});
