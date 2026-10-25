// src/features/passengers/components/PassengerListItem.jsx
// Fila de la lista de pasajeros — replica el diseño del mockup "Lista de Pasajeros" con las
// mismas acciones que client-admin (features/passangers/components/PassengerCard.jsx):
// - ADMIN y DRIVER: asistencia, motivo de ausencia (registrar / quitar) e info de contacto.
// - Solo ADMIN: editar el nombre y eliminar.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Avatar from '../../../shared/components/common/Avatar';
import Checkbox from '../../../shared/components/common/Checkbox';
import { isTodayGT } from '../../../shared/utils/date';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../../../shared/constants/theme';

const ABSENCE_REASON_LABELS = {
  SALUD: 'Motivos de Salud',
  EMERGENCIA: 'Emergencia',
  EXTRACURRICULAR: 'Actividad Extracurricular',
  OTRO: 'Otro Motivo',
};

function IconBtn({ icon, color, label, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={6}
      style={[styles.iconBtn, { backgroundColor: `${color}14`, borderColor: `${color}40` }]}
    >
      <MaterialIcons name={icon} size={16} color={color} />
    </TouchableOpacity>
  );
}

export default function PassengerListItem({
  passenger, canToggle, canManage, canEdit, canDelete,
  onToggle, onAbsenceReason, onClearAbsenceReason, onInfo, onEdit, onDelete,
}) {
  const isPresent = passenger.status === 'PRESENT';
  // El motivo de ausencia solo se muestra si se registró hoy (horario de Guatemala)
  const showAbsenceReason = !isPresent && passenger.absenceReason && isTodayGT(passenger.absenceReasonAt);
  const reasonLabel = ABSENCE_REASON_LABELS[passenger.absenceReason] ?? passenger.absenceReason;

  return (
    <View style={styles.row}>
      <View style={styles.top}>
        <Avatar name={passenger.name} size={48} />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{passenger.name}</Text>
          <Text style={styles.address} numberOfLines={1}>
            {passenger.address ?? `ID: ${String(passenger._id ?? '').slice(-6)}`}
          </Text>
          {showAbsenceReason ? (
            <View style={styles.reasonRow}>
              <Text style={styles.reason} numberOfLines={2}>
                {reasonLabel}{passenger.absenceReasonNote ? `: ${passenger.absenceReasonNote}` : ''}
              </Text>
              {canManage ? (
                <TouchableOpacity onPress={() => onClearAbsenceReason(passenger)} hitSlop={8} accessibilityLabel="Quitar motivo de ausencia">
                  <MaterialIcons name="close" size={14} color="#b45309" />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </View>
        <Checkbox checked={isPresent} onPress={() => onToggle(passenger)} disabled={!canToggle} />
      </View>

      {canManage ? (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.reasonBtn} onPress={() => onAbsenceReason(passenger)}>
            <Text style={styles.reasonBtnText}>¿Motivo de ausencia?</Text>
          </TouchableOpacity>
          <View style={styles.iconRow}>
            <IconBtn icon="contact-phone" color={COLORS.primary} label="Información de contacto" onPress={() => onInfo(passenger)} />
            {canEdit ? <IconBtn icon="edit" color={COLORS.primary} label="Editar pasajero" onPress={() => onEdit(passenger)} /> : null}
            {canDelete ? <IconBtn icon="delete-outline" color={COLORS.error} label="Eliminar pasajero" onPress={() => onDelete(passenger)} /> : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 14, paddingHorizontal: 18, backgroundColor: COLORS.surface },
  top: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  address: { fontSize: 12.5, color: COLORS.textMuted, marginTop: 2 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  reason: { flexShrink: 1, fontSize: FONT_SIZE.xs, fontWeight: '700', color: '#b45309' },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.sm, paddingLeft: 48 + SPACING.md },
  reasonBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.sm, borderWidth: 1.5, borderColor: COLORS.border },
  reasonBtnText: { fontSize: FONT_SIZE.xs, fontWeight: '600', color: COLORS.text },
  iconRow: { flexDirection: 'row', gap: 6 },
  iconBtn: { width: 32, height: 32, borderRadius: RADIUS.sm, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
