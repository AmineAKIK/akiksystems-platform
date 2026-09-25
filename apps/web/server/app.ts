import { createRequestHandler } from '@react-router/express';
import express, { type Application } from 'express';

export const app: Application = express();

// Railway terminates TLS before forwarding to this Express application.
// React Router's Express adapter reads req.protocol/req.hostname when it builds
// the Fetch Request used by loaders/actions, so the app must trust exactly the
// nearest proxy hop for X-Forwarded-Proto/Host to describe the public request.
app.set('trust proxy', 1);

app.use(
  createRequestHandler({
    build: () => import('virtual:react-router/server-build'),
  }),
);
