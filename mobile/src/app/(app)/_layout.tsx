import { useCallback, useEffect, useState } from 'react';
import {
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import { Drawer } from 'expo-router/drawer';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../../services/api';
import { removeToken } from '../../services/authStorage';
import { useAppTheme } from '../../hooks/useAppTheme';
import type { AuthUser } from '../../types';

function getUserInitials(name?: string | null) {
  if (!name?.trim()) return 'U';

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 1).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function CustomDrawerContent(props: any) {
  const { colors } = useAppTheme();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      setLoadingUser(true);
      const response = await api.get<{ user: AuthUser }>('/auth/me');
      setUser(response.data.user);
    } catch (error) {
      console.error('Erro ao carregar usuário do drawer:', error);
    } finally {
      setLoadingUser(false);
    }
  }, []);

  async function handleLogout() {
    await removeToken();
    router.replace('/login');
  }

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.drawerContainer, { backgroundColor: colors.drawerBackground }]}
    >
      <View
        style={[
          styles.brandBlock,
          {
            backgroundColor: colors.drawerSurface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.brandRow}>
          <View
            style={[
              styles.brandIcon,
              {
                backgroundColor: colors.primarySoft,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color={colors.primary}
            />
          </View>

          <View style={styles.brandTextGroup}>
            <Text style={[styles.drawerTitle, { color: colors.text }]}>
              Sentinela
            </Text>
            <Text style={[styles.drawerSubtitle, { color: colors.textMuted }]}>
              Navegação principal
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.drawerItemsContainer}>
        <DrawerContentScrollView
          {...props}
          contentContainerStyle={styles.drawerScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <DrawerItemList {...props} />
        </DrawerContentScrollView>
      </View>

      <View
        style={[
          styles.userSection,
          {
            borderTopColor: colors.border,
            backgroundColor: colors.drawerBackground,
          },
        ]}
      >
        {loadingUser ? (
          <View style={styles.userLoadingContainer}>
            <ActivityIndicator size="small" />
            <Text style={[styles.userLoadingText, { color: colors.textMuted }]}>
              Carregando usuário...
            </Text>
          </View>
        ) : (
          <>
            <View
              style={[
                styles.userCard,
                {
                  backgroundColor: colors.drawerSurface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.userInfoRow}>
                <View
                  style={[
                    styles.avatar,
                    {
                      backgroundColor: colors.primarySoft,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.avatarText, { color: colors.primary }]}>
                    {getUserInitials(user?.name)}
                  </Text>
                </View>

                <View style={styles.userTextContainer}>
                  <Text
                    style={[styles.userName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {user?.name ?? 'Usuário'}
                  </Text>
                  <Text
                    style={[styles.userEmail, { color: colors.textMuted }]}
                    numberOfLines={1}
                  >
                    {user?.email ?? 'email não disponível'}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.logoutButton,
                { backgroundColor: colors.surfaceSecondary },
              ]}
              onPress={handleLogout}
            >
              <Ionicons
                name="log-out-outline"
                size={16}
                color={colors.text}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.logoutButtonText, { color: colors.text }]}>
                Sair
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

export default function AppLayout() {
  const { colors } = useAppTheme();

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={({ navigation }) => ({
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '700',
        },
        sceneStyle: {
          backgroundColor: colors.background,
        },
        drawerStyle: {
          backgroundColor: colors.drawerBackground,
          width: 296,
        },
        drawerActiveBackgroundColor: colors.drawerActiveBg,
        drawerActiveTintColor: colors.drawerActiveText,
        drawerInactiveTintColor: colors.drawerInactiveText,
        drawerLabelStyle: {
          fontSize: 16,
          fontWeight: '600',
          marginLeft: -4,
        },
        drawerItemStyle: {
          borderRadius: 16,
          marginHorizontal: 12,
          marginVertical: 4,
          paddingHorizontal: 4,
        },
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => navigation.toggleDrawer()}
            style={[
              styles.headerMenuButton,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="menu" size={20} color={colors.text} />
          </TouchableOpacity>
        ),
        headerRight: () => (
          <View
            style={[
              styles.headerBadge,
              {
                backgroundColor: colors.primarySoft,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color={colors.primary}
            />
          </View>
        ),
      })}
    >
      <Drawer.Screen
        name="home"
        options={{
          title: 'Sentinela',
          drawerLabel: 'Home',
          drawerIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={size ?? 22}
              color={color}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="profile"
        options={{
          title: 'Perfil',
          drawerLabel: 'Perfil',
          drawerIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'person-circle' : 'person-circle-outline'}
              size={size ?? 22}
              color={color}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="settings"
        options={{
          title: 'Configurações',
          drawerLabel: 'Configurações',
          drawerIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'settings' : 'settings-outline'}
              size={size ?? 22}
              color={color}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="edit-profile"
        options={{
          title: 'Editar perfil',
          drawerItemStyle: { display: 'none' },
        }}
      />

      <Drawer.Screen
        name="edit/[id]"
        options={{
          title: 'Editar transação',
          drawerItemStyle: { display: 'none' },
        }}
      />

      <Drawer.Screen
        name="transaction/[id]"
        options={{
          title: 'Detalhes da transação',
          drawerItemStyle: { display: 'none' },
        }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
  },
  brandBlock: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  brandTextGroup: {
    marginLeft: 12,
  },
  drawerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  drawerSubtitle: {
    marginTop: 2,
    fontSize: 14,
  },
  drawerItemsContainer: {
    flex: 1,
  },
  drawerScrollContent: {
    paddingTop: 10,
    paddingBottom: 12,
  },
  userSection: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
  },
  userLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userLoadingText: {
    fontSize: 14,
  },
  userCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  userTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  logoutButton: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  headerMenuButton: {
    marginLeft: 14,
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerBadge: {
    marginRight: 14,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});