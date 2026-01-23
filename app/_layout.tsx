import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0056b3', 
        },
        headerTintColor: '#fff', 
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {/* Pantalla Login (index.tsx)*/}
      <Stack.Screen 
        name="index" 
        options={{ headerShown: false }} 
      />
      
      {/* Pantalla Cursos*/}
      <Stack.Screen 
        name="cursos" 
        options={{ headerShown: false }}
      />

      {/* Pantalla Detalles */}
      <Stack.Screen 
        name="detalles" 
        options={{ title: 'Contenidos' }} 
      />

      {/* Pantalla Calificaciones */}
      <Stack.Screen 
        name="calificaciones" 
        options={{ title: 'Notas' }} 
      />
    </Stack>
  );
}