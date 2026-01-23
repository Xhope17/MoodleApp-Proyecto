import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert 
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// AJUSTA TU IP AQUÍ
const BACKEND_URL = 'http://192.168.100.67:3000'; 

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNormalLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Por favor ingresa usuario y contraseña');
      return;
    }

    setLoading(true);
    try {
      console.log('Intentando login con:', username);
      const res = await axios.post(`${BACKEND_URL}/auth/login`, {
        username,
        password
      });

      if (res.data.ok) {
        // Guardar sesión
        await AsyncStorage.setItem('userToken', res.data.token.toString());
        await AsyncStorage.setItem('userData', JSON.stringify(res.data.user));
        
        // Limpiar y navegar
        setUsername('');
        setPassword('');
        router.replace('/cursos');
      } else {
        Alert.alert('Error de acceso', res.data.error || 'Credenciales incorrectas');
      }
    } catch (error: any) {
      console.error('Login error:', error.message);
      Alert.alert('Error de conexión', 'No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Moodle App</Text>
        <Text style={styles.subtitle}>Universidad de Guayaquil</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Usuario Institucional</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: juan.perez"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="********"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#0056b3" style={{ marginTop: 20 }} />
        ) : (
          <TouchableOpacity style={styles.loginButton} onPress={handleNormalLogin}>
            <Text style={styles.loginButtonText}>Ingresar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: 'white', borderRadius: 15, padding: 25, elevation: 3 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 30 },
  inputContainer: { marginBottom: 15 },
  label: { fontSize: 14, color: '#333', marginBottom: 5, fontWeight: '500' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#fafafa' },
  loginButton: { backgroundColor: '#0056b3', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  loginButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});