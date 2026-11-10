import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import useAuthStore from '../../../shared/store/authStore';
import { useGroups } from '../hooks/useGroups';
import GroupListItem from '../components/GroupListItem';
import GroupFormModal from '../components/GroupFormModal';
import GroupLimitsView from '../components/GroupLimitsView';
import ConfirmModal from '../../../shared/components/common/ConfirmModal';
import { Card, EmptyState, LoadingSpinner, ScreenHeader, HeaderAction, DashedDivider } from '../../../shared/components/common/Common';
import { COLORS, SPACING, FONT_SIZE, RADIUS, ROLES } from '../../../shared/constants/theme';

const plural = (n, word) => `${word}${n === 1 ? '' : 's'}`;

export default function GroupsScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === ROLES.ADMIN;
  const isDriver = user?.role === ROLES.DRIVER;

  const { groups, loading, error, myLimit, activeCount, refresh, addGroup, editGroup, toggleActive, removeGroup } =
    useGroups({ isDriver });

  const [tab, setTab] = useState('groups');
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState(null);
  const noticeTimer = useRef(null);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  const showNotice = (ok, text) => {
    clearTimeout(noticeTimer.current);
    setNotice({ ok, text });
    noticeTimer.current = setTimeout(() => setNotice(null), 4000);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const limitKnown = isDriver && myLimit !== null;
  const atLimit = limitKnown && activeCount >= myLimit;
  const overLimit = limitKnown && activeCount > myLimit;

  const handleSubmitForm = async (name) => {
    const result = form?.group ? await editGroup(form.group._id, { name }) : await addGroup(name);
    if (result.success) showNotice(true, form?.group ? 'Grupo actualizado' : `Grupo «${name}» creado`);
    return result;
  };

  const handleToggle = async (group) => {
    const result = await toggleActive(group);
    showNotice(result.success, result.success
      ? (group.isActive ? 'Grupo desactivado' : 'Grupo activado')
      : result.message);
  };

  const handleDelete = async () => {
    setDeleting(true);
    const result = await removeGroup(deleteTarget._id);
    setDeleting(false);
    setDeleteTarget(null);
    showNotice(result.success, result.success ? 'Grupo eliminado' : result.message);
  };

  let subtitle = `${groups.length} ${plural(groups.length, 'grupo')} registrados`;
  if (loading && groups.length === 0) subtitle = 'Cargando...';
  else if (isDriver) {
    subtitle = limitKnown
      ? `${activeCount} de ${myLimit} ${plural(myLimit, 'grupo')} ${plural(myLimit, 'activo')}`
      : `${activeCount} ${plural(activeCount, 'grupo')} ${plural(activeCount, 'activo')}`;
  }

  const listHeader = (
    <>
      {isDriver && atLimit ? (
        <View style={[styles.banner, styles.bannerWarning]}>
          <Text style={styles.bannerWarningText}>
            {overLimit
              ? `Tienes ${activeCount} grupos activos y el límite actual es ${myLimit}. Tus grupos se conservan, pero no podrás crear ni reactivar grupos hasta tener menos de ${myLimit} activos.`
              : `Alcanzaste el límite de ${myLimit} ${plural(myLimit, 'grupo')} ${plural(myLimit, 'activo')}. Para crear otro, desactiva o elimina uno, o pide a un administrador un límite mayor.`}
          </Text>
        </View>
      ) : null}
      {isDriver && groups.length > 0 ? (
        <View style={[styles.banner, styles.bannerInfo]}>
          <Text style={styles.bannerInfoText}>
            Cada grupo tiene su propio código de unión. Compártelo con tus pasajeros: lo ingresan en «Unirme a un grupo» y quedan asignados a ese grupo. Toca un grupo para ver sus pasajeros.
          </Text>
        </View>
      ) : null}
    </>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={isDriver ? 'Mis grupos' : 'Grupos'}
        subtitle={subtitle}
        right={
          isDriver ? (
            <HeaderAction
              icon="add"
              label="Nuevo grupo"
              disabled={atLimit}
              onPress={() => (atLimit ? showNotice(false, `Alcanzaste el límite de ${myLimit} grupos activos`) : setForm({}))}
            />
          ) : null
        }
      />
      <View style={styles.body}>

      {isAdmin ? (
        <View style={styles.tabs}>
          {[{ value: 'groups', label: 'Todos los grupos' }, { value: 'limits', label: 'Límites' }].map((t) => (
            <TouchableOpacity
              key={t.value}
              style={[styles.tab, tab === t.value && styles.tabSelected]}
              onPress={() => setTab(t.value)}
            >
              <Text style={[styles.tabText, tab === t.value && styles.tabTextSelected]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {notice ? (
        <View style={[styles.notice, notice.ok ? styles.noticeOk : styles.noticeError]}>
          <Text style={[styles.noticeText, { color: notice.ok ? COLORS.success : COLORS.error }]}>{notice.text}</Text>
        </View>
      ) : null}

      {isAdmin && tab === 'limits' ? (
        <GroupLimitsView onNotice={showNotice} />
      ) : (
        <Card style={styles.listCard}>
          {loading && groups.length === 0 ? (
            <LoadingSpinner />
          ) : (
            <FlatList
              data={groups}
              keyExtractor={(item) => item._id}
              ListHeaderComponent={listHeader}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              ItemSeparatorComponent={() => <DashedDivider />}
              ListEmptyComponent={
                <EmptyState
                  icon="groups"
                  message={error ?? (isDriver
                    ? (atLimit ? 'No tienes grupos disponibles para crear' : 'Todavía no has creado ningún grupo. Toca + para crear el primero.')
                    : 'Sin grupos registrados')}
                />
              }
              renderItem={({ item }) => (
                <GroupListItem
                  group={item}
                  canManage={isAdmin || item.driverId === user?.id}
                  onOpen={(g) => navigation.navigate('GroupDetail', { groupId: g._id, name: g.name })}
                  onEdit={(g) => setForm({ group: g })}
                  onToggleActive={handleToggle}
                  onDelete={(g) => setDeleteTarget(g)}
                />
              )}
            />
          )}
        </Card>
      )}
      </View>

      <GroupFormModal
        visible={Boolean(form)}
        group={form?.group ?? null}
        onClose={() => setForm(null)}
        onSubmit={handleSubmitForm}
      />

      <ConfirmModal
        visible={Boolean(deleteTarget)}
        title="¿Eliminar grupo?"
        message={deleteTarget
          ? `Se eliminará «${deleteTarget.name}» y sus pasajeros quedarán sin grupo. Esta acción no se puede deshacer.`
          : ''}
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  body: { flex: 1, padding: SPACING.md },
  tabs: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  tab: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.pill,
    borderWidth: 1.5, borderColor: COLORS.borderStrong, backgroundColor: COLORS.surface,
  },
  tabSelected: { backgroundColor: COLORS.text, borderColor: COLORS.text },
  tabText: { fontSize: 13.5, fontWeight: '700', color: COLORS.textLight },
  tabTextSelected: { color: '#fff' },
  notice: { borderRadius: RADIUS.md, padding: SPACING.sm + 2, marginBottom: SPACING.sm, borderWidth: 1.5, borderLeftWidth: 5 },
  noticeOk: { backgroundColor: COLORS.successSoft, borderColor: '#bddcc8', borderLeftColor: COLORS.success },
  noticeError: { backgroundColor: COLORS.errorSoft, borderColor: '#efc2bb', borderLeftColor: COLORS.error },
  noticeText: { fontSize: FONT_SIZE.sm, fontWeight: '700' },
  listCard: { flex: 1, padding: 0, overflow: 'hidden' },
  banner: { margin: SPACING.sm, marginBottom: 0, padding: SPACING.sm + 4, borderRadius: RADIUS.md, borderWidth: 1.5, borderLeftWidth: 5 },
  bannerWarning: { backgroundColor: COLORS.accentSoft, borderColor: '#f0d68a', borderLeftColor: COLORS.accentDark },
  bannerWarningText: { fontSize: FONT_SIZE.xs + 1, color: COLORS.accentInk, lineHeight: 18 },
  bannerInfo: { backgroundColor: COLORS.primarySoft, borderColor: '#cfe0ee', borderLeftColor: COLORS.primary, marginBottom: SPACING.sm },
  bannerInfoText: { fontSize: FONT_SIZE.xs + 1, color: '#12405f', lineHeight: 18 },
});
