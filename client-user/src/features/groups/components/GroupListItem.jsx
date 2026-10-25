// src/features/groups/components/GroupListItem.jsx
// Fila de un grupo — portada de client-admin (features/groups/components/GroupCard.jsx)
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { shareGroupCode } from '../utils/shareGroupCode';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../../../shared/constants/theme';

function IconBtn({ icon, color, label, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={6}
      style={[styles.iconBtn, { borderColor: `${color}40`, backgroundColor: `${color}14` }]}
    >
      <MaterialIcons name={icon} size={16} color={color} />
    </TouchableOpacity>
  );
}

export default function GroupListItem({ group, canManage, onOpen, onEdit, onToggleActive, onDelete }) {
  const { name, code, isActive, passengerCount = 0 } = group;

  return (
    <TouchableOpacity style={[styles.row, !isActive && styles.inactive]} onPress={() => onOpen(group)} activeOpacity={0.7}>
      <View style={styles.top}>
        <View style={styles.iconWrap}>
          <MaterialIcons name="groups" size={22} color={COLORS.primary} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <Text style={styles.meta}>
            {passengerCount} pasajero{passengerCount === 1 ? '' : 's'} · {isActive ? 'Activo' : 'Inactivo'}
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={22} color={COLORS.textMuted} />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.codeBtn}
          onPress={() => shareGroupCode(group)}
          accessibilityLabel={`Compartir código ${code}`}
        >
          <Text style={styles.code}>{code}</Text>
          <MaterialIcons name="share" size={14} color={COLORS.primary} />
        </TouchableOpacity>

        {canManage ? (
          <View style={styles.manage}>
            <IconBtn
              icon={isActive ? 'block' : 'check'}
              color={isActive ? '#b45309' : '#15803d'}
              label={isActive ? 'Desactivar grupo' : 'Activar grupo'}
              onPress={() => onToggleActive(group)}
            />
            <IconBtn icon="edit" color={COLORS.primary} label="Editar grupo" onPress={() => onEdit(group)} />
            <IconBtn icon="delete-outline" color={COLORS.error} label="Eliminar grupo" onPress={() => onDelete(group)} />
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 18, paddingVertical: 14, backgroundColor: COLORS.surface },
  inactive: { opacity: 0.6 },
  top: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 4 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#e8f0fe', alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  meta: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.sm, gap: SPACING.sm },
  codeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: RADIUS.sm, borderWidth: 1.5, borderStyle: 'dashed', borderColor: COLORS.primary, backgroundColor: '#f0f7ff',
  },
  code: { fontSize: FONT_SIZE.sm, fontWeight: '800', letterSpacing: 1.5, color: COLORS.primary },
  manage: { flexDirection: 'row', gap: 6 },
  iconBtn: { width: 34, height: 34, borderRadius: RADIUS.sm, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
