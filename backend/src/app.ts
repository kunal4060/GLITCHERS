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

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: false,
  });

  // CORS
  app.register(cors, {
    origin: true,
    credentials: true,
  });

  // Rate Limiting (Abuse Prevention)
  app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
  });

  // Health check
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'GLITCHERS Fastify Backend',
  }));

  // Register All Modular Routes
  app.register(authRoutes, { prefix: '/api/auth' });
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

  // Error Handler
  app.setErrorHandler((error: any, request, reply) => {
    reply.status(error.statusCode || 500).send({
      error: error.name || 'InternalServerError',
      message: error.message || 'An unexpected error occurred',
    });
  });

  return app;
}
