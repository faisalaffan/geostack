import { buildApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();

async function main() {
  const app = await buildApp(config);

  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    app.log.info(`Server running on port ${config.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
