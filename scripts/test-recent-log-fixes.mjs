import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
function section(source, start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, start);
  return source.slice(a, b);
}

for (const path of ['admin/logs.html', 'admin/talent-items.html', 'admin/purchases.html', 'shop.html']) {
  for (const match of read(path).matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (!/\bsrc\s*=/.test(match[1]) && match[2].trim()) new vm.Script(match[2], { filename: path });
  }
}
for (const path of ['js/activity-log.js', 'js/auth.js', 'js/slack-notify.js']) new vm.Script(read(path), { filename: path });

const logs = read('js/activity-log.js');
const retryContext = vm.createContext({ setTimeout(fn) { fn(); } });
vm.runInContext(section(logs, 'async function _retryTransientProfileRead(', 'async function _loadProfileDirectForSession('), retryContext);
let attempts = 0;
let result = await retryContext._retryTransientProfileRead(async () => ++attempts === 1
  ? { data: null, error: { message: 'TypeError: Failed to fetch' } }
  : { data: { id: 'ok' }, error: null });
assert.equal(attempts, 2);
assert.equal(result.data.id, 'ok');
attempts = 0;
result = await retryContext._retryTransientProfileRead(async () => { attempts++; return { error: { status: 403, message: 'forbidden' } }; });
assert.equal(attempts, 1);
attempts = 0;
await retryContext._retryTransientProfileRead(async () => { attempts++; throw new TypeError('Failed to fetch'); });
assert.equal(attempts, 2);

const countQuery = {
  select() { return this; }, eq() { return this; }, in() { return this; },
  or() { return this; }, limit() { return Promise.resolve({ error: null }); },
  then(resolve) { return Promise.resolve({ count: 212, error: null }).then(resolve); }
};
const countContext = vm.createContext({ _sb: { from: () => countQuery }, ERROR_LEVELS: ['ERROR', 'FATAL', 'CRITICAL'] });
vm.runInContext(section(logs, 'async function getUnacknowledgedCount(', 'async function acknowledgeLog('), countContext);
assert.equal(await countContext.getUnacknowledgedCount({ returnNullOnError: true }), 212);
countQuery.then = (resolve, reject) => Promise.reject(new Error('network')).then(resolve, reject);
assert.equal(await countContext.getUnacknowledgedCount({ returnNullOnError: true }), null);

// Successful login must complete without the removed idle-timeout function.
const auth = read('js/auth.js');
let savedSession;
const loginContext = vm.createContext({
  _sb: { auth: { signInWithPassword: async () => ({ data: {}, error: null }), signOut: async () => {} }, rpc: async name => name === 'get_my_profile' ? { data: { id:'u', username:'user', permission_level:'admin' }, error:null } : { data:null, error:null } },
  AUTH_EMAIL_DOMAIN: '@example.test',
  _retryTransientProfileRead: retryContext._retryTransientProfileRead,
  getPermRank: () => 100, attachCurrentAppVersion: s => s,
  setSession: s => { savedSession = s; }, logInfo: async () => {}, logError: async () => {}, console
});
vm.runInContext(section(auth, 'async function login(', 'function getRedirectUrl('), loginContext);
assert.equal((await loginContext.login('user', 'password')).success, true);
assert.equal(savedSession.username, 'user');

const logPage = read('admin/logs.html');
const config = read('js/supabase-config.js');
const dateContext = vm.createContext({ Date, Intl, Number, String, document: { getElementById(id) { return this.nodes[id]; }, nodes: { dateFrom: {}, dateTo: {} } }, applyFilters() {} });
vm.runInContext(section(config, 'function formatKSTDateInput(', '/* ===== CRUD Helper Functions ===== */'), dateContext);
vm.runInContext(section(logPage, '    function setLogPeriod(', '    async function loadAll()'), dateContext);
vm.runInContext("formatKSTDateInput = () => '2026-03-01'; setLogPeriod('month')", dateContext);
assert.equal(dateContext.document.nodes.dateFrom.value, '2026-01-31');
assert.equal(dateContext.document.nodes.dateTo.value, '2026-03-01');

const monthly = read('admin/monthly-talents.html');
const initContext = vm.createContext({ session: null });
vm.runInContext(section(monthly, '    async function switchTab(', '    async function onDeptFilterChange()'), initContext);
await initContext.switchTab('teacher');
vm.runInContext(section(monthly, '    async function loadUsers()', '    async function refreshScheduleGrants()'), initContext);
await initContext.loadUsers();

const shop = read('shop.html');
const fallbackContext = vm.createContext({ document: { createElement() { return { setAttribute(k,v) { this[k] = v; } }; } } });
vm.runInContext(section(shop, '    function showProductImageFallback(', '    function renderProductCard('), fallbackContext);
let replacement;
fallbackContext.showProductImageFallback({ replaceWith(node) { replacement = node; } }, true);
assert.equal(replacement.className, 'product-detail-emoji');
assert.equal(replacement['aria-label'], '상품 이미지를 불러올 수 없습니다');

const items = read('admin/talent-items.html');
const permissionContext = vm.createContext({ session: null });
vm.runInContext(section(items, '    function canEditTalentItems()', '    function switchTab('), permissionContext);
assert.equal(permissionContext.canEditTalentItems(), false);
permissionContext.session = { permissionRank: 80 };
assert.equal(permissionContext.canEditTalentItems(), false);
permissionContext.session = { permissionRank: 90 };
assert.equal(permissionContext.canEditTalentItems(), true);
console.log('PASS: login regression, profile retry, 30-day boundary, initialization, image fallback, permissions, syntax');
