/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { setTimeout: sleep } = require('node:timers/promises');
const { Pool } = require('pg');
const { chromium } = require('playwright');

const port = '4180';
const origin = 'http://127.0.0.1:' + port;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for the Profile browser smoke.');
}

const pool = new Pool({ connectionString: databaseUrl });
const technologyId = randomUUID();
const technologySlug = 'profile-smoke-' + technologyId.slice(0, 8);

function content() {
  return {
    hero: {
      eyebrow: 'Profile',
      professionalTitle: 'Systems builder',
      specialization: 'Software systems',
      introduction: 'A browser-smoke Profile publication.',
      cvLabel: 'Download CV',
    },
    stack: {
      eyebrow: 'Stack',
      title: 'What I master, and where to verify it.',
      introduction: 'Published evidence belongs to canonical Systems.',
      proofCountLabel: 'Proved in',
      inspectSystemLabel: 'Inspect system',
    },
    guidance: {
      eyebrow: 'What guides my work',
      title: 'One problem, four perspectives.',
      introduction: 'Code, management, field work and infrastructure.',
      centerLabel: 'Systemic view',
      benefitLabel: 'What it brings',
      avoidanceLabel: 'What it avoids',
      questionsLabel: 'Questions',
      looks: {
        code: {
          title: 'Code',
          description: 'Maintainable software.',
          benefit: 'Durability.',
          avoidance: 'Short-lived shortcuts.',
          questions: ['Can it be maintained?'],
        },
        management: {
          title: 'Management',
          description: 'Decisions and constraints.',
          benefit: 'Clear arbitration.',
          avoidance: 'Hidden coordination cost.',
          questions: ['Who decides?'],
        },
        field: {
          title: 'Field',
          description: 'Real work conditions.',
          benefit: 'Useful workflows.',
          avoidance: 'Screen-only solutions.',
          questions: ['What happens in practice?'],
        },
        infrastructure: {
          title: 'Infrastructure',
          description: 'Operational boundaries.',
          benefit: 'Deployable systems.',
          avoidance: 'Fragile assumptions.',
          questions: ['Where does it run?'],
        },
      },
    },
    capabilities: {
      eyebrow: 'Capabilities',
      title: 'From framing to evolution.',
      beforeCodingLabel: 'Before coding',
      buildDeliverLabel: 'Build and deliver',
      runLiveLabel: 'Run and evolve',
      deliverableLabel: 'What you receive',
      crossCuttingLabel: 'Throughout the project',
      steps: {
        frame: {
          title: 'Frame',
          purpose: 'Clarify the real problem.',
          actions: ['Map the workflow.'],
          deliverable: 'A clear frame.',
        },
        design: {
          title: 'Design',
          purpose: 'Shape the system.',
          actions: ['Model boundaries.'],
          deliverable: 'A coherent design.',
        },
        validate: {
          title: 'Validate',
          purpose: 'Reduce uncertainty.',
          actions: ['Test assumptions.'],
          deliverable: 'Validated decisions.',
        },
        develop: {
          title: 'Develop',
          purpose: 'Build the product.',
          actions: ['Implement deliberately.'],
          deliverable: 'Working software.',
        },
        test_secure: {
          title: 'Test & secure',
          purpose: 'Make failure visible.',
          actions: ['Automate checks.'],
          deliverable: 'Qualified software.',
        },
        deploy: {
          title: 'Deploy',
          purpose: 'Put it in real conditions.',
          actions: ['Ship repeatably.'],
          deliverable: 'A deployed system.',
        },
        operate: {
          title: 'Operate',
          purpose: 'Keep it observable.',
          actions: ['Watch production.'],
          deliverable: 'An operable system.',
        },
        evolve: {
          title: 'Evolve',
          purpose: 'Learn from use.',
          actions: ['Feed observations back.'],
          deliverable: 'The next informed iteration.',
        },
      },
      crossCutting: {
        project_management: {
          title: 'Project management',
          description: 'Make progress and risk explicit.',
        },
        collaboration: {
          title: 'Collaboration',
          description: 'Work with the people involved.',
        },
        documentation: {
          title: 'Documentation',
          description: 'Keep knowledge durable.',
        },
        transparency: {
          title: 'Transparency',
          description: 'State what is and is not proven.',
        },
      },
    },
    systemicScale: {
      eyebrow: 'The meaning of the slogan',
      title: 'Systemic Scale',
      statementPrimary: 'Intervene on one part.',
      statementSecondary: 'Evaluate across a wider boundary.',
      introduction: 'Local interventions can have non-local effects.',
      exampleLabel: 'In the example',
      questionLabel: 'The question to ask',
      processLabels: {
        reservation: 'Reservation',
        assignment: 'Assignment',
        use: 'Use',
        return: 'Return',
        verification: 'Verification',
        restoration: 'Restoration',
        location: 'Location',
        available: 'Available',
      },
      steps: {
        read_request: {
          title: 'Read the request',
          principle: 'Start with what is being asked.',
          example: 'A shared-resource request.',
          question: 'What is actually requested?',
          diagramLeadLabel: 'Observed process',
          diagramAlt: 'Eight-step shared-resource process.',
        },
        widen_view: {
          title: 'Widen the view',
          principle: 'Follow the effects.',
          example: 'Look beyond assignment.',
          question: 'Where do effects travel?',
          diagramLeadLabel: 'Wider boundary',
          diagramAlt: 'The same process viewed across a wider boundary.',
        },
        act_right_place: {
          title: 'Act in the right place',
          principle: 'Change the leverage point.',
          example: 'Move the rule rather than add a screen.',
          question: 'Where is the leverage point?',
          diagramLeadLabel: 'Leverage point',
          diagramAlt: 'Process with the intervention area highlighted.',
        },
        verify_effect: {
          title: 'Verify the effect',
          principle: 'Observe the result in the whole flow.',
          example: 'Check what changed downstream.',
          question: 'Did the system improve?',
          diagramLeadLabel: 'Observed effect',
          diagramAlt: 'Process with the verification boundary highlighted.',
        },
      },
    },
    emblem: {
      eyebrow: 'AkikSystems emblem',
      title: 'What the emblem says',
      symbols: {
        eagle: { name: 'Eagle', concept: 'Overview', description: 'See the whole.' },
        snake: { name: 'Snake', concept: 'Field', description: 'Know the ground.' },
        olive: { name: 'Olive', concept: 'Roots', description: 'Build to last.' },
        sea: { name: 'Sea', concept: 'Openness', description: 'Keep the horizon open.' },
        stars: { name: 'Stars', concept: 'Horizon', description: 'Keep exploring.' },
      },
      conclusion: 'Height of view requires knowledge of the ground.',
    },
    callToAction: {
      eyebrow: 'Work together',
      title: 'A business system to design, recover or make reliable?',
      buttonLabel: 'Start a conversation',
    },
  };
}

async function seedProfile() {
  const client = await pool.connect();
  try {
    const profileResult = await client.query(
      "select id from profiles where singleton_key = 'public'",
    );
    const profileId = profileResult.rows[0]?.id;
    assert.ok(profileId, 'Profile singleton must exist before browser qualification.');

    await client.query(
      'insert into technologies (id, slug, name) values ($1, $2, $3)',
      [technologyId, technologySlug, 'React'],
    );

    const snapshot = {
      version: 1,
      profileId,
      locale: 'en',
      displayName: 'Browser Smoke Profile',
      portraitAssetId: null,
      portraitAltText: null,
      sourceCvAssetId: null,
      content: content(),
      contacts: [],
      languages: ['en', 'fr'],
      mobility: {
        worldwide: true,
        remote: true,
        relocation: false,
      },
      currentSystemId: null,
      stackGroups: [
        {
          id: randomUUID(),
          position: 0,
          title: 'Front-end',
          technologies: [{ id: technologyId, position: 0 }],
        },
      ],
      systemicScaleWritingId: null,
    };

    await client.query(
      [
        'insert into profile_publications',
        '(profile_id, locale, snapshot, published_at, updated_at)',
        'values ($1, $2, $3::jsonb, now(), now())',
        'on conflict (profile_id, locale) do update set',
        'snapshot = excluded.snapshot, published_at = now(), updated_at = now()',
      ].join(' '),
      [profileId, 'en', JSON.stringify(snapshot)],
    );

    return profileId;
  } finally {
    client.release();
  }
}

async function cleanup(profileId) {
  const client = await pool.connect();
  try {
    await client.query(
      "delete from profile_publications where profile_id = $1 and locale = 'en'",
      [profileId],
    );
    await client.query('delete from technologies where id = $1', [technologyId]);
  } finally {
    client.release();
  }
}

const server = spawn(process.execPath, ['server.js'], {
  cwd: path.resolve(__dirname, '..'),
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: port,
    BETTER_AUTH_URL: origin,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let stderr = '';
server.stderr.on('data', (chunk) => {
  stderr += chunk.toString();
});

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await globalThis.fetch(origin + '/en/profile');
      if (response.status === 200) return;
    } catch {
      // Production server is still starting.
    }
    await sleep(125);
  }

  throw new Error('Profile browser smoke server did not become ready. stderr=' + stderr);
}

async function measure(page) {
  return page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const element = (selector) => {
      const match = document.querySelector(selector);
      return match instanceof HTMLElement ? match : null;
    };
    const px = (target, property) =>
      Number.parseFloat(getComputedStyle(target)[property]);

    const container = element('.aks-profile .aks-container[data-width="wide"]');
    const hero = element('.aks-profile-hero');
    const stack = element('.aks-profile-stack');
    const stackHeading = element('.aks-profile-stack-heading');
    const stackTitle = element('.aks-profile-stack-heading h2');
    const stackIcon = element('.aks-profile-stack-icon');
    const stackTrigger = element('.aks-profile-stack-trigger');
    const stackName = element('.aks-profile-stack-name');
    const stackCategory = element('.aks-profile-stack-category');
    const guidanceMap = element('.aks-profile-guidance-map');
    const guidanceTitle = element('.aks-profile-guidance-intro h2');
    const guidanceIntroduction = element(
      '.aks-profile-guidance-intro .aks-profile-body-copy',
    );
    const guidanceConclusion = element('.aks-profile-guidance-conclusion');
    const capabilityTabs = element('.aks-profile-capability-tabs');
    const capabilityTab = element('.aks-profile-capability-tab');
    const capabilityIcon = element('.aks-profile-capability-icon');
    const capabilityPanel = element('.aks-profile-capability-panel');
    const crossCuttingIcon = element('.aks-profile-cross-cutting-icon');
    const systemicTitle = element('.aks-profile-systemic-intro h2');
    const systemicTab = element('.aks-profile-systemic-tab');
    const systemicPanel = element('.aks-profile-systemic-panel');
    const systemicChain = element('.aks-profile-systemic-chain');
    const systemicNode = element('.aks-profile-systemic-process-node');
    const emblemMap = element('.aks-profile-emblem-map');
    const emblemMobile = element('.aks-profile-emblem-mobile');
    const emblemMobileMark = element('.aks-profile-emblem-mobile-mark');
    const cta = element('.aks-profile-cta');

    if (
      container === null ||
      hero === null ||
      stack === null ||
      stackHeading === null ||
      stackTitle === null ||
      stackIcon === null ||
      stackTrigger === null ||
      stackName === null ||
      stackCategory === null ||
      guidanceMap === null ||
      guidanceTitle === null ||
      guidanceIntroduction === null ||
      capabilityTabs === null ||
      capabilityTab === null ||
      capabilityIcon === null ||
      capabilityPanel === null ||
      crossCuttingIcon === null ||
      systemicTitle === null ||
      systemicTab === null ||
      systemicPanel === null ||
      systemicChain === null ||
      systemicNode === null ||
      emblemMap === null ||
      emblemMobile === null ||
      cta === null
    ) {
      return null;
    }

    return {
      viewportWidth,
      scrollWidth: document.documentElement.scrollWidth,
      containerWidth: container.getBoundingClientRect().width,
      heroPaddingTop: px(hero, 'paddingTop'),
      heroPaddingBottom: px(hero, 'paddingBottom'),
      stackPaddingTop: px(stack, 'paddingTop'),
      stackPaddingBottom: px(stack, 'paddingBottom'),
      stackHeadingPosition: getComputedStyle(stackHeading).position,
      stackHeadingAlignSelf: getComputedStyle(stackHeading).alignSelf,
      stackTitleFontSize: px(stackTitle, 'fontSize'),
      stackIconWidth: stackIcon.getBoundingClientRect().width,
      stackTriggerMinHeight: px(stackTrigger, 'minHeight'),
      stackTriggerGap: px(stackTrigger, 'gap'),
      stackNameFontSize: px(stackName, 'fontSize'),
      stackCategoryFontSize: px(stackCategory, 'fontSize'),
      stackCategoryTextTransform: getComputedStyle(stackCategory).textTransform,
      guidanceDisplay: getComputedStyle(guidanceMap).display,
      guidanceTitleFontSize: px(guidanceTitle, 'fontSize'),
      guidanceIntroductionFontSize: px(guidanceIntroduction, 'fontSize'),
      guidanceConclusionFontSize:
        guidanceConclusion === null
          ? null
          : px(guidanceConclusion, 'fontSize'),
      capabilityColumns: getComputedStyle(capabilityTabs).gridTemplateColumns,
      capabilityTabMinHeight: px(capabilityTab, 'minHeight'),
      capabilityIconWidth: capabilityIcon.getBoundingClientRect().width,
      capabilityPanelMarginLeft: px(capabilityPanel, 'marginLeft'),
      crossCuttingIconDisplay: getComputedStyle(crossCuttingIcon).display,
      systemicTitleFontSize: px(systemicTitle, 'fontSize'),
      systemicTabFontSize: px(systemicTab, 'fontSize'),
      systemicPanelDisplay: getComputedStyle(systemicPanel).display,
      systemicPanelMarginLeft: px(systemicPanel, 'marginLeft'),
      systemicDisplay: getComputedStyle(systemicChain).display,
      systemicDirection: getComputedStyle(systemicChain).flexDirection,
      systemicNodeWidth: systemicNode.getBoundingClientRect().width,
      systemicNodeMinHeight: px(systemicNode, 'minHeight'),
      emblemMapDisplay: getComputedStyle(emblemMap).display,
      emblemMobileDisplay: getComputedStyle(emblemMobile).display,
      emblemMobileMarkWidth:
        emblemMobileMark === null
          ? null
          : emblemMobileMark.getBoundingClientRect().width,
      ctaPaddingTop: px(cta, 'paddingTop'),
      ctaPaddingBottom: px(cta, 'paddingBottom'),
      overflowing: [...document.querySelectorAll('body *')]
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            tag: element.tagName,
            className:
              element instanceof HTMLElement
                ? element.className
                : element.getAttribute('class') ?? '',
            left: rect.left,
            right: rect.right,
            width: rect.width,
          };
        })
        .filter(
          (entry) =>
            entry.width > 0 &&
            (entry.left < -1 || entry.right > viewportWidth + 1),
        )
        .slice(0, 12),
    };
  });
}

function assertClose(actual, expected, tolerance, message) {
  assert.equal(
    Math.abs(actual - expected) <= tolerance,
    true,
    message + ' expected ' + expected + '±' + tolerance + ', got ' + actual,
  );
}

async function assertViewport(browser, viewport, name, mobile) {
  const context = await browser.newContext({
    viewport,
    hasTouch: mobile,
    isMobile: mobile,
  });

  try {
    const page = await context.newPage();
    const response = await page.goto(origin + '/en/profile');
    assert.equal(response?.status(), 200, name + ' must return HTTP 200.');
    await page.locator('.aks-profile').waitFor();

    const metrics = await measure(page);
    assert.ok(metrics, name + ' must expose the complete Profile composition.');
    assert.equal(
      metrics.scrollWidth <= metrics.viewportWidth,
      true,
      name +
        ' must not overflow horizontally. offenders=' +
        JSON.stringify(metrics.overflowing),
    );

    assert.equal(
      await page.locator('[data-profile-section="hero"]').count(),
      1,
      name + ' must render the hero once.',
    );
    assert.equal(
      await page.locator('[data-profile-section="stack"]').count(),
      1,
      name + ' must render the Stack once.',
    );
    assert.equal(
      await page.locator('[data-profile-section="guidance"]').count(),
      1,
      name + ' must render guidance once.',
    );
    assert.equal(
      await page.locator('[data-profile-section="capabilities"]').count(),
      1,
      name + ' must render capabilities once.',
    );
    assert.equal(
      await page.locator('[data-profile-section="systemic-scale"]').count(),
      1,
      name + ' must render Systemic Scale once.',
    );

    const stackTrigger = page.locator('.aks-profile-stack-trigger').first();
    assert.equal(await stackTrigger.getAttribute('aria-expanded'), 'true');
    await stackTrigger.click();
    assert.equal(await stackTrigger.getAttribute('aria-expanded'), 'false');
    await stackTrigger.click();
    assert.equal(await stackTrigger.getAttribute('aria-expanded'), 'true');

    const management = page.locator(
      '.aks-profile-guidance-node[data-guidance-key="management"]',
    );
    await management.click();
    assert.equal(await management.getAttribute('aria-pressed'), 'true');
    await page.locator('.aks-profile-guidance-detail').getByRole('heading', {
      name: 'Management',
    }).waitFor();

    const capabilityTabs = page.locator('.aks-profile-capability-tab');
    await capabilityTabs.nth(1).click();
    assert.equal(await capabilityTabs.nth(1).getAttribute('aria-selected'), 'true');
    await page.locator('#profile-capability-panel').getByRole('heading', {
      name: 'Design',
    }).waitFor();

    const systemicTabs = page.locator('.aks-profile-systemic-tab');
    await systemicTabs.nth(1).click();
    assert.equal(await systemicTabs.nth(1).getAttribute('aria-selected'), 'true');
    await page.locator('#profile-systemic-panel').getByRole('heading', {
      name: 'Widen the view',
    }).waitFor();

    assert.equal(
      metrics.crossCuttingIconDisplay,
      'none',
      name + ' cross-cutting capabilities must match the text-only reference.',
    );

    if (mobile) {
      assertClose(metrics.containerWidth, 358, 1, name + ' content width');
      assertClose(metrics.heroPaddingTop, 36, 0.5, name + ' hero top padding');
      assertClose(metrics.heroPaddingBottom, 52, 0.5, name + ' hero bottom padding');
      assertClose(metrics.stackPaddingTop, 56, 0.5, name + ' Stack top padding');
      assertClose(metrics.stackPaddingBottom, 56, 0.5, name + ' Stack bottom padding');
      assertClose(metrics.stackTitleFontSize, 30, 0.5, name + ' Stack title size');
      assertClose(metrics.stackIconWidth, 40, 0.5, name + ' Stack icon size');
      assertClose(metrics.stackTriggerMinHeight, 60, 0.5, name + ' Stack row height');
      assertClose(metrics.stackTriggerGap, 14, 0.5, name + ' Stack row gap');
      assertClose(metrics.stackNameFontSize, 17, 0.5, name + ' Stack name size');
      assertClose(metrics.stackCategoryFontSize, 12, 0.5, name + ' Stack category size');
      assert.equal(metrics.stackCategoryTextTransform, 'none');
      assert.equal(metrics.guidanceDisplay, 'grid');
      assertClose(metrics.guidanceTitleFontSize, 30, 0.5, name + ' guidance title size');
      assertClose(
        metrics.guidanceIntroductionFontSize,
        15,
        0.5,
        name + ' guidance introduction size',
      );
      if (metrics.guidanceConclusionFontSize !== null) {
        assertClose(
          metrics.guidanceConclusionFontSize,
          15,
          0.5,
          name + ' guidance conclusion size',
        );
      }
      assertClose(metrics.capabilityTabMinHeight, 96, 0.5, name + ' capability tab height');
      assertClose(metrics.capabilityIconWidth, 44, 0.5, name + ' capability icon size');
      assertClose(metrics.capabilityPanelMarginLeft, 0, 0.5, name + ' capability panel inset');
      assertClose(metrics.systemicTitleFontSize, 60, 0.5, name + ' Systemic Scale title size');
      assertClose(metrics.systemicTabFontSize, 13, 0.5, name + ' Systemic tab size');
      assert.equal(metrics.systemicPanelDisplay, 'flex');
      assertClose(metrics.systemicPanelMarginLeft, 0, 0.5, name + ' Systemic panel inset');
      assert.equal(metrics.systemicDisplay, 'flex');
      assert.equal(metrics.systemicDirection, 'column');
      assertClose(metrics.systemicNodeWidth, 148, 0.5, name + ' process node width');
      assertClose(metrics.systemicNodeMinHeight, 36, 0.5, name + ' process node height');
      assert.equal(metrics.emblemMapDisplay, 'none');
      assert.notEqual(metrics.emblemMobileDisplay, 'none');
      assertClose(metrics.emblemMobileMarkWidth, 220, 0.5, name + ' emblem size');
      assertClose(metrics.ctaPaddingTop, 56, 0.5, name + ' CTA top padding');
      assertClose(metrics.ctaPaddingBottom, 56, 0.5, name + ' CTA bottom padding');

      const columnCount = metrics.capabilityColumns
        .split(' ')
        .filter(Boolean).length;
      assert.equal(columnCount, 4, name + ' capability rail must use four columns.');
    } else {
      assertClose(metrics.containerWidth, 1100, 1, name + ' content width');
      assertClose(metrics.heroPaddingTop, 80, 0.5, name + ' hero top padding');
      assertClose(metrics.heroPaddingBottom, 96, 0.5, name + ' hero bottom padding');
      assertClose(metrics.stackPaddingTop, 96, 0.5, name + ' Stack top padding');
      assertClose(metrics.stackPaddingBottom, 112, 0.5, name + ' Stack bottom padding');
      assert.equal(metrics.stackHeadingPosition, 'static');
      assert.equal(metrics.stackHeadingAlignSelf, 'center');
      assertClose(metrics.stackTitleFontSize, 46, 0.5, name + ' Stack title size');
      assertClose(metrics.guidanceTitleFontSize, 50, 0.5, name + ' guidance title size');
      assertClose(
        metrics.guidanceIntroductionFontSize,
        16,
        0.5,
        name + ' guidance introduction size',
      );
      if (metrics.guidanceConclusionFontSize !== null) {
        assertClose(
          metrics.guidanceConclusionFontSize,
          17,
          0.5,
          name + ' guidance conclusion size',
        );
      }
      assertClose(metrics.capabilityTabMinHeight, 78, 0.5, name + ' capability tab height');
      assertClose(metrics.capabilityIconWidth, 44, 0.5, name + ' capability icon size');
      assertClose(metrics.capabilityPanelMarginLeft, -32, 0.5, name + ' capability panel bleed');
      assertClose(metrics.systemicTitleFontSize, 96, 0.5, name + ' Systemic Scale title size');
      assertClose(metrics.systemicTabFontSize, 18, 0.5, name + ' Systemic tab size');
      assert.equal(metrics.systemicPanelDisplay, 'flex');
      assertClose(metrics.systemicPanelMarginLeft, -32, 0.5, name + ' Systemic panel bleed');
      assert.equal(metrics.systemicDisplay, 'grid');
      assertClose(metrics.systemicNodeWidth, 120, 1, name + ' process node width');
      assertClose(metrics.systemicNodeMinHeight, 46, 0.5, name + ' process node height');
      assert.notEqual(metrics.emblemMapDisplay, 'none');
      assert.equal(metrics.emblemMobileDisplay, 'none');
      assertClose(metrics.ctaPaddingTop, 120, 0.5, name + ' CTA top padding');
      assertClose(metrics.ctaPaddingBottom, 120, 0.5, name + ' CTA bottom padding');

      const columnCount = metrics.capabilityColumns
        .split(' ')
        .filter(Boolean).length;
      assert.equal(columnCount, 8, name + ' capability rail must use eight columns.');
    }
  } finally {
    await context.close();
  }
}

async function assertReducedMotion(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  });

  try {
    const page = await context.newPage();
    await page.goto(origin + '/en/profile');
    const duration = await page
      .locator('.aks-profile-stack-panel')
      .evaluate((element) => getComputedStyle(element).animationDuration);
    assert.ok(
      duration === '0.001s' || duration === '0s',
      'Reduced motion must collapse Profile animation duration.',
    );
  } finally {
    await context.close();
  }
}

(async () => {
  let profileId;
  let browser;

  try {
    profileId = await seedProfile();
    await waitForServer();

    browser = await chromium.launch({ headless: true });
    await assertViewport(
      browser,
      { width: 390, height: 844 },
      '390px Profile',
      true,
    );
    await assertViewport(
      browser,
      { width: 1440, height: 1000 },
      '1440px Profile',
      false,
    );
    await assertReducedMotion(browser);

    console.log(
      'Profile browser smoke passed: approved 390/1440 geometry, interactions, overflow, responsive representation and reduced motion are qualified.',
    );
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
    await Promise.race([
      new Promise((resolve) => server.once('exit', resolve)),
      sleep(2000),
    ]);
    if (profileId) await cleanup(profileId);
    await pool.end();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
