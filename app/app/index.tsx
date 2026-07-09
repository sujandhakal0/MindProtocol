import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useUserStore } from '../stores/userStore';
import { COLORS } from '../constants/theme';

export default function Index() {
  const { onboardingComplete } = useUserStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onboardingComplete) {
        router.replace('/(tabs)');
      } else {
        router.replace('/onboarding');
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [onboardingComplete]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color={COLORS.accent} size="large" />
    </View>
  );
}
