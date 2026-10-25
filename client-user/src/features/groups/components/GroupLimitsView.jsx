// src/features/groups/components/GroupLimitsView.jsx
// Límites de grupos (solo ADMIN) — portado de client-admin (DefaultLimitCard + DriverLimitCard):
// - Límite general: máximo de grupos activos de cada conductor sin límite propio (2 por defecto).
// - Por conductor: un límite propio, o "Usar general" para quitarlo.
// Bajar un límite no elimina grupos: solo impide crear o reactivar más.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, RefreshControl, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getAllUsers } from '../../../shared/api/userApi';
import {
  getGroupSettings, updateGroupSettings, getGroupLimit, setGroupLimit, resetGroupLimit,
} from '../../../shared/api/groupApi';
import { Card, EmptyState, LoadingSpinner } from '../../../shared/components/common/Common';
import { COLORS, SPACING, FONT_SIZE, RADIUS, ROLES } from '../../../shared/constants/theme';

const MAX_LIMIT = 100;
const messageOf = (err, fallback) => err.response?.data?.message ?? fallback;

const parseLimit = (text) => {
  const value = Number(text);
  return text.trim() !== '' && Number.isInteger(value) && value >= 0 && value <= MAX_LIMIT ? value : null;
};

// Valor editable en línea: muestra "N grupos" y, al tocarlo, un campo numérico con Guardar/Cancelar
function LimitEditor({ value, onSave, highlight }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [invalid, setInvalid] = useState(false);

  const start = () => {
    setText(String(value ?? 0));
    setInvalid(false);
    setEditing(true);
  };

  const save = async () => {
    const limit = parseLimit(text);
    if (limit === null) {
      setInvalid(true);
      return;
    }
    setSaving(true);
    const ok = await onSave(limit);
    setSaving(false);
    if (ok) setEditing(false);
  };

  if (!editing) {
    return (
      <TouchableOpacity
        style={[styles.valueBtn, highlight && styles.valueBtnHighlight]}
        onPress={start}
        disabled={value === undefined || value === null}
      >
        <Text style={[styles.valueText, highlight && styles.valueTextHighlight]}>
          {value ?? '...'} grupo{value === 1 ? '' : 's'}
        </Text>
        <MaterialIcons name="edit" size={13} color={highlight ? '#fff' : COLORS.textLight} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.editRow}>
      <TextInput
        style={[styles.limitInput, invalid && styles.limitInputInvalid]}
        value={text}
        onChangeText={(t) => { setText(t.replace(/[^0-9]/g, '')); setInvalid(false); }}
        keyboardType="number-pad"
        maxLength={3}
        autoFocus
        onSubmitEditing={save}
      />
      <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
        <Text style={styles.saveText}>{saving ? '...' : 'Guardar'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setEditing(false)} hitSlop={8}>
        <MaterialIcons name="close" size={20} color={COLORS.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

export default function GroupLimitsView({ onNotice }) {
  const [defaultLimit, setDefaultLimit] = useState(null);
  const [drivers, setDrivers] = useState([]);
  // driverId -> { maxGroups, isCustom, activeGroups }
  const [limits, setLimits] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [settingsRes, usersRes] = await Promise.all([getGroupSettings(), getAllUsers()]);
      setDefaultLimit(settingsRes.data.data?.maxGroupsPerDriver ?? null);
      const users = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.data ?? []);
      const driverList = users.filter((u) => u.role === ROLES.DRIVER);
      setDrivers(driverList);

      const entries = await Promise.all(driverList.map(async (d) => {
        try {
          const res = await getGroupLimit(d.id);
          return [d.id, res.data.data];
        } catch {
          return [d.id, null];
        }
      }));
      setLimits(Object.fromEntries(entries));
    } catch (err) {
      setError(messageOf(err, 'No se pudieron cargar los límites'));
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

  const saveDefault = async (maxGroupsPerDriver) => {
    try {
      await updateGroupSettings({ maxGroupsPerDriver });
      setDefaultLimit(maxGroupsPerDriver);
      // Los conductores sin límite propio pasan a usar el nuevo valor
      setLimits((prev) => Object.fromEntries(Object.entries(prev).map(([id, l]) => [
        id, l && !l.isCustom ? { ...l, maxGroups: maxGroupsPerDriver } : l,
      ])));
      onNotice(true, 'Límite general actualizado');
      return true;
    } catch (err) {
      onNotice(false, messageOf(err, 'No se pudo actualizar el límite general'));
      return false;
    }
  };

  const saveDriver = async (driverId, maxGroups) => {
    try {
      const res = await setGroupLimit(driverId, maxGroups);
      setLimits((prev) => ({ ...prev, [driverId]: res.data.data }));
      onNotice(true, 'Límite del conductor actualizado');
      return true;
    } catch (err) {
      onNotice(false, messageOf(err, 'No se pudo actualizar el límite'));
      return false;
    }
  };

  const resetDriver = async (driverId) => {
    try {
      const res = await resetGroupLimit(driverId);
      setLimits((prev) => ({ ...prev, [driverId]: res.data.data }));
      onNotice(true, 'El conductor usa ahora el límite general');
    } catch (err) {
      onNotice(false, messageOf(err, 'No se pudo restablecer el límite'));
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Card style={styles.listCard}>
      <FlatList
        data={drivers}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.defaultCard}>
            <View style={styles.flex}>
              <Text style={styles.defaultTitle}>Límite general por conductor</Text>
              <Text style={styles.defaultHint}>
                Máximo de grupos activos de cada conductor sin límite propio. Bajarlo no elimina grupos: solo impide crear más.
              </Text>
            </View>
            <LimitEditor value={defaultLimit} onSave={saveDefault} highlight />
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={<EmptyState icon="person-off" message={error ?? 'No hay conductores registrados'} />}
        renderItem={({ item }) => {
          const limit = limits[item.id];
          const fullName = `${item.name ?? ''} ${item.surname ?? ''}`.trim() || item.username;
          return (
            <View style={styles.driverRow}>
              <View style={styles.flex}>
                <Text style={styles.driverName} numberOfLines={1}>{fullName}</Text>
                <Text style={styles.driverMeta} numberOfLines={1}>
                  {item.username}
                  {limit ? ` · ${limit.activeGroups ?? 0} activos · ${limit.isCustom ? 'Límite propio' : 'Usa el general'}` : ''}
                </Text>
                {limit?.isCustom ? (
                  <TouchableOpacity onPress={() => resetDriver(item.id)} hitSlop={6}>
                    <Text style={styles.resetText}>Usar general</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <LimitEditor value={limit?.maxGroups} onSave={(value) => saveDriver(item.id, value)} />
            </View>
          );
        }}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  listCard: { flex: 1, padding: 0, overflow: 'hidden' },
  flex: { flex: 1, minWidth: 0 },
  separator: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 18 },
  defaultCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: 18,
    backgroundColor: '#f0f7ff', borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  defaultTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  defaultHint: { fontSize: FONT_SIZE.xs, color: COLORS.textLight, marginTop: 2 },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: 18, paddingVertical: 14 },
  driverName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  driverMeta: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },
  resetText: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.primary, marginTop: 4 },
  valueBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: RADIUS.pill, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: '#f9fafb',
  },
  valueBtnHighlight: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  valueText: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text },
  valueTextHighlight: { color: '#fff' },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  limitInput: {
    width: 54, paddingVertical: 6, borderRadius: RADIUS.sm, borderWidth: 1.5, borderColor: COLORS.primary,
    textAlign: 'center', fontSize: FONT_SIZE.md, color: COLORS.text, backgroundColor: COLORS.surface,
  },
  limitInputInvalid: { borderColor: COLORS.error },
  saveBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: RADIUS.sm, backgroundColor: COLORS.primary },
  saveText: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZE.xs },
});
