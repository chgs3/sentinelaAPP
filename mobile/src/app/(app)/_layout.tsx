import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen
        name="edit-profile"
        options={{ headerShown: true, title: 'Editar perfil' }}
      />
      <Stack.Screen
        name="edit/[id]"
        options={{ headerShown: true, title: 'Editar transação' }}
      />
      <Stack.Screen
        name="transaction/[id]"
        options={{ headerShown: true, title: 'Detalhes da transação' }}
      />
    </Stack>
  );
}