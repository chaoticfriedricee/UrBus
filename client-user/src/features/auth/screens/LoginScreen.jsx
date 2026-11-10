import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useAuth } from '../hooks/useAuth';
import AuthBackdrop from '../components/AuthBackdrop';
import Input from '../../../shared/components/common/Input';
import Button from '../../../shared/components/common/Button';
import { DashedDivider } from '../../../shared/components/common/Common';
import { COLORS, SPACING, FONT_SIZE, FONTS } from '../../../shared/constants/theme';

export default function LoginScreen({ navigation }) {
  const { handleLogin, loading, error } = useAuth();
  const { control, handleSubmit } = useForm({
    defaultValues: { emailOrUsername: '', password: '' },
  });

  const onSubmit = async (values) => {
    await handleLogin(values);
  };

  return (
    <AuthBackdrop>
      <Text style={styles.title}>Bienvenido de vuelta</Text>
      <Text style={styles.subtitle}>Ingresa con tu cuenta para ver el recorrido de tu bus.</Text>

      <Controller
        control={control}
        name="emailOrUsername"
        rules={{ required: 'Ingresa tu correo o usuario' }}
        render={({ field: { onChange, value }, fieldState: { error: fieldError } }) => (
          <Input
            label="Usuario o correo"
            icon="person-outline"
            value={value}
            onChangeText={onChange}
            autoCapitalize="none"
            placeholder="tu.usuario o correo@ejemplo.com"
            error={fieldError?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        rules={{ required: 'Ingresa tu contraseña' }}
        render={({ field: { onChange, value }, fieldState: { error: fieldError } }) => (
          <Input
            label="Contraseña"
            icon="lock-outline"
            value={value}
            onChangeText={onChange}
            secureTextEntry
            placeholder="Tu contraseña"
            error={fieldError?.message}
          />
        )}
      />

      <Text style={styles.forgotLink} onPress={() => navigation.navigate('EmailRequest', { mode: 'forgot' })}>
        ¿Olvidaste tu contraseña?
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title="Ingresar" onPress={handleSubmit(onSubmit)} loading={loading} style={styles.loginBtn} />

      <DashedDivider style={styles.divider} />

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>¿No tienes cuenta? </Text>
        <Text style={styles.footerLink} onPress={() => navigation.navigate('Register')}>Regístrate</Text>
      </View>
      <View style={styles.footerRow}>
        <Text style={styles.footerText}>¿No verificaste tu correo? </Text>
        <Text style={styles.footerLink} onPress={() => navigation.navigate('EmailRequest', { mode: 'resend' })}>
          Reenviar enlace
        </Text>
      </View>
    </AuthBackdrop>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: FONTS.display, fontSize: 28, lineHeight: 32, color: COLORS.text },
  subtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginTop: 6, marginBottom: SPACING.lg, lineHeight: 20 },
  error: { color: COLORS.error, fontSize: 13, fontWeight: '700', marginBottom: SPACING.sm },
  loginBtn: { marginTop: SPACING.xs },
  divider: { marginHorizontal: 0, marginVertical: SPACING.lg },
  footerRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  forgotLink: { color: COLORS.primary, fontWeight: '800', fontSize: 13.5, textAlign: 'right', marginBottom: SPACING.sm },
  footerText: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm },
  footerLink: { color: COLORS.primary, fontWeight: '800', fontSize: FONT_SIZE.sm },
});
