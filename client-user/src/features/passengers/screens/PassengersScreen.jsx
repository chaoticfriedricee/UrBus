// src/features/passengers/screens/PassengersScreen.jsx
// Pantalla "Pasajeros" — replica el mockup "Lista de Pasajeros".
// - DRIVER_ROLE / ADMIN_ROLE: lista completa con marcado de presente/ausente.
//   Crear pasajeros: ADMIN o DRIVER. Eliminar: solo ADMIN (reglas del backend).
// - USER_ROLE / PASSENGER_ROLE: tarjeta con su propio estado de asistencia, su
//   grupo (o el formulario para unirse con un código) y sus compañeros de grupo.
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, ScrollView, RefreshControl, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import useAuthStore from '../../../shared/store/authStore';
import { usePassengers } from '../hooks/usePassengers';
import { useMyStatus } from '../hooks/useMyStatus';
import PassengerListItem from '../components/PassengerListItem';
import PassengerFormModal from '../components/PassengerFormModal';
import ConfirmModal from '../../../shared/components/common/ConfirmModal';
import Button from '../../../shared/components/common/Button';
import Input from '../../../shared/components/common/Input';
import Avatar from '../../../shared/components/common/Avatar';
import { Card, EmptyState, LoadingSpinner } from '../../../shared/components/common/Common';
import { COLORS, SPACING, FONT_SIZE, MANAGER_ROLES, ROLES } from '../../../shared/constants/theme';

function ManagerPassengersView() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === ROLES.ADMIN;
  const canCreate = MANAGER_ROLES.includes(user?.role); // ADMIN o DRIVER
  const canToggleStatus = user?.role === ROLES.ADMIN || user?.role === ROLES.DRIVER;

  const { passengers, loading, error, presentCount, fetchPassengers, toggleStatus, addPassenger, removePassenger } =
    usePassengers();

  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => { fetchPassengers(); }, [fetchPassengers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPassengers();
    setRefreshing(false);
  }, [fetchPassengers]);

  const handleFormSubmit = async (payload) => {
    const result = await addPassenger(payload);
    if (result.success) setShowCreate(false);
  };

  const handleDeleteConfirm = async () => {
    await removePassenger(deleteTarget._id);
    setDeleteTarget(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Lista de Pasajeros</Text>
          <Text style={styles.headerSubtitle}>
            {loading ? 'Cargando...' : `${presentCount} de ${passengers.length} presentes`}
          </Text>
        </View>
        {canCreate ? (
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
            <MaterialIcons name="person-add-alt-1" size={20} color="#fff" />
          </TouchableOpacity>
        ) : null}
      </View>

      <Card style={styles.listCard}>
        {loading && passengers.length === 0 ? (
          <LoadingSpinner />
        ) : (
          <FlatList
            data={passengers}
            keyExtractor={(item) => item._id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={<EmptyState message={error ?? 'Sin pasajeros registrados'} icon="people-outline" />}
            renderItem={({ item }) => (
              <PassengerListItem
                passenger={item}
                canToggle={canToggleStatus}
                canDelete={isAdmin}
                onToggle={(p) => toggleStatus(p._id, p.status)}
                onDelete={(p) => setDeleteTarget(p)}
              />
            )}
          />
        )}
      </Card>

      <PassengerFormModal
        visible={showCreate}
        loading={loading}
        onClose={() => setShowCreate(false)}
        onSubmit={handleFormSubmit}
      />

      <ConfirmModal
        visible={Boolean(deleteTarget)}
        title="¿Eliminar pasajero?"
        message={deleteTarget ? `Se eliminará a ${deleteTarget.name}. Esta acción no se puede deshacer.` : ''}
        loading={loading}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </View>
  );
}

function JoinGroupCard({ loading, currentGroup, onJoin }) {
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleJoin = async () => {
    if (!code.trim()) {
      setFeedback({ ok: false, text: 'Ingresa el código de tu grupo' });
      return;
    }
    setJoining(true);
    setFeedback(null);
    const result = await onJoin(code.trim());
    setJoining(false);
    if (result?.success) {
      setCode('');
      const name = result.data?.group?.name;
      setFeedback({ ok: true, text: name ? `Te uniste al grupo ${name}` : 'Te uniste al grupo' });
    } else {
      setFeedback({ ok: false, text: result?.error ?? 'No se pudo unir al grupo' });
    }
  };

  return (
    <Card style={styles.groupCard}>
      <Text style={styles.groupTitle}>Unirme a un grupo</Text>
      <Text style={styles.groupSubtitle}>
        Ingresa el código de unión que te compartió tu conductor.
        {currentGroup ? ` Si te unes a otro grupo dejarás «${currentGroup.name}».` : ''}
      </Text>
      <Input
        icon="qr-code"
        placeholder="Ej. A3F9K2"
        autoCapitalize="characters"
        value={code}
        onChangeText={(text) => { setCode(text.toUpperCase()); setFeedback(null); }}
        style={styles.groupInput}
      />
      {feedback ? (
        <Text style={[styles.feedback, { color: feedback.ok ? COLORS.success : COLORS.error }]}>{feedback.text}</Text>
      ) : null}
      <Button title="Unirme al grupo" onPress={handleJoin} loading={joining || loading} />
    </Card>
  );
}

function MyGroupCard({ group, mates }) {
  return (
    <Card style={styles.groupCard}>
      <Text style={styles.groupTitle}>Tu grupo</Text>
      <Text style={styles.groupName}>{group.name}</Text>
      <Text style={styles.groupSubtitle}>Código: {group.code}</Text>
      {group.isActive ? (
        <>
          <Text style={[styles.groupTitle, styles.matesTitle]}>
            Compañeros ({mates.length})
          </Text>
          {mates.map((mate) => (
            <View key={mate._id} style={styles.mateRow}>
              <Avatar name={mate.name} size={32} />
              <Text style={styles.mateName} numberOfLines={1}>{mate.name}</Text>
            </View>
          ))}
        </>
      ) : (
        <Text style={styles.groupSubtitle}>
          Este grupo está inactivo. Tu conductor debe reactivarlo para ver compañeros, anuncios y ubicación.
        </Text>
      )}
    </Card>
  );
}

function MyStatusView() {
  const { status, loading, error, notLinked, groupMates, fetchStatus, joinGroup } = useMyStatus();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStatus();
    setRefreshing(false);
  }, [fetchStatus]);

  const isPresent = status?.status === 'PRESENT';
  const group = status?.groupId;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Mi Asistencia</Text>
          <Text style={styles.headerSubtitle}>Tu estado de abordaje de hoy</Text>
        </View>
      </View>

      {loading && !status ? (
        <LoadingSpinner />
      ) : notLinked ? (
        <Card style={styles.statusCard}>
          <EmptyState message="Aún no estás vinculado como pasajero. Contacta al administrador." icon="info-outline" />
        </Card>
      ) : error && !status ? (
        <Card style={styles.statusCard}>
          <EmptyState message={error} />
        </Card>
      ) : (
        <>
          <Card style={styles.statusCard}>
            <Text style={styles.statusLabel}>Tu estado actual</Text>
            <Text style={[styles.statusValue, { color: isPresent ? COLORS.success : COLORS.warning }]}>
              {isPresent ? 'PRESENTE' : 'AUSENTE'}
            </Text>
            {/* La asistencia solo la marcan el conductor o un administrador (passenger-service) */}
            <Text style={styles.statusLabel}>El conductor marca tu asistencia al abordar.</Text>
          </Card>

          {group ? <MyGroupCard group={group} mates={groupMates} /> : null}
          {/* Siempre visible: un pasajero pertenece a un solo grupo y unirse a otro lo cambia */}
          <JoinGroupCard loading={loading} currentGroup={group} onJoin={joinGroup} />
        </>
      )}
    </ScrollView>
  );
}

export default function PassengersScreen() {
  const user = useAuthStore((state) => state.user);
  // PASSENGER_ROLE usa la misma vista que USER_ROLE: solo ve a los compañeros de su grupo
  const isManager = MANAGER_ROLES.includes(user?.role);
  return isManager ? <ManagerPassengersView /> : <MyStatusView />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  headerTitle: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.text },
  headerSubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginTop: 2 },
  addBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  listCard: { flex: 1, padding: 0, overflow: 'hidden' },
  separator: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 18 },
  statusCard: { alignItems: 'center', padding: SPACING.lg },
  statusLabel: { fontSize: FONT_SIZE.md, color: COLORS.textLight, marginBottom: SPACING.xs },
  statusValue: { fontSize: FONT_SIZE.xl, fontWeight: '800', marginBottom: SPACING.lg },
  groupCard: { padding: SPACING.lg, marginTop: SPACING.md },
  groupTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.xs },
  groupSubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginBottom: SPACING.sm },
  groupName: { fontSize: FONT_SIZE.lg, fontWeight: '800', color: COLORS.primary, marginBottom: 2 },
  groupInput: { marginBottom: SPACING.sm },
  feedback: { fontSize: FONT_SIZE.sm, fontWeight: '600', marginBottom: SPACING.sm },
  scrollContent: { paddingBottom: SPACING.xl },
  matesTitle: { marginTop: SPACING.md },
  mateRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 6 },
  mateName: { flex: 1, fontSize: FONT_SIZE.md, color: COLORS.text },
});