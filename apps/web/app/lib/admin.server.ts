import { redirect } from 'react-router';

import { auth, authEnv } from './auth.server';

export async function getAdminSession(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (session === null) {
    return null;
  }

  if (session.user.email.trim().toLowerCase() !== authEnv.ADMIN_EMAIL) {
    return null;
  }

  return session;
}

export async function requireAdminSession(request: Request) {
  const session = await getAdminSession(request);

  if (session === null) {
    throw redirect('/admin/login');
  }

  return session;
}
