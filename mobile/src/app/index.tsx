import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { api } from '../services/api';
import { getToken, removeToken } from '../services/authStorage';

export default function AppEntryScreen() {
  useEffect(() => {
    async function bootstrap() {
      const token = await getToken();

      if (!token) {
        router.replace('/login');
        return;
      }

      try {
        await api.get('/auth/me');
        router.replace('/home');
      } catch (error) {
        console.error(error);
        await removeToken();
        router.replace('/login');
      }
    }

    bootstrap();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ActivityIndicator size="large" />
      <Text style={styles.text}>Carregando sessão...</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 12,
    fontSize: 16,
  },
});