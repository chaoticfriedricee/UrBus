import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import authClient from '../../../shared/api/authClient';
import AuthBackdrop from '../components/AuthBackdrop';
import Input from '../../../shared/components/common/Input';
import Button from '../../../shared/components/common/Button';
import { DashedDivider } from '../../../shared/components/common/Common';
import { COLORS, SPACING, FONT_SIZE, FONTS } from '../../../shared/constants/theme';

const MODES = {
  forgot: {
    title: 'Recuperar contraseña',
    description: 'Ingresa el correo de tu cuenta y te enviaremos un enlace para crear una contraseña nueva.',
    action: 'Enviar enlace',
    sent: 'Si el correo existe, recibirás las instrucciones en unos minutos. Revisa también la carpeta de spam.',
    request: (email) => authClient.post('/auth/forgot-password', { email }),

    isSuccess: () => true,
    fallbackError: 'Error al enviar el correo de recuperación.',
  },
  resend: {
    title: 'Verificar correo',
    description: 'Ingresa el correo con el que te registraste y te reenviaremos el enlace de verificación.',
    action: 'Reenviar verificación',
    sent: 'Correo de verificación enviado. Abre el enlace para activar tu cuenta y luego inicia sesión.',
    request: (email) => authClient.post('/auth/resend-verification', { email }),

    isSuccess: (data) => Boolean(data?.success),
    fallbackError: 'No se pudo reenviar la verificación.',
  },
};

export default function EmailRequestScreen({ route, navigation }) {
  const mode = MODES[route.params?.mode] ?? MODES.forgot;
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    const value = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(value)) {
      setError('Ingresa un correo electrónico válido');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await mode.request(value);
      if (mode.isSuccess(data)) setSent(true);
      else setError(data?.message ?? mode.fallbackError);
    } catch (err) {
      setError(err.response?.data?.errors?.[0]?.message ?? err.response?.data?.message ?? mode.fallbackError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackdrop>
      <Text style={styles.title}>{mode.title}</Text>

      {sent ? (
        <View style={styles.sentBox}>
          <View style={styles.sentMark}>
            <MaterialIcons name="mark-email-read" size={30} color={COLORS.success} />
          </View>
          <Text style={styles.sentText}>{mode.sent}</Text>
        </View>
      ) : (
        <>
          <Text style={styles.description}>{mode.description}</Text>
          <Input
            label="Correo electrónico"
            icon="mail-outline"
            placeholder="correo@ejemplo.com"
            value={email}
            onChangeText={(text) => { setEmail(text); setError(null); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            onSubmitEditing={handleSubmit}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title={mode.action} onPress={handleSubmit} loading={loading} />
        </>
      )}

      <DashedDivider style={styles.divider} />
      <Text style={styles.backLink} onPress={() => navigation.goBack()}>Volver al inicio de sesión</Text>
    </AuthBackdrop>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: FONTS.display, fontSize: 26, lineHeight: 30, color: COLORS.text, marginBottom: SPACING.sm },
  description: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginBottom: SPACING.lg, lineHeight: 20 },
  error: { color: COLORS.error, fontSize: 13, fontWeight: '700', marginBottom: SPACING.sm },
  sentBox: { gap: SPACING.md, paddingVertical: SPACING.sm },
  sentMark: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.successSoft, alignItems: 'center', justifyContent: 'center' },
  sentText: { fontSize: FONT_SIZE.sm, color: COLORS.text, lineHeight: 21 },
  divider: { marginHorizontal: 0, marginVertical: SPACING.lg },
  backLink: { color: COLORS.primary, fontWeight: '800', fontSize: FONT_SIZE.sm },
});
