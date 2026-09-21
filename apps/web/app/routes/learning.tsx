import { useParams } from 'react-router';

import { GlobalDestinationView } from '../components/global-destination-view';
import { requireExactLocale } from '../i18n/locales';

export default function GlobalDestinationRoute() {
  const params = useParams();
  const locale = requireExactLocale(params.locale, 'en');

  return <GlobalDestinationView destinationId="learning" locale={locale} />;
}
