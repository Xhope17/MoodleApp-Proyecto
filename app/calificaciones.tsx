import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- CONFIGURACIÓN ---
const MOODLE_IP = '192.168.100.67';
const MOODLE_URL = `http://${MOODLE_IP}/moodle/webservice/rest/server.php`;

type Filtro = 'all' | 'graded' | 'ungraded';

export default function PantallaCalificaciones() {
  const { courseId, nombreCurso } = useLocalSearchParams<{ courseId: string; nombreCurso?: string }>();

  const [notas, setNotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>('all');

  useEffect(() => {
    fetchDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const limpiarHTML = (html: any) => {
    if (!html) return '';
    if (typeof html !== 'string') return String(html);
    return html.replace(/<[^>]+>/g, '').trim();
  };

  const esConNota = (item: any) => {
    const grade = item?.grade?.content ? limpiarHTML(item.grade.content) : '';
    if (!grade) return false;
    const g = grade.toLowerCase();
    if (g.includes('sin calificar') || g.includes('not graded') || g === '-') return false;
    return true;
  };

  const fetchDatos = async () => {
    try {
      if (!courseId) {
        Alert.alert('Error', 'No se recibió el courseId');
        router.back();
        return;
      }

      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'Sesión no válida');
        router.replace('/');
        return;
      }

      // 1) site_info -> userid
      const paramsUser = {
        wstoken: token,
        wsfunction: 'core_webservice_get_site_info',
        moodlewsrestformat: 'json',
      };
      const responseUser = await axios.get(MOODLE_URL, { params: paramsUser });
      const miUserId = responseUser.data.userid;

      if (!miUserId) {
        Alert.alert('Error', 'No se pudo identificar al usuario.');
        return;
      }

      // 2) grades table
      const paramsNotas = {
        wstoken: token,
        wsfunction: 'gradereport_user_get_grades_table',
        moodlewsrestformat: 'json',
        courseid: courseId,
        userid: miUserId,
      };

      const responseNotas = await axios.get(MOODLE_URL, { params: paramsNotas });

      if (responseNotas.data.tables && responseNotas.data.tables.length > 0) {
        setNotas(responseNotas.data.tables[0].tabledata || []);
      } else {
        setNotas([]);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Fallo al conectar con Moodle');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDatos();
  };

  const notasFiltradas = useMemo(() => {
    if (filtro === 'graded') return notas.filter(esConNota);
    if (filtro === 'ungraded') return notas.filter((x) => !esConNota(x));
    return notas;
  }, [notas, filtro]);

  const resumen = useMemo(() => {
    const totalItems = notas.filter((x) => x?.itemname?.content).length;
    const gradedItems = notas.filter((x) => x?.itemname?.content && esConNota(x)).length;

    // buscar el "Total" si existe
    const totalRow = notas.find((x) => (x?.itemname?.class || '').includes('total'));
    const totalTxt = totalRow?.grade?.content ? limpiarHTML(totalRow.grade.content) : '';

    return { totalItems, gradedItems, totalTxt };
  }, [notas]);

  const Chip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      activeOpacity={0.8}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const renderNota = ({ item }: { item: any }) => {
    if (!item?.itemname?.content) return null;

    const nombre = limpiarHTML(item.itemname.content);
    const calificacion = item?.grade?.content ? limpiarHTML(item.grade.content) : '-';
    const feedback = item?.feedback?.content ? limpiarHTML(item.feedback.content) : '';
    const esTotal = (item?.itemname?.class || '').includes('total');

    const tieneNota = esConNota(item);

    return (
      <View style={[styles.card, esTotal && styles.cardTotal]}>
        <View style={styles.row}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={[styles.itemNombre, esTotal && styles.textoTotal]} numberOfLines={2}>
              {nombre}
            </Text>

            <Text style={styles.estadoMini}>
              {esTotal ? 'Resumen del curso' : tieneNota ? 'Calificado' : 'Sin calificar'}
            </Text>
          </View>

          <Text style={[styles.nota, esTotal && styles.textoTotal, !tieneNota && styles.notaPendiente]}>
            {calificacion !== '-' ? calificacion : '—'}
          </Text>
        </View>

        {feedback ? <Text style={styles.feedback}>💬 {feedback}</Text> : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Mis Calificaciones' }} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{nombreCurso ? limpiarHTML(nombreCurso) : 'Calificaciones'}</Text>

        <View style={styles.headerStats}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{resumen.gradedItems}</Text>
            <Text style={styles.statLabel}>con nota</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{resumen.totalItems}</Text>
            <Text style={styles.statLabel}>items</Text>
          </View>

          <View style={[styles.statCard, styles.statCardAccent]}>
            <Text style={styles.statNumber}>{resumen.totalTxt || '—'}</Text>
            <Text style={styles.statLabel}>total</Text>
          </View>
        </View>

        {/* Chips */}
        <View style={styles.chipsRow}>
          <Chip label="Todo" active={filtro === 'all'} onPress={() => setFiltro('all')} />
          <Chip label="Con nota" active={filtro === 'graded'} onPress={() => setFiltro('graded')} />
          <Chip label="Sin nota" active={filtro === 'ungraded'} onPress={() => setFiltro('ungraded')} />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0056b3" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={notasFiltradas}
          keyExtractor={(_, index) => index.toString()}
          renderItem={renderNota}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Sin calificaciones</Text>
              <Text style={styles.emptyText}>
                Aún no tienes calificaciones registradas aquí. Desliza hacia abajo para actualizar.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },

  header: {
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#f4f6f8',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#222', marginBottom: 10 },

  headerStats: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e6e6e6',
  },
  statCardAccent: { borderColor: '#b7d7ff' },
  statNumber: { fontSize: 18, fontWeight: 'bold', color: '#0056b3' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 2 },

  chipsRow: { flexDirection: 'row', gap: 10 },
  chip: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e6e6e6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  chipActive: { backgroundColor: '#0056b3', borderColor: '#0056b3' },
  chipText: { color: '#333', fontWeight: '600', fontSize: 12 },
  chipTextActive: { color: 'white' },

  card: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 15,
    marginBottom: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e6e6e6',
  },
  cardTotal: { backgroundColor: '#d4edda', borderColor: '#155724' },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemNombre: { fontSize: 15, color: '#333', fontWeight: '600' },

  estadoMini: { marginTop: 6, fontSize: 12, color: '#777' },

  nota: { fontSize: 18, fontWeight: 'bold', color: '#0056b3' },
  notaPendiente: { color: '#999' },
  textoTotal: { color: '#155724', fontWeight: 'bold' },

  feedback: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 10,
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 8,
  },

  emptyBox: {
    marginTop: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  emptyText: { textAlign: 'center', color: '#777', lineHeight: 20 },
});
