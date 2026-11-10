import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getGroupById } from '../../../shared/api/groupApi';
import { shareGroupCode } from '../utils/shareGroupCode';
import Avatar from '../../../shared/components/common/Avatar';
import { Card, EmptyState, LoadingSpinner, DashedDivider } from '../../../shared/components/common/Common';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../../../shared/constants/theme';

export default function GroupDetailScreen({ route, navigation }) {
  const { groupId, name } = route.params;
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await getGroupById(groupId);
      setGroup(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message ?? 'No se pudo cargar el grupo');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    navigation.setOptions({ title: group?.name ?? name ?? 'Grupo' });
  }, [navigation, group?.name, name]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading) return <LoadingSpinner />;

  const passengers = group?.passengers ?? [];
  const presentCount = passengers.filter((p) => p.status === 'PRESENT').length;

  return (
    <View style={styles.container}>
      {group ? (
        <Card style={styles.codeCard}>
          <View style={styles.codeInfo}>
            <Text style={styles.codeLabel}>Código de unión</Text>
            <Text style={styles.codeHint}>Los pasajeros lo ingresan en «Unirme a un grupo» para quedar en este grupo.</Text>
          </View>
          <TouchableOpacity style={styles.codeBtn} onPress={() => shareGroupCode(group)} accessibilityLabel="Compartir código">
            <Text style={styles.code}>{group.code}</Text>
            <MaterialIcons name="share" size={16} color={COLORS.primary} />
          </TouchableOpacity>
          {!group.isActive ? (
            <Text style={styles.inactive}>Grupo inactivo: no acepta pasajeros nuevos y sus pasajeros no ven tu ubicación.</Text>
          ) : null}
        </Card>
      ) : null}

      <Text style={styles.sectionTitle}>
        {group ? `${passengers.length} pasajero${passengers.length === 1 ? '' : 's'} · ${presentCount} presentes` : ''}
      </Text>

      <Card style={styles.listCard}>
        <FlatList
          data={passengers}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ItemSeparatorComponent={() => <DashedDivider />}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              message={error ?? 'Todavía no hay pasajeros en este grupo. Comparte el código para que se unan.'}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Avatar name={item.name} size={36} />
              <Text style={styles.passengerName} numberOfLines={1}>{item.name}</Text>
              <View style={[styles.dot, { backgroundColor: item.status === 'PRESENT' ? COLORS.presentGreen : COLORS.borderStrong }]} />
              <Text style={styles.status}>{item.status === 'PRESENT' ? 'Presente' : 'Ausente'}</Text>
            </View>
          )}
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.md },
  codeCard: { marginBottom: SPACING.md },
  codeInfo: { marginBottom: SPACING.sm },
  codeLabel: { fontSize: 12, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
  codeHint: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },
  codeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 1.5, borderStyle: 'dashed',
    borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft,
  },
  code: { fontSize: FONT_SIZE.xl, fontWeight: '800', letterSpacing: 4, color: COLORS.primary },
  inactive: { fontSize: FONT_SIZE.xs, color: COLORS.warning, marginTop: SPACING.sm },
  sectionTitle: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.textLight, marginBottom: SPACING.sm },
  listCard: { flex: 1, padding: 0, overflow: 'hidden' },
  separator: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: 18, paddingVertical: 12 },
  passengerName: { flex: 1, fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.text },
  dot: { width: 10, height: 10, borderRadius: 5 },
  status: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, width: 56 },
});
