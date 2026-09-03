import { Platform } from 'react-native';
import type { AIChatResponse } from '@glitchers/shared';

const DEFAULT_HOST = Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api';

class ApiClient {
  private baseUrl: string = DEFAULT_HOST;
  private token: string = 'dev-token';

  public setBaseUrl(url: string) {
    this.baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setToken(token: string) {
    this.token = token;
  }

  public async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`,
      ...(options.headers || {}),
    };

    try {
      const res = await fetch(url, { ...options, headers });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `API error: ${res.status}`);
      }
      return (await res.json()) as T;
    } catch (err: any) {
      console.warn(`API call failed for ${endpoint}:`, err.message);
      throw err;
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
  public async fetchTimetableClasses() {
    return this.get<{ classes: any[] }>('/timetable/classes');
  }

  public async fetchTasks() {
    return this.get<{ tasks: any[] }>('/tasks');
  }

  public async createTask(task: { title: string; priority?: string; dueDate?: string | null; description?: string | null }) {
    return this.post<{ task: any }>('/tasks', task);
  }

  public async createTaskFromText(text: string) {
    return this.post<{ task: any }>('/tasks', { text });
  }

  public async fetchExpenses() {
    return this.get<{ expenses: any[]; totalSpent: number }>('/expenses');
  }

  public async createExpense(expense: { amount: number; category?: string; description?: string }) {
    return this.post<{ expense: any }>('/expenses', expense);
  }

  public async createExpenseFromText(text: string) {
    return this.post<{ expense: any }>('/expenses', { text });
  }

  public async fetchBudget() {
    return this.get<{ configured: boolean; status: any; budget: any }>('/budgets/current');
  }

  public async fetchDebts() {
    return this.get<{ debts: any[]; summary: any }>('/debts');
  }

  public async splitBill(data: { totalAmount: number; description: string; numberOfPeople: number; friends: string[] }) {
    return this.post<any>('/debts/split', data);
  }

  public async fetchEmails() {
    return this.get<{ emails: any[] }>('/emails');
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

  public async syncBatch(operations: any[]) {
    return this.post<any>('/sync/batch', { operations });
  }
}

export const apiClient = new ApiClient();
