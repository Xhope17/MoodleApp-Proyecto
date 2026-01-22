import React, { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet, Alert, Linking } from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { getCourseContents } from "../services/moodle";
import { API_BASE } from "../services/api";

export default function Detalles() {
  const { courseId, nombreCurso } = useLocalSearchParams<{ courseId: string; nombreCurso?: string }>();

  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const contents = await getCourseContents(Number(courseId));
        const mods = contents.flatMap((sec: any) => sec.modules || []);
        setModules(mods);
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId]);

  const items = useMemo(() => {
    // mostramos tareas, foros, recursos y links
    return modules.filter((m) =>
      ["assign", "forum", "resource", "url"].includes(m.modname)
    );
  }, [modules]);

  const openUrl = async (url: string) => {
    const ok = await Linking.canOpenURL(url);
    if (!ok) return Alert.alert("Error", "No se puede abrir este enlace");
    await Linking.openURL(url);
  };

  const onPressItem = async (item: any) => {
    const mod = item.modname;

    if (mod === "assign") {
      return router.push({
        pathname: "/tarea",
        params: { assignId: String(item.instance), nombre: item.name },
      });
    }

    if (mod === "forum") {
      return router.push({
        pathname: "/foro",
        params: { forumId: String(item.instance), nombre: item.name },
      });
    }

    if (mod === "url") {
      const link = item?.contents?.[0]?.fileurl;
      if (!link) return Alert.alert("Error", "No se encontró el link");
      return openUrl(link);
    }

    if (mod === "resource") {
      const fileurl = item?.contents?.[0]?.fileurl;
      if (!fileurl) return Alert.alert("Error", "No se encontró el archivo");

      // ✅ abre por el proxy backend (no expone token)
      const proxied = `${API_BASE}/file?u=${encodeURIComponent(fileurl)}`;
      return openUrl(proxied);
    }
  };

  const icon = (modname: string) => {
    if (modname === "assign") return "📌";
    if (modname === "forum") return "💬";
    if (modname === "resource") return "📄";
    if (modname === "url") return "🔗";
    return "📦";
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Cargando contenidos…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: nombreCurso || "Detalles" }} />
      <Pressable
  style={{
    backgroundColor: "#0056b3",
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 15,
    marginBottom: 12,
  }}
  onPress={() =>
    router.push({
      pathname: "/calificaciones",
      params: {
        courseId: String(courseId),
        nombreCurso: String(nombreCurso ?? ""),
      },
    })
  }
>
  <Text style={{ color: "white", fontWeight: "bold", textAlign: "center" }}>
    Ver calificaciones 🧾
  </Text>
</Pressable>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => onPressItem(item)}>
            <Text style={styles.cardTitle}>
              {icon(item.modname)} {item.name}
            </Text>
            <Text style={styles.cardMeta}>
              {item.modname} • instance: {item.instance}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={{ textAlign: "center", marginTop: 40 }}>No hay contenidos.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6f8", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: { backgroundColor: "white", borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#e6e6e6" },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  cardMeta: { opacity: 0.7 },
});
