import React from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useAuthStore from '../../store/authStore';
import { COLORS, SPACING, FONT_SIZE, RADIUS, FONTS, ROLE_PANEL } from '../../constants/theme';

export function LoadingSpinner() {
  return (
    <View style={styles.spinnerContainer}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}

export function EmptyState({ message, icon = 'info-outline' }) {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyMark}>
        <MaterialIcons name={icon} size={30} color={COLORS.textMuted} />
      </View>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function DashedDivider({ style }) {
  return (
    <View style={[styles.dashedWrap, style]}>
      <View style={styles.dashed} />
    </View>
  );
}

export function ScreenHeader({ title, subtitle, right, eyebrow }) {
  const insets = useSafeAreaInsets();
  const role = useAuthStore((state) => state.user?.role);
  const label = eyebrow ?? ROLE_PANEL[role];

  return (
    <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
      <View style={styles.ringA} pointerEvents="none" />
      <View style={styles.ringB} pointerEvents="none" />
      <View style={styles.stop} pointerEvents="none" />
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          {label ? (
            <View style={styles.eyebrowRow}>
              <View style={styles.eyebrowBar} />
              <Text style={styles.eyebrow} numberOfLines={1}>{label}</Text>
            </View>
          ) : null}
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        {right ?? null}
      </View>
    </View>
  );
}

export function HeaderAction({ icon, onPress, disabled, label }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      accessibilityLabel={label}
      style={[styles.actionShadow, disabled && styles.actionDisabled]}
    >
      <View style={styles.actionBtn}>
        <MaterialIcons name={icon} size={22} color={COLORS.text} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  spinnerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  emptyMark: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { marginTop: SPACING.md, fontSize: FONT_SIZE.sm, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  dashedWrap: { height: 1, overflow: 'hidden', marginHorizontal: 18 },
  dashed: { height: 3, borderWidth: 1.5, borderStyle: 'dashed', borderColor: COLORS.borderStrong },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingBottom: 18,
    overflow: 'hidden',
    borderBottomWidth: 4,
    borderBottomColor: COLORS.accent,
  },
  ringA: {
    position: 'absolute',
    top: -58,
    right: -42,
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 30,
    borderColor: 'rgba(255,193,7,0.2)',
  },
  ringB: {
    position: 'absolute',
    bottom: -64,
    left: -36,
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 22,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  stop: {
    position: 'absolute',
    top: 40,
    right: 118,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.primary,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  headerText: { flex: 1, minWidth: 0 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  eyebrowBar: { width: 18, height: 4, borderRadius: 2, backgroundColor: COLORS.accent },
  eyebrow: { fontSize: 11.5, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.78)' },
  title: { fontFamily: FONTS.display, fontSize: 27, lineHeight: 31, color: '#ffffff', fontWeight: '800' },
  subtitle: { fontSize: FONT_SIZE.sm, color: 'rgba(255,255,255,0.82)', marginTop: 3 },
  actionShadow: { backgroundColor: COLORS.accentDark, borderRadius: 12, paddingBottom: 3 },
  actionBtn: { width: 44, height: 42, borderRadius: 12, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  actionDisabled: { opacity: 0.5 },
});
