import { createClient } from 'redis';
import { REDIS_URI_CONNECTION } from '../config/redis';

const redisClient = createClient({ url: REDIS_URI_CONNECTION });

redisClient.connect().catch((err) => {
  console.error('Erro ao conectar ao Redis:', err);
});

redisClient.on('error', (err) => {
  console.error('Redis error: ', err);
});

export { redisClient }
