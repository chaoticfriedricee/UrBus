import React, { useState } from 'react';
import { View, Text, Alert, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import AuthBackdrop from '../components/AuthBackdrop';
import Input from '../../../shared/components/common/Input';
import Button from '../../../shared/components/common/Button';
import { DashedDivider } from '../../../shared/components/common/Common';
import { COLORS, SPACING, FONT_SIZE, FONTS } from '../../../shared/constants/theme';

function Field({ control, name, rules, label, ...rest }) {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <Input label={label} value={value} onChangeText={onChange} error={error?.message} {...rest} />
      )}
    />
  );
}

export default function RegisterScreen({ navigation }) {
  const { handleRegister, loading, error } = useAuth();
  const [photo, setPhoto] = useState(null);
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
    <AuthBackdrop>
      <Text style={styles.title}>Crea tu cuenta</Text>
      <Text style={styles.subtitle}>Un par de datos y ya puedes unirte al grupo de tu bus.</Text>

      <TouchableOpacity style={styles.photoRow} onPress={pickPhoto} activeOpacity={0.8}>
        <View style={styles.photoCircle}>
          {photo ? (
            <Image source={{ uri: photo.uri }} style={styles.photoImage} />
          ) : (
            <MaterialIcons name="photo-camera" size={26} color={COLORS.textMuted} />
          )}
        </View>
        <View>
          <Text style={styles.photoLabel}>Foto de perfil</Text>
          <Text style={styles.photoHint}>{photo ? 'Toca para cambiarla' : 'Opcional'}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.twoCols}>
        <View style={styles.col}>
          <Field control={control} name="name" label="Nombre" placeholder="Nombre" rules={{ required: 'El nombre es obligatorio', maxLength: { value: 25, message: 'Máximo 25 caracteres' } }} />
        </View>
        <View style={styles.col}>
          <Field control={control} name="surname" label="Apellido" placeholder="Apellido" rules={{ required: 'El apellido es obligatorio', maxLength: { value: 25, message: 'Máximo 25 caracteres' } }} />
        </View>
      </View>
      <Field control={control} name="username" label="Usuario" icon="person-outline" placeholder="usuario" autoCapitalize="none" rules={{ required: 'El usuario es obligatorio', maxLength: { value: 25, message: 'Máximo 25 caracteres' } }} />
      <Field
        control={control}
        name="email"
        label="Correo electrónico"
        icon="mail-outline"
        placeholder="correo@ejemplo.com"
        autoCapitalize="none"
        keyboardType="email-address"
        rules={{ required: 'El correo es obligatorio', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Correo inválido' } }}
      />
      <Field
        control={control}
        name="phone"
        label="Teléfono"
        icon="phone-iphone"
        placeholder="12345678"
        keyboardType="phone-pad"
        maxLength={8}
        rules={{ required: 'El teléfono es obligatorio', pattern: { value: /^\d{8}$/, message: 'Debe tener exactamente 8 dígitos' } }}
      />
      <Field
        control={control}
        name="password"
        label="Contraseña"
        icon="lock-outline"
        placeholder="8 o más caracteres"
        secureTextEntry
        rules={{ required: 'La contraseña es obligatoria', minLength: { value: 8, message: 'Mínimo 8 caracteres' } }}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title="Crear cuenta" onPress={handleSubmit(onSubmit)} loading={loading} />

      <DashedDivider style={styles.divider} />

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
        <Text style={styles.footerLink} onPress={() => navigation.navigate('Login')}>Ingresa</Text>
      </View>
    </AuthBackdrop>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: FONTS.display, fontSize: 28, lineHeight: 32, color: COLORS.text },
  subtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginTop: 6, marginBottom: SPACING.md, lineHeight: 20 },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: SPACING.md },
  photoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.borderStrong,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoImage: { width: '100%', height: '100%' },
  photoLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textLight },
  photoHint: { fontSize: 12.5, color: COLORS.textMuted },
  twoCols: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  error: { color: COLORS.error, fontSize: 13, fontWeight: '700', marginBottom: SPACING.sm },
  divider: { marginHorizontal: 0, marginVertical: SPACING.lg },
  footerRow: { flexDirection: 'row', flexWrap: 'wrap' },
  footerText: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm },
  footerLink: { color: COLORS.primary, fontWeight: '800', fontSize: FONT_SIZE.sm },
});
