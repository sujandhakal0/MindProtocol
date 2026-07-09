import { View, Text, StyleSheet, ScrollView, Linking, Platform } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

const RESOURCES = [
  { label: 'Samaritans Nepal (24/7)', number: '16600101234', url: 'tel:16600101234' },
  { label: 'TPO Nepal (24/7)', number: '16600186001', url: 'tel:16600186001' },
  { label: 'Mental Health Nepal', number: '16600101922', url: 'tel:16600101922' },
];

export default function CrisisScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      bounces={false}
    >
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>🤝</Text>
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

  header: { alignItems: 'center', marginBottom: SPACING.xl },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.bgCardAlt, justifyContent: 'center',
    alignItems: 'center', marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.borderAccent,
  },
  icon: { fontSize: 40 },
  title: { fontSize: 28, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12, textAlign: 'center' },
  sub: { fontSize: 15, color: COLORS.textSecondary, lineHeight: 23, textAlign: 'center' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.textMuted,
    letterSpacing: 1.5, marginBottom: SPACING.md,
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

  footerText: {
    fontSize: 12, color: COLORS.textMuted, textAlign: 'center',
    fontStyle: 'italic', marginTop: SPACING.md,
  },
});
