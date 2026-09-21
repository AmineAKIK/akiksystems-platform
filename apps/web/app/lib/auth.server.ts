import { createAuthInstance } from './auth.factory.server';

const instance = createAuthInstance();

export const auth = instance.auth;
export const authDatabase = instance.database;
export const authEnv = instance.env;
