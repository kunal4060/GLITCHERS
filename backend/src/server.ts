import { buildApp } from './app.js';
import { env } from './config/env.js';

const app = buildApp();

async function start() {
  try {
    const address = await app.listen({ port: env.PORT, host: env.HOST });
    console.log(`GLITCHERS Backend running at ${address}`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
