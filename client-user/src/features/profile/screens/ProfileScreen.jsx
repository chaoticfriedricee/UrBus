// src/features/profile/screens/ProfileScreen.jsx
// Replica el mockup "Perfil": avatar grande con insignia, nombre centrado,
// filas de datos (correo, teléfono, dirección) y botón "Editar Perfil".
import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import authClient from '../../../shared/api/authClient';
import useAuthStore from '../../../shared/store/authStore';
import { useMyStatus } from '../../passengers/hooks/useMyStatus';
import Button from '../../../shared/components/common/Button';
import Input from '../../../shared/components/common/Input';
import { COLORS, SPACING, FONT_SIZE, RADIUS, MANAGER_ROLES, ROLE_LABELS, ROLES } from '../../../shared/constants/theme';

export default function ProfileScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const logout = useAuthStore((state) => state.logout);
  const isManager = MANAGER_ROLES.includes(user?.role);

  const { status: myPassenger, fetchStatus } = useMyStatus();

  useEffect(() => {
    if (!isManager) fetchStatus();
  }, [isManager, fetchStatus]);

  // El login solo trae id/username/foto/rol; email, nombre y teléfono vienen de /auth/me
  useEffect(() => {
    authClient.get('/auth/me')
      .then(({ data }) => updateUser(data))
      .catch(() => {});
  }, [updateUser]);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [newPhoto, setNewPhoto] = useState(null);

  const { control, handleSubmit, reset } = useForm({
    defaultValues: { name: user?.name ?? '', surname: user?.surname ?? '', phone: user?.phone ?? '' },
  });

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos para cambiar el avatar');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setNewPhoto({ uri: asset.uri, name: asset.fileName ?? 'profile.jpg', type: 'image/jpeg' });
    }
  };

  const onSave = async (formValues) => {
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('name', formValues.name);
      formData.append('surname', formValues.surname);
      formData.append('phone', formValues.phone);
      if (newPhoto) formData.append('profilePicture', newPhoto);

      const response = await authClient.put(`/users/${user.id}/profile`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = response.data.data ?? response.data;
      updateUser(data);
      setNewPhoto(null);
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.message ?? 'No se pudo actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = () => {
    reset({ name: user?.name ?? '', surname: user?.surname ?? '', phone: user?.phone ?? '' });
    setEditing(true);
  };

  const cancelEdit = () => {
    reset({ name: user?.name ?? '', surname: user?.surname ?? '', phone: user?.phone ?? '' });
    setNewPhoto(null);
    setError(null);
    setEditing(false);
  };

  const confirmLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro de que quieres cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: logout },
    ]);
  };

  const avatarUri = newPhoto?.uri ?? (user?.profilePicture?.startsWith('http') ? user.profilePicture : null);
  const fullName = [user?.name, user?.surname].filter(Boolean).join(' ');

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>Perfil</Text>

      <View style={styles.card}>
        <TouchableOpacity onPress={editing ? pickImage : undefined} style={styles.avatarWrapper} activeOpacity={0.85}>
          <Image
            source={avatarUri ? { uri: avatarUri } : require('../../../../assets/avatarDefault.png')}
            style={styles.avatar}
          />
          <View style={styles.badge}>
            <MaterialIcons name="verified" size={16} color="#fff" />
          </View>
          {editing ? <Text style={styles.changePhoto}>Cambiar foto</Text> : null}
        </TouchableOpacity>

        <Text style={styles.name}>{fullName || user?.username}</Text>
        <Text style={styles.role}>{ROLE_LABELS[user?.role] ?? user?.role}</Text>

        {editing ? (
          <View style={styles.editForm}>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, value } }) => (
                <Input label="Nombre" value={value} onChangeText={onChange} editable />
              )}
            />
            <Controller
              control={control}
              name="surname"
              render={({ field: { onChange, value } }) => (
                <Input label="Apellido" value={value} onChangeText={onChange} editable />
              )}
            />
            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, value } }) => (
                <Input label="Teléfono" value={value} onChangeText={onChange} editable keyboardType="phone-pad" />
              )}
            />
          </View>
        ) : (
          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <MaterialIcons name="email" size={18} color={COLORS.textLight} />
              <Text style={styles.infoText}>{user?.email ?? '—'}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <MaterialIcons name="phone" size={18} color={COLORS.textLight} />
              <Text style={styles.infoText}>{user?.phone ?? '—'}</Text>
            </View>
            {!isManager ? (
              <>
                <View style={styles.infoDivider} />
                <View style={styles.infoRow}>
                  <MaterialIcons name="location-on" size={18} color={COLORS.textLight} />
                  <Text style={styles.infoText}>{myPassenger?.address ?? 'Sin dirección registrada'}</Text>
                </View>
              </>
            ) : null}
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {editing ? (
          <View style={styles.row}>
            <Button title="Cancelar" variant="secondary" onPress={cancelEdit} style={styles.flexBtn} />
            <Button title="Guardar" onPress={handleSubmit(onSave)} loading={saving} style={styles.flexBtn} />
          </View>
        ) : (
          <Button title="Editar Perfil" onPress={startEdit} />
        )}
      </View>

      {user?.role === ROLES.ADMIN ? (
        <TouchableOpacity style={styles.adminRow} onPress={() => navigation.navigate('Users')}>
          <MaterialIcons name="manage-accounts" size={22} color={COLORS.primary} />
          <View style={styles.adminText}>
            <Text style={styles.adminTitle}>Gestionar usuarios</Text>
            <Text style={styles.adminHint}>Roles y verificación de correo</Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={COLORS.textMuted} />
        </TouchableOpacity>
      ) : null}

      <Button title="Cerrar sesión" variant="secondary" onPress={confirmLogout} style={styles.logoutBtn} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingTop: 54 },
  headerTitle: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.text, textAlign: 'center', marginBottom: SPACING.lg },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg, alignItems: 'center' },
  avatarWrapper: { alignItems: 'center', marginBottom: SPACING.sm },
  avatar: { width: 110, height: 110, borderRadius: 55, backgroundColor: COLORS.border },
  badge: {
    position: 'absolute', bottom: 22, right: -2, width: 26, height: 26, borderRadius: 13,
    backgroundColor: COLORS.accentDark, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.surface,
  },
  changePhoto: { color: COLORS.primary, marginTop: SPACING.xs, fontSize: FONT_SIZE.sm },
  name: { fontSize: FONT_SIZE.lg, fontWeight: '800', color: COLORS.text, marginTop: SPACING.xs },
  role: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginBottom: SPACING.md },
  infoList: { width: '100%', marginBottom: SPACING.lg },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 12 },
  infoText: { fontSize: FONT_SIZE.md, color: COLORS.text, flexShrink: 1 },
  infoDivider: { height: 1, backgroundColor: COLORS.border },
  editForm: { width: '100%', marginTop: SPACING.sm },
  error: { color: COLORS.error, marginBottom: SPACING.sm },
  row: { flexDirection: 'row', gap: SPACING.sm, width: '100%' },
  flexBtn: { flex: 1 },
  logoutBtn: { marginTop: SPACING.lg, marginBottom: SPACING.xl },
  adminRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.md,
    padding: SPACING.md, borderRadius: RADIUS.xl, backgroundColor: COLORS.surface,
  },
  adminText: { flex: 1 },
  adminTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  adminHint: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },
});