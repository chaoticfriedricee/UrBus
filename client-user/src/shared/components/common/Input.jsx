import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../../constants/theme';

export default function Input({ label, error, style, inputStyle, editable = true, icon, multiline, secureTextEntry, ...rest }) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const isPassword = Boolean(secureTextEntry);

  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrapper,
          focused && styles.inputFocused,
          multiline && styles.inputWrapperMultiline,
          !editable && styles.inputDisabled,
          error && styles.inputError,
        ]}
      >
        {icon ? (
          <MaterialIcons name={icon} size={20} color={COLORS.textMuted} style={[styles.icon, multiline && styles.iconMultiline]} />
        ) : null}
        <TextInput
          style={[styles.input, multiline && styles.inputMultiline, inputStyle]}
          placeholderTextColor="#9aa3ae"
          editable={editable}
          multiline={multiline}
          secureTextEntry={isPassword && hidden}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
        {isPassword ? (
          <TouchableOpacity onPress={() => setHidden((value) => !value)} hitSlop={8} accessibilityLabel={hidden ? 'Mostrar contraseña' : 'Ocultar contraseña'}>
            <MaterialIcons name={hidden ? 'visibility' : 'visibility-off'} size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: SPACING.md },
  label: { fontSize: 13, color: COLORS.textLight, marginBottom: 6, fontWeight: '700' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
  },
  inputFocused: { borderColor: COLORS.primary },
  inputWrapperMultiline: { alignItems: 'flex-start', paddingVertical: SPACING.sm },
  icon: { marginRight: 10 },
  iconMultiline: { marginTop: 8 },
  input: { flex: 1, minWidth: 0, paddingVertical: 12, fontSize: FONT_SIZE.md, color: COLORS.text },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top', paddingTop: 6 },
  inputDisabled: { backgroundColor: COLORS.background },
  inputError: { borderColor: COLORS.error },
  errorText: { fontSize: 12.5, fontWeight: '700', color: COLORS.error, marginTop: 6 },
});
