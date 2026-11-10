import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Input from '../../../shared/components/common/Input';
import Button from '../../../shared/components/common/Button';
import { COLORS, SPACING, FONT_SIZE, FONTS } from '../../../shared/constants/theme';

export default function GroupFormModal({ visible, group = null, onClose, onSubmit }) {
  const isEdit = Boolean(group);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(group?.name ?? '');
      setError('');
      setSaving(false);
    }
  }, [visible, group]);

  const handleSubmit = async () => {
    if (name.trim().length < 3) {
      setError('Mínimo 3 caracteres');
      return;
    }
    setSaving(true);
    const result = await onSubmit(name.trim());
    setSaving(false);
    if (result?.success) onClose();
    else setError(result?.message ?? 'No se pudo guardar el grupo');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{isEdit ? 'Editar grupo' : 'Nuevo grupo'}</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <Input
            label="Nombre del grupo"
            placeholder="Ej. Ruta Zona 10 - Mañana"
            value={name}
            onChangeText={(text) => { setName(text); setError(''); }}
            autoFocus
            maxLength={80}
            error={error}
          />
          {!isEdit ? (
            <Text style={styles.hint}>Al crear el grupo se genera un código único para que los pasajeros se unan.</Text>
          ) : null}

          <View style={styles.row}>
            <Button title="Cancelar" variant="secondary" onPress={onClose} style={styles.flexBtn} />
            <Button title={isEdit ? 'Guardar' : 'Crear grupo'} onPress={handleSubmit} loading={saving} style={styles.flexBtn} />
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
  hint: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: -SPACING.sm, marginBottom: SPACING.md },
  row: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  flexBtn: { flex: 1 },
});
