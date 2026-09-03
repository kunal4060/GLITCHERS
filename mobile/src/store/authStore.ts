import { create } from 'zustand';
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
  loginWithGoogle: (email?: string, name?: string) => Promise<void>;
  checkSession: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false, // Default to false so student sees the Login Screen on fresh open
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
    // Persist to backend
    apiClient.saveOnboardingStep(step, data).catch((err) => console.warn('Failed to persist onboarding step:', err.message));
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

  loginWithGoogle: async (email = 'student@university.edu', name = 'Student User') => {
    set({ isLoading: true });
    try {
      // In mobile app, we exchange the Google auth token / call callback
      const res = await apiClient.post<{ accessToken: string; user: UserProfile }>('/auth/google/callback', {
        code: 'mock_google_oauth_code',
      }).catch(() => null);

      const user = res?.user || {
        id: '00000000-0000-0000-0000-000000000001',
        email,
        fullName: name,
        university: 'State Technological University',
        course: 'Computer Science & Engineering',
        year: 1,
        semester: 1,
        section: 'A',
        cgpa: '8.00',
        creditsCompleted: 20,
        creditsCurrent: 18,
        universityDomain: email.split('@')[1] || 'university.edu',
        isOnboardingComplete: false,
      };

      // Check onboarding state for this user
      const statusRes = await apiClient.getOnboardingStatus().catch(() => null);
      const isComplete = statusRes?.isComplete || user.isOnboardingComplete || false;
      const step = (statusRes?.state?.currentStep as OnboardingStep) || (isComplete ? 'COMPLETE' : 'GOOGLE_SERVICES');

      set({
        isAuthenticated: true,
        user,
        isOnboardingComplete: isComplete,
        currentOnboardingStep: step,
        onboardingData: statusRes?.state?.data || {},
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
    });
  },
}));

