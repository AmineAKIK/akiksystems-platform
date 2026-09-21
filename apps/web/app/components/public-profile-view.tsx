import { Container, Heading, Text } from '@akiksystems/ui';

import type { PublicProfile } from '@akiksystems/db';

interface PublicProfileViewProps {
  profile: PublicProfile;
}

export function PublicProfileView({ profile }: PublicProfileViewProps) {
  const fallback =
    profile.locale === 'fr'
      ? 'Le profil professionnel public sera enrichi par les prochaines étapes L3.'
      : 'The public professional profile will be enriched by the next L3 steps.';

  return (
    <main className="aks-proof-page">
      <Container>
        <div className="aks-proof-stack">
          <Text size="sm" tone="muted">
            AkikSystems
          </Text>
          <Heading level={1} size="md">
            {profile.locale === 'fr' ? 'Profil' : 'Profile'}
          </Heading>
          {profile.displayName !== null ? (
            <Heading level={2} size="sm">
              {profile.displayName}
            </Heading>
          ) : null}
          {profile.professionalTitle !== null ? (
            <Text size="lg" tone="strong">
              {profile.professionalTitle}
            </Text>
          ) : null}
          <Text size="lg" tone="muted">
            {profile.introduction ?? fallback}
          </Text>
          {profile.foundationalCopy !== null ? (
            <Text>{profile.foundationalCopy}</Text>
          ) : null}
        </div>
      </Container>
    </main>
  );
}
