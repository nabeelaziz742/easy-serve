// End-to-end browser test of the live order workflow across roles:
// Customer (QR dine-in) -> Waiter -> Chef -> Waiter -> cash -> Manager.
//
// Every role runs in its own browser context. Dashboards are never reloaded
// after they are opened, so an order only shows up if the page's own data
// refresh picks it up. The script prints the observed latency of each hop.
//
// Needs the backend and frontend running, one waiter/chef/manager of the
// same restaurant, a customer account, and a free table:
//
//   WAITER_EMAIL=... CHEF_EMAIL=... MANAGER_EMAIL=... CUSTOMER_EMAIL=... \
//   QA_PASSWORD=... RESTAURANT_ID=1 TABLE_NUMBER=1 \
//     node tests/order_sync_e2e.js
//
// Optional: BASE_URL, API_URL, CHROME_PATH, <ROLE>_PASSWORD.
//
// Only use this against a local/test database: it creates real orders.

const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://127.0.0.1:8000/api';
const CHROME_PATH = process.env.CHROME_PATH || undefined;
const RESTAURANT_ID = process.env.RESTAURANT_ID || '1';
const TABLE_NUMBER = process.env.TABLE_NUMBER || '1';
const SYNC_TIMEOUT = 20000;

const account = (role) => ({
  email: process.env[`${role.toUpperCase()}_EMAIL`],
  password: process.env[`${role.toUpperCase()}_PASSWORD`] || process.env.QA_PASSWORD,
});

const ACCOUNTS = {
  waiter: account('waiter'),
  chef: account('chef'),
  manager: account('manager'),
  customer: account('customer'),
};

const results = [];
const record = (name, passed, detail) => {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const login = async (page, role) => {
  const { email, password } = ACCOUNTS[role];
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle' });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 15000 });
  await page.waitForTimeout(1000);
};

// The order card is the closest ancestor of the "Order #id" heading that
// also holds the card's action button.
const card = (page, id, scope) =>
  (scope || page).locator(`xpath=//h2[normalize-space()="Order #${id}"]/ancestor::div[.//button][1]`);

const waitVisible = async (locator) => {
  const start = Date.now();
  await locator.first().waitFor({ state: 'visible', timeout: SYNC_TIMEOUT });
  return Date.now() - start;
};

const section = (page, title) =>
  page.locator('section').filter({ has: page.getByRole('heading', { name: title }) });

// Tracks every request a dashboard makes, how many ran at once per endpoint
// (overlap), and whether any full page navigation happened.
const watch = (page) => {
  const stats = { navigations: 0, inFlight: {}, maxInFlight: {}, writes: [], errors: [] };
  const key = (req) => new URL(req.url()).pathname;
  page.on('framenavigated', (frame) => { if (frame === page.mainFrame()) stats.navigations += 1; });
  page.on('request', (req) => {
    if (!req.url().startsWith(API_URL)) return;
    if (req.method() !== 'GET' && req.method() !== 'OPTIONS') stats.writes.push(`${req.method()} ${key(req)}`);
    const k = key(req);
    stats.inFlight[k] = (stats.inFlight[k] || 0) + 1;
    stats.maxInFlight[k] = Math.max(stats.maxInFlight[k] || 0, stats.inFlight[k]);
  });
  const done = (req) => {
    if (!req.url().startsWith(API_URL)) return;
    const k = key(req);
    stats.inFlight[k] = Math.max(0, (stats.inFlight[k] || 1) - 1);
  };
  page.on('requestfinished', done);
  page.on('requestfailed', done);
  page.on('pageerror', (err) => stats.errors.push(err.message));
  return stats;
};

const apiToken = async (role) => {
  const res = await fetch(`${API_URL}/user/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ACCOUNTS[role]),
  });
  return (await res.json()).access;
};

const api = async (token, path, method = 'GET', body) => {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch (_) { data = null; }
  return { status: res.status, data };
};

async function run() {
  const missing = Object.entries(ACCOUNTS).filter(([, a]) => !a.email || !a.password);
  if (missing.length) {
    console.error(`Missing credentials for: ${missing.map(([r]) => r).join(', ')}`);
    process.exit(2);
  }

  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
  const ctx = {};
  for (const role of Object.keys(ACCOUNTS)) {
    ctx[role] = await browser.newContext();
  }

  try {
    const waiter = await ctx.waiter.newPage();
    const chef = await ctx.chef.newPage();
    const manager = await ctx.manager.newPage();
    const customer = await ctx.customer.newPage();

    await login(waiter, 'waiter');
    await waiter.goto(`${BASE_URL}/waiter`);
    await login(chef, 'chef');
    await chef.goto(`${BASE_URL}/chef`);
    await login(manager, 'manager');
    await manager.goto(`${BASE_URL}/manager/cash`);
    await Promise.all([waiter, chef, manager].map((p) => p.waitForTimeout(3000)));
    const waiterStats = watch(waiter);
    const chefStats = watch(chef);
    const managerStats = watch(manager);

    // Scenario 1: customer places a QR dine-in order through the UI.
    await login(customer, 'customer');
    await customer.goto(`${BASE_URL}/restaurant/${RESTAURANT_ID}?mode=dine-in&table=${TABLE_NUMBER}`);
    await customer.waitForURL('**/dine-in/guests', { timeout: 15000 });
    await customer.getByRole('button', { name: '2 Guests', exact: true }).first().click();
    await customer.getByRole('button', { name: 'Continue to Menu' }).click();
    await customer.waitForURL((u) => u.pathname === `/restaurant/${RESTAURANT_ID}`, { timeout: 15000 });
    await customer.getByRole('button', { name: 'Add to Cart' }).first().click();
    await customer.locator('header button:has(svg.lucide-shopping-cart)').first().click();
    const [checkout] = await Promise.all([
      customer.waitForResponse((r) => r.url().includes('/orders/checkout-order/')),
      customer.getByRole('button', { name: 'Proceed to Checkout' }).click(),
    ]);
    const created = await checkout.json();
    const orderId = created.id;
    const placedAt = Date.now();
    record('S1a. Customer dine-in checkout creates an order', checkout.status() === 201 && !!orderId,
      `status=${checkout.status()} order=${orderId}`);

    let latency = await waitVisible(card(waiter, orderId, section(waiter, 'Pending Orders')))
      .then(() => Date.now() - placedAt).catch(() => null);
    record('S1. Order appears on Waiter dashboard without refresh', latency !== null,
      `latency=${latency}ms navigations=${waiterStats.navigations}`);

    // Scenario 2: waiter accepts, order appears on the chef's KDS.
    await card(waiter, orderId, section(waiter, 'Pending Orders')).getByRole('button', { name: 'Accept Order' }).click();
    const acceptedAt = Date.now();
    latency = await waitVisible(card(chef, orderId)).then(() => Date.now() - acceptedAt).catch(() => null);
    record('S2. Accepted order appears on Chef dashboard without refresh', latency !== null,
      `latency=${latency}ms navigations=${chefStats.navigations}`);

    // Scenario 3: chef starts and marks ready, waiter sees it ready once.
    await card(chef, orderId).getByRole('button', { name: 'Start Preparing' }).click();
    await card(chef, orderId).getByRole('button', { name: 'Mark Ready' }).waitFor({ timeout: SYNC_TIMEOUT });
    await card(chef, orderId).getByRole('button', { name: 'Mark Ready' }).click();
    const readyAt = Date.now();
    latency = await waitVisible(card(waiter, orderId, section(waiter, 'Ready To Serve')))
      .then(() => Date.now() - readyAt).catch(() => null);
    await waiter.waitForTimeout(4000);
    const copies = await waiter.getByRole('heading', { name: `Order #${orderId}`, exact: true }).count();
    const stillPending = await card(waiter, orderId, section(waiter, 'Pending Orders')).count();
    record('S3. Ready order reaches Waiter, shown once', latency !== null && copies === 1 && stillPending === 0,
      `latency=${latency}ms copies=${copies} stillPending=${stillPending}`);

    // Serve, customer pays cash, waiter receives, manager settles.
    await card(waiter, orderId, section(waiter, 'Ready To Serve')).getByRole('button', { name: 'Mark Served' }).click();
    await waiter.waitForTimeout(1500);
    await customer.goto(`${BASE_URL}/orders`);
    await customer.getByRole('button', { name: 'Pay with Cash' }).first().waitFor({ timeout: SYNC_TIMEOUT });
    const cashCard = customer.locator(`xpath=//*[contains(normalize-space(), "#${orderId}")]/ancestor::div[.//button[normalize-space()="Pay with Cash"]][1]`);
    await cashCard.getByRole('button', { name: 'Pay with Cash' }).first().click();
    const cashAt = Date.now();
    const cashSection = section(waiter, 'Cash Collection');
    const cashCardWaiter = cashSection.locator(`xpath=.//p[normalize-space()="Order #${orderId}"]/ancestor::div[.//button][1]`);
    latency = await waitVisible(cashCardWaiter).then(() => Date.now() - cashAt).catch(() => null);
    record('S4a. Cash request reaches Waiter without refresh', latency !== null, `latency=${latency}ms`);

    await cashCardWaiter.getByRole('button', { name: 'Cash Received' }).click();
    const receivedAt = Date.now();
    const settleCard = manager.locator(`xpath=//p[normalize-space()="Order #${orderId}"]/ancestor::div[.//button][1]`);
    latency = await waitVisible(settleCard).then(() => Date.now() - receivedAt).catch(() => null);
    record('S4b. Received cash reaches Manager settlement without refresh', latency !== null, `latency=${latency}ms`);
    await settleCard.getByRole('button', { name: /Settle Cash/ }).click();
    await manager.waitForTimeout(2000);

    const custToken = await apiToken('customer');
    const order = await api(custToken, `/restaurants/orders/${orderId}/`);
    const settled = order.data?.payment_status;
    record('S4c. Settled order is confirmed in the database', /confirm/i.test(String(settled)) || settled === 2,
      `payment_status=${settled}`);

    // Scenario 5: waiter loses the network, an order is placed meanwhile,
    // the dashboard reconciles after reconnecting and shows it once.
    await ctx.waiter.setOffline(true);
    const wToken = await apiToken('waiter');
    const menu = await api(custToken, `/restaurants/restaurants/${RESTAURANT_ID}/menus/`);
    const firstItem = menu.data?.menus?.[0]?.menu_items?.[0]?.id;
    const validate = await api(custToken, '/restaurants/dine-in/validate/', 'POST', { restaurant: RESTAURANT_ID, table: TABLE_NUMBER });
    const session = await api(custToken, '/restaurants/dine-in/start-session/', 'POST', {
      restaurant: RESTAURANT_ID, table: TABLE_NUMBER, guests: 1, session_token: validate.data?.session?.token,
    });
    const offlineOrder = await api(custToken, '/restaurants/orders/checkout-order/', 'POST', {
      order_type: 'DINE_IN', restaurant: Number(RESTAURANT_ID), table: Number(TABLE_NUMBER), guests: 1,
      session_token: session.data?.session?.token, items: [{ menu_item: firstItem, quantity: 1 }],
    });
    await waiter.waitForTimeout(6000);
    const shownWhileOffline = await card(waiter, offlineOrder.data?.id).count();
    await ctx.waiter.setOffline(false);
    const backAt = Date.now();
    latency = await waitVisible(card(waiter, offlineOrder.data?.id, section(waiter, 'Pending Orders')))
      .then(() => Date.now() - backAt).catch(() => null);
    await waiter.waitForTimeout(4000);
    const offlineCopies = await waiter.getByRole('heading', { name: `Order #${offlineOrder.data?.id}`, exact: true }).count();
    const pending = await api(wToken, '/restaurants/orders/pending/');
    const pendingIds = (pending.data?.results || pending.data || []).map((o) => o.id);
    record('S5. Waiter reconciles after a network drop, no duplicates',
      offlineOrder.status === 201 && shownWhileOffline === 0 && latency !== null && offlineCopies === 1
        && pendingIds.filter((id) => id === offlineOrder.data?.id).length === 1,
      `order=${offlineOrder.data?.id} status=${offlineOrder.status} latency=${latency}ms copies=${offlineCopies}`);

    // Polling hygiene: only reads, no overlapping requests per endpoint, no
    // full page reloads on the dashboards.
    const overlap = (s) => Math.max(0, ...Object.values(s.maxInFlight));
    const unexpectedWrites = [...chefStats.writes, ...managerStats.writes, ...waiterStats.writes]
      .filter((w) => !/(accept|start-preparing|mark-prepared|mark-served|cash-receive|cash-settle)\/$/.test(w));
    record('S6. Dashboards only poll (no reloads, no overlap, no stray writes)',
      waiterStats.navigations === 0 && chefStats.navigations === 0 && managerStats.navigations === 0
        && overlap(waiterStats) <= 1 && overlap(chefStats) <= 1 && overlap(managerStats) <= 1
        && unexpectedWrites.length === 0
        && waiterStats.errors.length + chefStats.errors.length + managerStats.errors.length === 0,
      `navigations=${waiterStats.navigations}/${chefStats.navigations}/${managerStats.navigations} `
        + `maxConcurrentPerEndpoint=${overlap(waiterStats)}/${overlap(chefStats)}/${overlap(managerStats)} `
        + `writes=${JSON.stringify(unexpectedWrites)}`);
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
