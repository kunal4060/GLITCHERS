import { z } from 'zod';

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string().min(1),
  avatarUrl: z.string().url().nullable().optional(),
  university: z.string().nullable().optional(),
  course: z.string().nullable().optional(),
  year: z.number().int().min(1).max(6).nullable().optional(),
  semester: z.number().int().min(1).max(12).nullable().optional(),
  section: z.string().nullable().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

export const GoogleConnectionSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  email: z.string().email(),
  gmailConnected: z.boolean().default(false),
  calendarConnected: z.boolean().default(false),
  scopes: z.array(z.string()).default([]),
  expiresAt: z.string().datetime().nullable().optional(),
});

export type GoogleConnection = z.infer<typeof GoogleConnectionSchema>;

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  user: UserProfile;
}
