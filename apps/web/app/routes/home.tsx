import { useParams } from 'react-router';

import { HomePortal } from '../components/home-portal';
import { requireLocale } from '../i18n/locales';

export { HomePortal } from '../components/home-portal';

export default function Home() {
  const params = useParams();
  const locale = requireLocale(params.locale);

  return <HomePortal locale={locale} />;
}
