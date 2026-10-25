// src/shared/components/AccountInfoModal.jsx
// Datos de contacto de una cuenta — portado de client-admin (shared/components/AccountInfoModal.jsx).
// Lo usan la lista de pasajeros (ADMIN o DRIVER) y la gestión de usuarios (ADMIN).
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, Linking, ActivityIndicator, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getUserById } from '../api/userApi';
import { formatDateGT } from '../utils/date';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';

function InfoRow({ icon, label, value, onPress }) {
  const content = (
    <View style={styles.infoRow}>
      <MaterialIcons name={icon} size={18} color={COLORS.primary} />
      <View style={styles.flex}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, onPress && styles.link]} selectable>{value || 'No disponible'}</Text>
      </View>
    </View>
  );
  return onPress && value ? <TouchableOpacity onPress={onPress}>{content}</TouchableOpacity> : content;
}

/** userId: la cuenta a mostrar (null = cerrado). */
export default function AccountInfoModal({ userId, onClose }) {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    setAccount(null);
    setError(null);
    setLoading(true);
    getUserById(userId)
      .then(({ data }) => { if (!cancelled) setAccount(data?.data ?? data); })
      .catch((err) => { if (!cancelled) setError(err.response?.data?.message ?? 'No se pudo cargar la información de la cuenta'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  const fullName = account ? `${account.name ?? ''} ${account.surname ?? ''}`.trim() : '';

  return (
    <Modal visible={Boolean(userId)} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Información de contacto</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={COLORS.primary} style={styles.spinner} />
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : account ? (
            <>
              <InfoRow icon="person" label="Nombre completo" value={fullName} />
              <InfoRow icon="alternate-email" label="Usuario" value={account.username} />
              <InfoRow
                icon="phone"
                label="Teléfono"
                value={account.phone}
                onPress={() => Linking.openURL(`tel:${account.phone}`)}
              />
              <InfoRow
                icon="email"
                label="Correo electrónico"
                value={account.email}
                onPress={() => Linking.openURL(`mailto:${account.email}`)}
              />
              <InfoRow icon="event" label="Cuenta creada" value={formatDateGT(account.createdAt)} />
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  card: { width: '100%', maxWidth: 400, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  title: { fontSize: FONT_SIZE.lg, fontWeight: '800', color: COLORS.text },
  flex: { flex: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm },
  infoLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  infoValue: { fontSize: FONT_SIZE.md, color: COLORS.text, fontWeight: '600' },
  link: { color: COLORS.primary },
  spinner: { marginVertical: SPACING.lg },
  error: { color: COLORS.error, fontSize: FONT_SIZE.sm, textAlign: 'center', marginVertical: SPACING.md },
});
