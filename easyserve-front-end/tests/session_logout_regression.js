// Browser regression tests for explicit logout, switching users in one tab,
// and a temporarily unreachable backend during a page refresh.
//
// Same setup as tests/auth_refresh_regression.js:
//
//   WAITER_EMAIL=... CHEF_EMAIL=... MANAGER_EMAIL=... QA_PASSWORD=... \
//     node tests/session_logout_regression.js
//
// Optional: BASE_URL, CHROME_PATH, WAITER_PASSWORD / CHEF_PASSWORD /
// MANAGER_PASSWORD.

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
const settle = (page) => page.waitForTimeout(4000);

const login = async (page, role, { navigate = true } = {}) => {
  const { email, password } = ACCOUNTS[role];
  if (navigate) await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle' });
  await page.waitForSelector('input[name="email"]');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 15000 });
  await page.waitForTimeout(1500);
};

const headerLogout = async (page) => {
  await page.getByRole('button', { name: 'Account' }).first().click();
  await page.getByRole('button', { name: 'Logout' }).first().click();
};

const storedTokens = (page) =>
  page.evaluate(() => ({
    session: sessionStorage.getItem('token'),
    shared: localStorage.getItem('token'),
  }));

async function run() {
  const missing = Object.entries(ACCOUNTS).filter(([, a]) => !a.email || !a.password);
  if (missing.length) {
    console.error(`Missing credentials for: ${missing.map(([r]) => r).join(', ')}`);
    process.exit(2);
  }

  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });

  try {
    // 11: explicit logout clears the session; dashboards are closed after it.
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      try {
        await login(page, 'waiter');
        await settle(page);
        await headerLogout(page);
        await settle(page);
        const afterLogout = pathOf(page);
        const tokens = await storedTokens(page);
        await page.goto(`${BASE_URL}/waiter`);
        await settle(page);
        const ok =
          afterLogout === '/auth/login' &&
          !tokens.session && !tokens.shared &&
          pathOf(page) === '/auth/login';
        record('11. Explicit logout clears the session and closes /waiter', ok,
          `afterLogout=${afterLogout} tokens=${JSON.stringify(tokens)} revisit=${pathOf(page)}`);
      } finally {
        await context.close();
      }
    }

    // 12: logging out and in as another role in the same tab must not reuse
    // the previous user's cached profile.
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      try {
        await login(page, 'waiter');
        await settle(page);
        await headerLogout(page);
        await page.waitForURL('**/auth/login', { timeout: 10000 });
        // Stay in the same page load (client-side navigation only), as a
        // user does when they log out and straight back in.
        await login(page, 'chef', { navigate: false });
        await settle(page);
        const landed = pathOf(page);
        await page.reload();
        await settle(page);
        const ok = landed === '/chef' && pathOf(page) === '/chef';
        record('12. Logout then login as another role in the same tab', ok,
          `landed=${landed} afterRefresh=${pathOf(page)}`);
      } finally {
        await context.close();
      }
    }

    // 13: a refresh while the backend is unreachable keeps the session and
    // the route, and the page recovers once the backend answers again.
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      try {
        await login(page, 'chef');
        await settle(page);
        await page.route('**/api/**', (route) => route.abort('connectionrefused'));
        await page.reload();
        await page.waitForTimeout(6000);
        const during = pathOf(page);
        const tokens = await storedTokens(page);
        await page.unroute('**/api/**');
        await page.waitForTimeout(8000);
        const recovered = await page.getByText('Kitchen Dashboard').count();
        const ok = during === '/chef' && !!tokens.session && pathOf(page) === '/chef' && recovered > 0;
        record('13. Backend outage during refresh keeps the session and recovers', ok,
          `during=${during} tokenKept=${!!tokens.session} after=${pathOf(page)} dashboardShown=${recovered > 0}`);
      } finally {
        await context.close();
      }
    }

    // 14: manager logout from the manager sidebar.
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      try {
        await login(page, 'manager');
        await page.goto(`${BASE_URL}/manager/cash`);
        await settle(page);
        await page.getByRole('button', { name: 'Logout' }).first().click();
        await settle(page);
        const tokens = await storedTokens(page);
        const ok = pathOf(page) === '/auth/login' && !tokens.session && !tokens.shared;
        record('14. Manager logout from /manager/cash', ok,
          `path=${pathOf(page)} tokens=${JSON.stringify(tokens)}`);
      } finally {
        await context.close();
      }
    }

    // 15: the legacy /admin/chef link opens the live kitchen, not mock data.
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      try {
        await login(page, 'chef');
        await page.goto(`${BASE_URL}/admin/chef`);
        await settle(page);
        const mock = await page.getByText('Ahmed Raza').count();
        const ok = pathOf(page) === '/chef' && mock === 0;
        record('15. Legacy /admin/chef opens the live kitchen', ok, `path=${pathOf(page)} mockShown=${mock > 0}`);
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
