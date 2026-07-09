import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform
} from 'react-native';
import { router } from 'expo-router';
import { saveUserProfile } from '../lib/db';
import { useUserStore } from '../stores/userStore';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

const AGE_RANGES = ['16–18', '18–22', '22–27', '27–35', '35+'];
const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'prefer-not', label: 'Prefer not to say' },
];
const ROLES = [
  { value: 'student', label: 'Student' },
  { value: 'professional', label: 'Working Professional' },
  { value: 'both', label: 'Both' },
  { value: 'other', label: 'Other' },
];

const STEPS = ['age', 'gender', 'role'] as const;

export default function Onboarding() {
  const [step, setStep] = useState<number>(0);
  const [selectedAge, setSelectedAge] = useState<string>('');
  const [selectedGender, setSelectedGender] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const { setProfile, setOnboardingComplete } = useUserStore();

  const currentField = STEPS[step];
  const canContinue =
    (currentField === 'age' && selectedAge) ||
    (currentField === 'gender' && selectedGender) ||
    (currentField === 'role' && selectedRole);

  async function handleContinue() {
    if (!canContinue) return;
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    await saveUserProfile(selectedAge, selectedRole);
    setProfile(selectedAge, selectedRole);
    setOnboardingComplete(true);
    router.replace('/session-time');
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  function renderProgressDots() {
    return (
      <View style={styles.dotsRow}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i <= step && styles.dotActive]}
          />
        ))}
      </View>
    );
  }

  function renderWhyWeAsk() {
    const reasons: Record<string, string> = {
      age: 'We use your age range to calibrate prompt complexity and tone.',
      gender: 'This helps us avoid assumptions in journaling prompts.',
      role: 'Your daily rhythm shapes when and how prompts are framed.',
    };
    return (
      <Text style={styles.whyText}>{reasons[currentField]}</Text>
    );
  }

  function renderField() {
    switch (currentField) {
      case 'age':
        return (
          <View style={styles.chipRow}>
            {AGE_RANGES.map((age) => (
              <TouchableOpacity
                key={age}
                style={[styles.chip, selectedAge === age && styles.chipSelected]}
                onPress={() => setSelectedAge(age)}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, selectedAge === age && styles.chipTextSelected]}>
                  {age}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      case 'gender':
        return (
          <View style={styles.chipRow}>
            {GENDERS.map((g) => (
              <TouchableOpacity
                key={g.value}
                style={[styles.chip, selectedGender === g.value && styles.chipSelected]}
                onPress={() => setSelectedGender(g.value)}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, selectedGender === g.value && styles.chipTextSelected]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      case 'role':
        return (
          <View style={styles.chipRow}>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[styles.chip, selectedRole === r.value && styles.chipSelected]}
                onPress={() => setSelectedRole(r.value)}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, selectedRole === r.value && styles.chipTextSelected]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );
    }
  }

  const titles: Record<string, string> = {
    age: 'How old are you?',
    gender: 'What is your gender?',
    role: 'What best describes you?',
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoDot} />
          <Text style={styles.logoText}>MindProtocol</Text>
        </View>
        {renderProgressDots()}
      </View>

      <Text style={styles.title}>{titles[currentField]}</Text>
      {renderWhyWeAsk()}

      <View style={styles.fieldContainer}>
        {renderField()}
      </View>

      {step > 0 && (
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.85}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.cta, !canContinue && styles.ctaDisabled]}
        onPress={handleContinue}
        activeOpacity={0.85}
        disabled={!canContinue}
      >
        <Text style={styles.ctaText}>
          {step < STEPS.length - 1 ? 'Continue →' : "Let's go →"}
        </Text>
      </TouchableOpacity>

      <View style={styles.privacyBadge}>
        <Text style={styles.privacyIcon}>🔒</Text>
        <Text style={styles.privacyText}>
          Stored only on your device. Never shared.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingBottom: 40,
  },

  header: { marginBottom: SPACING.xl },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg },
  logoDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: COLORS.accent, marginRight: 8,
  },
  logoText: { color: COLORS.accent, fontSize: 14, fontWeight: '600', letterSpacing: 1.2 },

  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SPACING.lg,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.bgCardAlt,
  },
  dotActive: {
    backgroundColor: COLORS.accent,
    width: 24,
  },

  title: {
    fontSize: 28, fontWeight: '700', color: COLORS.textPrimary,
    lineHeight: 36, marginBottom: SPACING.sm,
  },
  whyText: {
    fontSize: 13, color: COLORS.textMuted, lineHeight: 18,
    marginBottom: SPACING.xl, fontStyle: 'italic',
  },

  fieldContainer: {
    marginBottom: SPACING.xl,
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingHorizontal: SPACING.lg, paddingVertical: 14,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard, minWidth: 100, alignItems: 'center',
  },
  chipSelected: { borderColor: COLORS.accent, backgroundColor: COLORS.accentGlow },
  chipText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '500' },
  chipTextSelected: { color: COLORS.accentLight, fontWeight: '600' },

  backBtn: {
    paddingVertical: SPACING.md,
    marginBottom: SPACING.sm,
  },
  backBtnText: { color: COLORS.textMuted, fontSize: 15, fontWeight: '600' },

  privacyBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    padding: SPACING.md, marginTop: SPACING.xl,
    borderWidth: 1, borderColor: COLORS.border,
  },
  privacyIcon: { fontSize: 16, marginRight: 8 },
  privacyText: { color: COLORS.textMuted, fontSize: 13, flex: 1 },

  cta: {
    backgroundColor: COLORS.accent, borderRadius: RADIUS.lg,
    paddingVertical: 18, alignItems: 'center',
    shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  ctaDisabled: { backgroundColor: COLORS.bgCardAlt, shadowOpacity: 0 },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.5 },
});
