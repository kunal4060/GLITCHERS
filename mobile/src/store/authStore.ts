import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserProfile, OnboardingStep } from '@glitchers/shared';
import { apiClient, AuthError } from '../api/client';
import { loadAuthToken } from '../utils/tokenStorage';
import { useDashboardStore } from './dashboardStore';

interface AuthState {
  isHydrated: boolean;
  isAuthenticated: boolean;
  isOnboardingComplete: boolean;
  currentOnboardingStep: OnboardingStep;
  onboardingData: Record<string, any>;
  user: UserProfile | null;
  token: string | null;
  gmailConnected: boolean;
  calendarConnected: boolean;
  isLoading: boolean;
  setHydrated: (hydrated: boolean) => void;
  setUser: (user: UserProfile | null) => void;
  setToken: (token: string | null) => void;
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
      isHydrated: false,
      isAuthenticated: false,
      isOnboardingComplete: false,
      currentOnboardingStep: 'GOOGLE_AUTH',
      onboardingData: {},
      user: null,
      token: null,
      gmailConnected: false,
      calendarConnected: false,
      isLoading: false,

      setHydrated: (isHydrated) => set({ isHydrated }),
      setUser: (user) => {
        set({ user, isAuthenticated: !!user });
      },
      setToken: (token) => {
        if (token) {
          apiClient.setToken(token);
        } else {
          apiClient.clearToken();
        }
        set({ token });
      },
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

      loginWithGoogle: async (email?: string, name?: string, token?: string) => {
        set({ isLoading: true });
        try {
          if (token) {
            // M19: await persist so a kill right after login can't lose the token.
            await apiClient.setToken(token);
          }

          const safeEmail = (email || '').trim().toLowerCase();
          let safeName = (name || '').trim();
          if (!safeName) {
            const prefix = safeEmail.split('@')[0];
            safeName = prefix
              .split(/[._-]/)
              .filter(Boolean)
              .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
              .join(' ') || 'Student User';
          }

          let activeToken = token;

          // 1. Authenticate with backend /auth/login or /auth/me
          let user: UserProfile | null = null;
          try {
            const loginRes = await apiClient.login(safeEmail, safeName);
            if (loginRes?.user) {
              user = loginRes.user;
            }
            if (loginRes?.accessToken) {
              activeToken = loginRes.accessToken;
              await apiClient.setToken(activeToken);
            }
          } catch {
            const meRes = await apiClient.get<{ user: UserProfile }>('/auth/me').catch(() => null);
            user = meRes?.user || null;
          }

          if (!user) {
            // No mock OAuth fallback: test backdoors must never hit production auth.
            // Without a backend-issued user the login fails loudly instead of
            // fabricating a synthetic local user.
            throw new Error('Could not sign in. Please check your connection and try again.');
          }

          if (!activeToken && user?.id) {
            // No synthetic tokens: without a backend-issued token the user stays logged out.
            console.warn('Login completed without a backend token; staying logged out.');
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

          // Real connection flags from backend (never hardcoded)
          const priv = await apiClient
            .get<{ gmailConnected?: boolean; calendarConnected?: boolean }>('/privacy/status')
            .catch(() => null);

          set({
            isAuthenticated: !!(user && activeToken),
            user: user ? { ...user, isOnboardingComplete: isComplete } : null,
            token: activeToken || null,
            isOnboardingComplete: isComplete,
            currentOnboardingStep: step,
            onboardingData: statusRes?.state?.data || {},
            gmailConnected: priv?.gmailConnected ?? false,
            calendarConnected: priv?.calendarConnected ?? false,
            isLoading: false,
          });

          // HYDRATE ALL USER DATA FROM CLOUD (Expenses, Tasks, Classes, Debts, Chat History)
          useDashboardStore.getState().syncWithBackend().catch(() => null);
        } catch (err) {
          console.warn('Google login error:', err);
          set({ isLoading: false });
        }
      },

      checkSession: async () => {
        // H5: consult SecureStore too — the in-memory token may be empty after
        // a fresh launch even though a valid token is persisted.
        const effectiveToken = (await apiClient.getEffectiveToken().catch(() => '')) || get().token;
        if (!effectiveToken) {
          // No token: already logged out, nothing to validate.
          return;
        }
        await apiClient.setToken(effectiveToken);

        try {
          // FIX (repeated-logout bug): never log out on transport failures.
          // Render free-tier cold starts / offline / 5xx used to resolve as null
          // here and nuke a perfectly valid session. Only a definitive 401
          // (AuthError — apiClient already clears auth there) means dead session.
          const res = await apiClient.get<{ user: UserProfile }>('/auth/me');
          if (!res?.user) {
            // Server answered OK but has no user for this token — session is dead.
            get().logout();
            return;
          }
          // Guard: never let dev-token mock user overwrite an actual student profile
          if (
            res.user.id === '00000000-0000-0000-0000-000000000001' &&
            get().user?.id &&
            get().user!.id !== '00000000-0000-0000-0000-000000000001'
          ) {
            console.warn('Blocked checkSession from overwriting real user with dev user');
            return;
          }

          const statusRes = await apiClient.getOnboardingStatus().catch(() => null);
          const isComplete = statusRes?.isComplete ?? res.user.isOnboardingComplete ?? false;
          // M21: same INITIAL_PROCESSING trap-guard as loginWithGoogle
          const rawStep = statusRes?.state?.currentStep;
          const step: OnboardingStep = isComplete
            ? 'COMPLETE'
            : rawStep && rawStep !== 'COMPLETE' && rawStep !== 'INITIAL_PROCESSING' && rawStep !== 'GOOGLE_AUTH'
            ? (rawStep as OnboardingStep)
            : 'GOOGLE_SERVICES';
          const priv = await apiClient
            .get<{ gmailConnected?: boolean; calendarConnected?: boolean }>('/privacy/status')
            .catch(() => null);
          set({
            isAuthenticated: true,
            user: res.user,
            token: get().token,
            isOnboardingComplete: isComplete,
            currentOnboardingStep: step,
            onboardingData: statusRes?.state?.data || {},
            gmailConnected: priv?.gmailConnected ?? false,
            calendarConnected: priv?.calendarConnected ?? false,
          });

          // Hydrate latest data on session restore
          useDashboardStore.getState().syncWithBackend().catch(() => null);
        } catch (err) {
          if (err instanceof AuthError) {
            // Definitive 401: token is dead (apiClient already cleared it).
            console.warn('Check session: unauthorized, logging out.');
            get().logout();
          } else {
            // Network timeout / cold start / server error — keep the local session.
            console.warn('Check session: server unreachable, keeping local session.', err);
          }
        }
      },

      logout: () => {
        set({
          isAuthenticated: false,
          isOnboardingComplete: false,
          user: null,
          token: null,
          currentOnboardingStep: 'GOOGLE_AUTH',
          onboardingData: {},
          gmailConnected: false,
          calendarConnected: false,
        });
        useDashboardStore.getState().reset();
        apiClient.clearToken();
        AsyncStorage.removeItem('nexa-auth-storage').catch(() => null);
        AsyncStorage.removeItem('nexa-auth-token').catch(() => null);
        AsyncStorage.removeItem('glitchers-auth-storage').catch(() => null);
        AsyncStorage.removeItem('glitchers-auth-token').catch(() => null);
      },
    }),
    {
      name: 'nexa-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
          // Token lives in SecureStore, not in the persisted slice (M23).
          loadAuthToken()
            .then((t) => {
              if (t) {
                useAuthStore.setState({ token: t });
                apiClient.setToken(t);
              }
            })
            .catch(() => null);
        }
      },
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
