import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { getForumDiscussions } from "../services/moodle";

export default function PantallaForo() {
  const params = useLocalSearchParams();
  const forumIdStr = Array.isArray(params.forumId) ? params.forumId[0] : (params.forumId as string);
  const nombre = Array.isArray(params.nombre) ? params.nombre[0] : (params.nombre as string) || 'Foro';

  const forumId = Number(forumIdStr);

  const [discusiones, setDiscusiones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargar();
    
  }, []);

  const cargar = async () => {
    try {
      setLoading(true);
      const d = await getForumDiscussions(forumId);
      setDiscusiones(d);
    } finally {
      setLoading(false);
    }
  };

  const cleanHtml = (html: string) => html ? html.replace(/<[^>]+>/g, '').trim() : '';
  const formatDate = (timestamp: number) => new Date(timestamp * 1000).toLocaleString();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: nombre }} />

      {loading ? (
        <ActivityIndicator size="large" color="#0056b3" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={discusiones}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: "/posts",
                  params: { discussionId: String(item.discussion), subject: item.subject },
                })
              }
            >
              <Text style={styles.asunto}>{item.subject}</Text>
              <Text style={styles.autor}>{item.userfullname}</Text>
              <Text style={styles.mensaje} numberOfLines={2}>{cleanHtml(item.message)}</Text>
              <Text style={styles.fecha}>{formatDate(item.created)}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.vacio}>
              No hay discusiones visibles.
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  card: { backgroundColor: 'white', padding: 15, marginHorizontal: 15, marginTop: 15, borderRadius: 10, elevation: 2 },
  asunto: { fontSize: 16, fontWeight: 'bold', color: '#0056b3', marginBottom: 6 },
  autor: { fontSize: 12, color: '#666', marginBottom: 6 },
  mensaje: { fontSize: 14, color: '#333' },
  fecha: { fontSize: 10, color: '#999', marginTop: 10, textAlign: 'right' },
  vacio: { textAlign: 'center', marginTop: 50, color: '#888', fontStyle: 'italic', padding: 20 },
});
