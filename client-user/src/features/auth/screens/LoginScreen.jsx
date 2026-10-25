// src/features/auth/screens/LoginScreen.jsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet, Image } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../hooks/useAuth';
import Input from '../../../shared/components/common/Input';
import Button from '../../../shared/components/common/Button';
import { COLORS, SPACING, FONT_SIZE } from '../../../shared/constants/theme';

export default function LoginScreen({ navigation }) {
  const { handleLogin, loading, error } = useAuth();
  const { control, handleSubmit } = useForm({
    defaultValues: { emailOrUsername: '', password: '' },
  });

  const onSubmit = async (values) => {
    await handleLogin(values);
  };

  return (
    <View style={styles.screen}>
      <LinearGradient colors={['#eaf5fc', '#f7fbfe']} style={StyleSheet.absoluteFill} />
      <View style={[styles.cloud, styles.cloudA]} />
      <View style={[styles.cloud, styles.cloudB]} />
      <View style={[styles.cloud, styles.cloudC]} />

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Login</Text>

        <Image 
          source={require('../../../../assets/urbus-logo.png')} // <-- Asegúrate de tener la imagen del logo en esta ruta
          style={styles.logoImage}
          resizeMode="contain"
        />

        <Controller
          control={control}
          name="emailOrUsername"
          rules={{ required: 'Ingresa tu correo o usuario' }}
          render={({ field: { onChange, value }, fieldState: { error: fieldError } }) => (
            <Input
              icon="person"
              value={value}
              onChangeText={onChange}
              autoCapitalize="none"
              placeholder="Correo o usuario"
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
              icon="lock"
              value={value}
              onChangeText={onChange}
              secureTextEntry
              placeholder="Contraseña"
              error={fieldError?.message}
            />
          )}
        />

        <Text style={styles.forgotLink} onPress={() => navigation.navigate('EmailRequest', { mode: 'forgot' })}>
          ¿Olvidaste tu contraseña?
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button title="Login" onPress={handleSubmit(onSubmit)} loading={loading} style={styles.loginBtn} />

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>¿No tienes cuenta? </Text>
          <Text style={styles.footerLink} onPress={() => navigation.navigate('Register')}>
            Regístrate
          </Text>
        </View>
        <View style={styles.footerRowTight}>
          <Text style={styles.footerText}>¿No verificaste tu correo? </Text>
          <Text style={styles.footerLink} onPress={() => navigation.navigate('EmailRequest', { mode: 'resend' })}>
            Reenviar
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#eaf5fc' },
  cloud: { position: 'absolute', backgroundColor: '#ffffff', opacity: 0.6, borderRadius: 999 },
  cloudA: { width: 160, height: 60, top: 70, left: -30 },
  cloudB: { width: 200, height: 70, top: 130, right: -50 },
  cloudC: { width: 140, height: 50, top: 220, left: 40 },
  container: { flexGrow: 1, padding: SPACING.lg, justifyContent: 'center' },
  title: { fontSize: 30, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.lg },
  
  // Aquí está el cambio principal para que sea cuadrado
  logoImage: {
    width: 150,
    height: 150,
    alignSelf: 'center',
    marginBottom: SPACING.xl,
    borderRadius: 20, // <-- Un border radius de 20 le da ese efecto de app cuadrada con bordes suaves
    backgroundColor: '#ffffff', // Fondo blanco por si el logo tiene transparencias en las esquinas
  },
  
  error: { color: COLORS.error, fontSize: FONT_SIZE.sm, textAlign: 'center', marginBottom: SPACING.sm },
  loginBtn: { marginTop: SPACING.sm },
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.lg },
  footerRowTight: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.sm },
  forgotLink: { color: COLORS.primary, fontWeight: '600', fontSize: FONT_SIZE.sm, textAlign: 'right', marginBottom: SPACING.sm },
  footerText: { color: COLORS.textLight, fontSize: FONT_SIZE.sm },
  footerLink: { color: COLORS.primary, fontWeight: '700', fontSize: FONT_SIZE.sm },
});