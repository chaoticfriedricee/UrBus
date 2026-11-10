import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../../constants/theme';

export default function Button({ title, onPress, variant = 'primary', loading = false, disabled = false, style }) {
  const isDisabled = disabled || loading;
  const tone = TONES[variant] ?? TONES.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      style={[styles.base, tone.container, isDisabled && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator color={tone.text} />
      ) : (
        <View style={styles.content}>
          <Text style={[styles.text, { color: tone.text }]} numberOfLines={1}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const TONES = {
  primary: {
    container: { backgroundColor: COLORS.accent, borderBottomWidth: 4, borderBottomColor: COLORS.accentDark },
    text: COLORS.text,
  },
  blue: {
    container: { backgroundColor: COLORS.primary, borderBottomWidth: 4, borderBottomColor: COLORS.primaryDark },
    text: '#ffffff',
  },
  secondary: {
    container: { backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.borderStrong },
    text: COLORS.text,
  },
  danger: {
    container: { backgroundColor: COLORS.error, borderBottomWidth: 4, borderBottomColor: '#8a2a20' },
    text: '#ffffff',
  },
};

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.55 },
  text: { fontSize: FONT_SIZE.md, fontWeight: '700' },
});
