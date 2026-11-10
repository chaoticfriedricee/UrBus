import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Input from '../../../shared/components/common/Input';
import Button from '../../../shared/components/common/Button';
import { COLORS, SPACING, FONT_SIZE, FONTS } from '../../../shared/constants/theme';

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
  overlay: { flex: 1, backgroundColor: 'rgba(29,39,51,0.55)', justifyContent: 'flex-end' },
  card: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1.5, borderBottomWidth: 0, borderColor: COLORS.text, padding: SPACING.lg, paddingBottom: SPACING.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  title: { fontFamily: FONTS.display, fontSize: FONT_SIZE.xl, color: COLORS.text },
  error: { color: COLORS.error, fontSize: FONT_SIZE.sm, marginBottom: SPACING.sm },
  row: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  flexBtn: { flex: 1 },
});
