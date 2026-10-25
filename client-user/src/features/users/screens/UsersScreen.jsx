// src/features/users/screens/UsersScreen.jsx
// Gestión de usuarios (solo ADMIN) — portada de client-admin (features/users/pages/UserListPage.jsx
// y components/UserCard.jsx): filtrar por rol, cambiar el rol, verificar el correo a mano
// (alternativa al envío por SMTP) y ver la información de la cuenta.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, ScrollView, RefreshControl, TouchableOpacity, Alert, Modal, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import useAuthStore from '../../../shared/store/authStore';
import { getAllUsers, updateUserRole, verifyUserEmail } from '../../../shared/api/userApi';
import AccountInfoModal from '../../../shared/components/AccountInfoModal';
import Avatar from '../../../shared/components/common/Avatar';
import { Card, EmptyState, LoadingSpinner } from '../../../shared/components/common/Common';
import { COLORS, SPACING, FONT_SIZE, RADIUS, ROLES, ROLE_LABELS } from '../../../shared/constants/theme';

const ROLE_FILTERS = [
  { value: 'ALL', label: 'Todos' },
  { value: ROLES.ADMIN, label: 'Administradores' },
  { value: ROLES.PASSENGER, label: 'Pasajeros' },
  { value: ROLES.DRIVER, label: 'Conductores' },
  { value: ROLES.USER, label: 'Usuarios' },
];

const ROLE_COLORS = {
  ADMIN_ROLE: { bg: '#fee2e2', color: '#b91c1c' },
  PASSENGER_ROLE: { bg: '#dbeafe', color: '#1d4ed8' },
  DRIVER_ROLE: { bg: '#dcfce7', color: '#15803d' },
  USER_ROLE: { bg: '#f3f4f6', color: '#4b5563' },
};

const ROLE_OPTIONS = [ROLES.ADMIN, ROLES.PASSENGER, ROLES.DRIVER, ROLES.USER];

const messageOf = (err, fallback) => err.response?.data?.message ?? fallback;
const fullNameOf = (u) => `${u.name ?? ''} ${u.surname ?? ''}`.trim() || u.username;

function RoleBadge({ role }) {
  const palette = ROLE_COLORS[role] ?? ROLE_COLORS.USER_ROLE;
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.badgeText, { color: palette.color }]}>{ROLE_LABELS[role] ?? role ?? 'Sin rol'}</Text>
    </View>
  );
}

function RolePickerModal({ user, onClose, onPick }) {
  return (
    <Modal visible={Boolean(user)} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <View style={styles.flex}>
              <Text style={styles.sheetTitle}>Cambiar rol</Text>
              <Text style={styles.sheetSubtitle} numberOfLines={1}>{user ? fullNameOf(user) : ''}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
          {ROLE_OPTIONS.map((role) => {
            const selected = user?.role === role;
            return (
              <TouchableOpacity
                key={role}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => onPick(user, role)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
              >
                <MaterialIcons
                  name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
                  size={20}
                  color={selected ? COLORS.primary : COLORS.textMuted}
                />
                <Text style={styles.optionText}>{ROLE_LABELS[role]}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

export default function UsersScreen() {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [roleTarget, setRoleTarget] = useState(null);
  const [infoUserId, setInfoUserId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { data } = await getAllUsers();
      setUsers(Array.isArray(data) ? data : (data?.data ?? []));
    } catch (err) {
      setError(messageOf(err, 'No se pudieron cargar los usuarios'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const filtered = useMemo(
    () => (roleFilter === 'ALL' ? users : users.filter((u) => u.role === roleFilter)),
    [users, roleFilter]
  );

  const applyRole = async (user, role) => {
    setRoleTarget(null);
    setBusyId(user.id);
    try {
      const { data } = await updateUserRole(user.id, role);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...data, role } : u)));
    } catch (err) {
      Alert.alert('No se pudo cambiar el rol', messageOf(err, 'Error al actualizar el rol'));
    } finally {
      setBusyId(null);
    }
  };

  const handlePickRole = (user, role) => {
    if (role === user.role) {
      setRoleTarget(null);
      return;
    }
    const isSelf = String(user.id) === String(currentUserId);
    if (isSelf && user.role === ROLES.ADMIN && role !== ROLES.ADMIN) {
      setRoleTarget(null);
      Alert.alert(
        'Quitarte el rol de Administrador',
        'Estás a punto de quitarte el rol de Administrador a ti mismo. ¿Deseas continuar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar', style: 'destructive', onPress: () => applyRole(user, role) },
        ]
      );
      return;
    }
    applyRole(user, role);
  };

  const handleVerifyEmail = (user) => {
    Alert.alert(
      'Verificar correo',
      `¿Confirmas que quieres verificar manualmente el correo de ${fullNameOf(user)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Verificar',
          onPress: async () => {
            setBusyId(user.id);
            try {
              const { data } = await verifyUserEmail(user.id);
              setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...data, isEmailVerified: true } : u)));
            } catch (err) {
              Alert.alert('No se pudo verificar', messageOf(err, 'Error al verificar el correo'));
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>
        {roleFilter === 'ALL' ? `${users.length} usuarios` : `${filtered.length} de ${users.length} usuarios`}
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chips}>
        {ROLE_FILTERS.map((f) => {
          const selected = roleFilter === f.value;
          return (
            <TouchableOpacity key={f.value} style={[styles.chip, selected && styles.chipSelected]} onPress={() => setRoleFilter(f.value)}>
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Card style={styles.listCard}>
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={<EmptyState icon="person-search" message={error ?? 'No hay usuarios con ese rol'} />}
          renderItem={({ item }) => (
            <View style={[styles.row, busyId === item.id && styles.busy]}>
              <View style={styles.top}>
                <Avatar name={fullNameOf(item)} size={44} />
                <View style={styles.flex}>
                  <Text style={styles.name} numberOfLines={1}>{fullNameOf(item)}</Text>
                  <Text style={styles.email} numberOfLines={1}>{item.email}</Text>
                  <View style={styles.flags}>
                    <RoleBadge role={item.role} />
                    {item.status === false ? <Text style={styles.flagInactive}>Inactivo</Text> : null}
                    {!item.isEmailVerified ? <Text style={styles.flagUnverified}>Correo sin verificar</Text> : null}
                  </View>
                </View>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => setRoleTarget(item)} disabled={busyId === item.id}>
                  <MaterialIcons name="manage-accounts" size={16} color={COLORS.primary} />
                  <Text style={styles.actionText}>Cambiar rol</Text>
                </TouchableOpacity>
                {!item.isEmailVerified ? (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleVerifyEmail(item)} disabled={busyId === item.id}>
                    <MaterialIcons name="mark-email-read" size={16} color={COLORS.success} />
                    <Text style={[styles.actionText, { color: COLORS.success }]}>Verificar correo</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity style={styles.iconBtn} onPress={() => setInfoUserId(item.id)} accessibilityLabel="Información de la cuenta">
                  <MaterialIcons name="info-outline" size={18} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </Card>

      <RolePickerModal user={roleTarget} onClose={() => setRoleTarget(null)} onPick={handlePickRole} />
      <AccountInfoModal userId={infoUserId} onClose={() => setInfoUserId(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.md },
  flex: { flex: 1, minWidth: 0 },
  subtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginBottom: SPACING.sm },
  chipsScroll: { flexGrow: 0, marginBottom: SPACING.md },
  chips: { gap: SPACING.sm, paddingRight: SPACING.md },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.pill, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  chipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text },
  chipTextSelected: { color: '#fff' },
  listCard: { flex: 1, padding: 0, overflow: 'hidden' },
  separator: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 18 },
  row: { paddingHorizontal: 18, paddingVertical: 14 },
  busy: { opacity: 0.5 },
  top: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 4 },
  name: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  email: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },
  flags: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.pill },
  badgeText: { fontSize: 11, fontWeight: '700' },
  flagInactive: { fontSize: 11, fontWeight: '600', color: COLORS.error },
  flagUnverified: { fontSize: 11, fontWeight: '600', color: '#f59e0b' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.sm, paddingLeft: 44 + SPACING.sm + 4 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: RADIUS.sm, borderWidth: 1.5, borderColor: COLORS.border,
  },
  actionText: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.primary },
  iconBtn: { width: 32, height: 32, borderRadius: RADIUS.sm, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, paddingBottom: SPACING.xl },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  sheetTitle: { fontSize: FONT_SIZE.lg, fontWeight: '800', color: COLORS.text },
  sheetSubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginTop: 2 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: 12, marginBottom: SPACING.sm,
    borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border,
  },
  optionSelected: { borderColor: COLORS.primary, backgroundColor: '#e8f1f9' },
  optionText: { fontSize: FONT_SIZE.md, color: COLORS.text },
});
