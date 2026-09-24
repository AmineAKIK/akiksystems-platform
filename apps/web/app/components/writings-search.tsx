import { Button, Heading, Link, Text } from '@akiksystems/ui';

import type { Locale } from '../i18n/locales';
import type { WritingFilterModel } from '../lib/writing-filters';

import './writings-search.css';

function overviewHref(locale: Locale): string {
  return locale === 'fr' ? '/fr/ecrits' : '/en/writings';
}

function clearSearchHref(
  locale: Locale,
  filterModel: WritingFilterModel,
): string {
  const params = new URLSearchParams();
  if (filterModel.selection.kind !== null) {
    params.set('type', filterModel.selection.kind);
  }
  if (filterModel.selection.category !== null) {
    params.set('category', filterModel.selection.category);
  }
  if (filterModel.selection.tag !== null) {
    params.set('tag', filterModel.selection.tag);
  }

  const query = params.toString();
  return query === ''
    ? overviewHref(locale)
    : `${overviewHref(locale)}?${query}`;
}

export function WritingsSearch({
  filterModel,
  locale,
  query,
  resultCount,
}: {
  filterModel: WritingFilterModel;
  locale: Locale;
  query: string;
  resultCount: number;
}) {
  const label = locale === 'fr' ? 'Rechercher dans les Écrits' : 'Search Writings';

  return (
    <section
      aria-labelledby="writing-search-title"
      className="aks-writings-search"
      data-writing-search
    >
      <div className="aks-writings-search-heading">
        <Heading id="writing-search-title" level={3} size="sm">
          {label}
        </Heading>
        <Text size="sm" tone="muted">
          {locale === 'fr'
            ? 'Recherche PostgreSQL dans les titres, résumés et corps publiés.'
            : 'PostgreSQL search across published titles, summaries, and bodies.'}
        </Text>
      </div>

      <form
        action={overviewHref(locale)}
        className="aks-writings-search-form"
        method="get"
        role="search"
      >
        {filterModel.selection.kind !== null ? (
          <input name="type" type="hidden" value={filterModel.selection.kind} />
        ) : null}
        {filterModel.selection.category !== null ? (
          <input
            name="category"
            type="hidden"
            value={filterModel.selection.category}
          />
        ) : null}
        {filterModel.selection.tag !== null ? (
          <input name="tag" type="hidden" value={filterModel.selection.tag} />
        ) : null}

        <label className="aks-writings-search-field">
          <span className="aks-visually-hidden">{label}</span>
          <input
            defaultValue={query}
            maxLength={160}
            name="q"
            placeholder={
              locale === 'fr'
                ? 'Ex. attention, systèmes, maîtrise'
                : 'e.g. architecture, systems, delivery'
            }
            type="search"
          />
        </label>
        <Button type="submit">
          {locale === 'fr' ? 'Rechercher' : 'Search'}
        </Button>
        {query !== '' ? (
          <Link href={clearSearchHref(locale, filterModel)}>
            {locale === 'fr' ? 'Effacer la recherche' : 'Clear search'}
          </Link>
        ) : null}
      </form>

      {query !== '' ? (
        <Text className="aks-writings-search-status" role="status" size="sm" tone="muted">
          {locale === 'fr'
            ? `${resultCount} résultat${resultCount === 1 ? '' : 's'} pour « ${query} »`
            : `${resultCount} result${resultCount === 1 ? '' : 's'} for “${query}”`}
        </Text>
      ) : null}
    </section>
  );
}
