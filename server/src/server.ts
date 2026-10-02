import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';

async function main() {
  // Test database connection
  await prisma.$connect();
  console.log('✅ Database connected');

  const server = app.listen(env.port, () => {
    console.log(`🚀 CMS Server running on http://localhost:${env.port}`);
    console.log(`📊 Environment: ${env.nodeEnv}`);
    console.log(`🤖 ML Service: ${env.mlServiceUrl}`);
  });

  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down...');
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
