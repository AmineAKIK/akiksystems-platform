import { index, route, type RouteConfig } from '@react-router/dev/routes';

export default [
  index('routes/locale-index.tsx'),
  route(':locale', 'routes/locale-layout.tsx', [
    index('routes/home.tsx'),
    route('profile', 'routes/profile.tsx'),
    route('profil', 'routes/profile-fr.tsx'),
    route('systems', 'routes/systems.tsx'),
    route('writings', 'routes/writings.tsx'),
    route('ecrits', 'routes/writings-fr.tsx'),
    route('learning', 'routes/learning.tsx'),
    route('apprentissage', 'routes/learning-fr.tsx'),
    route('work-with-us', 'routes/work-with-us.tsx'),
    route('travailler-ensemble', 'routes/work-with-us-fr.tsx'),
    route('privacy', 'routes/privacy.tsx'),
    route('confidentialite', 'routes/privacy-fr.tsx'),
    route('legal-notice', 'routes/legal-notice.tsx'),
    route('mentions-legales', 'routes/legal-notice-fr.tsx'),
    route('cookies', 'routes/cookies.tsx'),
    route('about', 'routes/about.tsx'),
  ]),
] satisfies RouteConfig;
