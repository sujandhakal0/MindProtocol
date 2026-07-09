import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform
} from 'react-native';
import { router } from 'expo-router';
import { updateSessionTime } from '../lib/db';
import { scheduleDailyNotification } from '../lib/notifications';
import { useUserStore } from '../stores/userStore';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);
const MINUTE_OPTIONS = [0, 15, 30, 45];

function pad(n: number) { return n.toString().padStart(2, '0'); }

export default function SessionTime() {
  const { sessionTime, setSessionTime } = useUserStore();
  const [hour, setHour] = useState(parseInt(sessionTime.split(':')[0]) || 21);
  const [minute, setMinute] = useState(parseInt(sessionTime.split(':')[1]) || 0);

  async function handleSave() {
    const timeStr = `${pad(hour)}:${pad(minute)}`;
    await updateSessionTime(timeStr);
    await scheduleDailyNotification(timeStr);
    setSessionTime(timeStr);
    router.replace('/(tabs)');
  }

  const displayTime = `${pad(hour)}:${pad(minute)}`;
  const period = hour < 12 ? 'AM' : 'PM';
  const display12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoDot} />
        <Text style={styles.step}>STEP 2 OF 2</Text>
      </View>

      <Text style={styles.title}>When's your{'\n'}quiet 15 minutes?</Text>
      <Text style={styles.subtitle}>
        Pick a time you can reliably keep.{'\n'}
        <Text style={styles.reassurance}>You can change this anytime in settings.</Text>
      </Text>

      {/* Time display */}
      <View style={styles.timeDisplay}>
        <Text style={styles.timeText}>{pad(display12)}:{pad(minute)}</Text>
        <Text style={styles.timePeriod}>{period}</Text>
      </View>

      {/* Hour picker */}
      <Text style={styles.label}>Hour</Text>
      <View style={styles.pickerScroll}>
        {HOUR_OPTIONS.map((h) => (
          <TouchableOpacity
            key={h}
            style={[styles.timeChip, hour === h && styles.timeChipSelected]}
            onPress={() => setHour(h)}
          >
            <Text style={[styles.timeChipText, hour === h && styles.timeChipTextSelected]}>
              {pad(h === 0 ? 12 : h > 12 ? h - 12 : h)}{h < 12 ? 'am' : 'pm'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Minute picker */}
      <Text style={styles.label}>Minute</Text>
      <View style={styles.minuteRow}>
        {MINUTE_OPTIONS.map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.minuteChip, minute === m && styles.timeChipSelected]}
            onPress={() => setMinute(m)}
          >
            <Text style={[styles.timeChipText, minute === m && styles.timeChipTextSelected]}>
              :{pad(m)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.noticeCard}>
        <Text style={styles.noticeEmoji}>🔔</Text>
        <Text style={styles.noticeText}>
          You'll get one gentle reminder at {displayTime} every day. No spam.
        </Text>
      </View>

      <TouchableOpacity style={styles.cta} onPress={handleSave} activeOpacity={0.85}>
        <Text style={styles.ctaText}>Let's go →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: COLORS.bg,
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingBottom: 40,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg },
  logoDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent, marginRight: 8 },
  step: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, letterSpacing: 1.5 },

  title: { fontSize: 30, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 38, marginBottom: SPACING.sm },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: SPACING.xl },
  reassurance: { color: COLORS.textMuted, fontStyle: 'italic' },

  timeDisplay: {
    flexDirection: 'row', alignItems: 'flex-end', marginBottom: SPACING.xl,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderAccent, paddingBottom: SPACING.md,
  },
  timeText: { fontSize: 56, fontWeight: '200', color: COLORS.textPrimary, letterSpacing: -2 },
  timePeriod: { fontSize: 20, color: COLORS.accent, marginLeft: 8, marginBottom: 10, fontWeight: '600' },

  label: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 8 },

  pickerScroll: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: SPACING.lg },
  timeChip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  timeChipSelected: { borderColor: COLORS.accent, backgroundColor: COLORS.accentGlow },
  timeChipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '500' },
  timeChipTextSelected: { color: COLORS.accentLight, fontWeight: '700' },

  minuteRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.xl },
  minuteChip: {
    flex: 1, paddingVertical: 12, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard, alignItems: 'center',
  },

  noticeCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.xl,
  },
  noticeEmoji: { fontSize: 18, marginRight: 10 },
  noticeText: { color: COLORS.textSecondary, fontSize: 13, flex: 1, lineHeight: 18 },

  cta: {
    backgroundColor: COLORS.accent, borderRadius: RADIUS.lg,
    paddingVertical: 18, alignItems: 'center',
    shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 8,
  },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
