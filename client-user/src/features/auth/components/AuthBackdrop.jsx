import React from 'react';
import { View, Text, Image, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS } from '../../../shared/constants/theme';

const STOPS = [
  { top: '14%', left: '18%' },
  { top: '30%', right: '12%' },
  { bottom: '22%', left: '8%' },
  { bottom: '10%', right: '24%' },
];

export default function AuthBackdrop({ children }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <View style={styles.ringBig} pointerEvents="none" />
      <View style={styles.ringSmall} pointerEvents="none" />
      <View style={[styles.arc, styles.arcA]} pointerEvents="none" />
      <View style={[styles.arc, styles.arcB]} pointerEvents="none" />
      {STOPS.map((position, index) => (
        <View key={index} style={[styles.stop, position]} pointerEvents="none" />
      ))}

      <View style={[styles.brand, { paddingTop: insets.top + 16 }]}>
        <Image source={require('../../../../assets/urbus-logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.brandText}>UrBus</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cardWrap}>
            <View style={styles.cardShadow} />
            <View style={styles.card}>{children}</View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.primary, overflow: 'hidden' },
  flex: { flex: 1 },
  ringBig: {
    position: 'absolute',
    right: -110,
    bottom: -110,
    width: 330,
    height: 330,
    borderRadius: 165,
    borderWidth: 54,
    borderColor: 'rgba(255,193,7,0.16)',
  },
  ringSmall: {
    position: 'absolute',
    left: -70,
    top: -50,
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 32,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  arc: {
    position: 'absolute',
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.34)',
  },
  arcA: { width: 560, height: 560, borderRadius: 280, left: -300, top: 120 },
  arcB: { width: 480, height: 480, borderRadius: 240, right: -250, bottom: 40 },
  stop: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 4,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.primary,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingBottom: 6 },
  logo: { width: 44, height: 44, padding: 3, borderRadius: 12, backgroundColor: '#ffffff' },
  brandText: { fontFamily: FONTS.display, fontSize: 26, color: '#ffffff' },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingTop: 12 },
  cardWrap: { marginRight: 6, marginBottom: 6 },
  cardShadow: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: -6,
    bottom: -6,
    borderRadius: 20,
    backgroundColor: COLORS.text,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.text,
    backgroundColor: COLORS.surface,
    padding: 24,
  },
});
