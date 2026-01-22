import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import axios from 'axios';

const MOODLE_IP = '192.168.100.67';
const MOODLE_URL = `http://${MOODLE_IP}/moodle/webservice/rest/server.php`;
const TOKEN = '55e6792c90c631f445f83db3c7718fb5'; 

export default function PantallaDebate() {
  const { discussionId, asunto } = useLocalSearchParams();
  const [mensajes, setMensajes] = useState<any[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetchMensajes();
  }, []);

  const fetchMensajes = async () => {
    try {
      const params = {
        wstoken: TOKEN,
        wsfunction: 'mod_forum_get_discussion_posts', // <--- Función nueva
        moodlewsrestformat: 'json',
        discussionid: discussionId
      };
      const response = await axios.get(MOODLE_URL, { params });
      // Los mensajes vienen en 'posts'
      setMensajes(response.data.posts || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const enviarRespuesta = async () => {
    if (!nuevoMensaje.trim()) return;
    setEnviando(true);
    try {
      const params = {
        wstoken: TOKEN,
        wsfunction: 'mod_forum_add_discussion_post', // <--- Función para responder
        moodlewsrestformat: 'json',
        postid: mensajes[0]?.id, // Respondemos al mensaje principal (el primero)
        subject: 'Re: ' + asunto,
        message: nuevoMensaje
      };
      
      // Enviamos el POST
      // Nota: Moodle suele pedir los datos en la URL o como form-data. 
      // Para simplificar probamos params primero.
      await axios.get(MOODLE_URL, { params }); 
      
      setNuevoMensaje('');
      fetchMensajes(); // Recargamos para ver nuestro mensaje
      Alert.alert("Enviado", "Tu respuesta se publicó correctamente");
      
    } catch (error) {
      Alert.alert("Error", "No se pudo enviar la respuesta");
    } finally {
      setEnviando(false);
    }
  };

  const renderMensaje = ({ item }: { item: any }) => (
    <View style={[styles.globo, item.parent === 0 ? styles.globoPrincipal : styles.globoRespuesta]}>
      <Text style={styles.autor}>{item.userfullname} dijo:</Text>
      <Text style={styles.texto}>{item.message.replace(/<[^>]+>/g, '').trim()}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <Stack.Screen options={{ title: 'Debate' }} />

      {loading ? (
        <ActivityIndicator size="large" color="#0056b3" style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={mensajes}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMensaje}
          contentContainerStyle={{ padding: 10 }}
        />
      )}

      {/* Área para escribir respuesta */}
      <View style={styles.inputArea}>
        <TextInput 
            style={styles.input} 
            placeholder="Escribe una respuesta..." 
            value={nuevoMensaje}
            onChangeText={setNuevoMensaje}
        />
        <TouchableOpacity onPress={enviarRespuesta} disabled={enviando} style={styles.botonEnviar}>
            <Text style={{color: 'white', fontWeight: 'bold'}}>{enviando ? '...' : 'Enviar'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f4f7' },
  globo: { padding: 15, borderRadius: 10, marginBottom: 10, maxWidth: '90%' },
  globoPrincipal: { backgroundColor: '#ffffff', borderLeftWidth: 4, borderLeftColor: '#0056b3', alignSelf: 'flex-start' },
  globoRespuesta: { backgroundColor: '#e3f2fd', alignSelf: 'flex-end' }, // Respuestas a la derecha (estilo chat)
  autor: { fontWeight: 'bold', fontSize: 12, color: '#555', marginBottom: 2 },
  texto: { fontSize: 15, color: '#333' },
  inputArea: { flexDirection: 'row', padding: 10, backgroundColor: 'white', borderTopWidth: 1, borderColor: '#ddd' },
  input: { flex: 1, backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 15, height: 40 },
  botonEnviar: { backgroundColor: '#0056b3', borderRadius: 20, paddingHorizontal: 20, justifyContent: 'center', marginLeft: 10 }
});