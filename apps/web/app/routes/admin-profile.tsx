import { BrandSignature, Container, Link, Text } from '@akiksystems/ui';
import { useActionData, useLoaderData, useSearchParams } from 'react-router';

import { ProfileAdminEditor } from '../components/admin-profile-editor';
import { ProfileAdminManagement } from '../components/admin-profile-management';
import {
  handleProfileAdminAction,
  loadProfileAdmin,
} from '../lib/profile-admin.server';

import type { Route } from './+types/admin-profile';

export async function loader({ request }: Route.LoaderArgs) {
  return loadProfileAdmin(request);
}

export async function action({ request }: Route.ActionArgs) {
  return handleProfileAdminAction(request);
}

export default function AdminProfile() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const locale = searchParams.get('locale') === 'fr' ? 'fr' : 'en';

  return (
    <main className="aks-admin-profile-page">
      <header className="aks-admin-profile-header">
        <Container width="wide">
          <div className="aks-admin-profile-header-inner">
            <BrandSignature
              aria-label="AkikSystems home"
              className="aks-admin-profile-brand"
              href="/en"
              size="sm"
            />
            <nav
              aria-label="Administration breadcrumb"
              className="aks-admin-profile-breadcrumb"
            >
              <Link href="/admin">Administration</Link>
              <span aria-hidden="true">/</span>
              <span>Profile</span>
            </nav>
            <Text className="aks-admin-profile-operator" size="sm">
              {data.email}
            </Text>
          </div>
        </Container>
      </header>

      <ProfileAdminEditor
        actionData={actionData?.scope === 'content' ? actionData : null}
        locale={locale}
        preview={data.preview}
        profile={data.profile}
        publications={data.publications}
      />

      <Container className="aks-admin-profile-management" width="wide">
        <ProfileAdminManagement
          actionData={
            actionData !== undefined && actionData.scope !== 'content'
              ? actionData
              : null
          }
          assets={data.assets}
          locale={locale}
          profile={data.profile}
          systems={data.systems}
          technologies={data.technologies}
          writings={data.writings}
        />
      </Container>

      <footer className="aks-admin-profile-footer">
        <Container width="wide">
          <div className="aks-admin-profile-footer-inner">
            <span>© {new Date().getUTCFullYear()} AkikSystems</span>
            <span>Private system · Visual Profile editor</span>
          </div>
        </Container>
      </footer>
    </main>
  );
}
