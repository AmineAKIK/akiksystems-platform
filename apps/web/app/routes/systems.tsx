import { useParams } from 'react-router';

import { GlobalDestinationView } from '../components/global-destination-view';
import { requireLocale } from '../i18n/locales';

export default function GlobalDestinationRoute() {
  const params = useParams();
  const locale = requireLocale(params.locale);

  return <GlobalDestinationView destinationId="systems" locale={locale} />;
}
