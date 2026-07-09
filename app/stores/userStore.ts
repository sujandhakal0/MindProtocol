import { create } from 'zustand';

interface UserState {
  ageRange: string;
  role: string;
  gender: string;
  sessionTime: string;
  onboardingComplete: boolean;
  setProfile: (ageRange: string, role: string, gender?: string) => void;
  setSessionTime: (time: string) => void;
  setOnboardingComplete: (v: boolean) => void;
}

export const useUserStore = create<UserState>((set) => ({
  ageRange: '',
  role: '',
  gender: '',
  sessionTime: '21:00',
  onboardingComplete: false,
  setProfile: (ageRange, role, gender = '') => set({ ageRange, role, gender }),
  setSessionTime: (time) => set({ sessionTime: time }),
  setOnboardingComplete: (v) => set({ onboardingComplete: v }),
}));
