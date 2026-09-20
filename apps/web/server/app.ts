import { createRequestHandler } from '@react-router/express';
import express, { type Application } from 'express';

export const app: Application = express();

app.use(
  createRequestHandler({
    build: () => import('virtual:react-router/server-build'),
  }),
);
