export function databaseUrlFromEnv(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl === undefined || databaseUrl.trim() === '') {
    throw new Error('DATABASE_URL is required for database commands.');
  }

  return databaseUrl;
}
