import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { getWeeklySessions, getMonthlySessions, getStreak, getTodaySession } from '../../lib/db';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface Session {
  date: string;
  pre_mood: number; pre_noise: number; pre_focus: number; pre_energy: number;
  post_mood: number; post_noise: number; post_focus: number; post_energy: number;
  session_reflection?: string;
}

function avg(nums: number[]) {
  if (!nums.length) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function TrendLine({ data, color, height = 60 }: { data: number[]; color: string; height?: number }) {
  if (data.length < 2) {
    return <View style={[ss.trendLineEmpty, { height }]}><Text style={ss.trendLineText}>Not enough data</Text></View>;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 280;

  const points = data.map((val, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((val - min) / range) * (height - 10) - 5,
  }));

  return (
    <View style={[ss.trendLineContainer, { height, width }]}>
      {points.map((p, i) => (
        <View
          key={i}
          style={[
            ss.trendDot,
            { left: p.x - 3, top: p.y - 3, backgroundColor: color },
          ]}
        />
      ))}
      {points.slice(0, -1).map((p, i) => {
        const next = points[i + 1];
        const dx = next.x - p.x;
        const dy = next.y - p.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        return (
          <View
            key={`line-${i}`}
            style={[
              ss.trendLineSegment,
              {
                left: p.x,
                top: p.y,
                width: length,
                transform: [{ rotate: `${angle}rad` }],
                backgroundColor: color,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  const color = delta > 0 ? COLORS.success : delta < 0 ? COLORS.secondary : COLORS.textMuted;
  const sign = delta > 0 ? '+' : '';
  return <Text style={[ds.deltaBadge, { color }]}>{sign}{delta}%</Text>;
}

export default function DashboardTab() {
  const [view, setView] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [streak, setStreak] = useState(0);
  const [longest, setLongest] = useState(0);
  const [today, setToday] = useState<Session | null>(null);
  const [weekly, setWeekly] = useState<Session[]>([]);
  const [monthly, setMonthly] = useState<Session[]>([]);

  useEffect(() => {
    async function load() {
      const s = await getStreak();
      setStreak(s?.current_streak ?? 0);
      setLongest(s?.longest_streak ?? 0);
      const t = await getTodaySession();
      setToday(t);
      const w = await getWeeklySessions();
      setWeekly(w as Session[]);
      const m = await getMonthlySessions();
      setMonthly(m as Session[]);
    }
    load();
  }, []);

  const renderDaily = () => {
    if (!today) {
      return (
        <View style={ds.emptyCard}>
          <Text style={ds.emptyTitle}>No session yet today</Text>
          <Text style={ds.emptySub}>Complete today's session to see your data here.</Text>
        </View>
      );
    }
    const deltas = {
      mood: today.post_mood - today.pre_mood,
      noise: today.pre_noise - today.post_noise,
      focus: today.post_focus - today.pre_focus,
      energy: today.post_energy - today.pre_energy,
    };
    const overall = avg([deltas.mood, deltas.noise, deltas.focus, deltas.energy]);
    return (
      <View>
        <View style={ds.resultCard}>
          <Text style={ds.resultLabel}>Overall shift today</Text>
          <Text style={[ds.resultBig, { color: overall >= 0 ? COLORS.success : COLORS.secondary }]}>
            {overall >= 0 ? '+' : ''}{overall}%
          </Text>
        </View>
        {[
          { label: 'Mood', delta: deltas.mood, color: COLORS.sliderMood },
          { label: 'Mental Noise ↓', delta: deltas.noise, color: COLORS.sliderNoise },
          { label: 'Focus', delta: deltas.focus, color: COLORS.sliderFocus },
          { label: 'Energy', delta: deltas.energy, color: COLORS.sliderEnergy },
        ].map(item => (
          <View key={item.label} style={ds.row}>
            <Text style={ds.rowLabel}>{item.label}</Text>
            <DeltaBadge delta={item.delta} />
          </View>
        ))}
        {today.session_reflection ? (
          <View style={ds.reflectionCard}>
            <Text style={ds.reflectionLabel}>Session reflection</Text>
            <Text style={ds.reflectionText}>{today.session_reflection}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  const renderWeekly = () => {
    if (!weekly.length) {
      return (
        <View style={ds.emptyCard}>
          <Text style={ds.emptyTitle}>No sessions this week yet</Text>
          <Text style={ds.emptySub}>Complete a few sessions to see weekly trends.</Text>
        </View>
      );
    }
    const avgMoodDelta = avg(weekly.map(s => s.post_mood - s.pre_mood));
    const avgNoiseDelta = avg(weekly.map(s => s.pre_noise - s.post_noise));
    const avgFocusDelta = avg(weekly.map(s => s.post_focus - s.pre_focus));
    const avgEnergyDelta = avg(weekly.map(s => s.post_energy - s.pre_energy));

    const moodData = weekly.map(s => s.post_mood - s.pre_mood);
    const noiseData = weekly.map(s => s.pre_noise - s.post_noise);
    const focusData = weekly.map(s => s.post_focus - s.pre_focus);
    const energyData = weekly.map(s => s.post_energy - s.pre_energy);

    return (
      <View>
        <View style={ds.statsGrid}>
          <View style={ds.statBox}>
            <Text style={ds.statNum}>{weekly.length}</Text>
            <Text style={ds.statLbl}>Sessions</Text>
          </View>
          <View style={ds.statBox}>
            <Text style={[ds.statNum, { color: COLORS.success }]}>+{avg([avgMoodDelta, avgNoiseDelta, avgFocusDelta, avgEnergyDelta])}%</Text>
            <Text style={ds.statLbl}>Avg shift</Text>
          </View>
          <View style={ds.statBox}>
            <Text style={ds.statNum}>{streak}</Text>
            <Text style={ds.statLbl}>Streak</Text>
          </View>
        </View>

        <Text style={ds.sectionHeading}>Weekly trends</Text>
        <View style={ds.trendGrid}>
          <View style={ds.trendItem}>
            <Text style={[ds.trendLabel, { color: COLORS.sliderMood }]}>Mood</Text>
            <TrendLine data={moodData} color={COLORS.sliderMood} />
            <DeltaBadge delta={avgMoodDelta} />
          </View>
          <View style={ds.trendItem}>
            <Text style={[ds.trendLabel, { color: COLORS.sliderNoise }]}>Mental Noise</Text>
            <TrendLine data={noiseData} color={COLORS.sliderNoise} />
            <DeltaBadge delta={avgNoiseDelta} />
          </View>
          <View style={ds.trendItem}>
            <Text style={[ds.trendLabel, { color: COLORS.sliderFocus }]}>Focus</Text>
            <TrendLine data={focusData} color={COLORS.sliderFocus} />
            <DeltaBadge delta={avgFocusDelta} />
          </View>
          <View style={ds.trendItem}>
            <Text style={[ds.trendLabel, { color: COLORS.sliderEnergy }]}>Energy</Text>
            <TrendLine data={energyData} color={COLORS.sliderEnergy} />
            <DeltaBadge delta={avgEnergyDelta} />
          </View>
        </View>
      </View>
    );
  };

  const renderMonthly = () => {
    if (monthly.length < 3) {
      return (
        <View style={ds.emptyCard}>
          <Text style={ds.emptyTitle}>Keep going</Text>
          <Text style={ds.emptySub}>Monthly insights appear after at least 3 sessions.</Text>
        </View>
      );
    }
    const first = monthly.slice(0, Math.ceil(monthly.length / 2));
    const second = monthly.slice(Math.ceil(monthly.length / 2));
    const firstAvg = avg(first.map(s => avg([s.post_mood - s.pre_mood, s.pre_noise - s.post_noise])));
    const secondAvg = avg(second.map(s => avg([s.post_mood - s.pre_mood, s.pre_noise - s.post_noise])));
    const trend = secondAvg - firstAvg;

    const moodData = monthly.map(s => s.post_mood - s.pre_mood);
    const noiseData = monthly.map(s => s.pre_noise - s.post_noise);
    const focusData = monthly.map(s => s.post_focus - s.pre_focus);
    const energyData = monthly.map(s => s.post_energy - s.pre_energy);

    return (
      <View>
        <View style={ds.trendCard}>
          <View>
            <Text style={ds.trendTitle}>
              {trend > 0 ? 'Improving trend' : trend < 0 ? 'Dip this month' : 'Holding steady'}
            </Text>
            <Text style={ds.trendSub}>
              {trend > 0
                ? `Average shift improved by +${trend}% compared to earlier this month.`
                : trend < 0
                ? `Earlier sessions showed higher gains. Keep the habit going.`
                : `Consistent results across the month.`}
            </Text>
          </View>
        </View>

        <View style={ds.statsGrid}>
          <View style={ds.statBox}>
            <Text style={ds.statNum}>{monthly.length}</Text>
            <Text style={ds.statLbl}>Total sessions</Text>
          </View>
          <View style={ds.statBox}>
            <Text style={ds.statNum}>{longest}</Text>
            <Text style={ds.statLbl}>Best streak</Text>
          </View>
        </View>

        <Text style={ds.sectionHeading}>Monthly trends</Text>
        <View style={ds.trendGrid}>
          <View style={ds.trendItem}>
            <Text style={[ds.trendLabel, { color: COLORS.sliderMood }]}>Mood</Text>
            <TrendLine data={moodData} color={COLORS.sliderMood} />
          </View>
          <View style={ds.trendItem}>
            <Text style={[ds.trendLabel, { color: COLORS.sliderNoise }]}>Mental Noise</Text>
            <TrendLine data={noiseData} color={COLORS.sliderNoise} />
          </View>
          <View style={ds.trendItem}>
            <Text style={[ds.trendLabel, { color: COLORS.sliderFocus }]}>Focus</Text>
            <TrendLine data={focusData} color={COLORS.sliderFocus} />
          </View>
          <View style={ds.trendItem}>
            <Text style={[ds.trendLabel, { color: COLORS.sliderEnergy }]}>Energy</Text>
            <TrendLine data={energyData} color={COLORS.sliderEnergy} />
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={ds.container} contentContainerStyle={ds.content}>
      <Text style={ds.pageTitle}>Your Progress</Text>
      <Text style={ds.pageSub}>Track your daily shifts over time.</Text>

      {/* Switcher */}
      <View style={ds.switcher}>
        {(['daily', 'weekly', 'monthly'] as const).map(v => (
          <TouchableOpacity
            key={v}
            style={[ds.switchBtn, view === v && ds.switchBtnActive]}
            onPress={() => setView(v)}
          >
            <Text style={[ds.switchBtnText, view === v && ds.switchBtnTextActive]}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {view === 'daily' && renderDaily()}
      {view === 'weekly' && renderWeekly()}
      {view === 'monthly' && renderMonthly()}
    </ScrollView>
  );
}

const ds = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: SPACING.lg, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 100 },

  pageTitle: { fontSize: 26, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  pageSub: { fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.lg, lineHeight: 18 },

  switcher: {
    flexDirection: 'row', backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.full, padding: 4, marginBottom: SPACING.xl,
    borderWidth: 1, borderColor: COLORS.border,
  },
  switchBtn: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.full, alignItems: 'center' },
  switchBtnActive: { backgroundColor: COLORS.accent },
  switchBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  switchBtnTextActive: { color: '#fff' },

  emptyCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl,
    padding: SPACING.xl, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  emptySub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 18 },

  resultCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl,
    padding: SPACING.xl, alignItems: 'center', marginBottom: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.borderAccent,
  },
  resultLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, letterSpacing: 1.1, marginBottom: 8 },
  resultBig: { fontSize: 52, fontWeight: '200' },

  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  rowLabel: { fontSize: 13, color: COLORS.textSecondary },
  deltaBadge: { fontSize: 14, fontWeight: '700', textAlign: 'right' },

  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: SPACING.lg },
  statBox: {
    flex: 1, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    padding: SPACING.md, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  statNum: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  statLbl: { fontSize: 10, color: COLORS.textMuted },

  sectionHeading: {
    fontSize: 12, fontWeight: '700', color: COLORS.textMuted,
    letterSpacing: 1.1, textTransform: 'uppercase',
    marginTop: SPACING.lg, marginBottom: SPACING.sm,
  },

  trendGrid: {
    gap: SPACING.md,
  },
  trendItem: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  trendLabel: {
    fontSize: 12, fontWeight: '600', marginBottom: 8,
  },

  trendCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.lg, marginBottom: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  trendTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  trendSub: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },

  reflectionCard: {
    backgroundColor: COLORS.bgCardAlt, borderRadius: RADIUS.md,
    padding: SPACING.md, marginTop: SPACING.md,
    borderWidth: 1, borderColor: COLORS.borderAccent,
  },
  reflectionLabel: {
    fontSize: 10, fontWeight: '700', color: COLORS.accent,
    letterSpacing: 1.2, marginBottom: 6, textTransform: 'uppercase',
  },
  reflectionText: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 20, fontStyle: 'italic' },
});

const ss = StyleSheet.create({
  trendLineContainer: {
    position: 'relative',
    marginVertical: 8,
  },
  trendLineEmpty: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bgCardAlt,
    borderRadius: RADIUS.sm,
  },
  trendLineText: { fontSize: 11, color: COLORS.textMuted },
  trendDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  trendLineSegment: {
    position: 'absolute',
    height: 2,
    transformOrigin: 'left',
  },
});
