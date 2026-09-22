import {
  parsePresentationDocument,
  presentationDocumentVersion,
  validatePresentationDocument,
  type PlatformLocale,
  type PresentationBlock,
  type PresentationDocument,
} from '@akiksystems/core';
import {
  lockSystemMutation,
  markSystemDraft,
  writeAdminAuditEvent,
} from '@akiksystems/db';
import { Button, Container, Heading, Link, Text } from '@akiksystems/ui';
import { useMemo, useState } from 'react';
import { Form, useActionData, useLoaderData } from 'react-router';

import { requireAdminSession } from '../lib/admin.server';
import { appDb } from '../lib/db.server';

import type { Route } from './+types/admin-system-presentation';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiredSystemId(value: string | undefined): string {
  if (value === undefined || !uuidPattern.test(value)) {
    throw new Response('System not found.', { status: 404 });
  }

  return value;
}

function requiredLocale(value: string | undefined): PlatformLocale {
  if (value !== 'en' && value !== 'fr') {
    throw new Response('Locale not found.', { status: 404 });
  }

  return value;
}

function emptyDocument(): PresentationDocument {
  return {
    version: presentationDocumentVersion,
    blocks: [],
  };
}

function newBlock(type: PresentationBlock['type']): PresentationBlock {
  switch (type) {
    case 'heading':
      return { type: 'heading', level: 2, text: 'New heading' };
    case 'paragraph':
      return { type: 'paragraph', text: 'New paragraph' };
    case 'list':
      return { type: 'list', style: 'unordered', items: ['New item'] };
    case 'code':
      return { type: 'code', code: 'code', language: null };
    case 'image':
      return { type: 'image', assetId: '' };
    case 'quote':
      return { type: 'quote', text: 'New quotation', attribution: null };
  }
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdminSession(request);
  const systemId = requiredSystemId(params.systemId);
  const locale = requiredLocale(params.locale);
  const db = appDb;

    const system = await db
      .selectFrom('systems')
      .leftJoin(
        'system_localizations as localized',
        (join) =>
          join
            .onRef('localized.system_id', '=', 'systems.id')
            .on('localized.locale', '=', locale),
      )
      .select([
        'systems.id',
        'systems.lifecycle',
        'localized.title',
        'localized.presentation_document',
      ])
      .where('systems.id', '=', systemId)
      .executeTakeFirst();

    if (system === undefined) {
      throw new Response('System not found.', { status: 404 });
    }

    const assets = await db
      .selectFrom('system_assets')
      .innerJoin('assets', 'assets.id', 'system_assets.asset_id')
      .leftJoin(
        'asset_localizations as localized_asset',
        (join) =>
          join
            .onRef('localized_asset.asset_id', '=', 'assets.id')
            .on('localized_asset.locale', '=', locale),
      )
      .select([
        'assets.id',
        'assets.original_filename',
        'assets.mime_type',
        'localized_asset.alt_text',
        'localized_asset.caption',
        'system_assets.position',
      ])
      .where('system_assets.system_id', '=', systemId)
      .orderBy('system_assets.position')
      .execute();

    return {
      system: {
        id: system.id,
        lifecycle: system.lifecycle,
        title: system.title,
      },
      locale,
      presentationDocument:
        system.presentation_document ?? emptyDocument(),
      assets,
    };
}

export async function action({ request, params }: Route.ActionArgs) {
  const session = await requireAdminSession(request);
  const systemId = requiredSystemId(params.systemId);
  const locale = requiredLocale(params.locale);
  const form = await request.formData();
  const rawDocument = form.get('presentationDocument');

  if (typeof rawDocument !== 'string') {
    return {
      ok: false,
      message: 'Presentation document payload is missing.',
      errors: ['presentation_document is required.'],
    };
  }

  let candidate: unknown;

  try {
    candidate = JSON.parse(rawDocument);
  } catch {
    return {
      ok: false,
      message: 'Presentation document is not valid JSON.',
      errors: ['presentation_document must be valid JSON.'],
    };
  }

  const validation = validatePresentationDocument(candidate);

  if (!validation.success) {
    return {
      ok: false,
      message: 'Presentation document failed server validation.',
      errors: validation.errors,
    };
  }

  const document = parsePresentationDocument(candidate);
  const imageAssetIds = document.blocks
    .filter((block): block is Extract<PresentationBlock, { type: 'image' }> =>
      block.type === 'image',
    )
    .map((block) => block.assetId);

  if (imageAssetIds.some((assetId) => !uuidPattern.test(assetId))) {
    return {
      ok: false,
      message: 'One or more image blocks reference an invalid asset ID.',
      errors: ['Every image block must reference a valid contextual asset ID.'],
    };
  }

  const db = appDb;

    const system = await db
      .selectFrom('systems')
      .select('id')
      .where('id', '=', systemId)
      .executeTakeFirst();

    if (system === undefined) {
      throw new Response('System not found.', { status: 404 });
    }

    if (imageAssetIds.length > 0) {
      const linkedAssets = await db
        .selectFrom('system_assets')
        .select('asset_id')
        .where('system_id', '=', systemId)
        .where('asset_id', 'in', imageAssetIds)
        .execute();

      const linkedAssetIds = new Set(
        linkedAssets.map((asset) => asset.asset_id),
      );
      const missingAssetId = imageAssetIds.find(
        (assetId) => !linkedAssetIds.has(assetId),
      );

      if (missingAssetId !== undefined) {
        return {
          ok: false,
          message:
            'An image block references an asset that is not linked to this System.',
          errors: [
            `Asset ${missingAssetId} is not available in this System context.`,
          ],
        };
      }
    }

    const localization = await db
      .selectFrom('system_localizations')
      .select([
        'system_id',
        'locale',
        'slug',
        'title',
        'summary',
        'proof_role',
        'proof_maturity',
        'proof_demo_nature',
        'proof_data_nature',
        'proof_limits',
        'editorial_state',
      ])
      .where('system_id', '=', systemId)
      .where('locale', '=', locale)
      .executeTakeFirst();

    if (localization === undefined) {
      await db.transaction().execute(async (transaction) => {
        await lockSystemMutation(transaction, systemId);
        await transaction
          .insertInto('system_localizations')
          .values({
            system_id: systemId,
            locale,
            presentation_document: document,
          })
          .execute();

        await markSystemDraft(transaction, { systemId, locale });

        await writeAdminAuditEvent(transaction, {
          actorUserId: session.user.id,
          actorEmail: session.user.email,
          action: 'system.presentation_updated',
          entityType: 'system_localization',
          entityId: `${systemId}:${locale}`,
          systemId,
          locale,
          metadata: {
            blockCount: document.blocks.length,
            blockTypes: document.blocks.map((block) => block.type),
          },
        });
      });
    } else {
      await db.transaction().execute(async (transaction) => {
        await lockSystemMutation(transaction, systemId);
        await markSystemDraft(transaction, { systemId, locale });

        await transaction
          .updateTable('system_localizations')
          .set({
            presentation_document: document,
            updated_at: new Date(),
          })
          .where('system_id', '=', systemId)
          .where('locale', '=', locale)
          .execute();

        await writeAdminAuditEvent(transaction, {
          actorUserId: session.user.id,
          actorEmail: session.user.email,
          action: 'system.presentation_updated',
          entityType: 'system_localization',
          entityId: `${systemId}:${locale}`,
          systemId,
          locale,
          metadata: {
            blockCount: document.blocks.length,
            blockTypes: document.blocks.map((block) => block.type),
          },
        });
      });
    }

    return {
      ok: true,
      message: `${locale.toUpperCase()} presentation saved.`,
      errors: [],
    };
}

function PresentationBlockEditor({
  block,
  index,
  assets,
  onChange,
  onMove,
  onRemove,
}: {
  block: PresentationBlock;
  index: number;
  assets: Array<{
    id: string;
    original_filename: string;
    mime_type: string;
    alt_text: string | null;
    caption: string | null;
    position: number;
  }>;
  onChange: (index: number, block: PresentationBlock) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <article className="aks-admin-presentation-block">
      <div className="aks-admin-presentation-block-header">
        <Text tone="strong">
          {index + 1}. {block.type}
        </Text>
        <div className="aks-proof-actions">
          <Button
            emphasis="quiet"
            disabled={index === 0}
            onClick={() => onMove(index, -1)}
            type="button"
          >
            Move up
          </Button>
          <Button
            emphasis="quiet"
            onClick={() => onMove(index, 1)}
            type="button"
          >
            Move down
          </Button>
          <Button
            emphasis="quiet"
            onClick={() => onRemove(index)}
            type="button"
          >
            Remove
          </Button>
        </div>
      </div>

      <div className="aks-admin-form">
        {block.type === 'heading' ? (
          <>
            <label>
              <span>Heading level</span>
              <select
                value={block.level}
                onChange={(event) =>
                  onChange(index, {
                    ...block,
                    level: Number(event.target.value) as 2 | 3,
                    evidenceStatus:
                      Number(event.target.value) === 2
                        ? block.evidenceStatus ?? null
                        : null,
                  })
                }
              >
                <option value={2}>Heading 2</option>
                <option value={3}>Heading 3</option>
              </select>
            </label>
            <label>
              <span>Text</span>
              <input
                value={block.text}
                onChange={(event) =>
                  onChange(index, { ...block, text: event.target.value })
                }
              />
            </label>
            {block.level === 2 ? (
              <label>
                <span>Evidence semantics</span>
                <select
                  value={block.evidenceStatus ?? ''}
                  onChange={(event) =>
                    onChange(index, {
                      ...block,
                      evidenceStatus:
                        event.target.value === ''
                          ? null
                          : (event.target.value as
                              | 'implemented'
                              | 'boundary'
                              | 'hypothesis'
                              | 'future_integration'),
                    })
                  }
                >
                  <option value="">Neutral / renderer default</option>
                  <option value="implemented">Implemented</option>
                  <option value="boundary">Explicit boundary</option>
                  <option value="hypothesis">Hypothesis</option>
                  <option value="future_integration">Future integration</option>
                </select>
              </label>
            ) : null}
          </>
        ) : null}

        {block.type === 'paragraph' ? (
          <label>
            <span>Paragraph</span>
            <textarea
              rows={5}
              value={block.text}
              onChange={(event) =>
                onChange(index, { ...block, text: event.target.value })
              }
            />
          </label>
        ) : null}

        {block.type === 'list' ? (
          <>
            <label>
              <span>List style</span>
              <select
                value={block.style}
                onChange={(event) =>
                  onChange(index, {
                    ...block,
                    style: event.target.value as 'ordered' | 'unordered',
                  })
                }
              >
                <option value="unordered">Unordered</option>
                <option value="ordered">Ordered</option>
              </select>
            </label>
            <label>
              <span>Items (one per line)</span>
              <textarea
                rows={6}
                value={block.items.join('\n')}
                onChange={(event) =>
                  onChange(index, {
                    ...block,
                    items: event.target.value.split('\n'),
                  })
                }
              />
            </label>
          </>
        ) : null}

        {block.type === 'code' ? (
          <>
            <label>
              <span>Language (optional)</span>
              <input
                value={block.language ?? ''}
                onChange={(event) =>
                  onChange(index, {
                    ...block,
                    language:
                      event.target.value.trim() === ''
                        ? null
                        : event.target.value,
                  })
                }
              />
            </label>
            <label>
              <span>Code</span>
              <textarea
                className="aks-admin-code-input"
                rows={10}
                value={block.code}
                onChange={(event) =>
                  onChange(index, { ...block, code: event.target.value })
                }
              />
            </label>
          </>
        ) : null}

        {block.type === 'image' ? (
          <label>
            <span>Contextual asset</span>
            <select
              value={block.assetId}
              onChange={(event) =>
                onChange(index, { ...block, assetId: event.target.value })
              }
            >
              <option value="">Select an asset</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.original_filename} · {asset.mime_type}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {block.type === 'quote' ? (
          <>
            <label>
              <span>Quotation</span>
              <textarea
                rows={5}
                value={block.text}
                onChange={(event) =>
                  onChange(index, { ...block, text: event.target.value })
                }
              />
            </label>
            <label>
              <span>Attribution (optional)</span>
              <input
                value={block.attribution ?? ''}
                onChange={(event) =>
                  onChange(index, {
                    ...block,
                    attribution:
                      event.target.value.trim() === ''
                        ? null
                        : event.target.value,
                  })
                }
              />
            </label>
          </>
        ) : null}
      </div>
    </article>
  );
}

export default function AdminSystemPresentation() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [blocks, setBlocks] = useState<PresentationBlock[]>(
    data.presentationDocument.blocks,
  );
  const [newBlockType, setNewBlockType] =
    useState<PresentationBlock['type']>('paragraph');

  const document = useMemo<PresentationDocument>(
    () => ({
      version: presentationDocumentVersion,
      blocks,
    }),
    [blocks],
  );

  function updateBlock(index: number, block: PresentationBlock) {
    setBlocks((current) =>
      current.map((candidate, candidateIndex) =>
        candidateIndex === index ? block : candidate,
      ),
    );
  }

  function moveBlock(index: number, direction: -1 | 1) {
    setBlocks((current) => {
      const target = index + direction;

      if (target < 0 || target >= current.length) {
        return current;
      }

      const next = [...current];
      const currentBlock = next[index];
      const targetBlock = next[target];

      if (currentBlock === undefined || targetBlock === undefined) {
        return current;
      }

      next[index] = targetBlock;
      next[target] = currentBlock;
      return next;
    });
  }

  function removeBlock(index: number) {
    setBlocks((current) =>
      current.filter((_, candidateIndex) => candidateIndex !== index),
    );
  }

  function addBlock() {
    setBlocks((current) => [...current, newBlock(newBlockType)]);
  }

  return (
    <main className="aks-admin-shell">
      <Container>
        <div className="aks-proof-stack">
          <section className="aks-admin-card">
            <div className="aks-proof-stack">
              <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                System presentation editor
              </Text>
              <Heading level={1} size="md">
                {data.system.title ?? 'Untitled System'} ·{' '}
                {data.locale.toUpperCase()}
              </Heading>
              <Text tone="muted">
                Edit semantic presentation blocks only. Layout remains defined
                by the public renderer.
              </Text>
              <div className="aks-proof-actions">
                <Link href="/admin">Back to administration</Link>
                <Link href={`/admin/systems/${data.system.id}/assets`}>
                  Manage assets
                </Link>
                <Link
                  href={`/admin/systems/${data.system.id}/presentation/${
                    data.locale === 'en' ? 'fr' : 'en'
                  }`}
                >
                  Edit {data.locale === 'en' ? 'FR' : 'EN'}
                </Link>
              </div>
            </div>
          </section>

          {actionData ? (
            <section className="aks-admin-card" aria-live="polite">
              <div className="aks-proof-stack">
                <Text tone={actionData.ok ? 'strong' : 'muted'}>
                  {actionData.message}
                </Text>
                {actionData.errors.length > 0 ? (
                  <ul>
                    {actionData.errors.map((error) => (
                      <li key={error}>
                        <Text size="sm">{error}</Text>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="aks-admin-card">
            <div className="aks-proof-stack">
              <Heading level={2} size="sm">
                Add block
              </Heading>
              <div className="aks-admin-presentation-add">
                <label>
                  <span>Block type</span>
                  <select
                    value={newBlockType}
                    onChange={(event) =>
                      setNewBlockType(
                        event.target.value as PresentationBlock['type'],
                      )
                    }
                  >
                    <option value="heading">Heading</option>
                    <option value="paragraph">Paragraph</option>
                    <option value="list">List</option>
                    <option value="code">Code</option>
                    <option value="image">Image</option>
                    <option value="quote">Quotation</option>
                  </select>
                </label>
                <Button onClick={addBlock} type="button">
                  Add block
                </Button>
              </div>
            </div>
          </section>

          <Form className="aks-proof-stack" method="post">
            <input
              name="presentationDocument"
              type="hidden"
              value={JSON.stringify(document)}
            />

            {blocks.length === 0 ? (
              <section className="aks-admin-card">
                <Text tone="muted">
                  No presentation blocks yet. Add the first block above.
                </Text>
              </section>
            ) : (
              blocks.map((block, index) => (
                <PresentationBlockEditor
                  assets={data.assets}
                  block={block}
                  index={index}
                  key={index}
                  onChange={updateBlock}
                  onMove={moveBlock}
                  onRemove={removeBlock}
                />
              ))
            )}

            <section className="aks-admin-card">
              <div className="aks-proof-actions">
                <Button type="submit">Save presentation</Button>
                <Text size="sm" tone="muted">
                  Server validation is authoritative. Image blocks must use an
                  asset linked to this System.
                </Text>
              </div>
            </section>
          </Form>
        </div>
      </Container>
    </main>
  );
}
