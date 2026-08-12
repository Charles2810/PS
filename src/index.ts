import 'dotenv/config';
import { createApp } from './app';
import { logger } from './middleware/logger';

const port = parseInt(process.env.PORT ?? '3000', 10);

const app = createApp();

app.listen(port, '0.0.0.0', () => {
  logger.info(`Sistema de prospección escuchando en el puerto ${port}`);
});