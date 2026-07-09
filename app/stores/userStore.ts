import { create } from 'zustand';

interface UserState {
  ageRange: string;
  role: string;
  sessionTime: string;
  onboardingComplete: boolean;
  setProfile: (ageRange: string, role: string) => void;
  setSessionTime: (time: string) => void;
  setOnboardingComplete: (v: boolean) => void;
}

export const useUserStore = create<UserState>((set) => ({
  ageRange: '',
  role: '',
  sessionTime: '21:00',
  onboardingComplete: false,
  setProfile: (ageRange, role) => set({ ageRange, role }),
  setSessionTime: (time) => set({ sessionTime: time }),
  setOnboardingComplete: (v) => set({ onboardingComplete: v }),
}));
