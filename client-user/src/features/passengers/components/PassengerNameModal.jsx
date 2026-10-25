// src/features/passengers/components/PassengerNameModal.jsx
// Editar el nombre de un pasajero (ADMIN) — como el modo edición de PassengerModal en client-admin
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Input from '../../../shared/components/common/Input';
import Button from '../../../shared/components/common/Button';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../../../shared/constants/theme';

export default function PassengerNameModal({ passenger, onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (passenger) {
      setName(passenger.name ?? '');
      setError('');
      setSaving(false);
    }
  }, [passenger]);

  const handleSubmit = async () => {
    if (name.trim().length < 3) {
      setError('El nombre debe tener al menos 3 caracteres');
      return;
    }
    setSaving(true);
    const result = await onSubmit(passenger._id, name.trim());
    setSaving(false);
    if (result.success) onClose();
    else setError(result.message);
  };

  return (
    <Modal visible={Boolean(passenger)} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Editar pasajero</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
          <Input
            label="Nombre completo"
            value={name}
            onChangeText={(text) => { setName(text); setError(''); }}
            autoFocus
            maxLength={100}
            error={error}
          />
          <View style={styles.row}>
            <Button title="Cancelar" variant="secondary" onPress={onClose} style={styles.flexBtn} />
            <Button title="Guardar" onPress={handleSubmit} loading={saving} style={styles.flexBtn} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  card: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, paddingBottom: SPACING.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  title: { fontSize: FONT_SIZE.lg, fontWeight: '800', color: COLORS.text },
  row: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  flexBtn: { flex: 1 },
});
