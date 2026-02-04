import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Linking,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { API_BASE } from "../services/api";
import {
    getCourseAssignments,
    getCourseContents,
    getCourseForums,
} from "../services/moodle";

export default function Detalles() {
  const { courseId, nombreCurso } = useLocalSearchParams<{
    courseId: string;
    nombreCurso?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [forums, setForums] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Carga inicial de contenidos y tareas del curso
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [contents, assigns, forumsData] = await Promise.all([
          getCourseContents(Number(courseId)),
          getCourseAssignments(Number(courseId)),
          getCourseForums(Number(courseId)),
        ]);
        const mods = contents.flatMap((sec: any) => sec.modules || []);
        setModules(mods);
        setAssignments(assigns);
        setForums(forumsData);
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId]);

  // Formatea la fecha para los encabezados de sección
  const formatDateHeader = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const weekday = date.toLocaleDateString("es-ES", { weekday: "long" });
    const dateStr = date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return `${weekday}, ${dateStr}`;
  };

  // Formatea la hora en formato 24h
  const formatTime = (timestamp: number | null | undefined) => {
    if (!timestamp || timestamp === 0) return null;
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  // Busca información de una tarea por su instance ID
  const getAssignmentInfo = (instance: number) => {
    return assignments.find((a) => a.id === instance);
  };

  // Busca información de un foro por su instance ID
  const getForumInfo = (instance: number) => {
    return forums.find((f) => f.id === instance);
  };

  // Filtra solo las actividades relevantes: tareas, foros, recursos y enlaces
  const items = useMemo(() => {
    return modules.filter((m) =>
      ["assign", "forum", "resource", "url"].includes(m.modname),
    );
  }, [modules]);

  // Aplica el filtro de fecha seleccionado por el usuario
  const filteredItems = useMemo(() => {
    const now = Date.now() / 1000;

    if (filter === "all") return items;

    return items.filter((item) => {
      let displayDate = null;

      if (item.modname === "assign") {
        const assignInfo = assignments.find((a) => a.id === item.instance);
        displayDate = assignInfo?.duedate;
      } else if (item.modname === "forum") {
        const forumInfo = forums.find((f) => f.id === item.instance);
        displayDate = forumInfo?.duedate || forumInfo?.cutoffdate;
      } else {
        displayDate =
          item.added || item.timemodified || item.timecreated || null;
      }

      // Para filtro "all", incluir todos los items
      if (!displayDate || displayDate === 0) {
        return false;
      }

      if (filter === "overdue") {
        return displayDate < now;
      }

      const daysDiff = (displayDate - now) / (60 * 60 * 24);

      if (filter === "7days") return daysDiff >= 0 && daysDiff <= 7;
      if (filter === "30days") return daysDiff >= 0 && daysDiff <= 30;
      if (filter === "3months") return daysDiff >= 0 && daysDiff <= 90;
      if (filter === "6months") return daysDiff >= 0 && daysDiff <= 180;

      return true;
    });
  }, [items, assignments, forums, filter]);

  // Agrupa las actividades por fecha para mostrarlas organizadas
  const groupedItems = useMemo(() => {
    const itemsWithDates: any[] = [];
    const itemsWithoutDates: any[] = [];

    filteredItems.forEach((item) => {
      let displayDate = null;
      let assignInfo = null;
      let forumInfo = null;

      if (item.modname === "assign") {
        assignInfo = getAssignmentInfo(item.instance);
        displayDate = assignInfo?.duedate;
      } else if (item.modname === "forum") {
        forumInfo = getForumInfo(item.instance);
        displayDate = forumInfo?.duedate || forumInfo?.cutoffdate;
      } else {
        // Para otros módulos, intentar múltiples campos de fecha
        displayDate =
          item.added || item.timemodified || item.timecreated || null;
      }

      if (displayDate && displayDate > 0) {
        itemsWithDates.push({ ...item, assignInfo, forumInfo, displayDate });
      } else {
        itemsWithoutDates.push(item);
      }
    });

    // Ordenar items con fecha
    itemsWithDates.sort((a, b) => a.displayDate - b.displayDate);

    // Agrupar por fecha
    const itemsByDate: { [key: string]: any[] } = {};
    itemsWithDates.forEach((item) => {
      const dateKey = new Date(item.displayDate * 1000).toDateString();
      if (!itemsByDate[dateKey]) {
        itemsByDate[dateKey] = [];
      }
      itemsByDate[dateKey].push(item);
    });

    const result: any[] = [];

    // Agregar items sin fecha primero
    itemsWithoutDates.forEach((item) => {
      result.push({ type: "item", data: item });
    });

    // Agregar items agrupados por fecha
    const sortedDates = Object.keys(itemsByDate).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });

    sortedDates.forEach((dateKey) => {
      const items = itemsByDate[dateKey];
      result.push({ type: "header", date: items[0].displayDate });
      items.forEach((item) => {
        result.push({ type: "item", data: item });
      });
    });

    return result;
  }, [filteredItems, assignments, forums]);

  // Abre una URL externa
  const openUrl = async (url: string) => {
    const ok = await Linking.canOpenURL(url);
    if (!ok) return Alert.alert("Error", "No se puede abrir este enlace");
    await Linking.openURL(url);
  };

  // Maneja el clic en una actividad según su tipo
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

      // funcion del token
      const proxied = `${API_BASE}/file?u=${encodeURIComponent(fileurl)}`;
      return openUrl(proxied);
    }
  };

  // Retorna el icono según el tipo de módulo
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
        <Text
          style={{ color: "white", fontWeight: "bold", textAlign: "center" }}
        >
          Ver calificaciones
        </Text>
      </Pressable>

      <View style={styles.filterContainer}>
        <Pressable
          style={styles.filterButton}
          onPress={() => setShowFilterMenu(!showFilterMenu)}
        >
          <Text style={styles.filterButtonText}>
            {filter === "all" && "Todos"}
            {filter === "overdue" && "Atrasados"}
            {filter === "7days" && "Próximos 7 días"}
            {filter === "30days" && "Próximos 30 días"}
            {filter === "3months" && "Próximos 3 meses"}
            {filter === "6months" && "Próximos 6 meses"}
          </Text>
          <Text style={styles.filterArrow}>▼</Text>
        </Pressable>

        {showFilterMenu && (
          <View style={styles.filterMenu}>
            {[
              { value: "all", label: "Todos" },
              { value: "overdue", label: "Atrasados" },
              { value: "7days", label: "Próximos 7 días" },
              { value: "30days", label: "Próximos 30 días" },
              { value: "3months", label: "Próximos 3 meses" },
              { value: "6months", label: "Próximos 6 meses" },
            ].map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.filterOption,
                  filter === option.value && styles.filterOptionActive,
                ]}
                onPress={() => {
                  setFilter(option.value);
                  setShowFilterMenu(false);
                }}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    filter === option.value && styles.filterOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                {filter === option.value && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <FlatList
        data={groupedItems}
        keyExtractor={(item, index) =>
          item.type === "header"
            ? `header-${item.date}`
            : `item-${item.data.id}-${index}`
        }
        renderItem={({ item: groupItem }) => {
          if (groupItem.type === "header") {
            return (
              <View style={styles.dateHeader}>
                <Text style={styles.dateHeaderText}>
                  {formatDateHeader(groupItem.date)}
                </Text>
              </View>
            );
          }

          const item = groupItem.data;
          const assignInfo =
            item.modname === "assign"
              ? item.assignInfo || getAssignmentInfo(item.instance)
              : null;
          const forumInfo =
            item.modname === "forum"
              ? item.forumInfo || getForumInfo(item.instance)
              : null;

          // Para tareas mostrar hora de vencimiento, para foros su duedate, para otros la hora de creación
          const timeToShow = assignInfo?.duedate
            ? formatTime(assignInfo.duedate)
            : forumInfo?.duedate || forumInfo?.cutoffdate
              ? formatTime(forumInfo.duedate || forumInfo.cutoffdate)
              : item.added || item.timemodified || item.timecreated
                ? formatTime(
                    item.added || item.timemodified || item.timecreated,
                  )
                : null;

          // Verificar si está atrasado
          const now = Date.now() / 1000;
          const displayDate =
            assignInfo?.duedate ||
            forumInfo?.duedate ||
            forumInfo?.cutoffdate ||
            item.added ||
            item.timemodified ||
            item.timecreated;
          const isOverdue = displayDate && displayDate < now;

          return (
            <Pressable
              style={[styles.card, isOverdue && styles.cardOverdue]}
              onPress={() => onPressItem(item)}
            >
              <Text style={styles.cardTitle}>
                {icon(item.modname)} {item.name}
              </Text>

              {timeToShow && (
                <Text style={styles.timeText}>
                  {item.modname === "assign" || item.modname === "forum"
                    ? "Vencimiento"
                    : "Publicado"}
                  : {timeToShow}
                </Text>
              )}

              <Text style={styles.cardMeta}>
                {item.modname} • instance: {item.instance}
              </Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 40 }}>
            No hay contenidos.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6f8", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e6e6e6",
  },
  cardOverdue: {
    backgroundColor: "#ffebee",
    borderColor: "#ffcdd2",
  },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  timeText: { fontSize: 12, color: "#666", marginTop: 4 },
  cardMeta: { opacity: 0.7, marginTop: 8 },
  dateText: { fontSize: 12, color: "#666", marginTop: 4 },
  dateHeader: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 8,
    marginTop: 16,
  },
  dateHeaderText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  filterContainer: {
    marginHorizontal: 15,
    marginBottom: 12,
    position: "relative",
  },
  filterButton: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  filterButtonText: {
    fontSize: 14,
    color: "#333",
  },
  filterArrow: {
    fontSize: 10,
    color: "#666",
  },
  filterMenu: {
    backgroundColor: "white",
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  filterOptionActive: {
    backgroundColor: "#f0f7ff",
  },
  filterOptionText: {
    fontSize: 14,
    color: "#333",
  },
  filterOptionTextActive: {
    fontWeight: "600",
    color: "#0056b3",
  },
  checkmark: {
    fontSize: 16,
    color: "#0056b3",
  },
});
