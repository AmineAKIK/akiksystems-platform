import { parseDatabaseCommandEnv } from '@akiksystems/config/env';
import { createDatabase } from '@akiksystems/db';

const env = parseDatabaseCommandEnv(process.env);

export const appDb = createDatabase(env.DATABASE_URL);
