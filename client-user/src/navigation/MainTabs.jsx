import React, { useEffect } from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';

import PassengersScreen from '../features/passengers/screens/PassengersScreen';
import BusTrackingScreen from '../features/bus/screens/BusTrackingScreen';
import PostsScreen from '../features/posts/screens/PostsScreen';
import PostDetailScreen from '../features/posts/screens/PostDetailScreen';
import ProfileScreen from '../features/profile/screens/ProfileScreen';
import GroupsScreen from '../features/groups/screens/GroupsScreen';
import GroupDetailScreen from '../features/groups/screens/GroupDetailScreen';
import UsersScreen from '../features/users/screens/UsersScreen';

import useAuthStore from '../shared/store/authStore';
import { getPosts } from '../shared/api/postApi';
import useUrgentPostsStore from '../features/posts/store/urgentPostsStore';
import { hasUnreadUrgent } from '../features/posts/utils/urgent';
import { COLORS, FONTS, MANAGER_ROLES } from '../shared/constants/theme';

const Tab = createBottomTabNavigator();

const STACK_HEADER = {
  headerShown: true,
  headerStyle: { backgroundColor: COLORS.primary },
  headerTintColor: '#ffffff',
  headerTitleStyle: { fontFamily: FONTS.display, fontSize: 20 },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: COLORS.background },
};
const PassengersStackNav = createNativeStackNavigator();
const BusStackNav = createNativeStackNavigator();
const PostsStackNav = createNativeStackNavigator();
const GroupsStackNav = createNativeStackNavigator();
const ProfileStackNav = createNativeStackNavigator();

function PassengersStack() {
  return (
    <PassengersStackNav.Navigator screenOptions={{ headerShown: false }}>
      <PassengersStackNav.Screen name="PassengersList" component={PassengersScreen} />
    </PassengersStackNav.Navigator>
  );
}

function BusStack() {
  return (
    <BusStackNav.Navigator screenOptions={{ headerShown: false }}>
      <BusStackNav.Screen name="BusTracking" component={BusTrackingScreen} />
    </BusStackNav.Navigator>
  );
}

function PostsStack() {
  return (
    <PostsStackNav.Navigator screenOptions={{ headerShown: false }}>
      <PostsStackNav.Screen name="PostsList" component={PostsScreen} />
      <PostsStackNav.Screen
        name="PostDetail"
        component={PostDetailScreen}
        options={{ ...STACK_HEADER, title: 'Anuncio' }}
      />
    </PostsStackNav.Navigator>
  );
}

function GroupsStack() {
  return (
    <GroupsStackNav.Navigator screenOptions={{ headerShown: false }}>
      <GroupsStackNav.Screen name="GroupsList" component={GroupsScreen} />
      <GroupsStackNav.Screen
        name="GroupDetail"
        component={GroupDetailScreen}
        options={{ ...STACK_HEADER, title: 'Grupo' }}
      />
    </GroupsStackNav.Navigator>
  );
}

function ProfileStack() {
  return (
    <ProfileStackNav.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStackNav.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStackNav.Screen
        name="Users"
        component={UsersScreen}
        options={{ ...STACK_HEADER, title: 'Usuarios' }}
      />
    </ProfileStackNav.Navigator>
  );
}

const ICONS = {
  Pasajeros: 'people-alt',
  Mapa: 'map',
  Grupos: 'groups',
  Anuncios: 'campaign',
  Perfil: 'person',
};

export default function MainTabs() {
  const role = useAuthStore((state) => state.user?.role);
  const isManager = MANAGER_ROLES.includes(role);
  const setUrgentPosts = useUrgentPostsStore((state) => state.setPosts);
  const unreadUrgent = useUrgentPostsStore((state) => hasUnreadUrgent(state.latestAt, state.lastSeenAt));

  useEffect(() => {
    getPosts()
      .then(({ data }) => {
        const list = data.data ?? data;
        if (Array.isArray(list)) setUrgentPosts(list);
      })
      .catch(() => {});
  }, [setUrgentPosts]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          height: 66,
          paddingTop: 8,
          paddingBottom: 6,
          borderTopWidth: 1.5,
          borderTopColor: COLORS.borderStrong,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarIcon: ({ color, focused }) => (
          <View style={{ alignItems: 'center' }}>
            <View
              style={{
                position: 'absolute',
                top: -9,
                width: 26,
                height: 4,
                borderBottomLeftRadius: 4,
                borderBottomRightRadius: 4,
                backgroundColor: focused ? COLORS.accent : 'transparent',
              }}
            />
            <View
              style={{
                width: 44,
                height: 30,
                borderRadius: 15,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: focused ? COLORS.primarySoft : 'transparent',
              }}
            >
              <MaterialIcons name={ICONS[route.name]} size={22} color={color} />
            </View>
          </View>
        ),
      })}
    >
      <Tab.Screen name="Pasajeros" component={PassengersStack} />
      <Tab.Screen name="Mapa" component={BusStack} />
      {isManager ? <Tab.Screen name="Grupos" component={GroupsStack} /> : null}
      <Tab.Screen
        name="Anuncios"
        component={PostsStack}
        options={{
          tabBarBadge: unreadUrgent ? '' : undefined,
          tabBarBadgeStyle: { minWidth: 10, maxHeight: 10, borderRadius: 5, backgroundColor: COLORS.warning, top: 4 },
        }}
      />
      <Tab.Screen name="Perfil" component={ProfileStack} />
    </Tab.Navigator>
  );
}
