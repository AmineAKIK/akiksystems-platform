import { parseDatabaseCommandEnv } from '@akiksystems/config/env';

export function databaseUrlFromEnv(): string {
  return parseDatabaseCommandEnv(process.env).DATABASE_URL;
}
