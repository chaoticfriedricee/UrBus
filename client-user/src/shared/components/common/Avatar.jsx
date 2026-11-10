import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { AVATAR_PALETTE, FONTS } from '../../constants/theme';

export default function Avatar({ name, uri, size = 52, fontSize }) {
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  const initials = name
    ? name.trim().split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    : '?';
  const palette = AVATAR_PALETTE[name ? name.charCodeAt(0) % AVATAR_PALETTE.length : 0];

  return (
    <View style={[styles.base, { width: size, height: size, borderRadius: size / 2, backgroundColor: palette.bg }]}>
      <Text style={[styles.initials, { color: palette.color, fontSize: fontSize ?? size * 0.34 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: FONTS.display, fontWeight: '800' },
});
