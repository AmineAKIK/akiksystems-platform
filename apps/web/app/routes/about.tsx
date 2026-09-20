import { Link, useParams } from 'react-router';

import { dictionaryFor, requireLocale } from '../i18n/locales';

export default function About() {
  const params = useParams();
  const locale = requireLocale(params.locale);
  const dictionary = dictionaryFor(locale);

  return (
    <main>
      <p>{dictionary.about.eyebrow}</p>
      <h1>{dictionary.about.title}</h1>
      <p>{dictionary.about.description}</p>
      <Link to={`/${locale}`}>{dictionary.about.homeLink}</Link>
    </main>
  );
}
