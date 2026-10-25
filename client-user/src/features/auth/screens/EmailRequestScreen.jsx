// src/features/auth/screens/EmailRequestScreen.jsx
// "¿Olvidaste tu contraseña?" y "¿No verificaste tu correo?" — portados de client-admin
// (features/auth/components/ForgotPassword.jsx y ResendVerification.jsx). El enlace del
// correo abre la página web de UrBus (restablecer contraseña / verificar correo).
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import authClient from '../../../shared/api/authClient';
import Input from '../../../shared/components/common/Input';
import Button from '../../../shared/components/common/Button';
import { COLORS, SPACING, FONT_SIZE } from '../../../shared/constants/theme';

const MODES = {
  forgot: {
    title: 'Recuperar contraseña',
    description: 'Ingresa el correo de tu cuenta y te enviaremos un enlace para crear una contraseña nueva.',
    action: 'Enviar enlace',
    sent: 'Si el correo existe, recibirás las instrucciones en unos minutos. Revisa también la carpeta de spam.',
    request: (email) => authClient.post('/auth/forgot-password', { email }),
    // El servicio responde lo mismo exista o no la cuenta (no revela qué correos están registrados)
    isSuccess: () => true,
    fallbackError: 'Error al enviar el correo de recuperación.',
  },
  resend: {
    title: 'Verificar correo',
    description: 'Ingresa el correo con el que te registraste y te reenviaremos el enlace de verificación.',
    action: 'Reenviar verificación',
    sent: 'Correo de verificación enviado. Abre el enlace para activar tu cuenta y luego inicia sesión.',
    request: (email) => authClient.post('/auth/resend-verification', { email }),
    // Responde 200 con success:false si la cuenta no existe o ya está verificada
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
    <View style={styles.screen}>
      <LinearGradient colors={['#eaf5fc', '#f7fbfe']} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{mode.title}</Text>

        {sent ? (
          <View style={styles.sentBox}>
            <MaterialIcons name="mark-email-read" size={40} color={COLORS.success} />
            <Text style={styles.sentText}>{mode.sent}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.description}>{mode.description}</Text>
            <Input
              icon="email"
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

        <Text style={styles.backLink} onPress={() => navigation.goBack()}>Volver al inicio de sesión</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#eaf5fc' },
  container: { flexGrow: 1, padding: SPACING.lg, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.sm },
  description: { fontSize: FONT_SIZE.sm, color: COLORS.textLight, marginBottom: SPACING.lg, lineHeight: 20 },
  error: { color: COLORS.error, fontSize: FONT_SIZE.sm, textAlign: 'center', marginBottom: SPACING.sm },
  sentBox: { alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.lg },
  sentText: { fontSize: FONT_SIZE.md, color: COLORS.text, textAlign: 'center', lineHeight: 22 },
  backLink: { color: COLORS.primary, fontWeight: '700', fontSize: FONT_SIZE.sm, textAlign: 'center', marginTop: SPACING.lg },
});
