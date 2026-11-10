import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/theme';

export default function Checkbox({ checked, onPress, disabled }) {
  return (
    <TouchableOpacity
      onPress={disabled ? undefined : onPress}
      activeOpacity={0.7}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: Boolean(checked), disabled: Boolean(disabled) }}
      style={[styles.pill, checked ? styles.on : styles.off, disabled && styles.disabled]}
    >
      <View style={[styles.dot, checked ? styles.dotOn : styles.dotOff]} />
      <Text style={[styles.text, { color: checked ? COLORS.success : COLORS.textLight }]}>
        {checked ? 'Presente' : 'Ausente'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    minWidth: 102,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  on: { backgroundColor: COLORS.successSoft, borderColor: COLORS.success },
  off: { backgroundColor: COLORS.surface, borderColor: COLORS.borderStrong },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dotOn: { backgroundColor: COLORS.success },
  dotOff: { borderWidth: 2, borderColor: COLORS.textMuted },
  text: { fontSize: 13, fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
