import { Button, Heading, Link, Text } from '@akiksystems/ui';

import type { WritingFilterModel } from '../lib/writing-filters';
import type { Locale } from '../i18n/locales';

import './writings-filters.css';

function kindLabel(value: string, locale: Locale): string {
  if (value === 'note') return 'Note';
  if (value === 'article') return 'Article';
  return locale === 'fr' ? 'Essai' : 'Essay';
}

export function WritingsFilters({
  locale,
  model,
}: {
  locale: Locale;
  model: WritingFilterModel;
}) {
  if (!model.enabled) return null;

  const showKinds = model.kinds.length >= 2;
  const showCategories = model.categories.length >= 2;
  const showTags = model.tags.length >= 2;
  const hasThemeFilters = showCategories || showTags;
  const hasSelection =
    model.selection.kind !== null ||
    model.selection.category !== null ||
    model.selection.tag !== null;
  const overviewHref = locale === 'fr' ? '/fr/ecrits' : '/en/writings';

  return (
    <section
      aria-labelledby="writing-filters-title"
      className="aks-writings-filters"
      data-writing-filters
    >
      <div className="aks-writings-filters-heading">
        <Heading id="writing-filters-title" level={3} size="sm">
          {locale === 'fr' ? 'Affiner le flux' : 'Refine the feed'}
        </Heading>
        <Text size="sm" tone="muted">
          {locale === 'fr'
            ? 'Les filtres apparaissent seulement quand le volume publié rend l’affinage utile.'
            : 'Filters appear only when published volume makes refinement useful.'}
        </Text>
      </div>

      <form action={overviewHref} className="aks-writings-filters-form" method="get">
        {showKinds ? (
          <label className="aks-writings-filter-field">
            <span>{locale === 'fr' ? 'Type' : 'Type'}</span>
            <select
              defaultValue={model.selection.kind ?? ''}
              name="type"
            >
              <option value="">
                {locale === 'fr' ? 'Tous les types' : 'All types'}
              </option>
              {model.kinds.map((option) => (
                <option key={option.value} value={option.value}>
                  {kindLabel(option.value, locale)} ({option.count})
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {hasThemeFilters ? (
          <fieldset className="aks-writings-filter-themes">
            <legend>{locale === 'fr' ? 'Thèmes' : 'Themes'}</legend>
            <div className="aks-writings-filter-theme-fields">
              {showCategories ? (
                <label className="aks-writings-filter-field">
                  <span>{locale === 'fr' ? 'Catégorie' : 'Category'}</span>
                  <select
                    defaultValue={model.selection.category ?? ''}
                    name="category"
                  >
                    <option value="">
                      {locale === 'fr'
                        ? 'Toutes les catégories'
                        : 'All categories'}
                    </option>
                    {model.categories.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label} ({option.count})
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {showTags ? (
                <label className="aks-writings-filter-field">
                  <span>Tag</span>
                  <select defaultValue={model.selection.tag ?? ''} name="tag">
                    <option value="">
                      {locale === 'fr' ? 'Tous les tags' : 'All tags'}
                    </option>
                    {model.tags.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label} ({option.count})
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          </fieldset>
        ) : null}

        <div className="aks-writings-filter-actions">
          <Button type="submit">
            {locale === 'fr' ? 'Appliquer' : 'Apply filters'}
          </Button>
          {hasSelection ? (
            <Link href={overviewHref}>
              {locale === 'fr' ? 'Effacer les filtres' : 'Clear filters'}
            </Link>
          ) : null}
        </div>
      </form>

      <Text className="aks-writings-filter-status" role="status" size="sm" tone="muted">
        {locale === 'fr'
          ? `${model.resultCount} sur ${model.totalCount} écrits`
          : `${model.resultCount} of ${model.totalCount} writings`}
      </Text>
    </section>
  );
}
