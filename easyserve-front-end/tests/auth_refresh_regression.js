// Browser regression tests for session restore on page refresh.
//
// Needs the backend (default http://127.0.0.1:8000) and the frontend
// (default http://localhost:3000) running, plus one active account per role.
//
//   WAITER_EMAIL=... CHEF_EMAIL=... MANAGER_EMAIL=... QA_PASSWORD=... \
//     node tests/auth_refresh_regression.js
//
// Optional: BASE_URL, CHROME_PATH (a Chrome/Chromium executable), and
// WAITER_PASSWORD / CHEF_PASSWORD / MANAGER_PASSWORD to override QA_PASSWORD.

const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const CHROME_PATH = process.env.CHROME_PATH || undefined;

const account = (role) => ({
  email: process.env[`${role.toUpperCase()}_EMAIL`],
  password: process.env[`${role.toUpperCase()}_PASSWORD`] || process.env.QA_PASSWORD,
});

const ACCOUNTS = {
  waiter: account('waiter'),
  chef: account('chef'),
  manager: account('manager'),
};

const results = [];
const record = (name, passed, detail) => {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const pathOf = (page) => new URL(page.url()).pathname;

// Attaches listeners that collect navigations and genuine browser errors
// (uncaught exceptions, hydration errors, app console.error calls).
// "Failed to load resource" lines are left out: 401s are expected while an
// expired token is refreshed, and unrelated assets (Stripe, footer links)
// can fail independently of auth.
const watch = (page) => {
  const log = { navigations: [], errors: [] };
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) log.navigations.push(new URL(frame.url()).pathname);
  });
  page.on('pageerror', (err) => log.errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (/^Failed to load resource/.test(text)) return;
    log.errors.push(text.slice(0, 200));
  });
  return log;
};

const login = async (page, role) => {
  const { email, password } = ACCOUNTS[role];
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle' });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 15000 });
  await page.waitForTimeout(1500);
};

const settle = (page) => page.waitForTimeout(4000);

const newPage = async (browser) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  return { context, page, log: watch(page) };
};

async function refreshKeepsRoute(browser, role, route, name) {
  const { context, page, log } = await newPage(browser);
  try {
    await login(page, role);
    await page.goto(`${BASE_URL}${route}`);
    await settle(page);
    const before = pathOf(page);
    log.navigations.length = 0;
    await page.reload();
    await settle(page);
    const after = pathOf(page);
    const ok = before === route && after === route && log.errors.length === 0;
    record(name, ok, `before=${before} after=${after} navigations=${log.navigations.join(',')} errors=${log.errors.length}`);
    if (log.errors.length) console.log('   ', log.errors);
  } finally {
    await context.close();
  }
}

async function run() {
  const missing = Object.entries(ACCOUNTS).filter(([, a]) => !a.email || !a.password);
  if (missing.length) {
    console.error(`Missing credentials for: ${missing.map(([r]) => r).join(', ')}`);
    process.exit(2);
  }

  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });

  try {
    // 1-4: refresh keeps the session and the (nested) route.
    await refreshKeepsRoute(browser, 'waiter', '/waiter', '1. Waiter refresh stays on /waiter');
    await refreshKeepsRoute(browser, 'chef', '/chef', '2. Chef refresh stays on /chef');
    await refreshKeepsRoute(browser, 'manager', '/manager', '3. Manager refresh stays on /manager');
    await refreshKeepsRoute(browser, 'manager', '/manager/cash', '4. Manager refresh stays on /manager/cash');

    // Root cause: two roles in tabs of the same browser. Logging in as Chef
    // in a second tab used to overwrite the Waiter tab's session.
    {
      const context = await browser.newContext();
      try {
        const waiter = await context.newPage();
        const waiterLog = watch(waiter);
        await login(waiter, 'waiter');
        const chef = await context.newPage();
        await login(chef, 'chef');
        await waiter.reload();
        await chef.reload();
        await settle(waiter);
        const ok = pathOf(waiter) === '/waiter' && pathOf(chef) === '/chef' && waiterLog.errors.length === 0;
        record('1b. Waiter tab survives a Chef login in another tab + refresh', ok, `waiter=${pathOf(waiter)} chef=${pathOf(chef)}`);

        // A newly opened tab starts with the most recent login (Chef).
        const fresh = await context.newPage();
        await fresh.goto(`${BASE_URL}/chef`);
        await settle(fresh);
        record('1c. New tab starts signed in with the latest login', pathOf(fresh) === '/chef', `new tab=${pathOf(fresh)}`);
      } finally {
        await context.close();
      }
    }

    // 5: a slow session check must not redirect while it is pending.
    {
      const { context, page, log } = await newPage(browser);
      try {
        await login(page, 'waiter');
        await page.route('**/api/user/me/', async (route) => {
          await new Promise((r) => setTimeout(r, 3000));
          await route.continue();
        });
        log.navigations.length = 0;
        await page.reload();
        await page.waitForTimeout(1500);
        const during = pathOf(page);
        await settle(page);
        const ok = during === '/waiter' && pathOf(page) === '/waiter' && log.navigations.every((p) => p === '/waiter');
        record('5. Pending session check does not cause a redirect', ok, `during=${during} after=${pathOf(page)} navigations=${log.navigations.join(',')}`);
      } finally {
        await context.close();
      }
    }

    // 6: an expired access token is restored through the refresh token.
    {
      const { context, page, log } = await newPage(browser);
      try {
        await login(page, 'chef');
        await page.evaluate(() => {
          sessionStorage.setItem('token', 'expired.invalid.token');
          localStorage.setItem('token', 'expired.invalid.token');
        });
        let refreshed = false;
        page.on('response', (res) => {
          if (res.url().includes('/user/token-refresh/') && res.status() === 200) refreshed = true;
        });
        await page.reload();
        await settle(page);
        const newToken = await page.evaluate(() => sessionStorage.getItem('token'));
        const ok = refreshed && pathOf(page) === '/chef' && newToken !== 'expired.invalid.token' && log.errors.length === 0;
        record('6. Expired access token is refreshed and route kept', ok, `refreshed=${refreshed} path=${pathOf(page)}`);
      } finally {
        await context.close();
      }
    }

    // 7: a genuinely invalid session goes to /auth/login and is cleared.
    {
      const { context, page } = await newPage(browser);
      try {
        await login(page, 'waiter');
        await page.evaluate(() => {
          for (const s of [sessionStorage, localStorage]) {
            s.setItem('token', 'expired.invalid.token');
            s.setItem('refresh_token', 'invalid.refresh.token');
          }
        });
        await page.reload();
        await settle(page);
        const stored = await page.evaluate(() => sessionStorage.getItem('token') || localStorage.getItem('token'));
        const ok = pathOf(page) === '/auth/login' && !stored;
        record('7. Invalid session redirects to /auth/login', ok, `path=${pathOf(page)} tokenLeft=${!!stored}`);
      } finally {
        await context.close();
      }
    }

    // 8: unauthenticated visitors cannot open dashboards.
    {
      const { context, page } = await newPage(browser);
      try {
        const landed = [];
        for (const route of ['/waiter', '/chef', '/manager', '/manager/cash']) {
          await page.goto(`${BASE_URL}${route}`);
          await settle(page);
          landed.push(`${route}->${pathOf(page)}`);
        }
        const ok = landed.every((l) => l.endsWith('->/auth/login'));
        record('8. Unauthenticated visitor is sent to /auth/login', ok, landed.join(' '));
      } finally {
        await context.close();
      }
    }

    // 9: a user never stays on another role's dashboard.
    {
      const { context, page } = await newPage(browser);
      try {
        await login(page, 'chef');
        await page.goto(`${BASE_URL}/waiter`);
        await settle(page);
        const chefOnWaiter = pathOf(page);
        await page.goto(`${BASE_URL}/manager/cash`);
        await settle(page);
        const chefOnCash = pathOf(page);
        const ok = chefOnWaiter === '/chef' && chefOnCash === '/chef';
        record('9. Wrong role is sent to its own dashboard', ok, `chef@/waiter->${chefOnWaiter} chef@/manager/cash->${chefOnCash}`);
      } finally {
        await context.close();
      }
    }

    // 10: no redirect loop or browser errors across repeated refreshes.
    {
      const { context, page, log } = await newPage(browser);
      try {
        await login(page, 'manager');
        await page.goto(`${BASE_URL}/manager/cash`);
        await settle(page);
        log.navigations.length = 0;
        for (let i = 0; i < 3; i += 1) {
          await page.reload();
          await page.waitForTimeout(2500);
        }
        const ok = pathOf(page) === '/manager/cash' && log.navigations.length <= 6 && log.errors.length === 0;
        record('10. No redirect loop or console errors on repeated refresh', ok, `navigations=${log.navigations.length} errors=${log.errors.length}`);
        if (log.errors.length) console.log('   ', log.errors);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.passed);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
