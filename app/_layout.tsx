import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0056b3', // Color azul Moodle para todas las barras
        },
        headerTintColor: '#fff', // Texto blanco en la barra
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {/* Pantalla Login (index) - Sin barra superior ni botón de atrás */}
      <Stack.Screen 
        name="index" 
        options={{ headerShown: false }} 
      />
      
      {/* Pantalla Cursos - Con el título que definimos dentro del archivo */}
      <Stack.Screen 
        name="cursos" 
        options={{ headerShown: false }} // La ocultamos aquí pq cursos.tsx tiene su propio header personalizado
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