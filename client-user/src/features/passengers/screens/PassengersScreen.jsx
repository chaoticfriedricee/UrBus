import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, ScrollView, RefreshControl, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import useAuthStore from '../../../shared/store/authStore';
import { usePassengers } from '../hooks/usePassengers';
import { useMyStatus } from '../hooks/useMyStatus';
import { getGroups } from '../../../shared/api/groupApi';
import PassengerListItem from '../components/PassengerListItem';
import PassengerFormModal from '../components/PassengerFormModal';
import AbsenceReasonModal from '../components/AbsenceReasonModal';
import AccountInfoModal from '../../../shared/components/AccountInfoModal';
import PassengerNameModal from '../components/PassengerNameModal';
import ConfirmModal from '../../../shared/components/common/ConfirmModal';
import Button from '../../../shared/components/common/Button';
import Input from '../../../shared/components/common/Input';
import Avatar from '../../../shared/components/common/Avatar';
import { Card, EmptyState, LoadingSpinner, ScreenHeader, HeaderAction, DashedDivider } from '../../../shared/components/common/Common';
import { COLORS, SPACING, FONT_SIZE, MANAGER_ROLES, ROLES, FONTS } from '../../../shared/constants/theme';

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
  const canCreate = MANAGER_ROLES.includes(user?.role);
  const canToggleStatus = user?.role === ROLES.ADMIN || user?.role === ROLES.DRIVER;

  const {
    passengers, loading, error, presentCount, fetchPassengers, toggleStatus, addPassenger, removePassenger,
    editPassenger, saveAbsenceReason, removeAbsenceReason,
  } = usePassengers();
  const [absenceTarget, setAbsenceTarget] = useState(null);
  const [infoTarget, setInfoTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);

  const handleClearAbsenceReason = async (passenger) => {
    const result = await removeAbsenceReason(passenger._id);
    if (!result.success) Alert.alert('No se pudo quitar el motivo', result.message);
  };

  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [groups, setGroups] = useState([]);

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

      if (selectedGroupId) await loadPassengers(selectedGroupId);
    }
  };

  const handleDeleteConfirm = async () => {
    await removePassenger(deleteTarget._id);
    setDeleteTarget(null);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={isAdmin ? 'Pasajeros' : 'Mis pasajeros'}
        subtitle={
          loading
            ? 'Cargando…'
            : `${selectedGroup ? `${selectedGroup.name} · ` : ''}${presentCount} de ${passengers.length} presentes`
        }
        right={canCreate ? <HeaderAction icon="person-add-alt-1" label="Nuevo pasajero" onPress={() => setShowCreate(true)} /> : null}
      />
      <View style={styles.body}>

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
            ItemSeparatorComponent={() => <DashedDivider />}
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
                canManage={canToggleStatus}

                canEdit={canToggleStatus}
                canDelete={isAdmin}
                onToggle={(p) => toggleStatus(p._id, p.status)}
                onAbsenceReason={setAbsenceTarget}
                onClearAbsenceReason={handleClearAbsenceReason}
                onInfo={setInfoTarget}
                onEdit={setEditTarget}
                onDelete={(p) => setDeleteTarget(p)}
              />
            )}
          />
        )}
      </Card>
      </View>

      <PassengerFormModal
        visible={showCreate}
        loading={loading}
        onClose={() => setShowCreate(false)}
        onSubmit={handleFormSubmit}
      />

      <AbsenceReasonModal passenger={absenceTarget} onClose={() => setAbsenceTarget(null)} onSubmit={saveAbsenceReason} />
      <AccountInfoModal userId={infoTarget?.userId} onClose={() => setInfoTarget(null)} />
      <PassengerNameModal passenger={editTarget} onClose={() => setEditTarget(null)} onSubmit={editPassenger} />

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
      <View style={styles.codeTicket}><Text style={styles.codeTicketText}>{group.code}</Text></View>
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
    <View style={styles.container}>
    <ScreenHeader title="Mi asistencia" subtitle="Tu estado de abordaje de hoy" />
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {loading && !status ? (
        <LoadingSpinner />
      ) : notLinked ? (
        <JoinGroupCard loading={loading} currentGroup={null} onJoin={joinGroup} feedback={joinFeedback} setFeedback={setJoinFeedback} />
      ) : error && !status ? (
        <Card style={styles.statusCard}>
          <EmptyState message={error} />
        </Card>
      ) : (
        <>
          <Card style={[styles.statusCard, isPresent ? styles.statusPresent : styles.statusAbsent]}>
            <Text style={styles.statusLabel}>Tu estado actual</Text>
            <Text style={[styles.statusValue, { color: isPresent ? COLORS.success : COLORS.warning }]}>
              {isPresent ? 'Presente' : 'Ausente'}
            </Text>
            <Text style={styles.statusHint}>El conductor marca tu asistencia al abordar.</Text>
          </Card>

          {group ? <MyGroupCard group={group} mates={groupMates} /> : null}
          {}
          <JoinGroupCard loading={loading} currentGroup={group} onJoin={joinGroup} feedback={joinFeedback} setFeedback={setJoinFeedback} />
        </>
      )}
    </ScrollView>
    </View>
  );
}

export default function PassengersScreen() {
  const user = useAuthStore((state) => state.user);

  const isManager = MANAGER_ROLES.includes(user?.role);
  return isManager ? <ManagerPassengersView /> : <MyStatusView />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  body: { flex: 1, padding: SPACING.md },
  scroll: { flex: 1 },
  chipsScroll: { flexGrow: 0, marginBottom: SPACING.md },
  chips: { gap: SPACING.sm, paddingRight: SPACING.md },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, maxWidth: 220,
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.borderStrong,
  },
  chipSelected: { backgroundColor: COLORS.text, borderColor: COLORS.text },
  chipText: { fontSize: 13.5, fontWeight: '700', color: COLORS.textLight },
  chipTextSelected: { color: '#fff' },
  chipHint: { fontSize: FONT_SIZE.xs, fontWeight: '700', opacity: 0.7 },
  listCard: { flex: 1, padding: 0, overflow: 'hidden' },
  statusCard: { alignItems: 'center', padding: SPACING.lg, marginHorizontal: SPACING.md, marginTop: SPACING.md, borderLeftWidth: 8 },
  statusPresent: { borderLeftColor: COLORS.success },
  statusAbsent: { borderLeftColor: COLORS.warning },
  statusLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', color: COLORS.textMuted },
  statusValue: { fontFamily: FONTS.display, fontSize: 34, lineHeight: 40, marginVertical: SPACING.xs },
  statusHint: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, textAlign: 'center' },
  groupCard: { padding: SPACING.lg, marginTop: SPACING.md, marginHorizontal: SPACING.md },
  groupTitle: { fontFamily: FONTS.displayBold, fontSize: FONT_SIZE.lg, color: COLORS.text, marginBottom: SPACING.xs },
  groupSubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginBottom: SPACING.sm, lineHeight: 20 },
  groupName: { fontFamily: FONTS.display, fontSize: 24, lineHeight: 28, color: COLORS.primary, marginBottom: SPACING.sm },
  codeTicket: {
    alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft,
  },
  codeTicketText: { fontSize: 15, fontWeight: '800', letterSpacing: 3, color: COLORS.primary },
  groupInput: { marginBottom: SPACING.sm },
  feedback: { fontSize: FONT_SIZE.sm, fontWeight: '700', marginBottom: SPACING.sm },
  scrollContent: { paddingBottom: SPACING.xl },
  matesTitle: { marginTop: SPACING.md },
  mateRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 6 },
  mateName: { flex: 1, fontSize: FONT_SIZE.md, color: COLORS.text },
});
