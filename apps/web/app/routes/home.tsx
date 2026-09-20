import { Link, useParams } from 'react-router';

import { dictionaryFor, requireLocale } from '../i18n/locales';

export default function Home() {
  const params = useParams();
  const locale = requireLocale(params.locale);
  const dictionary = dictionaryFor(locale);

  return (
    <main>
      <p>{dictionary.home.eyebrow}</p>
      <h1>{dictionary.home.title}</h1>
      <p>{dictionary.home.description}</p>
      <Link to={`/${locale}/about`}>{dictionary.home.aboutLink}</Link>
    </main>
  );
}
