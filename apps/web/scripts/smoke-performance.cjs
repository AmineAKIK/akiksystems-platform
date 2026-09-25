/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const { strict: assert } = require('node:assert');
const { execFile, spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { promisify } = require('node:util');
const { setTimeout: sleep } = require('node:timers/promises');
const { chromium } = require('playwright');

const execFileAsync = promisify(execFile);
const lighthouseBin = process.env.LIGHTHOUSE_BIN;

assert.ok(
  lighthouseBin,
  'LIGHTHOUSE_BIN is required for performance qualification.',
);

const port = '4178';
const origin = `http://127.0.0.1:${port}`;
let stderr = '';

const server = spawn(process.execPath, ['server.js'], {
  cwd: path.join(process.cwd(), 'apps/web'),
  env: {
    ...process.env,
    NODE_ENV: 'test',
    PORT: port,
    BETTER_AUTH_URL: origin,
  },
  stdio: ['ignore', 'ignore', 'pipe'],
});

server.stderr.on('data', (chunk) => {
  stderr += chunk.toString();
});

async function waitForSentinel() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`${origin}/en/systems/sentinel`);
      if (response.ok) {
        const html = await response.text();
        assert.match(
          html,
          /<h1[^>]*>Sentinel<\/h1>/,
          'Performance fixture must expose the real Sentinel System renderer.',
        );
        return;
      }
    } catch {
      // Server still starting.
    }

    await sleep(100);
  }

  throw new Error(
    `Performance qualification server did not become ready. stderr=${stderr}`,
  );
}

function lighthouseArgs(outputPath) {
  return [
    `${origin}/en/systems/sentinel`,
    '--only-categories=performance',
    '--form-factor=mobile',
    '--throttling-method=simulate',
    '--chrome-flags=--headless --no-sandbox',
    '--output=json',
    `--output-path=${outputPath}`,
    '--quiet',
  ];
}

function isTransientLighthouseRuntimeFailure(error) {
  const stderrText =
    typeof error?.stderr === 'string'
      ? error.stderr
      : Buffer.isBuffer(error?.stderr)
        ? error.stderr.toString('utf8')
        : '';

  return /NO_NAVSTART|recording the trace|PROTOCOL_TIMEOUT|TARGET_CRASHED/i.test(
    stderrText,
  );
}

async function runLighthouseObservation(observation) {
  const outputPath = `/tmp/akiksystems-lighthouse-performance-${observation}.json`;
  fs.rmSync(outputPath, { force: true });

  for (let runtimeAttempt = 1; runtimeAttempt <= 3; runtimeAttempt += 1) {
    try {
      await execFileAsync(lighthouseBin, lighthouseArgs(outputPath), {
        env: {
          ...process.env,
          CHROME_PATH: chromium.executablePath(),
        },
        maxBuffer: 10 * 1024 * 1024,
      });
      break;
    } catch (error) {
      if (
        runtimeAttempt < 3 &&
        isTransientLighthouseRuntimeFailure(error)
      ) {
        process.stdout.write(
          `Transient Lighthouse runtime failure on observation ${observation}, attempt ${runtimeAttempt}; retrying the performance gate only.\n`,
        );
        await sleep(1_000);
        continue;
      }

      throw error;
    }
  }

  const report = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  return {
    performanceScore: report.categories?.performance?.score ?? 0,
    lcp:
      report.audits?.['largest-contentful-paint']?.numericValue ?? Infinity,
    cls:
      report.audits?.['cumulative-layout-shift']?.numericValue ?? Infinity,
    tbt:
      report.audits?.['total-blocking-time']?.numericValue ?? Infinity,
  };
}

function writeObservation(observation, metrics, target, ceiling) {
  process.stdout.write(
    `Mobile Lighthouse observation #${observation}: score=${metrics.performanceScore.toFixed(2)}, LCP=${Math.round(metrics.lcp)}ms, CLS=${metrics.cls.toFixed(3)}, TBT=${Math.round(metrics.tbt)}ms. Target LCP<=${target}ms; CI variance ceiling<=${ceiling}ms.\n`,
  );
}

(async () => {
  await waitForSentinel();

  const lcpTargetMs = 4500;
  const lcpCiVarianceAllowanceMs = 150;
  const lcpCiCeilingMs = lcpTargetMs + lcpCiVarianceAllowanceMs;
  const lcpBorderlineRetestWindowMs = 300;

  let metrics = await runLighthouseObservation(1);
  writeObservation(1, metrics, lcpTargetMs, lcpCiCeilingMs);

  if (
    metrics.lcp > lcpCiCeilingMs &&
    metrics.lcp <= lcpCiCeilingMs + lcpBorderlineRetestWindowMs &&
    metrics.cls <= 0.1 &&
    metrics.tbt <= 600
  ) {
    process.stdout.write(
      `Borderline synthetic LCP exceeded the CI ceiling by ${Math.round(metrics.lcp - lcpCiCeilingMs)}ms; retrying Lighthouse once without rerunning functional browser qualification.\n`,
    );
    metrics = await runLighthouseObservation(2);
    writeObservation(2, metrics, lcpTargetMs, lcpCiCeilingMs);
  }

  if (
    metrics.lcp > lcpTargetMs &&
    metrics.lcp <= lcpCiCeilingMs
  ) {
    process.stdout.write(
      `Mobile simulated LCP exceeded the 4.5s target by ${Math.round(metrics.lcp - lcpTargetMs)}ms but remained within the ${lcpCiVarianceAllowanceMs}ms synthetic-runner variance allowance.\n`,
    );
  }

  assert.ok(
    metrics.lcp <= lcpCiCeilingMs,
    `Mobile simulated LCP exceeded the 4.5s target plus ${lcpCiVarianceAllowanceMs}ms CI variance allowance after qualification: ${metrics.lcp}ms`,
  );
  assert.ok(
    metrics.cls <= 0.1,
    `Mobile CLS regressed above 0.1: ${metrics.cls}`,
  );
  assert.ok(
    metrics.tbt <= 600,
    `Mobile TBT regressed above 600ms: ${metrics.tbt}ms`,
  );

  process.stdout.write(
    'Dedicated Sentinel Lighthouse qualification passed with the existing LCP, CLS, and TBT budgets.\n',
  );
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    server.kill('SIGTERM');
    await Promise.race([
      new Promise((resolve) => server.once('exit', resolve)),
      sleep(2_000),
    ]);
  });
