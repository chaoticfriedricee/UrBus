// src/features/passengers/screens/PassengersScreen.jsx
// Pantalla "Pasajeros" — replica el mockup "Lista de Pasajeros".
// - DRIVER_ROLE / ADMIN_ROLE: lista completa con marcado de presente/ausente.
//   Crear pasajeros: ADMIN o DRIVER. Eliminar: solo ADMIN (reglas del backend).
// - USER_ROLE / PASSENGER_ROLE: tarjeta con su propio estado de asistencia.
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import useAuthStore from '../../../shared/store/authStore';
import { usePassengers } from '../hooks/usePassengers';
import { useMyStatus } from '../hooks/useMyStatus';
import PassengerListItem from '../components/PassengerListItem';
import PassengerFormModal from '../components/PassengerFormModal';
import ConfirmModal from '../../../shared/components/common/ConfirmModal';
import Button from '../../../shared/components/common/Button';
import Input from '../../../shared/components/common/Input';
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

function JoinGroupCard({ loading, onJoin }) {
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    if (!code.trim()) return;
    setJoining(true);
    await onJoin(code.trim());
    setJoining(false);
  };

  return (
    <Card style={styles.groupCard}>
      <Text style={styles.groupTitle}>Únete a un grupo</Text>
      <Text style={styles.groupSubtitle}>Ingresa el código que te compartió tu conductor</Text>
      <Input
        icon="qr-code"
        placeholder="Ej. A3F9K2"
        autoCapitalize="characters"
        value={code}
        onChangeText={setCode}
        style={styles.groupInput}
      />
      <Button title="Unirme al grupo" onPress={handleJoin} loading={joining || loading} />
    </Card>
  );
}

function MyStatusView() {
  const { status, loading, error, notLinked, fetchStatus, toggleStatus, joinGroup } = useMyStatus();

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const isPresent = status?.status === 'PRESENT';
  const group = status?.groupId;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Mi Asistencia</Text>
          <Text style={styles.headerSubtitle}>Marca si vas a abordar el bus hoy</Text>
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
            <Button
              title={isPresent ? 'Marcar como ausente' : 'Marcar como presente'}
              onPress={toggleStatus}
              loading={loading}
            />
          </Card>

          {group ? (
            <Card style={styles.groupCard}>
              <Text style={styles.groupTitle}>Tu grupo</Text>
              <Text style={styles.groupName}>{group.name}</Text>
              <Text style={styles.groupSubtitle}>Código: {group.code}</Text>
            </Card>
          ) : (
            <JoinGroupCard loading={loading} onJoin={joinGroup} />
          )}
        </>
      )}
    </View>
  );
}

export default function PassengersScreen() {
  const user = useAuthStore((state) => state.user);
  const isPassengerRole = user?.role === ROLES.PASSENGER;
  const isManager = MANAGER_ROLES.includes(user?.role) || isPassengerRole;
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
});