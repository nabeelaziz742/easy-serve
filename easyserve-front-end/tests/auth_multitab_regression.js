// Browser regression tests for logout and token refresh across tabs.
//
// Same setup as tests/auth_refresh_regression.js (backend + frontend running,
// one active account per role):
//
//   WAITER_EMAIL=... CHEF_EMAIL=... MANAGER_EMAIL=... QA_PASSWORD=... \
//     node tests/auth_multitab_regression.js
//
// Optional: BASE_URL, API_URL (default http://127.0.0.1:8000/api),
// CHROME_PATH, WAITER_PASSWORD / CHEF_PASSWORD / MANAGER_PASSWORD.

const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://127.0.0.1:8000/api';
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

const login = async (page, role) => {
  const { email, password } = ACCOUNTS[role];
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle' });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 15000 });
  await settle(page);
};

// Logs out through the header's Logout button (Redux onLoggedOut).
const logoutViaUi = async (page) => {
  // The staff header keeps Logout inside the "Account" menu.
  const account = page.getByRole('button', { name: /^account$/i }).first();
  if (await account.count()) await account.click();
  const button = page.getByRole('button', { name: /log ?out/i }).first();
  if (await button.count()) {
    await button.click();
  } else {
    throw new Error(`no logout button on ${pathOf(page)}`);
  }
  await settle(page);
};

// Records every API request with the bearer token it carried.
const watchApi = (page) => {
  const requests = [];
  page.on('request', (req) => {
    if (!req.url().startsWith(API_URL)) return;
    if (req.method() === 'OPTIONS') return;
    requests.push({
      path: new URL(req.url()).pathname,
      auth: req.headers().authorization || null,
    });
  });
  return requests;
};

const sessionOf = (page) =>
  page.evaluate(() => ({
    token: sessionStorage.getItem('token'),
    user: JSON.parse(sessionStorage.getItem('user') || 'null'),
  }));

async function run() {
  const missing = Object.entries(ACCOUNTS).filter(([, a]) => !a.email || !a.password);
  if (missing.length) {
    console.error(`Missing credentials for: ${missing.map(([r]) => r).join(', ')}`);
    process.exit(2);
  }

  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });

  try {
    // 11. Logout in the Waiter tab must not turn that tab into the Chef
    // (the shared login of another tab), not even after F5.
    {
      const context = await browser.newContext();
      try {
        const waiter = await context.newPage();
        await login(waiter, 'waiter');
        const chef = await context.newPage();
        await login(chef, 'chef');

        await waiter.bringToFront();
        await logoutViaUi(waiter);
        await waiter.reload();
        await settle(waiter);
        await waiter.goto(`${BASE_URL}/waiter`);
        await settle(waiter);
        const afterLogout = pathOf(waiter);
        const waiterSession = await sessionOf(waiter);

        await chef.reload();
        await settle(chef);
        const ok =
          afterLogout === '/auth/login' && !waiterSession.token && pathOf(chef) === '/chef';
        record(
          '11. Logout in Waiter tab keeps it logged out and Chef tab signed in',
          ok,
          `waiter tab=${afterLogout} waiter role=${waiterSession.user?.user_type || 'none'} chef tab=${pathOf(chef)}`
        );
      } finally {
        await context.close();
      }
    }

    // 12. A rejected refresh token in the Waiter tab logs that tab out and
    // never switches it to the Chef's shared login.
    {
      const context = await browser.newContext();
      try {
        const waiter = await context.newPage();
        await login(waiter, 'waiter');
        const chef = await context.newPage();
        await login(chef, 'chef');

        await waiter.bringToFront();
        await waiter.evaluate(() => {
          sessionStorage.setItem('token', 'expired.invalid.token');
          sessionStorage.setItem('refresh_token', 'invalid.refresh.token');
        });
        const api = watchApi(waiter);
        await waiter.reload();
        await settle(waiter);
        const chefTokenUsed = api.some((r) => r.auth && r.auth !== 'Bearer expired.invalid.token');
        const waiterSession = await sessionOf(waiter);
        await chef.reload();
        await settle(chef);
        const ok =
          pathOf(waiter) === '/auth/login' &&
          !waiterSession.token &&
          !chefTokenUsed &&
          pathOf(chef) === '/chef';
        record(
          "12. Rejected refresh logs the Waiter tab out without adopting the Chef",
          ok,
          `waiter tab=${pathOf(waiter)} sentOtherToken=${chefTokenUsed} chef tab=${pathOf(chef)}`
        );
      } finally {
        await context.close();
      }
    }

    // 13. On reload no protected request goes out anonymously or with
    // another tab's token before the session is restored.
    {
      const context = await browser.newContext();
      try {
        const waiter = await context.newPage();
        await login(waiter, 'waiter');
        const chef = await context.newPage();
        await login(chef, 'chef');
        await waiter.bringToFront();
        const { token } = await sessionOf(waiter);
        const api = watchApi(waiter);
        await waiter.reload();
        await settle(waiter);
        const wrong = api.filter((r) => r.auth !== `Bearer ${token}`);
        record(
          '13. Waiter reload sends only its own token on every API request',
          api.length > 0 && wrong.length === 0 && pathOf(waiter) === '/waiter',
          `requests=${api.length} wrong=${wrong.map((r) => `${r.path}:${r.auth ? 'other' : 'none'}`).join(',') || 0}`
        );
      } finally {
        await context.close();
      }
    }

    // 14. Several parallel requests with an expired access token cause a
    // single refresh call.
    {
      const context = await browser.newContext();
      try {
        const page = await context.newPage();
        await login(page, 'manager');
        await page.goto(`${BASE_URL}/manager`);
        await settle(page);
        await page.evaluate(() => sessionStorage.setItem('token', 'expired.invalid.token'));
        const api = watchApi(page);
        await page.reload();
        await settle(page);
        const refreshes = api.filter((r) => r.path.endsWith('/user/token-refresh/')).length;
        const expired = api.filter((r) => r.auth === 'Bearer expired.invalid.token').length;
        record(
          '14. Parallel 401s on /manager trigger exactly one refresh',
          refreshes === 1 && pathOf(page) === '/manager',
          `refreshCalls=${refreshes} requestsWithExpiredToken=${expired} path=${pathOf(page)}`
        );
      } finally {
        await context.close();
      }
    }

    // 15. Two tabs of the same Waiter: tab A rotates the refresh token, tab B
    // (opened later, inherited the login) recovers instead of logging out.
    {
      const context = await browser.newContext();
      try {
        const a = await context.newPage();
        await login(a, 'waiter');
        const b = await context.newPage();
        await b.goto(`${BASE_URL}/waiter`);
        await settle(b);

        for (const p of [a, b]) {
          await p.evaluate(() => sessionStorage.setItem('token', 'expired.invalid.token'));
        }
        await a.bringToFront();
        await a.reload();
        await settle(a);
        await b.bringToFront();
        await b.reload();
        await settle(b);
        const ok = pathOf(a) === '/waiter' && pathOf(b) === '/waiter';
        record('15. Same-user tabs survive refresh-token rotation', ok, `tabA=${pathOf(a)} tabB=${pathOf(b)}`);
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
