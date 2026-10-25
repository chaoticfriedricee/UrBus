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
import { getGroups } from '../../../shared/api/groupApi';
import PassengerListItem from '../components/PassengerListItem';
import PassengerFormModal from '../components/PassengerFormModal';
import ConfirmModal from '../../../shared/components/common/ConfirmModal';
import Button from '../../../shared/components/common/Button';
import Input from '../../../shared/components/common/Input';
import Avatar from '../../../shared/components/common/Avatar';
import { Card, EmptyState, LoadingSpinner } from '../../../shared/components/common/Common';
import { COLORS, SPACING, FONT_SIZE, MANAGER_ROLES, ROLES } from '../../../shared/constants/theme';

// Selector del grupo de pasajeros que se quiere ver (conductor: sus grupos; admin: todos)
function GroupChips({ groups, selectedGroupId, onSelect }) {
  const options = [{ _id: null, name: 'Todos' }, ...groups];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.chipsScroll}
      contentContainerStyle={styles.chips}
    >
      {options.map((g) => {
        const selected = g._id === selectedGroupId;
        const hint = g._id ? (g.isActive ? `${g.passengerCount ?? 0}` : 'inactivo') : null;
        return (
          <TouchableOpacity
            key={g._id ?? 'all'}
            style={[styles.chip, selected && styles.chipSelected]}
            onPress={() => { if (!selected) onSelect(g._id); }}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1}>
              {g.name}
              {hint ? <Text style={styles.chipHint}>{`  ${hint}`}</Text> : null}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

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
  const [groups, setGroups] = useState([]);
  // null = todos; si no, el _id del grupo que el conductor quiere ver en este momento
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  const loadGroups = useCallback(async () => {
    try {
      const response = await getGroups();
      const data = response.data.data ?? response.data;
      setGroups(Array.isArray(data) ? data : []);
    } catch {
      setGroups([]);
    }
  }, []);

  const loadPassengers = useCallback(async (groupId) => {
    const result = await fetchPassengers(groupId);
    // El grupo ya no existe o no es suyo: se vuelve a la lista completa (el efecto la carga)
    if (groupId && [400, 403, 404].includes(result.status)) {
      setSelectedGroupId(null);
      loadGroups();
    }
  }, [fetchPassengers, loadGroups]);

  useEffect(() => { loadGroups(); }, [loadGroups]);
  useEffect(() => { loadPassengers(selectedGroupId); }, [loadPassengers, selectedGroupId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadPassengers(selectedGroupId), loadGroups()]);
    setRefreshing(false);
  }, [loadPassengers, loadGroups, selectedGroupId]);

  const selectedGroup = groups.find((g) => g._id === selectedGroupId) ?? null;

  const handleFormSubmit = async (payload) => {
    const result = await addPassenger(payload);
    if (result.success) {
      setShowCreate(false);
      // Un pasajero nuevo no tiene grupo: si se está viendo un grupo, no pertenece a esa lista
      if (selectedGroupId) await loadPassengers(selectedGroupId);
    }
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
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {loading
              ? 'Cargando...'
              : `${selectedGroup ? `${selectedGroup.name} · ` : ''}${presentCount} de ${passengers.length} presentes`}
          </Text>
        </View>
        {canCreate ? (
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
            <MaterialIcons name="person-add-alt-1" size={20} color="#fff" />
          </TouchableOpacity>
        ) : null}
      </View>

      {groups.length > 0 ? (
        <GroupChips groups={groups} selectedGroupId={selectedGroupId} onSelect={setSelectedGroupId} />
      ) : null}

      <Card style={styles.listCard}>
        {loading && passengers.length === 0 ? (
          <LoadingSpinner />
        ) : (
          <FlatList
            data={passengers}
            keyExtractor={(item) => item._id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <EmptyState
                message={
                  error ??
                  (selectedGroup
                    ? `Este grupo todavía no tiene pasajeros. Comparte el código ${selectedGroup.code} para que se unan.`
                    : 'Sin pasajeros registrados')
                }
                icon="people-outline"
              />
            }
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

// feedback vive en el padre: tras unirse la vista cambia y esta tarjeta se vuelve a montar
function JoinGroupCard({ loading, currentGroup, onJoin, feedback, setFeedback }) {
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);

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
  const [joinFeedback, setJoinFeedback] = useState(null);

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
        // Sin perfil de pasajero todavía: al unirse con el código del conductor se crea
        <JoinGroupCard loading={loading} currentGroup={null} onJoin={joinGroup} feedback={joinFeedback} setFeedback={setJoinFeedback} />
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
          <JoinGroupCard loading={loading} currentGroup={group} onJoin={joinGroup} feedback={joinFeedback} setFeedback={setJoinFeedback} />
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
  chipsScroll: { flexGrow: 0, marginBottom: SPACING.md },
  chips: { gap: SPACING.sm, paddingRight: SPACING.md },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, maxWidth: 220,
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border,
  },
  chipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text },
  chipTextSelected: { color: '#fff' },
  chipHint: { fontSize: FONT_SIZE.xs, fontWeight: '600', opacity: 0.7 },
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