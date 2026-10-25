// src/features/passengers/components/AbsenceReasonModal.jsx
// "¿Motivo de ausencia?" — portado de client-admin (features/passangers/components/AbsenceReasonModal.jsx).
// Registrar un motivo marca al pasajero como ausente; se muestra solo durante ese día (hora GT).
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Input from '../../../shared/components/common/Input';
import Button from '../../../shared/components/common/Button';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../../../shared/constants/theme';

export const ABSENCE_REASONS = [
  { value: 'SALUD', label: 'Motivos de Salud' },
  { value: 'EMERGENCIA', label: 'Emergencias' },
  { value: 'EXTRACURRICULAR', label: 'Actividades Extracurriculares' },
  { value: 'OTRO', label: 'Otro Motivo' },
];

export default function AbsenceReasonModal({ passenger, onClose, onSubmit }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (passenger) {
      setReason('');
      setNote('');
      setError('');
      setSaving(false);
    }
  }, [passenger]);

  const handleAccept = async () => {
    if (!reason) {
      setError('Elige un motivo');
      return;
    }
    setSaving(true);
    const result = await onSubmit(passenger._id, reason, reason === 'OTRO' ? note.trim() || undefined : undefined);
    setSaving(false);
    if (result.success) onClose();
    else setError(result.message);
  };

  return (
    <Modal visible={Boolean(passenger)} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.flex}>
              <Text style={styles.title}>¿Motivo de ausencia?</Text>
              <Text style={styles.subtitle} numberOfLines={1}>{passenger?.name}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {ABSENCE_REASONS.map((r) => {
            const selected = reason === r.value;
            return (
              <TouchableOpacity
                key={r.value}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => { setReason(r.value); setError(''); }}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
              >
                <MaterialIcons
                  name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
                  size={20}
                  color={selected ? COLORS.primary : COLORS.textMuted}
                />
                <Text style={styles.optionText}>{r.label}</Text>
              </TouchableOpacity>
            );
          })}

          {reason === 'OTRO' ? (
            <Input
              placeholder="Describe el motivo (opcional)"
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={200}
              style={styles.note}
            />
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.row}>
            <Button title="Cancelar" variant="secondary" onPress={onClose} style={styles.flex} />
            <Button title="Aceptar" onPress={handleAccept} loading={saving} style={styles.flex} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  card: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, paddingBottom: SPACING.xl },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  flex: { flex: 1 },
  title: { fontSize: FONT_SIZE.lg, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginTop: 2 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: 12, marginBottom: SPACING.sm,
    borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border,
  },
  optionSelected: { borderColor: COLORS.primary, backgroundColor: '#e8f1f9' },
  optionText: { fontSize: FONT_SIZE.md, color: COLORS.text },
  note: { marginTop: SPACING.xs },
  error: { color: COLORS.error, fontSize: FONT_SIZE.sm, marginBottom: SPACING.sm },
  row: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
});
