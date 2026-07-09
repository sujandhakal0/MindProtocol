import { View, Text, StyleSheet, ScrollView, Linking, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { THERAPISTS } from '../data/therapists';

const RESOURCES = [
  { label: 'Samaritans Nepal (24/7)', number: '16600101234', url: 'tel:16600101234' },
  { label: 'TPO Nepal (24/7)', number: '16600186001', url: 'tel:16600186001' },
  { label: 'Mental Health Nepal', number: '16600101922', url: 'tel:16600101922' },
];

export default function CrisisScreen() {
  const router = useRouter();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      bounces={false}
    >
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color={COLORS.textSecondary} />
        <Text style={styles.backBtnText}>Go back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name="heart-circle" size={36} color={COLORS.accent} />
        </View>
        <Text style={styles.title}>You're not alone</Text>
        <Text style={styles.sub}>
          What you wrote suggests you might be going through something serious.
          MindProtocol isn't the right tool for this moment — but real support is available right now.
        </Text>
      </View>

      <Text style={styles.sectionLabel}>REACH OUT NOW</Text>

      {RESOURCES.map((r) => (
        <View key={r.label} style={styles.resourceCard}>
          <Text style={styles.resourceName}>{r.label}</Text>
          <Text
            style={styles.resourceNumber}
            onPress={() => Linking.openURL(r.url)}
          >
            {r.number}
          </Text>
          <Text
            style={styles.resourceAction}
            onPress={() => Linking.openURL(r.url)}
          >
            Tap to call or message →
          </Text>
        </View>
      ))}

      <View style={styles.noteCard}>
        <Text style={styles.noteText}>
          If you are in immediate danger, please call your local emergency services (100 in Nepal).
        </Text>
      </View>

      {/* ─── TALK TO A PROFESSIONAL ───────────────────────────── */}
      <Text style={styles.sectionLabel}>TALK TO A PROFESSIONAL</Text>
      <Text style={styles.therapistIntro}>
        If you'd like to talk to a trained counselor or therapist, here are some options in Nepal.
      </Text>

      {THERAPISTS.map((t) => (
        <View key={t.id} style={styles.therapistCard}>
          <Text style={styles.therapistName}>{t.name}</Text>
          <Text style={styles.therapistTitle}>{t.title}</Text>

          <View style={styles.tagRow}>
            {t.specialties.map((s) => (
              <View key={s} style={styles.tag}>
                <Text style={styles.tagText}>{s}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.therapistBio}>{t.bio}</Text>

          <View style={styles.therapistMeta}>
            <Text style={styles.metaText}>
              <Ionicons name="time-outline" size={12} color={COLORS.textMuted} /> {t.availability}
            </Text>
            <Text style={styles.metaText}>
              <Ionicons name="cash-outline" size={12} color={COLORS.textMuted} /> {t.priceRange}
            </Text>
          </View>

          <View style={styles.therapistActions}>
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => Linking.openURL(`tel:${t.phone}`)}
            >
              <Ionicons name="call-outline" size={16} color="#fff" />
              <Text style={styles.callBtnText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bookBtn}
              onPress={() => Linking.openURL(t.bookingUrl)}
            >
              <Ionicons name="calendar-outline" size={16} color={COLORS.accent} />
              <Text style={styles.bookBtnText}>Book session</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <Text style={styles.footerText}>
        This screen will remain here. Take your time.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingBottom: 60,
  },

  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: SPACING.xl, alignSelf: 'flex-start',
  },
  backBtnText: { fontSize: 14, color: COLORS.textSecondary },

  header: { alignItems: 'center', marginBottom: SPACING.xl },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.bgCardAlt, justifyContent: 'center',
    alignItems: 'center', marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.borderAccent,
  },
  title: { fontSize: 28, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12, textAlign: 'center' },
  sub: { fontSize: 15, color: COLORS.textSecondary, lineHeight: 23, textAlign: 'center' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.textMuted,
    letterSpacing: 1.5, marginBottom: SPACING.md, marginTop: SPACING.sm,
  },

  resourceCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    padding: SPACING.lg, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.borderAccent,
  },
  resourceName: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 4 },
  resourceNumber: { fontSize: 22, color: COLORS.accent, fontWeight: '700', marginBottom: 4 },
  resourceAction: { fontSize: 13, color: COLORS.textMuted },

  noteCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    padding: SPACING.md, marginTop: SPACING.md, marginBottom: SPACING.xl,
    borderWidth: 1, borderColor: COLORS.border,
  },
  noteText: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18 },

  // Therapist section
  therapistIntro: {
    fontSize: 13, color: COLORS.textSecondary, lineHeight: 18,
    marginBottom: SPACING.md,
  },
  therapistCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    padding: SPACING.lg, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  therapistName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  therapistTitle: { fontSize: 12, color: COLORS.textMuted, marginBottom: 10 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  tag: {
    backgroundColor: COLORS.bgCardAlt, borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  tagText: { fontSize: 11, color: COLORS.textSecondary },
  therapistBio: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 10 },
  therapistMeta: { gap: 4, marginBottom: 12 },
  metaText: { fontSize: 12, color: COLORS.textMuted },
  therapistActions: { flexDirection: 'row', gap: 10 },
  callBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: RADIUS.md,
    backgroundColor: COLORS.accent,
  },
  callBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  bookBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgCardAlt, borderWidth: 1, borderColor: COLORS.border,
  },
  bookBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.accent },

  footerText: {
    fontSize: 12, color: COLORS.textMuted, textAlign: 'center',
    fontStyle: 'italic', marginTop: SPACING.lg,
  },
});
