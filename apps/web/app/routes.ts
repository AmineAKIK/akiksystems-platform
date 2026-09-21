import { index, route, type RouteConfig } from '@react-router/dev/routes';

export default [
  route('api/auth/*', 'routes/api-auth.ts'),
  route('admin/login', 'routes/admin-login.tsx'),
  route('admin/two-factor', 'routes/admin-two-factor.tsx'),
  route('admin/security', 'routes/admin-security.tsx'),
  route('admin/systems/:systemId', 'routes/admin-system.tsx'),
  route('admin/systems/:systemId/assets', 'routes/admin-system-assets.tsx'),
  route(
    'admin/systems/:systemId/presentation/:locale',
    'routes/admin-system-presentation.tsx',
  ),
  route(
    'admin/systems/:systemId/preview/:locale',
    'routes/admin-system-preview.tsx',
  ),
  route(
    'admin/systems/:systemId/preview/:locale/assets/:assetId',
    'routes/admin-system-preview-asset.ts',
  ),
  route('admin', 'routes/admin.tsx'),
  index('routes/locale-index.tsx'),
  route(':locale', 'routes/locale-layout.tsx', [
    index('routes/home.tsx'),
    route('about', 'routes/about.tsx'),
    route('systems/:slug', 'routes/system-detail.tsx'),
    route(
      'systems/:slug/assets/:assetId',
      'routes/system-detail-asset.ts',
    ),
  ]),
] satisfies RouteConfig;
