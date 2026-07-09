import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Platform, TextInput, KeyboardAvoidingView, ActivityIndicator,
  Keyboard
} from 'react-native';
import { router } from 'expo-router';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { useSessionStore, JournalEntry } from '../../stores/sessionStore';
import { useUserStore } from '../../stores/userStore';
import { useVoiceInput } from '../../lib/useVoiceInput';
import {
  startSession, savePreSliders, saveDiagnosticTranscript,
  saveGeneratedPrompt, saveJournalText, saveSessionReflection,
  savePostSliders, completeSession
} from '../../lib/db';
import {
  checkCrisisInText, generateFollowUpQuestion, generateSessionReflection,
  generateJournalingPrompt, SessionInput
} from '../../lib/groq';
import { PROGRESSIVE_QUESTIONS } from '../../constants/systemPrompt';

type Step = 'pre-sliders' | 'diagnostic' | 'journaling' | 'post-sliders' | 'complete';

const SLIDER_CONFIG = [
  { key: 'mood' as const, label: 'Mood', color: COLORS.sliderMood, low: 'Low', high: 'Great' },
  { key: 'mentalNoise' as const, label: 'Mental Noise', color: COLORS.sliderNoise, low: 'Calm', high: 'Loud' },
  { key: 'focus' as const, label: 'Focus / Clarity', color: COLORS.sliderFocus, low: 'Foggy', high: 'Sharp' },
  { key: 'energy' as const, label: 'Energy', color: COLORS.sliderEnergy, low: 'Depleted', high: 'Alive' },
];

const AUDIO_TRACKS = [
  require('../../assets/audio/1_compressed.mp3'),
  require('../../assets/audio/2_compressed.mp3'),
  require('../../assets/audio/3_compressed.mp3'),
  require('../../assets/audio/4_compressed.mp3'),
];

function SliderRow({
  label, value, onChange, color, low, high
}: {
  label: string; value: number; onChange: (v: number) => void;
  color: string; low: string; high: string;
}) {
  const steps = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  return (
    <View style={ss.sliderBlock}>
      <View style={ss.sliderHeader}>
        <Text style={ss.sliderLabel}>{label}</Text>
        <Text style={[ss.sliderValue, { color }]}>{value}%</Text>
      </View>
      <View style={ss.track}>
        <View style={[ss.fill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
      <View style={ss.stepRow}>
        {steps.map(s => (
          <TouchableOpacity key={s} onPress={() => onChange(s)} style={ss.stepDot}>
            <View style={[
              ss.dot,
              value >= s && { backgroundColor: color },
              value === s && ss.dotActive,
            ]} />
          </TouchableOpacity>
        ))}
      </View>
      <View style={ss.labelRow}>
        <Text style={ss.extremeLabel}>{low}</Text>
        <Text style={ss.extremeLabel}>{high}</Text>
      </View>
    </View>
  );
}

export default function SessionTab() {
  const [step, setStep] = useState<Step>('pre-sliders');

  const {
    preSliders, postSliders, conversation, journalEntries, currentQuestionIndex,
    generatedPrompts, currentPromptIndex, journalText, sessionReflection, sessionId,
    setPreSliders, setPostSliders, appendMessage, addJournalEntry,
    setCurrentQuestionIndex, setGeneratedPrompts, advancePrompt, setJournalText,
    setSessionReflection, setSessionId, resetSession
  } = useSessionStore();
  const { ageRange, role, gender } = useUserStore();

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Voice input
  const { isRecording, transcript, partialResult, error: voiceError, isSupported: voiceSupported, startRecording, stopRecording, cancelRecording } = useVoiceInput();

  // Auto-append transcript to input when voice recognition completes
  useEffect(() => {
    if (transcript) {
      setInputText(prev => prev ? `${prev} ${transcript}` : transcript);
    }
  }, [transcript]);

  // Elapsed timer
  useEffect(() => {
    if (step !== 'diagnostic' && step !== 'journaling') return;
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  // Reset timer when entering session steps
  useEffect(() => {
    if (step === 'diagnostic' || step === 'journaling') setElapsedSeconds(0);
  }, [step]);

  // Audio state
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Stop audio when component unmounts
  useEffect(() => {
    return sound
      ? () => { sound.unloadAsync(); }
      : undefined;
  }, [sound]);

  async function toggleAudio() {
    if (sound) {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } else {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });
        const randomTrack = AUDIO_TRACKS[Math.floor(Math.random() * AUDIO_TRACKS.length)];
        const { sound: newSound } = await Audio.Sound.createAsync(
          randomTrack,
          { shouldPlay: true, isLooping: true, volume: 0.5 }
        );
        setSound(newSound);
        setIsPlaying(true);
      } catch (error) {
        console.error("Error playing audio", error);
      }
    }
  }

  async function stopAudio() {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
      setIsPlaying(false);
    }
  }

  // ─── Step handlers ───────────────────────────────────────────────────────────

  async function handlePreSlidersNext() {
    const today = new Date().toISOString().split('T')[0];
    const id = await startSession(today);
    setSessionId(id);
    await savePreSliders(id, preSliders.mood, preSliders.mentalNoise, preSliders.focus, preSliders.energy);
    setStep('diagnostic');
  }

  async function handleDiagnosticNext() {
    if (!inputText.trim()) return;

    const text = inputText.trim();
    setInputText('');
    Keyboard.dismiss();

    const qi = currentQuestionIndex;
    const currentQ = qi < PROGRESSIVE_QUESTIONS.length
      ? PROGRESSIVE_QUESTIONS[qi]
      : null;

    const questionText = currentQ?.question || 'Final reflection';

    const entry: JournalEntry = {
      questionIndex: qi,
      phase: currentQ?.phase || 'deepening',
      question: questionText,
      response: text,
      timestamp: Date.now(),
    };
    addJournalEntry(entry);
    appendMessage({ role: 'user', text });

    setIsTyping(true);
    const crisisResult = await checkCrisisInText(text);
    setIsTyping(false);

    if (crisisResult.type === 'crisis') {
      router.push('/crisis');
      return;
    }

    const nextIndex = qi + 1;

    if (nextIndex >= PROGRESSIVE_QUESTIONS.length) {
      setIsTyping(true);

      const sessionInput: SessionInput = {
        ageRange,
        role,
        gender,
        sliders: preSliders,
        conversation: [...conversation, { role: 'ai', text: questionText }, { role: 'user', text }],
      };

      const [followUp, promptResult] = await Promise.all([
        generateFollowUpQuestion(
          sessionInput.conversation,
          currentQ?.phase || 'deepening',
          preSliders
        ),
        generateJournalingPrompt(sessionInput),
      ]);

      setIsTyping(false);

      if (followUp.type === 'crisis' || promptResult.type === 'crisis') {
        router.push('/crisis');
        return;
      }

      if (followUp.type === 'prompt') {
        appendMessage({ role: 'ai', text: followUp.text });
      }

      const prompts = promptResult.type === 'prompts' ? promptResult.prompts : [];
      setGeneratedPrompts(prompts.length > 0 ? prompts : ['Write freely for the next few minutes.']);

      setCurrentQuestionIndex(nextIndex);
      setStep('journaling');
    } else {
      setIsTyping(true);
      const followUp = await generateFollowUpQuestion(
        [...conversation, { role: 'ai', text: questionText }, { role: 'user', text }],
        currentQ?.phase || 'surface',
        preSliders
      );
      setIsTyping(false);

      if (followUp.type === 'crisis') {
        router.push('/crisis');
        return;
      }

      const nextQ = PROGRESSIVE_QUESTIONS[nextIndex];
      const questionToShow = followUp.type === 'prompt' ? followUp.text : nextQ.question;

      appendMessage({ role: 'ai', text: questionToShow });
      setCurrentQuestionIndex(nextIndex);
    }
  }

  async function handleJournalingSend() {
    if (!inputText.trim()) return;

    const text = inputText.trim();
    setInputText('');
    Keyboard.dismiss();

    setIsTyping(true);
    const crisisResult = await checkCrisisInText(text);
    setIsTyping(false);

    if (crisisResult.type === 'crisis') {
      router.push('/crisis');
      return;
    }

    const currentPrompt = generatedPrompts[currentPromptIndex] || 'Free journaling';
    addJournalEntry({
      questionIndex: currentPromptIndex,
      phase: 'journaling',
      question: currentPrompt,
      response: text,
      timestamp: Date.now(),
    });

    // Advance to next prompt if there is one
    if (currentPromptIndex < generatedPrompts.length - 1) {
      advancePrompt();
    }
  }

  async function handleJournalingDone() {
    setIsSaving(true);

    if (inputText.trim()) {
      const currentPrompt = generatedPrompts[currentPromptIndex] || 'Free journaling';
      addJournalEntry({
        questionIndex: currentPromptIndex,
        phase: 'journaling',
        question: currentPrompt,
        response: inputText.trim(),
        timestamp: Date.now(),
      });
      setInputText('');
    }

    const allText = journalEntries
      .map(e => `[${e.phase}]\n${e.question}\n\n${e.response}`)
      .join('\n\n---\n\n');

    const transcript = conversation.map(m => ({ role: m.role as 'ai' | 'user', text: m.text }));

    if (sessionId) {
      await saveDiagnosticTranscript(sessionId, transcript);
      await saveGeneratedPrompt(sessionId, generatedPrompts.join('\n\n---\n\n'));
      await saveJournalText(sessionId, allText);
    }

    await stopAudio();
    setIsComplete(true);
    setIsSaving(false);
    setStep('post-sliders');
  }

  async function handlePostSlidersNext() {
    setIsSaving(true);
    if (sessionId) {
      await savePostSliders(sessionId, postSliders.mood, postSliders.mentalNoise, postSliders.focus, postSliders.energy);

      const reflectionResult = await generateSessionReflection(preSliders, postSliders);
      const reflection = reflectionResult.type === 'prompt'
        ? reflectionResult.text
        : 'You showed up and put words to what you were carrying.';
      setSessionReflection(reflection);
      await saveSessionReflection(sessionId, reflection);

      await completeSession(sessionId);
    }
    setIsSaving(false);
    setStep('complete');
  }

  function handleDone() {
    resetSession();
    setInputText('');
    setStep('pre-sliders');
    router.replace('/(tabs)');
  }

  // ─── Render steps ────────────────────────────────────────────────────────────

  const AudioToggle = () => (
    <TouchableOpacity style={ss.audioBtn} onPress={toggleAudio}>
      <Text style={ss.audioIcon}>{isPlaying ? '🔊' : '🔇'}</Text>
    </TouchableOpacity>
  );

  // ─── PRE-SLIDERS ─────────────────────────────────────────────────────────────
  if (step === 'pre-sliders') {
    return (
      <ScrollView style={ss.container} contentContainerStyle={ss.content}>
        <Text style={ss.eyebrow}>BEFORE SESSION</Text>
        <Text style={ss.title}>How are you feeling{'\n'}right now?</Text>
        <Text style={ss.sub}>Move each bar to where you actually are — not where you want to be.</Text>
        {SLIDER_CONFIG.map(cfg => (
          <SliderRow
            key={cfg.key}
            label={cfg.label}
            value={preSliders[cfg.key]}
            color={cfg.color}
            low={cfg.low}
            high={cfg.high}
            onChange={(v) => setPreSliders({ ...preSliders, [cfg.key]: v })}
          />
        ))}
        <TouchableOpacity style={ss.cta} onPress={handlePreSlidersNext} activeOpacity={0.85}>
          <Text style={ss.ctaText}>Begin session →</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ─── DIAGNOSTIC (30% phase) ──────────────────────────────────────────────────
  if (step === 'diagnostic') {
    const qi = currentQuestionIndex;
    const currentQ = qi < PROGRESSIVE_QUESTIONS.length ? PROGRESSIVE_QUESTIONS[qi] : null;
    const questionText = currentQ?.question || 'Tell me more about what you are experiencing.';
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;

    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={ss.chatHeader}>
          <View style={ss.headerLeft}>
            <Text style={ss.eyebrow}>CHECK-IN</Text>
            <Text style={ss.timerText}>{mins}:{secs.toString().padStart(2, '0')}</Text>
          </View>
          <View style={ss.headerRight}>
            <AudioToggle />
          </View>
        </View>

        {/* Progress dots - not percentage bar */}
        <View style={ss.dotsContainer}>
          {PROGRESSIVE_QUESTIONS.map((_, i) => (
            <View
              key={i}
              style={[ss.progressDot, i < qi && ss.progressDotDone, i === qi && ss.progressDotActive]}
            />
          ))}
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={ss.chatScroll}
          contentContainerStyle={ss.chatContent}
        >
          {/* Show first question if conversation is empty */}
          {conversation.length === 0 && currentQ && (
            <View style={[ss.bubble, ss.bubbleAi]}>
              <Text style={ss.bubbleText}>{currentQ.question}</Text>
              {currentQ.instruction && (
                <Text style={ss.bubbleInstruction}>{currentQ.instruction}</Text>
              )}
            </View>
          )}

          {conversation.map((msg, i) => (
            <View key={i} style={[ss.bubble, msg.role === 'ai' ? ss.bubbleAi : ss.bubbleUser]}>
              <Text style={ss.bubbleText}>{msg.text}</Text>
            </View>
          ))}

          {isTyping && (
            <View style={[ss.bubble, ss.bubbleAi, ss.typingBubble]}>
              <ActivityIndicator size="small" color={COLORS.textSecondary} />
              <Text style={ss.typingText}>Thinking...</Text>
            </View>
          )}
        </ScrollView>

        {voiceError && (
          <View style={ss.voiceError}>
            <Text style={ss.voiceErrorText}>{voiceError}</Text>
          </View>
        )}
        <View style={ss.chatInputContainer}>
          <TouchableOpacity
            style={[ss.micBtn, isRecording && ss.micBtnActive]}
            onPress={isRecording ? stopRecording : startRecording}
          >
            <Ionicons name={isRecording ? 'mic' : 'mic-outline'} size={22} color={isRecording ? '#fff' : COLORS.textSecondary} />
          </TouchableOpacity>
          <TextInput
            style={ss.chatInput}
            placeholder={isRecording ? 'Listening...' : 'Write freely here...'}
            placeholderTextColor={COLORS.textMuted}
            value={isRecording ? (partialResult || inputText) : inputText}
            onChangeText={setInputText}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[ss.sendBtn, !inputText.trim() && { opacity: 0.5 }]}
            onPress={handleDiagnosticNext}
            disabled={!inputText.trim() || isTyping}
          >
            <Text style={ss.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ─── JOURNALING (70% phase) ────────────────────────────────────────────────
  if (step === 'journaling') {
    const activePrompt = generatedPrompts[currentPromptIndex] || 'Write freely for the next few minutes. There are no wrong answers — just write whatever comes up for you.';
    const totalPrompts = generatedPrompts.length;
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    const atFifteen = elapsedSeconds >= 15 * 60;
    const isLastPrompt = currentPromptIndex >= totalPrompts - 1;

    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={ss.chatHeader}>
          <View style={ss.headerLeft}>
            <Text style={ss.eyebrow}>JOURNALING</Text>
            <Text style={[ss.timerText, atFifteen && ss.timerTextDone]}>
              {mins}:{secs.toString().padStart(2, '0')} {atFifteen ? '✓ 15 min reached' : '/ 15:00'}
            </Text>
          </View>
          <View style={ss.headerRight}>
            <AudioToggle />
            <TouchableOpacity
              style={[ss.doneBtn, isSaving && { opacity: 0.5 }]}
              onPress={handleJournalingDone}
              disabled={isSaving}
            >
              <Text style={ss.doneBtnText}>{isSaving ? 'Saving...' : 'Done'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={ss.chatScroll}
          contentContainerStyle={ss.chatContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {/* Prompt progression dots */}
          {totalPrompts > 1 && (
            <View style={ss.promptProgressRow}>
              {generatedPrompts.map((_, i) => (
                <View
                  key={i}
                  style={[
                    ss.promptProgressDot,
                    i < currentPromptIndex && ss.promptProgressDotActive,
                    i === currentPromptIndex && ss.promptProgressDotCurrent,
                  ]}
                />
              ))}
              <Text style={ss.progressLabel}>
                {currentPromptIndex + 1} of {totalPrompts}
              </Text>
            </View>
          )}

          {/* Personalized prompt — serif-like style */}
          <View style={ss.promptPinned}>
            <Text style={ss.promptLabel}>
              {isLastPrompt ? 'Final prompt:' : `Prompt ${currentPromptIndex + 1}:`}
            </Text>
            <Text style={ss.promptText}>{activePrompt}</Text>
          </View>

          {/* Instruction */}
          <Text style={ss.journalHint}>
            {isLastPrompt
              ? 'This is your last prompt. Write freely, then press Done when finished.'
              : 'Write as much as you want. Press the arrow to save and move to the next prompt, or press Done anytime.'}
          </Text>

          {/* Journal entries written so far — only for current prompt */}
          {journalEntries
            .filter(e => e.phase === 'journaling' && e.question === generatedPrompts[currentPromptIndex])
            .map((entry, i) => (
              <View key={i} style={[ss.bubble, ss.bubbleUser, { alignSelf: 'stretch' }]}>
                <Text style={ss.bubbleText}>{entry.response}</Text>
              </View>
            ))}

          {isTyping && (
            <View style={[ss.bubble, ss.bubbleAi, ss.typingBubble]}>
              <ActivityIndicator size="small" color={COLORS.textSecondary} />
            </View>
          )}
        </ScrollView>

        {voiceError && (
          <View style={ss.voiceError}>
            <Text style={ss.voiceErrorText}>{voiceError}</Text>
          </View>
        )}

        {/* After final prompt: show Done button instead of input */}
        {isLastPrompt && journalEntries.some(e => e.phase === 'journaling' && e.question === generatedPrompts[currentPromptIndex]) ? (
          <View style={ss.finalDoneContainer}>
            <TouchableOpacity
              style={[ss.finalDoneBtn, isSaving && { opacity: 0.5 }]}
              onPress={handleJournalingDone}
              disabled={isSaving}
            >
              <Text style={ss.finalDoneBtnText}>{isSaving ? 'Saving...' : 'Done writing'}</Text>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={ss.chatInputContainer}>
            <TouchableOpacity
              style={[ss.micBtn, isRecording && ss.micBtnActive]}
              onPress={isRecording ? stopRecording : startRecording}
            >
              <Ionicons name={isRecording ? 'mic' : 'mic-outline'} size={22} color={isRecording ? '#fff' : COLORS.textSecondary} />
            </TouchableOpacity>
            <TextInput
              style={ss.chatInput}
              placeholder={isRecording ? 'Listening...' : 'Write freely here...'}
              placeholderTextColor={COLORS.textMuted}
              value={isRecording ? (partialResult || inputText) : inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[ss.sendBtn, !inputText.trim() && { opacity: 0.5 }]}
              onPress={handleJournalingSend}
              disabled={!inputText.trim() || isTyping}
            >
              <Text style={ss.sendIcon}>↑</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    );
  }

  // ─── POST-SLIDERS ────────────────────────────────────────────────────────────
  if (step === 'post-sliders') {
    return (
      <ScrollView style={ss.container} contentContainerStyle={ss.content}>
        <Text style={ss.eyebrow}>AFTER SESSION</Text>
        <Text style={ss.title}>How do you feel{'\n'}now?</Text>
        <Text style={ss.sub}>Be honest — even a small shift matters.</Text>
        {SLIDER_CONFIG.map(cfg => (
          <SliderRow
            key={cfg.key}
            label={cfg.label}
            value={postSliders[cfg.key]}
            color={cfg.color}
            low={cfg.low}
            high={cfg.high}
            onChange={(v) => setPostSliders({ ...postSliders, [cfg.key]: v })}
          />
        ))}
        <TouchableOpacity style={ss.cta} onPress={handlePostSlidersNext} activeOpacity={0.85} disabled={isSaving}>
          <Text style={ss.ctaText}>{isSaving ? 'Saving...' : 'See my results →'}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ─── COMPLETE ────────────────────────────────────────────────────────────────
  const moodDelta = postSliders.mood - preSliders.mood;
  const noiseDelta = preSliders.mentalNoise - postSliders.mentalNoise;
  const focusDelta = postSliders.focus - preSliders.focus;
  const energyDelta = postSliders.energy - preSliders.energy;

  function DeltaBar({ label, delta, color }: { label: string; delta: number; color: string }) {
    const isPositive = delta >= 0;
    const width = Math.min(Math.abs(delta), 100);
    return (
      <View style={ss.deltaRow}>
        <Text style={ss.deltaLabel}>{label}</Text>
        <View style={ss.deltaBarContainer}>
          <View style={[ss.deltaBar, {
            width: `${width}%`,
            backgroundColor: isPositive ? COLORS.success : COLORS.secondary,
          }]} />
        </View>
        <Text style={[ss.deltaValue, { color: isPositive ? COLORS.success : COLORS.secondary }]}>
          {isPositive ? '↑' : '↓'} {Math.abs(delta)}%
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={ss.container} contentContainerStyle={ss.content}>
      <View style={ss.completeHeader}>
        <Text style={ss.completeTick}>✓</Text>
        <Text style={ss.completeTitle}>Session complete</Text>
        <Text style={ss.completeSub}>You showed up. That's the whole thing.</Text>
      </View>

      <View style={ss.deltaCard}>
        <Text style={ss.deltaTitle}>Before → After</Text>
        <DeltaBar label="Mood" delta={moodDelta} color={COLORS.sliderMood} />
        <DeltaBar label="Mental Noise ↓" delta={noiseDelta} color={COLORS.sliderNoise} />
        <DeltaBar label="Focus" delta={focusDelta} color={COLORS.sliderFocus} />
        <DeltaBar label="Energy" delta={energyDelta} color={COLORS.sliderEnergy} />
      </View>

      {sessionReflection ? (
        <View style={ss.reflectionCard}>
          <Text style={ss.reflectionLabel}>TODAY'S REFLECTION</Text>
          <Text style={ss.reflectionText}>{sessionReflection}</Text>
        </View>
      ) : null}

      <TouchableOpacity style={ss.cta} onPress={handleDone} activeOpacity={0.85}>
        <Text style={ss.ctaText}>Done</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const ss = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: SPACING.lg, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 100 },
  centerContent: { justifyContent: 'center', alignItems: 'center' },

  eyebrow: { fontSize: 10, fontWeight: '700', color: COLORS.accent, letterSpacing: 2, marginBottom: 4 },
  timerText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  timerTextDone: { color: COLORS.success },
  title: { fontSize: 28, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 36, marginBottom: 8 },
  sub: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: SPACING.xl },

  sliderBlock: { marginBottom: SPACING.lg },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  sliderLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  sliderValue: { fontSize: 14, fontWeight: '700' },
  track: {
    height: 6, backgroundColor: COLORS.bgCardAlt,
    borderRadius: 3, overflow: 'hidden', marginBottom: 8,
  },
  fill: { height: 6, borderRadius: 3 },
  stepRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  stepDot: { padding: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.bgCardAlt },
  dotActive: { transform: [{ scale: 1.4 }] },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  extremeLabel: { fontSize: 10, color: COLORS.textMuted },

  // Header
  chatHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  headerLeft: { flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  doneBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: COLORS.bgCardAlt, borderRadius: RADIUS.full,
  },
  doneBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },

  // Final Done button (bottom of screen after last prompt)
  finalDoneContainer: {
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    paddingBottom: SPACING.xl, backgroundColor: COLORS.bg,
  },
  finalDoneBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: RADIUS.md,
    backgroundColor: COLORS.accent,
  },
  finalDoneBtnText: {
    fontSize: 16, fontWeight: '700', color: '#fff',
  },

  // Progress dots
  dotsContainer: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 8, paddingVertical: SPACING.md,
  },
  progressDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.bgCardAlt,
  },
  progressDotDone: { backgroundColor: COLORS.accent },
  progressDotActive: { backgroundColor: COLORS.accent, width: 24 },

  // Audio
  audioBtn: { padding: 8, backgroundColor: COLORS.bgCardAlt, borderRadius: RADIUS.full },
  audioIcon: { fontSize: 16 },

  // Chat
  chatScroll: { flex: 1 },
  chatContent: { padding: SPACING.lg, paddingBottom: SPACING.xl },

  // Pinned prompt for journaling
  promptProgressRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginBottom: SPACING.lg,
  },
  promptProgressDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.bgCardAlt,
  },
  promptProgressDotActive: { backgroundColor: COLORS.accent },
  promptProgressDotCurrent: { backgroundColor: COLORS.accent, width: 20 },
  progressLabel: {
    fontSize: 12, color: COLORS.textMuted, marginLeft: 6,
  },
  promptPinned: {
    backgroundColor: COLORS.bgCardAlt, borderRadius: RADIUS.md,
    padding: SPACING.lg, marginBottom: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  promptLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.accent,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6,
  },
  promptText: {
    fontSize: 17, color: COLORS.textPrimary, lineHeight: 26,
    fontStyle: 'italic',
  },
  journalHint: {
    fontSize: 13, color: COLORS.textMuted, lineHeight: 18,
    textAlign: 'center', marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },

  bubble: { maxWidth: '88%', padding: 14, borderRadius: 20, marginBottom: SPACING.md },
  bubbleAi: { backgroundColor: COLORS.bgCardAlt, alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: COLORS.accent, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 16, color: COLORS.textPrimary, lineHeight: 22 },
  bubbleInstruction: { fontSize: 13, color: COLORS.textSecondary, marginTop: 8, lineHeight: 18, fontStyle: 'italic' },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingText: { fontSize: 14, color: COLORS.textSecondary },
  chatInputContainer: {
    flexDirection: 'row', padding: SPACING.sm, paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.bgCard, borderTopWidth: 1, borderTopColor: COLORS.border,
    alignItems: 'flex-end', gap: SPACING.sm,
  },
  voiceError: {
    backgroundColor: COLORS.bgCardAlt, paddingHorizontal: SPACING.md, paddingVertical: 6,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  voiceErrorText: { fontSize: 11, color: COLORS.danger },
  micBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.bgCardAlt, alignItems: 'center', justifyContent: 'center',
  },
  micBtnActive: {
    backgroundColor: COLORS.danger,
  },
  chatInput: {
    flex: 1, backgroundColor: COLORS.bgInput, borderRadius: 20,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16,
    color: COLORS.textPrimary, fontSize: 15, maxHeight: 200, minHeight: 60,
  },
  sendBtn: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  sendIcon: { color: '#fff', fontSize: 22, fontWeight: '700' },

  // Complete
  completeHeader: { alignItems: 'center', paddingVertical: SPACING.xl, marginBottom: SPACING.lg },
  completeTick: { fontSize: 48, color: COLORS.success, marginBottom: 12 },
  completeTitle: { fontSize: 28, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  completeSub: { fontSize: 15, color: COLORS.textSecondary },

  deltaCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.lg, marginBottom: SPACING.xl,
    borderWidth: 1, borderColor: COLORS.border,
  },
  deltaTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1.2, marginBottom: SPACING.md },
  deltaRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  deltaLabel: { fontSize: 13, color: COLORS.textSecondary, width: 100 },
  deltaBarContainer: {
    flex: 1, height: 6, backgroundColor: COLORS.bgCardAlt,
    borderRadius: 3, marginHorizontal: SPACING.sm, overflow: 'hidden',
  },
  deltaBar: { height: 6, borderRadius: 3 },
  deltaValue: { fontSize: 14, fontWeight: '700', width: 60, textAlign: 'right' },

  reflectionCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.lg, marginBottom: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.borderAccent,
  },
  reflectionLabel: {
    fontSize: 10, fontWeight: '700', color: COLORS.accent,
    letterSpacing: 1.5, marginBottom: 8,
  },
  reflectionText: { fontSize: 15, color: COLORS.textPrimary, lineHeight: 22, fontStyle: 'italic' },

  cta: {
    backgroundColor: COLORS.accent, borderRadius: RADIUS.lg,
    paddingVertical: 18, alignItems: 'center',
    shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
    marginBottom: SPACING.md,
    marginTop: SPACING.xl,
  },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
