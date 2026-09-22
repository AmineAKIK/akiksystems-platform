import { Button, Container, Heading, Link, Text } from '@akiksystems/ui';
import {
  lockSystemMutation,
  markSystemDraft,
  writeAdminAuditEvent,
} from '@akiksystems/db';
import { randomUUID } from 'node:crypto';
import {
  Form,
  useActionData,
  useLoaderData,
} from 'react-router';

import { requireAdminSession } from '../lib/admin.server';
import { imageDimensions } from '../lib/image-dimensions.server';
import { appDb } from '../lib/db.server';
import {
  assetExtensionForMimeType,
  deleteAssetObject,
  putAssetObject,
  validateAssetUpload,
} from '../lib/asset-storage.server';

import type { Route } from './+types/admin-system-assets';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiredSystemId(value: string | undefined): string {
  if (value === undefined || !uuidPattern.test(value)) {
    throw new Response('System not found.', { status: 404 });
  }

  return value;
}

function optionalText(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized === '' ? null : normalized;
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdminSession(request);
  const systemId = requiredSystemId(params.systemId);
  const db = appDb;

    const system = await db
      .selectFrom('systems')
      .select(['id', 'lifecycle'])
      .where('id', '=', systemId)
      .executeTakeFirst();

    if (system === undefined) {
      throw new Response('System not found.', { status: 404 });
    }

    const assets = await db
      .selectFrom('system_assets')
      .innerJoin('assets', 'assets.id', 'system_assets.asset_id')
      .leftJoin(
        'asset_localizations as asset_en',
        (join) =>
          join
            .onRef('asset_en.asset_id', '=', 'assets.id')
            .on('asset_en.locale', '=', 'en'),
      )
      .leftJoin(
        'asset_localizations as asset_fr',
        (join) =>
          join
            .onRef('asset_fr.asset_id', '=', 'assets.id')
            .on('asset_fr.locale', '=', 'fr'),
      )
      .select([
        'assets.id',
        'assets.original_filename',
        'assets.mime_type',
        'assets.byte_size',
        'assets.width',
        'assets.height',
        'assets.storage_key',
        'system_assets.position',
        'asset_en.alt_text as alt_en',
        'asset_en.caption as caption_en',
        'asset_fr.alt_text as alt_fr',
        'asset_fr.caption as caption_fr',
      ])
      .where('system_assets.system_id', '=', systemId)
      .orderBy('system_assets.position')
      .execute();

    return {
      system,
      assets,
    };
}

export async function action({ request, params }: Route.ActionArgs) {
  const session = await requireAdminSession(request);
  const systemId = requiredSystemId(params.systemId);
  const form = await request.formData();
  const intent = form.get('_intent');
  const db = appDb;

    if (intent === 'upload') {
      const file = form.get('file');

      if (!(file instanceof File)) {
        return { ok: false, message: 'Choose a file to upload.' };
      }

      try {
        validateAssetUpload(file);
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : 'Invalid asset.',
        };
      }

      const system = await db
        .selectFrom('systems')
        .select('id')
        .where('id', '=', systemId)
        .executeTakeFirst();

      if (system === undefined) {
        throw new Response('System not found.', { status: 404 });
      }

      const bytes = new Uint8Array(await file.arrayBuffer());
      const dimensions = imageDimensions(file.type, bytes);
      const assetId = randomUUID();
      const extension = assetExtensionForMimeType(file.type);
      const storageKey = `systems/${systemId}/${assetId}.${extension}`;
      try {
        await putAssetObject(storageKey, file);

        await db.transaction().execute(async (transaction) => {
          await lockSystemMutation(transaction, systemId);

          const maxPosition = await transaction
            .selectFrom('system_assets')
            .select(({ fn }) => fn.max<number>('position').as('max_position'))
            .where('system_id', '=', systemId)
            .executeTakeFirst();
          const position = (maxPosition?.max_position ?? -1) + 1;

          await transaction
            .insertInto('assets')
            .values({
              id: assetId,
              storage_key: storageKey,
              original_filename: file.name,
              mime_type: file.type,
              byte_size: file.size,
              width: dimensions?.width ?? null,
              height: dimensions?.height ?? null,
            })
            .execute();

          await transaction
            .insertInto('asset_localizations')
            .values([
              {
                asset_id: assetId,
                locale: 'en',
                alt_text: optionalText(form.get('altEn')),
                caption: optionalText(form.get('captionEn')),
              },
              {
                asset_id: assetId,
                locale: 'fr',
                alt_text: optionalText(form.get('altFr')),
                caption: optionalText(form.get('captionFr')),
              },
            ])
            .execute();

          await transaction
            .insertInto('system_assets')
            .values({
              system_id: systemId,
              asset_id: assetId,
              position,
            })
            .execute();

          await markSystemDraft(transaction, { systemId });

          await writeAdminAuditEvent(transaction, {
            actorUserId: session.user.id,
            actorEmail: session.user.email,
            action: 'system.asset_uploaded',
            entityType: 'asset',
            entityId: assetId,
            systemId,
            metadata: {
              mimeType: file.type,
              byteSize: file.size,
              position,
              localizedMetadata: ['en', 'fr'],
              width: dimensions?.width ?? null,
              height: dimensions?.height ?? null,
            },
          });
        });
      } catch (error) {
        try {
          await deleteAssetObject(storageKey);
        } catch {
          // Best-effort compensation: storage may already have rejected the upload.
        }

        return {
          ok: false,
          message:
            error instanceof Error
              ? error.message
              : 'Asset upload could not be completed.',
        };
      }

      return { ok: true, message: 'Asset uploaded and linked to this System.' };
    }

    if (intent === 'delete') {
      const assetId = form.get('assetId');

      if (typeof assetId !== 'string' || !uuidPattern.test(assetId)) {
        return { ok: false, message: 'Invalid asset identifier.' };
      }

      return db.transaction().execute(async (transaction) => {
        await lockSystemMutation(transaction, systemId);

        const asset = await transaction
          .selectFrom('assets')
          .select(['id', 'storage_key'])
          .where('id', '=', assetId)
          .executeTakeFirst();

        if (asset === undefined) {
          return { ok: false, message: 'Asset no longer exists.' };
        }

        const publicationReferences = await transaction
          .selectFrom('system_publication_assets')
          .select(['locale'])
          .where('system_id', '=', systemId)
          .where('asset_id', '=', assetId)
          .orderBy('locale')
          .execute();

        if (publicationReferences.length > 0) {
          return {
            ok: false,
            message:
              `Deletion blocked: this asset is still referenced by public snapshot(s) ${publicationReferences
                .map(({ locale }) => locale)
                .join(', ')}. Remove every image block that uses it, republish those locales, then delete the asset.`,
          };
        }

        const references = await transaction
          .selectFrom('system_assets')
          .select('system_id')
          .where('asset_id', '=', assetId)
          .execute();

        const currentReference = references.some(
          (reference) => reference.system_id === systemId,
        );

        if (!currentReference) {
          return {
            ok: false,
            message: 'This asset is not linked to the current System.',
          };
        }

        if (references.length > 1) {
          return {
            ok: false,
            message:
              'Deletion blocked: this asset is still referenced by another context.',
          };
        }

        try {
          await deleteAssetObject(asset.storage_key);
        } catch (error) {
          return {
            ok: false,
            message:
              error instanceof Error
                ? `Storage deletion failed; metadata was kept so the operation can be retried: ${error.message}`
                : 'Storage deletion failed; metadata was kept so the operation can be retried.',
          };
        }

        await transaction
          .deleteFrom('system_assets')
          .where('system_id', '=', systemId)
          .where('asset_id', '=', assetId)
          .execute();

        await transaction
          .deleteFrom('assets')
          .where('id', '=', assetId)
          .executeTakeFirstOrThrow();

        await markSystemDraft(transaction, { systemId });

        await writeAdminAuditEvent(transaction, {
          actorUserId: session.user.id,
          actorEmail: session.user.email,
          action: 'system.asset_deleted',
          entityType: 'asset',
          entityId: assetId,
          systemId,
          metadata: {
            storageObjectDeleted: true,
          },
        });

        return { ok: true, message: 'Asset removed from this System and storage.' };
      });
    }

    return { ok: false, message: 'Unsupported asset operation.' };
}

export default function AdminSystemAssets() {
  const { system, assets } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <main className="aks-admin-shell">
      <Container>
        <div className="aks-proof-stack">
          <section className="aks-admin-card">
            <div className="aks-proof-stack">
              <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                Contextual asset management
              </Text>
              <Heading level={1} size="md">
                System assets
              </Heading>
              <Text tone="muted">
                System {system.id} · lifecycle {system.lifecycle}
              </Text>
              <Text size="sm" tone="muted">
                Files are private in S3-compatible object storage. Metadata,
                localized alternatives, captions, and context relations live in
                PostgreSQL.
              </Text>
              <Link href="/admin">Back to administration</Link>
            </div>
          </section>

          {actionData ? (
            <section className="aks-admin-card" aria-live="polite">
              <Text tone={actionData.ok ? 'strong' : 'muted'}>
                {actionData.message}
              </Text>
            </section>
          ) : null}

          <section className="aks-admin-card">
            <div className="aks-proof-stack">
              <Heading level={2} size="sm">
                Upload for this System
              </Heading>
              <Form
                className="aks-admin-form"
                encType="multipart/form-data"
                method="post"
              >
                <input name="_intent" type="hidden" value="upload" />
                <label>
                  <span>File</span>
                  <input
                    accept="image/jpeg,image/png,image/webp,image/avif,application/pdf"
                    name="file"
                    required
                    type="file"
                  />
                </label>
                <label>
                  <span>English alt text</span>
                  <input name="altEn" type="text" />
                </label>
                <label>
                  <span>English caption</span>
                  <textarea name="captionEn" rows={3} />
                </label>
                <label>
                  <span>French alt text</span>
                  <input name="altFr" type="text" />
                </label>
                <label>
                  <span>French caption</span>
                  <textarea name="captionFr" rows={3} />
                </label>
                <Text size="sm" tone="muted">
                  Allowed: JPEG, PNG, WebP, AVIF, PDF. Maximum 10 MiB.
                </Text>
                <Button type="submit">Upload asset</Button>
              </Form>
            </div>
          </section>

          <section className="aks-admin-card">
            <div className="aks-proof-stack">
              <Heading level={2} size="sm">
                Linked assets
              </Heading>
              {assets.length === 0 ? (
                <Text tone="muted">No assets are linked to this System yet.</Text>
              ) : (
                <div className="aks-admin-asset-list">
                  {assets.map((asset) => (
                    <article className="aks-admin-asset" key={asset.id}>
                      <div className="aks-proof-stack">
                        <Text tone="strong">{asset.original_filename}</Text>
                        <Text size="sm" tone="muted">
                          {asset.mime_type} · {asset.byte_size} bytes ·
                          {asset.width !== null && asset.height !== null
                            ? ` ${asset.width}×${asset.height} ·`
                            : ' dimensions pending ·'}{' '}
                          position {asset.position}
                        </Text>
                        <Text size="sm" tone="muted">
                          EN alt: {asset.alt_en ?? '—'}
                        </Text>
                        <Text size="sm" tone="muted">
                          FR alt: {asset.alt_fr ?? '—'}
                        </Text>
                        <Text size="sm" tone="muted">
                          EN caption: {asset.caption_en ?? '—'}
                        </Text>
                        <Text size="sm" tone="muted">
                          FR caption: {asset.caption_fr ?? '—'}
                        </Text>
                        <Form method="post">
                          <input name="_intent" type="hidden" value="delete" />
                          <input
                            name="assetId"
                            type="hidden"
                            value={asset.id}
                          />
                          <Button emphasis="quiet" type="submit">
                            Remove asset
                          </Button>
                        </Form>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </Container>
    </main>
  );
}
