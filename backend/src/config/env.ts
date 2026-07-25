import 'dotenv/config';
import { parseBackendEnv } from './envSchema';

export const env = parseBackendEnv(process.env);
