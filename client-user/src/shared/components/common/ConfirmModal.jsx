import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZE, RADIUS, FONTS } from '../../constants/theme';

export default function ConfirmModal({
  visible, title, message, confirmLabel = 'Sí, eliminar', cancelLabel = 'Cancelar',
  loading = false, danger = true, onConfirm, onClose,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: danger ? COLORS.errorSoft : COLORS.accentSoft }]}>
            <MaterialIcons
              name={danger ? 'delete-outline' : 'help-outline'}
              size={26}
              color={danger ? COLORS.error : COLORS.accentInk}
            />
          </View>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.row}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, danger ? styles.dangerBtn : styles.primaryBtn]}
              onPress={onConfirm}
              disabled={loading}
            >
              <Text style={styles.confirmText}>{loading ? 'Procesando…' : confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(29,39,51,0.55)', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.text,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md },
  title: { fontFamily: FONTS.display, fontSize: FONT_SIZE.xl, color: COLORS.text, marginBottom: SPACING.xs, textAlign: 'center' },
  message: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING.lg, lineHeight: 20 },
  row: { flexDirection: 'row', gap: SPACING.sm, width: '100%' },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.borderStrong, alignItems: 'center' },
  cancelText: { color: COLORS.text, fontWeight: '700', fontSize: FONT_SIZE.sm },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.md, alignItems: 'center' },
  dangerBtn: { backgroundColor: COLORS.error },
  primaryBtn: { backgroundColor: COLORS.primary },
  confirmText: { color: '#fff', fontWeight: '800', fontSize: FONT_SIZE.sm },
});
