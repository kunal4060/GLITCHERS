import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';

describe('Onboarding & First-Time Student Experience API', () => {
  let app: FastifyInstance;
  const authHeaders = {
    authorization: 'Bearer dev-token',
  };

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  test('GET /api/onboarding/status returns onboarding state', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/onboarding/status',
      headers: authHeaders,
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.body);
    expect(json.state).toBeDefined();
    expect(json.state.currentStep).toBeDefined();
  });

  test('PATCH /api/onboarding/step saves profile step and updates state incrementally', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/onboarding/step',
      headers: authHeaders,
      payload: {
        step: 'PROFILE',
        data: {
          fullName: 'Kunal Ugale',
          university: 'State Technological University',
          course: 'B.Tech Computer Science',
          year: 3,
          semester: 6,
          section: 'B',
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.body);
    expect(json.success).toBe(true);
    expect(json.state.currentStep).toBe('PROFILE');
    expect(json.state.completedSteps).toContain('PROFILE');
    expect(json.state.data.course).toBe('B.Tech Computer Science');
  });

  test('PATCH /api/onboarding/step validates CGPA within range 0.00 - 10.00', async () => {
    const invalidRes = await app.inject({
      method: 'PATCH',
      url: '/api/onboarding/step',
      headers: authHeaders,
      payload: {
        step: 'ACADEMICS',
        data: {
          cgpa: '14.5',
        },
      },
    });

    expect(invalidRes.statusCode).toBe(400);

    const validRes = await app.inject({
      method: 'PATCH',
      url: '/api/onboarding/step',
      headers: authHeaders,
      payload: {
        step: 'ACADEMICS',
        data: {
          cgpa: '8.75',
          creditsCompleted: 45,
          creditsCurrent: 18,
        },
      },
    });

    expect(validRes.statusCode).toBe(200);
    const validJson = JSON.parse(validRes.body);
    expect(validJson.state.data.cgpa).toBe('8.75');
  });

  test('POST /api/onboarding/initialize runs idempotent initialization pipeline', async () => {
    const payload = {
      profile: {
        fullName: 'Kunal Ugale',
        university: 'State Technological University',
        course: 'Computer Science',
        year: 3,
        semester: 6,
        cgpa: '8.75',
        universityDomain: 'university.edu',
      },
      classes: [
        {
          subjectName: 'Artificial Intelligence',
          day: 'MONDAY',
          startTime: '09:00',
          endTime: '10:00',
          room: 'AB3-105',
          faculty: 'Dr. Iyer',
          classType: 'LECTURE',
        },
        {
          subjectName: 'Database Management Systems',
          day: 'MONDAY',
          startTime: '10:00',
          endTime: '11:00',
          room: 'AB1-204',
          faculty: 'Dr. Sharma',
          classType: 'LECTURE',
        },
      ],
      notificationSettings: {
        classReminderMinutes: 10,
        quietHoursEnabled: true,
        quietHoursStart: '23:00',
        quietHoursEnd: '07:00',
      },
      financeSettings: {
        startingBalance: 8500,
        monthlyBudget: 10000,
      },
    };

    // First run
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/onboarding/initialize',
      headers: authHeaders,
      payload,
    });

    expect(res1.statusCode).toBe(200);
    const json1 = JSON.parse(res1.body);
    expect(json1.success).toBe(true);
    expect(json1.isComplete).toBe(true);
    expect(json1.job.status).toBe('COMPLETED');
    expect(json1.job.stepStatuses.timetable.status).toBe('COMPLETED');

    // IDEMPOTENCY CHECK: Run initialization a second time
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/onboarding/initialize',
      headers: authHeaders,
      payload,
    });

    expect(res2.statusCode).toBe(200);
    const json2 = JSON.parse(res2.body);
    expect(json2.success).toBe(true);

    // Verify classes were not duplicated
    const classesRes = await app.inject({
      method: 'GET',
      url: '/api/timetable/classes',
      headers: authHeaders,
    });
    const classesJson = JSON.parse(classesRes.body);
    const aiClasses = classesJson.classes.filter(
      (c: any) => c.subjectName.toLowerCase().includes('artificial intelligence') && c.day === 'MONDAY' && c.startTime === '09:00'
    );
    expect(aiClasses.length).toBe(1); // Exact 1 copy, not 2
  });

  test('POST /api/timetable/analyze-image extracts structured timetable with conflict detection', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/timetable/analyze-image',
      headers: authHeaders,
      payload: {
        imageBase64: 'mock_base64_timetable_image_string',
        mimeType: 'image/jpeg',
      },
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.body);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.classes)).toBe(true);
    expect(json.classes.length).toBeGreaterThan(0);
    expect(json.classes[0].subjectName).toBeDefined();
    expect(json.classes[0].day).toBeDefined();
    expect(json.classes[0].startTime).toBeDefined();
  });

  test('Security: Rejects requests with invalid or expired authentication token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/onboarding/status',
      headers: {
        authorization: 'Bearer invalid',
      },
    });

    expect(res.statusCode).toBe(401);
  });
});
