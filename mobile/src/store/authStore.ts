import { create } from 'zustand';
import type { UserProfile } from '@glitchers/shared';

interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  gmailConnected: boolean;
  calendarConnected: boolean;
  setUser: (user: UserProfile | null) => void;
  setAuthenticated: (status: boolean) => void;
  setGoogleConnections: (gmail: boolean, calendar: boolean) => void;
  setAvatarUrl: (avatarUrl: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: true, // Auto-login default for instant local preview
  user: {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'kunal@university.edu',
    fullName: 'Kunal Ugale',
    university: 'State Technological University',
    course: 'Computer Science & Engineering',
    year: 3,
    semester: 6,
    section: 'A',
    avatarUrl: null,
  },
  gmailConnected: true,
  calendarConnected: true,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setGoogleConnections: (gmailConnected, calendarConnected) => set({ gmailConnected, calendarConnected }),
  setAvatarUrl: (avatarUrl) =>
    set((s) => ({
      user: s.user ? { ...s.user, avatarUrl } : null,
    })),
  logout: () => set({ isAuthenticated: false, user: null }),
}));
