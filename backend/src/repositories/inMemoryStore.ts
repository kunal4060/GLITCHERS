import { randomUUID } from 'crypto';
import type {
  UserProfile,
  ClassSession,
  Subject,
  Task,
  Exam,
  Assignment,
  Expense,
  Budget,
  Debt,
  EmailSummary,
  NotificationItem,
  QuietHours,
  OnboardingState,
  InitializationJob,
  GoogleConnection,
} from '@glitchers/shared';

class InMemoryStore {
  public profiles = new Map<string, UserProfile>();
  public subjects = new Map<string, Subject[]>();
  public classes = new Map<string, ClassSession[]>();
  public tasks = new Map<string, Task[]>();
  public exams = new Map<string, Exam[]>();
  public assignments = new Map<string, Assignment[]>();
  public expenses = new Map<string, Expense[]>();
  public budgets = new Map<string, Budget>();
  public debts = new Map<string, Debt[]>();
  public emails = new Map<string, EmailSummary[]>();
  public notifications = new Map<string, NotificationItem[]>();
  public preferences = new Map<string, { quietHours: QuietHours; universityDomain: string }>();
  public onboardingStates = new Map<string, OnboardingState>();
  public initializationJobs = new Map<string, InitializationJob>();
  public googleConnections = new Map<string, GoogleConnection>();

  constructor() {
    this.seedDefaultStudent();
  }

  public seedDefaultStudent(userId: string = '00000000-0000-0000-0000-000000000001') {
    if (this.profiles.has(userId)) return;

    this.profiles.set(userId, {
      id: userId,
      email: 'kunalugale4060@gmail.com',
      fullName: 'Kunal Ugale',
      university: 'State Technological University',
      course: 'Computer Science & Engineering',
      year: 3,
      semester: 6,
      section: 'A',
      cgpa: '8.71',
      creditsCompleted: 42,
      creditsCurrent: 18,
      universityDomain: 'university.edu',
      isOnboardingComplete: false,
      createdAt: new Date().toISOString(),
    });

    this.onboardingStates.set(userId, {
      userId,
      currentStep: 'GOOGLE_SERVICES',
      completedSteps: ['GOOGLE_AUTH'],
      isComplete: false,
      data: {},
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    this.classes.set(userId, [
      {
        id: randomUUID(),
        userId,
        subjectName: 'Database Management Systems (DBMS)',
        day: 'MONDAY',
        startTime: '10:00',
        endTime: '11:00',
        room: 'AB1-204',
        faculty: 'Dr. Sharma',
        classType: 'LECTURE',
        isCancelled: false,
      },
      {
        id: randomUUID(),
        userId,
        subjectName: 'Operating Systems Lab',
        day: 'MONDAY',
        startTime: '14:00',
        endTime: '16:00',
        room: 'AB2-301',
        faculty: 'Prof. Verma',
        classType: 'LAB',
        isCancelled: false,
      },
      {
        id: randomUUID(),
        userId,
        subjectName: 'Artificial Intelligence',
        day: 'TUESDAY',
        startTime: '11:00',
        endTime: '12:00',
        room: 'AB3-105',
        faculty: 'Dr. Iyer',
        classType: 'LECTURE',
        isCancelled: false,
      },
    ]);

    this.tasks.set(userId, [
      {
        id: randomUUID(),
        userId,
        title: 'Complete AI Assignment 2',
        description: 'Implement A* search algorithm in Python',
        priority: 'EXTREMELY_IMPORTANT',
        status: 'TODO',
        dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
        relatedSubject: 'Artificial Intelligence',
        createdAt: new Date().toISOString(),
      },
      {
        id: randomUUID(),
        userId,
        title: 'Submit DBMS Lab Report',
        description: 'Normalization and BCNF queries report',
        priority: 'HIGH',
        status: 'TODO',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        relatedSubject: 'DBMS',
        createdAt: new Date().toISOString(),
      },
    ]);

    this.expenses.set(userId, [
      {
        id: randomUUID(),
        userId,
        amount: 180,
        category: 'FOOD',
        merchant: "Domino's Pizza",
        description: 'Dinner with friends',
        date: new Date().toISOString(),
        type: 'EXPENSE',
      },
      {
        id: randomUUID(),
        userId,
        amount: 80,
        category: 'TRANSPORT',
        merchant: 'Auto Rickshaw',
        description: 'Campus commute',
        date: new Date().toISOString(),
        type: 'EXPENSE',
      },
      {
        id: randomUUID(),
        userId,
        amount: 450,
        category: 'EDUCATION',
        merchant: 'University Bookstore',
        description: 'Calculus textbook',
        date: new Date(Date.now() - 86400000).toISOString(),
        type: 'EXPENSE',
      },
    ]);

    this.budgets.set(userId, {
      id: randomUUID(),
      userId,
      monthlyLimit: 10000,
      currentSpending: 710,
      month: new Date().toISOString().slice(0, 7),
      categoryLimits: {
        FOOD: 3500,
        TRANSPORT: 1500,
        EDUCATION: 2000,
        ENTERTAINMENT: 1500,
        OTHER: 1500,
      },
      alertThresholds: [75, 90, 100],
    });

    this.debts.set(userId, [
      {
        id: randomUUID(),
        userId,
        person: 'Rahul',
        type: 'OWES_ME',
        amount: 500,
        status: 'PENDING',
        paidAmount: 0,
        notes: 'Lunch split at canteen',
        createdAt: new Date().toISOString(),
      },
      {
        id: randomUUID(),
        userId,
        person: 'Aman',
        type: 'I_OWE',
        amount: 200,
        status: 'PENDING',
        paidAmount: 0,
        notes: 'Stationery purchase',
        createdAt: new Date().toISOString(),
      },
    ]);

    this.emails.set(userId, [
      {
        id: randomUUID(),
        userId,
        providerMessageId: 'msg_001',
        sender: 'examcell@university.edu',
        subject: 'Midterm Examination Schedule Announcement',
        receivedAt: new Date().toISOString(),
        isUniversityRelated: true,
        importance: 'HIGH',
        summary: 'Midterm examinations will commence next Monday. Check room allocations.',
        actionRequired: true,
        actionItem: 'Review exam dates and room numbers',
        extractedDeadline: new Date(Date.now() + 7 * 86400000).toISOString(),
        isProcessed: true,
      },
    ]);

    this.notifications.set(userId, [
      {
        id: randomUUID(),
        userId,
        title: 'DBMS starts in 15 minutes',
        message: 'Room AB1-204 with Dr. Sharma.',
        type: 'CLASS_REMINDER',
        priority: 'NORMAL',
        read: false,
        scheduledFor: new Date().toISOString(),
        sentAt: new Date().toISOString(),
      },
    ]);

    this.preferences.set(userId, {
      quietHours: {
        enabled: true,
        startTime: '23:00',
        endTime: '07:00',
        criticalBypass: true,
      },
      universityDomain: 'university.edu',
    });
  }

  public ensureStudentData(userId: string) {
    if (!this.emails.has(userId) || this.emails.get(userId)!.length === 0) {
      const profile = this.profiles.get(userId);
      const domain = profile?.universityDomain || (profile?.email?.includes('@') ? profile.email.split('@')[1] : 'university.edu');
      this.emails.set(userId, [
        {
          id: randomUUID(),
          userId,
          providerMessageId: 'msg_001',
          sender: `examcell@${domain}`,
          subject: '🔴 Midterm Examination Schedule Announcement & Hall Tickets',
          receivedAt: new Date(Date.now() - 3600000).toISOString(),
          isUniversityRelated: true,
          importance: 'CRITICAL',
          summary: 'Midterm examinations will commence next Monday. Download hall tickets and verify room allocations by Friday 5 PM.',
          actionRequired: true,
          actionItem: 'Review exam dates and room numbers on portal',
          extractedDeadline: new Date(Date.now() + 3 * 86400000).toISOString(),
          isProcessed: true,
        },
        {
          id: randomUUID(),
          userId,
          providerMessageId: 'msg_002',
          sender: `dean.academics@${domain}`,
          subject: '⚠️ Semester Course Registration & Elective Confirmation Deadline',
          receivedAt: new Date(Date.now() - 14400000).toISOString(),
          isUniversityRelated: true,
          importance: 'HIGH',
          summary: 'Elective course add/drop portal closes tomorrow midnight. Ensure min 18 credits are locked in.',
          actionRequired: true,
          actionItem: 'Lock in 18 semester credits before tomorrow midnight',
          extractedDeadline: new Date(Date.now() + 86400000).toISOString(),
          isProcessed: true,
        },
        {
          id: randomUUID(),
          userId,
          providerMessageId: 'msg_003',
          sender: `cse.hod@${domain}`,
          subject: 'Lab Session Rescheduling: DBMS Practical Batch A',
          receivedAt: new Date(Date.now() - 86400000).toISOString(),
          isUniversityRelated: true,
          importance: 'NORMAL',
          summary: 'DBMS practical laboratory on Friday is shifted to Software Lab 3 (AB2-301) due to server maintenance.',
          actionRequired: false,
          actionItem: 'Attend Friday DBMS lab in AB2-301',
          isProcessed: true,
        },
        {
          id: randomUUID(),
          userId,
          providerMessageId: 'msg_004',
          sender: `library@${domain}`,
          subject: 'Digital Library & IEEE Xplore Access Renewal',
          receivedAt: new Date(Date.now() - 172800000).toISOString(),
          isUniversityRelated: true,
          importance: 'LOW',
          summary: 'Annual campus license for IEEE Xplore, ACM Digital Library, and Springer has been renewed for the current academic session.',
          actionRequired: false,
          isProcessed: true,
        },
      ]);
    }

    if (!this.googleConnections.has(userId)) {
      const profile = this.profiles.get(userId);
      this.googleConnections.set(userId, {
        id: randomUUID(),
        userId,
        email: profile?.email || 'kunalugale4060@gmail.com',
        gmailConnected: true,
        calendarConnected: true,
        scopes: ['userinfo.email', 'userinfo.profile', 'openid', 'gmail.readonly'],
      });
    }
  }
}

export const inMemoryStore = new InMemoryStore();
