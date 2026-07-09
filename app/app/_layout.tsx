import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initDb, hasCompletedOnboarding, getUserProfile } from '../lib/db';
import { useUserStore } from '../stores/userStore';
import { requestNotificationPermissions } from '../lib/notifications';
import { View, ActivityIndicator, Text } from 'react-native';
import { COLORS } from '../constants/theme';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setProfile, setSessionTime, setOnboardingComplete } = useUserStore();

  useEffect(() => {
    async function bootstrap() {
      try {
        await initDb();
        await requestNotificationPermissions();

        const onboarded = await hasCompletedOnboarding();
        if (onboarded) {
          const profile = await getUserProfile();
          if (profile) {
            setProfile(profile.age_range, profile.role);
            setSessionTime(profile.session_time);
          }
          setOnboardingComplete(true);
        }

        setReady(true);
      } catch (e: any) {
        console.error("Bootstrap Error:", e);
        setError(e.message || "Failed to start");
      }
    }
    bootstrap();
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: COLORS.danger, fontSize: 18, marginBottom: 10 }}>Error</Text>
        <Text style={{ color: COLORS.textPrimary, textAlign: 'center' }}>{error}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={COLORS.accent} size="large" />
        <Text style={{ color: COLORS.textMuted, marginTop: 12 }}>Loading MindProtocol...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="session-time" />
        <Stack.Screen name="(session)" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="crisis" options={{ animation: 'fade', gestureEnabled: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
