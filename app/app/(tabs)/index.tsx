import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image } from 'react-native';
import { router } from 'expo-router';
import { getStreak, getTodaySession } from '../../lib/db';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

export default function HomeTab() {
  const [streak, setStreak] = useState(0);
  const [todayDone, setTodayDone] = useState(false);

  useEffect(() => {
    async function load() {
      const s = await getStreak();
      setStreak(s?.current_streak ?? 0);
      const today = await getTodaySession();
      setTodayDone(!!today);
    }
    load();
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image source={require('../../assets/logo.jpeg')} style={styles.logo} resizeMode="cover" />
        </View>
      </View>

      {/* Single dominant CTA */}
      <View style={styles.centerContent}>
        <Text style={styles.timeEmoji}>🧘</Text>
        <Text style={styles.title}>
          {todayDone
            ? "You've shown up today"
            : "Your quiet 15 minutes"}
        </Text>
        <Text style={styles.subtitle}>
          {todayDone
            ? 'You can do another session anytime, or come back tomorrow.'
            : 'A daily reset for your mind. Science-backed, private, yours.'}
        </Text>

        <TouchableOpacity
          style={styles.startBtn}
          onPress={() => router.push('/(tabs)/session')}
          activeOpacity={0.85}
        >
          <Text style={styles.startBtnText}>
            {todayDone ? 'Start another session →' : "Start today's session →"}
          </Text>
        </TouchableOpacity>

        {streak > 0 && (
          <View style={styles.streakRow}>
            <Text style={styles.streakLabel}>Current streak</Text>
            <Text style={styles.streakCount}>{streak} days</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
  },

  header: {
    marginBottom: SPACING.xl,
    paddingLeft: 8,
  },
  logoContainer: {
    width: 52, height: 52, borderRadius: 12, overflow: 'hidden',
    backgroundColor: COLORS.bgCard,
  },
  logo: {
    width: 52, height: 52,
  },

  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },

  timeEmoji: {
    fontSize: 48,
    marginBottom: SPACING.xl,
  },

  title: {
    fontSize: 28, fontWeight: '700', color: COLORS.textPrimary,
    textAlign: 'center', lineHeight: 36, marginBottom: SPACING.md,
  },
  subtitle: {
    fontSize: 15, color: COLORS.textSecondary, textAlign: 'center',
    lineHeight: 22, marginBottom: SPACING.xl, paddingHorizontal: SPACING.md,
  },

  startBtn: {
    backgroundColor: COLORS.accent, borderRadius: RADIUS.lg,
    paddingVertical: 18, paddingHorizontal: SPACING.xl,
    alignItems: 'center', width: '100%', maxWidth: 320,
    shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  streakRow: {
    marginTop: SPACING.xl,
    alignItems: 'center',
  },
  streakLabel: {
    fontSize: 12, color: COLORS.textMuted, marginBottom: 4,
  },
  streakCount: {
    fontSize: 16, fontWeight: '600', color: COLORS.secondary,
  },
});
