import { app } from './app';
import { disconnectDatabase } from './config/database';
import { env } from './config/env';

const server = app.listen(env.PORT, () => {
  console.info(`Intervue backend listening on port ${env.PORT}`);
});

async function shutdown(signal: string): Promise<void> {
  console.info(`${signal} received, shutting down`);
  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
