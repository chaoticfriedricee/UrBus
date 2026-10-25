// src/navigation/MainTabs.jsx
// Navegación inferior — replica el mockup: Pasajeros, Mapa, Anuncios y Perfil, con el
// ícono activo resaltado en amarillo. Conductor y admin tienen además "Grupos".
import React from 'react';
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
import { COLORS, MANAGER_ROLES } from '../shared/constants/theme';

const Tab = createBottomTabNavigator();
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
        options={{ headerShown: true, title: 'Anuncio' }}
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
        options={{ headerShown: true, title: 'Grupo' }}
      />
    </GroupsStackNav.Navigator>
  );
}

// "Gestionar usuarios" (solo ADMIN) se abre desde el perfil
function ProfileStack() {
  return (
    <ProfileStackNav.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStackNav.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStackNav.Screen
        name="Users"
        component={UsersScreen}
        options={{ headerShown: true, title: 'Usuarios' }}
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

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.accentDark,
        tabBarInactiveTintColor: COLORS.secondary,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          height: 64,
          paddingTop: 6,
          borderTopColor: COLORS.border,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarIcon: ({ color, focused }) => (
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: focused ? '#FFF3CC' : 'transparent',
            }}
          >
            <MaterialIcons name={ICONS[route.name]} size={22} color={color} />
          </View>
        ),
      })}
    >
      <Tab.Screen name="Pasajeros" component={PassengersStack} />
      <Tab.Screen name="Mapa" component={BusStack} />
      {isManager ? <Tab.Screen name="Grupos" component={GroupsStack} /> : null}
      <Tab.Screen name="Anuncios" component={PostsStack} />
      <Tab.Screen name="Perfil" component={ProfileStack} />
    </Tab.Navigator>
  );
}