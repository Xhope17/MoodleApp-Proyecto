import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { getCourses } from "../services/moodle";
import AsyncStorage from "@react-native-async-storage/async-storage";



export default function PantallaCursos() {
  const [cursos, setCursos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarCursos();
  }, []);

  const cargarCursos = async () => {
  try {
    setLoading(true);
    const cursosBackend = await getCourses();
    setCursos(cursosBackend);
  } catch (error) {
    console.error(error);
    Alert.alert("Error", "No se pudieron cargar los cursos desde el backend");
  } finally {
    setLoading(false);
  }
};

const cerrarSesion = async () => {
  try {
    await AsyncStorage.multiRemove(["userToken", "userId", "userName", "fullName"]);

    // ✅ resetea navegación y manda al login (index.tsx)
    router.replace("/");
  } catch (e) {
    Alert.alert("Error", "No se pudo cerrar sesión.");
  }
};


  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0056b3" />
        <Text style={{ marginTop: 10, color: '#666' }}>Cargando tus cursos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Cursos 📚</Text>
        <TouchableOpacity onPress={cerrarSesion}>
          <Text style={styles.logoutText}>Salir 🚪</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={cursos}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => (
          <Link
            href={{
              pathname: "/detalles",
              params: { courseId: item.id, nombreCurso: item.fullname }
            }}
            asChild
          >
            <TouchableOpacity style={styles.card}>
              <Image
                source={{ uri: item.courseimage || "https://via.placeholder.com/600x240/0056b3/FFFFFF?text=Curso" }}
                style={styles.courseImage}
              />

              <View style={styles.cardContent}>
                <Text style={styles.courseTitle}>{item.fullname}</Text>
                <Text style={styles.courseCategory}>
                  {item.shortname || 'Curso'}
                </Text>
              </View>
            </TouchableOpacity>
          </Link>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No estás inscrito en ningún curso todavía.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8', paddingTop: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  logoutText: { color: '#d9534f', fontWeight: 'bold' },

  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 15,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  courseImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  cardContent: {
    padding: 15,
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  courseCategory: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#999',
    fontSize: 16,
  }
});
