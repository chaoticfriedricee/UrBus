// src/features/posts/screens/PostDetailScreen.jsx
import React, { useEffect } from 'react';
import { ScrollView, View, Text, Image, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { usePostDetail } from '../hooks/usePosts';
import { LoadingSpinner, EmptyState } from '../../../shared/components/common/Common';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../../../shared/constants/theme';

export default function PostDetailScreen({ route }) {
  const { id } = route.params;
  const { post, loading, error, fetchPost } = usePostDetail(id);

  useEffect(() => { fetchPost(); }, [fetchPost]);

  if (loading) return <LoadingSpinner />;

  if (error || !post) {
    return (
      <View style={styles.container}>
        <EmptyState message={error ?? 'No se encontró el anuncio'} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {post.image ? (
        <Image source={{ uri: post.image }} style={styles.image} />
      ) : (
        <View style={styles.iconPlaceholder}>
          <MaterialIcons name="directions-bus" size={40} color={COLORS.accentDark} />
        </View>
      )}
      {post.isUrgent ? (
        <View style={styles.urgentBadge}>
          <MaterialIcons name="priority-high" size={14} color="#fff" />
          <Text style={styles.urgentText}>URGENTE</Text>
        </View>
      ) : null}
      <Text style={styles.title}>{post.title}</Text>
      {post.createdAt ? <Text style={styles.date}>{new Date(post.createdAt).toLocaleDateString('es-GT')}</Text> : null}
      <Text style={styles.body}>{post.content}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md },
  image: { width: '100%', height: 220, borderRadius: RADIUS.lg, marginBottom: SPACING.md },
  iconPlaceholder: { width: '100%', height: 160, borderRadius: RADIUS.lg, marginBottom: SPACING.md, backgroundColor: '#FFF6DA', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.xs },
  date: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginBottom: SPACING.md },
  body: { fontSize: FONT_SIZE.md, color: COLORS.text, lineHeight: 22 },
  urgentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.pill, backgroundColor: COLORS.error, marginBottom: SPACING.sm,
  },
  urgentText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
});