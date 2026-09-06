import { createServer } from './app.js';
import { config } from './config.js';
import { log } from './logger.js';

const server = createServer();
server.listen(config.port, () => log('log', 'server_started', { port: config.port }));

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    log('error', 'server_start_failed', {
      port: config.port,
      reason: `Port ${config.port} is already in use. Stop the existing server or choose another PORT.`,
    });
  } else {
    log('error', 'server_start_failed', { reason: error.message });
  }
  process.exitCode = 1;
});

function shutdown(signal) {
  log('log', 'server_stopping', { signal });
  server.close(() => process.exit(0));
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
