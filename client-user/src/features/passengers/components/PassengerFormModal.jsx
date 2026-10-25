// src/features/passengers/components/PassengerFormModal.jsx
// Modal para vincular un nuevo pasajero a una cuenta — portado de client-admin
// (features/passangers/components/PassengerModal.jsx). Solo alta: el nombre de un
// pasajero existente se edita con PassengerNameModal.
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Input from '../../../shared/components/common/Input';
import Button from '../../../shared/components/common/Button';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../../../shared/constants/theme';

export default function PassengerFormModal({ visible, loading, onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setName('');
      setUserId('');
      setError('');
    }
  }, [visible]);

  const handleSubmit = () => {
    if (!name.trim() || name.trim().length < 3) {
      setError('El nombre debe tener al menos 3 caracteres');
      return;
    }
    if (!userId.trim()) {
      setError('El ID de cuenta es obligatorio');
      return;
    }
    onSubmit({ name: name.trim(), userId: userId.trim() });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Vincular pasajero</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <Input label="Nombre completo" placeholder="Ej. María García" value={name} onChangeText={setName} />
          <Input
            label="ID de cuenta (userId)"
            placeholder="ID del usuario en el sistema de auth"
            value={userId}
            onChangeText={setUserId}
            autoCapitalize="none"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.row}>
            <Button title="Cancelar" variant="secondary" onPress={onClose} style={styles.flexBtn} />
            <Button title="Vincular" onPress={handleSubmit} loading={loading} style={styles.flexBtn} />
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
  error: { color: COLORS.error, fontSize: FONT_SIZE.sm, marginBottom: SPACING.sm },
  row: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  flexBtn: { flex: 1 },
});