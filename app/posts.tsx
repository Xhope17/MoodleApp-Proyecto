import { Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { getDiscussionPosts, replyToPost } from "../services/moodle";

export default function Posts() {
  const params = useLocalSearchParams();
  const discussionIdStr = Array.isArray(params.discussionId)
    ? params.discussionId[0]
    : (params.discussionId as string);
  const subject = Array.isArray(params.subject)
    ? params.subject[0]
    : (params.subject as string) || "Discusión";

  const discussionId = Number(discussionIdStr);

  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Elimina etiquetas HTML del texto
  const cleanHtml = (html: string) =>
    html ? html.replace(/<[^>]+>/g, "").trim() : "";

  // Formatea timestamp a fecha legible
  const formatDate = (timestamp: number) =>
    new Date(timestamp * 1000).toLocaleString();

  // Carga los posts de la discusión
  async function load() {
    setLoading(true);
    try {
      const p = await getDiscussionPosts(discussionId);
      setPosts(p);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [discussionId]);

  // Envía una respuesta al último post de la discusión
  async function onReply() {
    if (!message.trim()) return Alert.alert("Ups", "Escribe un mensaje.");
    if (!posts.length)
      return Alert.alert("Error", "No hay posts para responder.");

    const parentPostId = posts[posts.length - 1].id;

    try {
      setSending(true);
      const resp = await replyToPost(
        parentPostId,
        `Re: ${subject}`,
        `<p>${message}</p>`,
      );
      if (!resp.ok) throw new Error(resp.error || "No se pudo responder");
      setMessage("");
      await load();
      Alert.alert("Listo", "Respuesta enviada");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <Stack.Screen options={{ title: "Posts" }} />

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.subject}>{item.subject}</Text>
              <Text style={styles.meta}>
                {item.author?.fullname} • {formatDate(item.timecreated)}
              </Text>
              <Text style={styles.body}>{cleanHtml(item.message)}</Text>
            </View>
          )}
        />
      )}

      <View style={styles.inputBox}>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Escribe una respuesta..."
          multiline
          style={styles.input}
        />
        <TouchableOpacity
          style={styles.btn}
          onPress={onReply}
          disabled={sending}
        >
          <Text style={styles.btnText}>
            {sending ? "Enviando..." : "Responder"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    margin: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e6e6e6",
  },
  subject: { fontWeight: "700", marginBottom: 6 },
  meta: { opacity: 0.7, marginBottom: 8 },
  body: { color: "#333" },
  inputBox: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "white",
    padding: 12,
    borderTopWidth: 1,
    borderColor: "#eee",
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd3da",
    borderRadius: 10,
    padding: 10,
    minHeight: 50,
    marginBottom: 10,
    textAlignVertical: "top",
  },
  btn: {
    backgroundColor: "#0056b3",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  btnText: { color: "white", fontWeight: "700" },
});
