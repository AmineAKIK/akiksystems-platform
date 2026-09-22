import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('profile_technology_journey_stages')
    .addColumn('profile_id', 'uuid', (column) =>
      column.notNull().references('profiles.id').onDelete('cascade'),
    )
    .addColumn('stage_key', 'text', (column) => column.notNull())
    .addColumn('position', 'integer', (column) => column.notNull())
    .addColumn('evidence_experience_id', 'uuid', (column) =>
      column.references('experiences.id').onDelete('set null'),
    )
    .addColumn('evidence_system_id', 'uuid', (column) =>
      column.references('systems.id').onDelete('set null'),
    )
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addPrimaryKeyConstraint('profile_technology_journey_stages_pkey', [
      'profile_id',
      'stage_key',
    ])
    .addUniqueConstraint('profile_technology_journey_stages_profile_position_key', [
      'profile_id',
      'position',
    ])
    .addCheckConstraint(
      'profile_technology_journey_stages_stage_key_check',
      sql`stage_key in ('programming', 'networks_telecom', 'it_support', 'industry', 'development_akiksystems')`,
    )
    .addCheckConstraint(
      'profile_technology_journey_stages_position_check',
      sql`position between 0 and 4`,
    )
    .addCheckConstraint(
      'profile_technology_journey_stages_single_evidence_check',
      sql`not (evidence_experience_id is not null and evidence_system_id is not null)`,
    )
    .execute();

  await db.schema
    .createTable('profile_technology_journey_stage_localizations')
    .addColumn('profile_id', 'uuid', (column) => column.notNull())
    .addColumn('stage_key', 'text', (column) => column.notNull())
    .addColumn('locale', 'text', (column) => column.notNull())
    .addColumn('title', 'text', (column) => column.notNull())
    .addColumn('summary', 'text')
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addForeignKeyConstraint(
      'profile_technology_journey_stage_localizations_stage_fkey',
      ['profile_id', 'stage_key'],
      'profile_technology_journey_stages',
      ['profile_id', 'stage_key'],
      (constraint) => constraint.onDelete('cascade'),
    )
    .addPrimaryKeyConstraint(
      'profile_technology_journey_stage_localizations_pkey',
      ['profile_id', 'stage_key', 'locale'],
    )
    .addCheckConstraint(
      'profile_technology_journey_stage_localizations_locale_check',
      sql`locale in ('en', 'fr')`,
    )
    .addCheckConstraint(
      'profile_technology_journey_stage_localizations_title_not_blank_check',
      sql`length(trim(title)) > 0 and char_length(title) <= 80`,
    )
    .addCheckConstraint(
      'profile_technology_journey_stage_localizations_summary_length_check',
      sql`summary is null or (length(trim(summary)) > 0 and char_length(summary) <= 280)`,
    )
    .execute();

  await sql`
    insert into profile_technology_journey_stages (profile_id, stage_key, position)
    select id, stage_key, position
    from profiles
    cross join (
      values
        ('programming', 0),
        ('networks_telecom', 1),
        ('it_support', 2),
        ('industry', 3),
        ('development_akiksystems', 4)
    ) as stages(stage_key, position)
    where singleton_key = 'public'
  `.execute(db);

  await sql`
    insert into profile_technology_journey_stage_localizations
      (profile_id, stage_key, locale, title, summary)
    select
      profiles.id,
      copy.stage_key,
      copy.locale,
      copy.title,
      copy.summary
    from profiles
    cross join (
      values
        ('programming', 'en', 'Programming foundations', 'Started with programming as a way to understand how software is built and controlled.'),
        ('programming', 'fr', 'Fondations en programmation', 'Commencer par la programmation pour comprendre comment les logiciels sont construits et maîtrisés.'),
        ('networks_telecom', 'en', 'Networks and telecom', 'Expanded from code into connectivity, protocols, and the behavior of systems across networks.'),
        ('networks_telecom', 'fr', 'Réseaux et télécoms', 'Élargir la programmation à la connectivité, aux protocoles et au comportement des systèmes en réseau.'),
        ('it_support', 'en', 'IT support', 'Learned to diagnose real user and infrastructure problems under practical constraints.'),
        ('it_support', 'fr', 'Support informatique', 'Apprendre à diagnostiquer des problèmes réels d’utilisateurs et d’infrastructure sous contraintes pratiques.'),
        ('industry', 'en', 'Relevant industry', 'Industrial context connected software decisions to operations, reliability, and concrete consequences.'),
        ('industry', 'fr', 'Industrie pertinente', 'Le contexte industriel relie les décisions logicielles aux opérations, à la fiabilité et à des conséquences concrètes.'),
        ('development_akiksystems', 'en', 'Development and AkikSystems', 'The path converges on building inspectable software systems with deliberate architecture and evidence.'),
        ('development_akiksystems', 'fr', 'Développement et AkikSystems', 'Le parcours converge vers des systèmes logiciels inspectables, une architecture délibérée et des preuves concrètes.')
    ) as copy(stage_key, locale, title, summary)
    where profiles.singleton_key = 'public'
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .dropTable('profile_technology_journey_stage_localizations')
    .execute();
  await db.schema.dropTable('profile_technology_journey_stages').execute();
}
