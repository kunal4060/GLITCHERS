import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserProfile, OnboardingStep } from '@glitchers/shared';
import { apiClient } from '../api/client';

interface AuthState {
  isAuthenticated: boolean;
  isOnboardingComplete: boolean;
  currentOnboardingStep: OnboardingStep;
  onboardingData: Record<string, any>;
  user: UserProfile | null;
  gmailConnected: boolean;
  calendarConnected: boolean;
  isLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  setAuthenticated: (status: boolean) => void;
  setGoogleConnections: (gmail: boolean, calendar: boolean) => void;
  setAvatarUrl: (avatarUrl: string | null) => void;
  setOnboardingStep: (step: OnboardingStep, data?: Record<string, any>) => void;
  completeOnboarding: (profileUpdates?: Partial<UserProfile>) => void;
  loginWithGoogle: (email?: string, name?: string, token?: string) => Promise<void>;
  checkSession: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      isOnboardingComplete: false,
      currentOnboardingStep: 'GOOGLE_AUTH',
      onboardingData: {},
      user: null,
      gmailConnected: false,
      calendarConnected: false,
      isLoading: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
      setGoogleConnections: (gmailConnected, calendarConnected) => set({ gmailConnected, calendarConnected }),
      setAvatarUrl: (avatarUrl) =>
        set((s) => ({
          user: s.user ? { ...s.user, avatarUrl } : null,
        })),

      setOnboardingStep: (step: OnboardingStep, data?: Record<string, any>) => {
        set((s) => ({
          currentOnboardingStep: step,
          onboardingData: { ...s.onboardingData, ...(data || {}) },
        }));
        // Persist to backend if connected
        apiClient.saveOnboardingStep(step, data).catch(() => null);
      },

      completeOnboarding: (profileUpdates?: Partial<UserProfile>) => {
        set((s) => ({
          isOnboardingComplete: true,
          currentOnboardingStep: 'COMPLETE',
          user: s.user
            ? {
                ...s.user,
                ...(profileUpdates || {}),
                isOnboardingComplete: true,
              }
            : null,
        }));
      },

      loginWithGoogle: async (email = 'kunalugale4060@gmail.com', name = 'Kunal Ugale', token?: string) => {
        set({ isLoading: true });
        try {
          if (token) {
            apiClient.setToken(token);
          }

          const safeEmail = email.trim().toLowerCase();
          const uniqueUserId = `usr_${safeEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

          // Try to fetch profile from /auth/me
          const meRes = await apiClient.get<{ user: UserProfile }>('/auth/me').catch(() => null);
          let user = meRes?.user;

          if (!user) {
            const res = await apiClient.post<{ accessToken: string; user: UserProfile }>('/auth/google/callback', {
              code: 'mock_google_oauth_code',
            }).catch(() => null);
            if (res?.accessToken && !token) {
              apiClient.setToken(res.accessToken);
            }
            user = res?.user || {
              id: uniqueUserId,
              email: safeEmail,
              fullName: name,
              university: safeEmail.includes('@') && !safeEmail.endsWith('gmail.com')
                ? safeEmail.split('@')[1].toUpperCase()
                : 'State Technological University',
              course: 'Computer Science & Engineering',
              year: 3,
              semester: 6,
              section: 'A',
              cgpa: '8.71',
              creditsCompleted: 42,
              creditsCurrent: 18,
              universityDomain: safeEmail.split('@')[1] || 'university.edu',
              isOnboardingComplete: false,
            };
          }

          // Check if this user had previously completed onboarding
          const statusRes = await apiClient.getOnboardingStatus().catch(() => null);
          const isComplete = statusRes?.isComplete ?? user.isOnboardingComplete ?? false;

          // Never trap user in INITIAL_PROCESSING on login
          const rawStep = statusRes?.state?.currentStep;
          const step: OnboardingStep = isComplete
            ? 'COMPLETE'
            : (rawStep && rawStep !== 'COMPLETE' && rawStep !== 'INITIAL_PROCESSING' && rawStep !== 'GOOGLE_AUTH')
            ? (rawStep as OnboardingStep)
            : 'GOOGLE_SERVICES';

          set({
            isAuthenticated: true,
            user: { ...user, isOnboardingComplete: isComplete },
            isOnboardingComplete: isComplete,
            currentOnboardingStep: step,
            onboardingData: statusRes?.state?.data || {},
            gmailConnected: true,
            calendarConnected: true,
            isLoading: false,
          });
        } catch (err) {
          console.warn('Google login error:', err);
          set({ isLoading: false });
        }
      },

      checkSession: async () => {
        try {
          const res = await apiClient.get<{ user: UserProfile }>('/auth/me').catch(() => null);
          if (res?.user) {
            const statusRes = await apiClient.getOnboardingStatus().catch(() => null);
            const isComplete = statusRes?.isComplete ?? res.user.isOnboardingComplete ?? false;
            set({
              isAuthenticated: true,
              user: res.user,
              isOnboardingComplete: isComplete,
              currentOnboardingStep: (statusRes?.state?.currentStep as OnboardingStep) || (isComplete ? 'COMPLETE' : 'GOOGLE_SERVICES'),
              onboardingData: statusRes?.state?.data || {},
              gmailConnected: true,
              calendarConnected: true,
            });
          }
        } catch (err) {
          console.warn('Check session error:', err);
        }
      },

      logout: () => {
        set({
          isAuthenticated: false,
          isOnboardingComplete: false,
          user: null,
          currentOnboardingStep: 'GOOGLE_AUTH',
          onboardingData: {},
          gmailConnected: false,
          calendarConnected: false,
        });
        AsyncStorage.removeItem('glitchers-auth-storage').catch(() => null);
      },
    }),
    {
      name: 'glitchers-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        isOnboardingComplete: state.isOnboardingComplete,
        currentOnboardingStep: state.currentOnboardingStep,
        user: state.user,
        gmailConnected: state.gmailConnected,
        calendarConnected: state.calendarConnected,
        onboardingData: state.onboardingData,
      }),
    }
  )
);
