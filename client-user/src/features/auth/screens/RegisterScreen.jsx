// src/features/auth/screens/RegisterScreen.jsx
// Replica el mockup "Registrar": icono de cámara para foto de perfil, tarjeta
// agrupada con campos separados por líneas y botón degradado amarillo.
import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity, Image, TextInput, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import Button from '../../../shared/components/common/Button';
import { COLORS, SPACING, FONT_SIZE, RADIUS, SHADOWS } from '../../../shared/constants/theme';

function Field({ control, name, rules, placeholder, ...rest }) {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <View style={styles.fieldWrap}>
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor={COLORS.textMuted}
            style={styles.fieldInput}
            {...rest}
          />
          {error ? <Text style={styles.fieldError}>{error.message}</Text> : null}
        </View>
      )}
    />
  );
}

export default function RegisterScreen({ navigation }) {
  const { handleRegister, loading, error } = useAuth();
  const [photo, setPhoto] = useState(null); // { uri, name, type }
  const { control, handleSubmit } = useForm({
    defaultValues: { name: '', surname: '', username: '', email: '', password: '', phone: '' },
  });

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setPhoto({ uri: asset.uri, name: asset.fileName ?? 'profile.jpg', type: 'image/jpeg' });
    }
  };

  const onSubmit = async (values) => {
    const result = await handleRegister({ ...values, profilePicture: photo ?? undefined });

    if (!result.success) {
      Alert.alert('No se pudo completar el registro', result.message ?? 'Intenta de nuevo');
      return;
    }

    const message = result.emailVerificationRequired
      ? `${result.message ?? 'Cuenta creada.'} Revisa tu correo para verificar tu cuenta antes de iniciar sesión.`
      : result.message ?? 'Cuenta creada correctamente';

    Alert.alert('Registro exitoso', message, [
      { text: 'Ir a iniciar sesión', onPress: () => navigation.navigate('Login') },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Registrar</Text>

      <TouchableOpacity style={styles.photoCircle} onPress={pickPhoto} activeOpacity={0.8}>
        {photo ? (
          <Image source={{ uri: photo.uri }} style={styles.photoImage} />
        ) : (
          <MaterialIcons name="photo-camera" size={40} color={COLORS.primary} />
        )}
      </TouchableOpacity>

      <View style={styles.card}>
        <Field control={control} name="name" placeholder="Nombre" rules={{ required: 'El nombre es obligatorio', maxLength: { value: 25, message: 'Máximo 25 caracteres' } }} />
        <View style={styles.divider} />
        <Field control={control} name="surname" placeholder="Apellido" rules={{ required: 'El apellido es obligatorio', maxLength: { value: 25, message: 'Máximo 25 caracteres' } }} />
        <View style={styles.divider} />
        <Field control={control} name="username" placeholder="Usuario" autoCapitalize="none" rules={{ required: 'El usuario es obligatorio', maxLength: { value: 25, message: 'Máximo 25 caracteres' } }} />
        <View style={styles.divider} />
        <Field
          control={control}
          name="email"
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          rules={{ required: 'El correo es obligatorio', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Correo inválido' } }}
        />
        <View style={styles.divider} />
        <Field
          control={control}
          name="password"
          placeholder="Contraseña"
          secureTextEntry
          rules={{ required: 'La contraseña es obligatoria', minLength: { value: 8, message: 'Mínimo 8 caracteres' } }}
        />
        <View style={styles.divider} />
        <Field
          control={control}
          name="phone"
          placeholder="Teléfono"
          keyboardType="phone-pad"
          maxLength={8}
          rules={{ required: 'El teléfono es obligatorio', pattern: { value: /^\d{8}$/, message: 'Debe tener exactamente 8 dígitos' } }}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title="Registrarse" onPress={handleSubmit(onSubmit)} loading={loading} style={styles.submitBtn} />

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
        <Text style={styles.footerLink} onPress={() => navigation.navigate('Login')}>
          Ingresa
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#eaf5fc', padding: SPACING.lg, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, textAlign: 'center', marginBottom: SPACING.lg },
  photoCircle: {
    width: 110, height: 110, borderRadius: 55, backgroundColor: '#dcedf7',
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  photoImage: { width: '100%', height: '100%' },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm, marginBottom: SPACING.lg, ...SHADOWS.soft,
  },
  fieldWrap: { paddingVertical: 10 },
  fieldInput: { fontSize: FONT_SIZE.md, color: COLORS.text, padding: 0 },
  fieldError: { color: COLORS.error, fontSize: FONT_SIZE.xs, marginTop: 4 },
  divider: { height: 1, backgroundColor: COLORS.border },
  error: { color: COLORS.error, fontSize: FONT_SIZE.sm, textAlign: 'center', marginBottom: SPACING.md },
  submitBtn: { marginBottom: SPACING.lg },
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: SPACING.xl },
  footerText: { color: COLORS.textLight, fontSize: FONT_SIZE.sm },
  footerLink: { color: COLORS.primary, fontWeight: '700', fontSize: FONT_SIZE.sm },
});