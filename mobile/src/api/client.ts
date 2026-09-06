import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AIChatResponse } from '@glitchers/shared';

const PROD_HOST = 'https://glitchers-backend.onrender.com/api';
const LOCAL_DEV_HOST = Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api';

function resolveDefaultHost(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
  }
  if (__DEV__) {
    return LOCAL_DEV_HOST;
  }
  return PROD_HOST;
}

const DEFAULT_HOST = resolveDefaultHost();

class ApiClient {
  private baseUrl: string = DEFAULT_HOST;
  private token: string = '';

  constructor() {
    this.initializeToken().catch(() => null);
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setToken(token: string) {
    this.token = token;
    if (token) {
      AsyncStorage.setItem('glitchers-auth-token', token).catch(() => null);
    }
  }

  public getToken(): string {
    return this.token;
  }

  public clearToken() {
    this.token = '';
    AsyncStorage.removeItem('glitchers-auth-token').catch(() => null);
  }

  public async getEffectiveToken(): Promise<string> {
    if (this.token && this.token.trim() && this.token !== 'dev-token') {
      return this.token.trim();
    }

    // 1. Try reading from active authStore in memory
    try {
      const { useAuthStore } = require('../store/authStore');
      const authState = useAuthStore?.getState?.();
      if (authState?.token && authState.token !== 'dev-token') {
        this.token = authState.token;
        return this.token;
      }
      if (authState?.user?.id && authState.user.id !== '00000000-0000-0000-0000-000000000001') {
        this.token = `jwt_${authState.user.id}`;
        return this.token;
      }
    } catch {
      // ignore
    }

    // 2. Try reading from dedicated token storage
    try {
      const stored = await AsyncStorage.getItem('glitchers-auth-token');
      if (stored && stored.trim() && stored !== 'dev-token') {
        this.token = stored.trim();
        return this.token;
      }
    } catch {
      // ignore
    }

    // 3. Try reading from persisted authStore storage in AsyncStorage
    try {
      const rawAuth = await AsyncStorage.getItem('glitchers-auth-storage');
      if (rawAuth) {
        const parsed = JSON.parse(rawAuth);
        const storedToken = parsed?.state?.token;
        const storedUserId = parsed?.state?.user?.id;
        if (storedToken && storedToken !== 'dev-token') {
          this.token = storedToken;
          return this.token;
        }
        if (storedUserId && storedUserId !== '00000000-0000-0000-0000-000000000001') {
          this.token = `jwt_${storedUserId}`;
          return this.token;
        }
      }
    } catch {
      // ignore
    }

    // Fallback for local development only if no real session exists
    if (__DEV__) {
      return 'dev-token';
    }

    return '';
  }

  public async initializeToken(): Promise<string> {
    return await this.getEffectiveToken();
  }

  public async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const activeToken = await this.getEffectiveToken();
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
      ...((options.headers as Record<string, string>) || {}),
    };

    const isAiVision = endpoint.includes('analyze-image') || endpoint.includes('scan-bill') || endpoint.includes('/ai/') || endpoint.includes('summarize');
    const timeoutMs = isAiVision ? 90000 : 45000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { ...options, headers, signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `API error: ${res.status}`);
      }
      return (await res.json()) as T;
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isAbort = err?.name === 'AbortError' || (err?.message && err.message.toLowerCase().includes('abort'));
      const friendlyErr = isAbort
        ? new Error('Request timed out while contacting server. Please try again.')
        : err;
      console.warn(`API call failed for ${endpoint}:`, friendlyErr.message);
      throw friendlyErr;
    }
  }

  // Generic methods
  public get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  public post<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
  }

  public patch<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
  }

  public delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Domain-specific typed API methods
  public async login(email: string, name?: string) {
    const res = await this.post<{ accessToken: string; user: any }>('/auth/login', { email, name });
    if (res?.accessToken) {
      this.setToken(res.accessToken);
    }
    return res;
  }

  public async getProfile() {
    return this.get<{ user: any }>('/auth/me');
  }

  public async fetchTimetableClasses() {
    return this.get<{ classes: any[] }>('/timetable/classes');
  }

  public async deleteClass(classId: string) {
    return this.delete<{ success: boolean; id: string }>(`/timetable/classes/${classId}`);
  }

  public async fetchTasks() {
    return this.get<{ tasks: any[] }>('/tasks');
  }

  public async createTask(task: { title: string; priority?: string; dueDate?: string | null; description?: string | null }) {
    return this.post<{ task: any }>('/tasks', task);
  }

  public async updateTask(taskId: string, updates: any) {
    return this.patch<{ task: any }>(`/tasks/${taskId}`, updates);
  }

  public async deleteTask(taskId: string) {
    return this.delete<{ success: boolean }>(`/tasks/${taskId}`);
  }

  public async createTaskFromText(text: string) {
    return this.post<{ task: any }>('/tasks', { text });
  }

  public async fetchExpenses() {
    return this.get<{ expenses: any[]; totalSpent: number }>('/expenses');
  }

  public async createExpense(expense: { amount: number; category?: string; description?: string; merchant?: string }) {
    return this.post<{ expense: any }>('/expenses', expense);
  }

  public async deleteExpense(expenseId: string) {
    return this.delete<{ success: boolean }>(`/expenses/${expenseId}`);
  }

  public async createExpenseFromText(text: string) {
    return this.post<{ expense: any }>('/expenses', { text });
  }

  public async fetchBudget() {
    return this.get<{ configured: boolean; status: any; budget: any }>('/budgets/current');
  }

  public async fetchDebts() {
    return this.get<{ debts: any[]; totals?: any; summary?: any }>('/debts');
  }

  public async createDebt(debt: { person: string; amount: number; type?: string; notes?: string }) {
    return this.post<{ debt: any }>('/debts', debt);
  }

  public async payDebt(debtId: string, paidAmount?: number) {
    return this.patch<{ debt: any }>(`/debts/${debtId}/pay`, { paidAmount });
  }

  public async splitBill(data: { totalAmount: number; description: string; numberOfPeople: number; friends: string[] }) {
    return this.post<any>('/debts/split', data);
  }

  public async fetchEmails() {
    return this.get<{ emails: any[] }>('/emails');
  }

  public async dismissEmailNotice(id: string) {
    return this.patch<{ success: boolean }>(`/emails/${id}/dismiss`, { dismissed: true });
  }

  public async restoreEmailNotice(id: string) {
    return this.patch<{ success: boolean }>(`/emails/${id}/dismiss`, { dismissed: false });
  }

  public async summarizeEmails(emails?: any[]) {
    return this.post<{ bullets: string[]; summary: string; count: number }>('/emails/summarize', { emails });
  }

  public async syncEmails() {
    return this.post<any>('/emails/sync');
  }

  public async sendAIChat(message: string, conversationId?: string) {
    return this.post<AIChatResponse>('/ai/chat', {
      message,
      conversationId,
    });
  }

  public async getChatHistory() {
    return this.get<{ messages: Array<{ id: string; sender: 'user' | 'assistant'; text: string; actionCard?: any; timestamp: string }> }>('/ai/history');
  }

  public async clearChatHistory() {
    return this.delete<{ success: boolean }>('/ai/history');
  }

  public async fetchExams() {
    return this.get<{ exams: any[] }>('/exams');
  }

  public async fetchAssignments() {
    return this.get<{ assignments: any[] }>('/assignments');
  }

  public async fetchDocuments() {
    return this.get<{ documents: any[] }>('/documents');
  }

  public async fetchSettings() {
    return this.get<any>('/settings');
  }

  public async updateSettings(data: any) {
    return this.patch<any>('/settings', data);
  }

  public async scanBill(imageBase64: string, mimeType: string = 'image/jpeg') {
    return this.post<{
      success: boolean;
      expense: any;
      parsed: {
        merchant: string;
        items: Array<{ name: string; price: number; quantity?: number }>;
        total: number;
        category: string;
        summary: string;
      };
    }>('/expenses/scan-bill', {
      imageBase64,
      mimeType,
    });
  }

  public async analyzeImage(imageBase64: string, mimeType: string = 'image/jpeg', prompt?: string) {
    return this.post<{
      message: string;
      isBill: boolean;
      expense?: any;
      billData?: any;
    }>('/ai/analyze-image', {
      imageBase64,
      mimeType,
      message: prompt,
    });
  }

  public async syncBatch(operations: any[]) {
    return this.post<any>('/sync/batch', { operations });
  }

  // Onboarding & Identity methods
  public async getOnboardingStatus() {
    return this.get<{ state: any; profile: any; isComplete: boolean }>('/onboarding/status');
  }

  public async saveOnboardingStep(step: string, data?: Record<string, any>, isComplete?: boolean) {
    return this.patch<{ success: boolean; state: any }>('/onboarding/step', {
      step,
      data,
      isComplete,
    });
  }

  public async initializeWorkspace(payload: any) {
    return this.post<{
      success: boolean;
      jobId: string;
      status: string;
      job: any;
      isComplete: boolean;
    }>('/onboarding/initialize', payload);
  }

  public async getJobStatus(jobId: string) {
    return this.get<{ job: any }>(`/onboarding/jobs/${jobId}`);
  }

  public async updateGoogleServices(data: { gmailConnected?: boolean; calendarConnected?: boolean; universityDomain?: string }) {
    return this.post<{ success: boolean; connection: any }>('/auth/google/services', data);
  }

  public async analyzeTimetableImage(imageBase64: string, mimeType: string = 'image/jpeg') {
    return this.post<{ success: boolean; classes: any[]; conflicts: any[] }>('/timetable/analyze-image', {
      imageBase64,
      mimeType,
    });
  }

  public async saveTimetableClasses(classes: any[]) {
    return this.post<{ success: boolean; savedCount: number; classes: any[]; conflicts: any[] }>('/timetable/classes/bulk', {
      classes,
    });
  }
}

export const apiClient = new ApiClient();
