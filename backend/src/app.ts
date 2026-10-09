import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';

import { authRoutes } from './routes/auth.js';
import { timetableRoutes } from './routes/timetable.js';
import { taskRoutes } from './routes/tasks.js';
import { expenseRoutes } from './routes/expenses.js';
import { budgetRoutes } from './routes/budgets.js';
import { debtRoutes } from './routes/debts.js';
import { calendarRoutes } from './routes/calendar.js';
import { emailRoutes } from './routes/emails.js';
import { notificationRoutes } from './routes/notifications.js';
import { chatbotRoutes } from './routes/chatbot.js';
import { searchRoutes } from './routes/search.js';
import { syncRoutes } from './routes/sync.js';
import { privacyRoutes } from './routes/privacy.js';
import { examRoutes } from './routes/exams.js';
import { assignmentRoutes } from './routes/assignments.js';
import { documentRoutes } from './routes/documents.js';
import { settingsRoutes } from './routes/settings.js';
import { attendanceRoutes } from './routes/attendance.js';
import { healthRoutes } from './routes/health.js';
import { publicRoutes } from './routes/public.js';
import { onboardingRoutes } from './routes/onboarding.js';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: false,
    bodyLimit: 50 * 1024 * 1024, // 50MB to support high-resolution base64 timetable images/documents
  });

  // CORS — restrict to known app origins (open CORS + credentials = any site can call the API)
  // SECURITY: exact origin match — prefix matching would allow
  // https://kunal4060.github.io.evil.com to pass as https://kunal4060.github.io
  const ALLOWED_ORIGINS = new Set([
    'http://localhost:8082',
    'http://localhost:19006',
    'http://localhost:5000',
    'https://kunal4060.github.io',
  ]);
  app.register(cors, {
    origin: (origin, cb) => {
      if (!origin || ALLOWED_ORIGINS.has(origin)) {
        cb(null, true);
      } else {
        cb(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
  });

  // Rate Limiting (Abuse Prevention)
  app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
  });

  // Health & Diagnostic check
  app.register(healthRoutes);

  // Public homepage + privacy policy (no auth) — required for Google OAuth publishing
  app.register(publicRoutes);

  // Register All Modular Routes
  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(onboardingRoutes, { prefix: '/api/onboarding' });
  app.register(timetableRoutes, { prefix: '/api/timetable' });
  app.register(taskRoutes, { prefix: '/api/tasks' });
  app.register(expenseRoutes, { prefix: '/api/expenses' });
  app.register(budgetRoutes, { prefix: '/api/budgets' });
  app.register(debtRoutes, { prefix: '/api/debts' });
  app.register(calendarRoutes, { prefix: '/api/calendar' });
  app.register(emailRoutes, { prefix: '/api/emails' });
  app.register(notificationRoutes, { prefix: '/api/notifications' });
  app.register(chatbotRoutes, { prefix: '/api/ai' });
  app.register(searchRoutes, { prefix: '/api/search' });
  app.register(syncRoutes, { prefix: '/api/sync' });
  app.register(privacyRoutes, { prefix: '/api/privacy' });
  app.register(examRoutes, { prefix: '/api/exams' });
  app.register(assignmentRoutes, { prefix: '/api/assignments' });
  app.register(documentRoutes, { prefix: '/api/documents' });
  app.register(settingsRoutes, { prefix: '/api/settings' });
  app.register(attendanceRoutes, { prefix: '/api/attendance' });

  // Error Handler
  // SECURITY: never leak internal error details (DB errors, paths, stack
  // fragments) to clients on 5xx — log server-side, send a generic message.
  app.setErrorHandler((error: any, request, reply) => {
    const statusCode = error.statusCode || 500;
    if (statusCode >= 500) {
      request.log?.error?.(error);
      reply.status(statusCode).send({
        error: 'InternalServerError',
        message: 'An unexpected error occurred',
      });
      return;
    }
    reply.status(statusCode).send({
      error: error.name || 'BadRequest',
      message: error.message || 'Bad request',
    });
  });

  return app;
}
