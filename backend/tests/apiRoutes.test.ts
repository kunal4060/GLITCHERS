import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';

describe('Fastify Modular API Routes Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  test('GET /health returns 200 OK', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
  });

  test('GET /api/timetable/classes returns classes', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/timetable/classes',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(Array.isArray(body.classes)).toBe(true);
    expect(body.classes.length).toBeGreaterThan(0);
  });

  test('POST /api/tasks creates a task from natural text', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      payload: {
        text: 'Finish Machine Learning assignment by Friday, high priority',
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.task.title).toContain('Machine Learning');
    expect(body.task.priority).toBe('HIGH');
  });

  test('POST /api/expenses records an expense from natural language', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/expenses',
      payload: {
        text: 'Spent 250 on pizza for dinner',
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.expense.amount).toBe(250);
    expect(body.expense.category).toBe('FOOD');
  });

  test('GET /api/budgets/current returns budget status and threshold calculations', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/budgets/current',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.configured).toBe(true);
    expect(body.status.monthlyLimit).toBeGreaterThan(0);
  });

  test('POST /api/debts/split splits group expenses accurately', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/debts/split',
      payload: {
        totalAmount: 900,
        description: 'Hostel dinner party',
        numberOfPeople: 3,
        friends: ['Aman', 'Saurabh'],
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.sharePerPerson).toBe(300);
    expect(body.createdDebts.length).toBe(2);
  });

  test('POST /api/ai/chat processes student query with tool call', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/chat',
      payload: {
        message: 'What classes do I have today?',
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.intent).toBe('GET_SCHEDULE');
    expect(body.message).toBeDefined();
  });

  test('GET /api/search returns cross-entity results', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/search?q=DBMS',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(Array.isArray(body.results)).toBe(true);
    expect(body.results.length).toBeGreaterThan(0);
  });

  test('GET and POST /api/exams manages student exam schedule', async () => {
    const postRes = await app.inject({
      method: 'POST',
      url: '/api/exams',
      payload: {
        subject: 'Artificial Intelligence',
        date: '2026-09-22',
        time: '14:00',
        room: 'Hall 4',
        syllabus: 'Search algorithms, Knowledge Representation, ML foundations',
        importance: 'CRITICAL',
      },
    });
    expect(postRes.statusCode).toBe(200);
    const postBody = JSON.parse(postRes.body);
    expect(postBody.exam.subject).toBe('Artificial Intelligence');

    const getRes = await app.inject({
      method: 'GET',
      url: '/api/exams',
    });
    expect(getRes.statusCode).toBe(200);
    const getBody = JSON.parse(getRes.body);
    expect(getBody.exams.length).toBeGreaterThanOrEqual(1);
  });

  test('GET and POST /api/assignments tracks deadlines and submission platform', async () => {
    const postRes = await app.inject({
      method: 'POST',
      url: '/api/assignments',
      payload: {
        title: 'Compiler Design Syntax Tree Lab',
        subject: 'Compiler Design',
        deadline: new Date(Date.now() + 86400000 * 4).toISOString(),
        submissionPlatform: 'Canvas LMS',
        priority: 'HIGH',
      },
    });
    expect(postRes.statusCode).toBe(200);
    const postBody = JSON.parse(postRes.body);
    expect(postBody.assignment.submissionPlatform).toBe('Canvas LMS');

    const getRes = await app.inject({
      method: 'GET',
      url: '/api/assignments',
    });
    expect(getRes.statusCode).toBe(200);
    const getBody = JSON.parse(getRes.body);
    expect(getBody.assignments.length).toBeGreaterThanOrEqual(1);
  });

  test('GET and POST /api/documents manages academic circulars and syllabus', async () => {
    const uploadRes = await app.inject({
      method: 'POST',
      url: '/api/documents/upload',
      payload: {
        title: 'End-Term Practical Exam Schedule.pdf',
        type: 'PDF',
      },
    });
    expect(uploadRes.statusCode).toBe(200);
    const uploadBody = JSON.parse(uploadRes.body);
    expect(uploadBody.document.title).toContain('End-Term');

    const getRes = await app.inject({
      method: 'GET',
      url: '/api/documents',
    });
    expect(getRes.statusCode).toBe(200);
    const getBody = JSON.parse(getRes.body);
    expect(getBody.documents.length).toBeGreaterThanOrEqual(1);
  });

  test('GET and PATCH /api/settings manages student preferences and quiet hours', async () => {
    const patchRes = await app.inject({
      method: 'PATCH',
      url: '/api/settings',
      payload: {
        universityDomain: 'iit.edu',
        quietHours: { startTime: '23:30', endTime: '06:30' },
      },
    });
    expect(patchRes.statusCode).toBe(200);

    const getRes = await app.inject({
      method: 'GET',
      url: '/api/settings',
    });
    expect(getRes.statusCode).toBe(200);
    const getBody = JSON.parse(getRes.body);
    expect(getBody.preferences.universityDomain).toBe('iit.edu');
    expect(getBody.preferences.quietHours.startTime).toBe('23:30');
  });
});
