import { Stack } from 'expo-router';
import { useAppTheme } from '../../hooks/useAppTheme';

export default function AuthLayout() {
  const { colors } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '700',
        },
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen
        name="login"
        options={{
          title: 'Entrar',
        }}
      />

      <Stack.Screen
        name="register"
        options={{
          title: 'Criar conta',
        }}
      />
    </Stack>
  );
}