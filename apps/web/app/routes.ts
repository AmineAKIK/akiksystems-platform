import { index, route, type RouteConfig } from '@react-router/dev/routes';

export default [
  route('api/auth/*', 'routes/api-auth.ts'),
  route('admin/login', 'routes/admin-login.tsx'),
  route('admin/two-factor', 'routes/admin-two-factor.tsx'),
  route('admin/security', 'routes/admin-security.tsx'),
  route('admin', 'routes/admin.tsx'),
  index('routes/locale-index.tsx'),
  route(':locale', 'routes/locale-layout.tsx', [
    index('routes/home.tsx'),
    route('about', 'routes/about.tsx'),
  ]),
] satisfies RouteConfig;
