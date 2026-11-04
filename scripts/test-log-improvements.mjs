import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const section = (source, start, end) => {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `missing source section: ${start}`);
  return source.slice(a, b);
};

// Check syntax of every inline script in the changed pages.
for (const path of ['admin/monthly-talents.html', 'admin/talents.html']) {
  for (const match of read(path).matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (!/\bsrc\s*=/.test(match[1]) && match[2].trim()) new vm.Script(match[2], { filename: path });
  }
}
new vm.Script(read('js/activity-log.js'), { filename: 'activity-log.js' });
new vm.Script(read('js/version.js'), { filename: 'version.js' });

// The daily prayer item cannot be represented by the Sunday-only monthly selector.
const monthly = read('admin/monthly-talents.html');
const monthlyContext = vm.createContext({});
vm.runInContext(`let currentTab='teacher'; let talentItems = [
  {id:'daily',name:'특별새벽기도회 참석',target_type:'teacher',is_active:true},
  {id:'normal',name:'월례회',target_type:'teacher',is_active:true},
  {id:'student',name:'특별새벽기도회 참석',target_type:'student',is_active:true}
]; ${section(monthly, '    function getActiveItems()', '    function getSelectedItems()')}`, monthlyContext);
assert.deepEqual(Array.from(vm.runInContext('getActiveItems().map(x => x.id)', monthlyContext)), ['normal']);
vm.runInContext("currentTab='student'", monthlyContext);
assert.deepEqual(Array.from(vm.runInContext('getActiveItems().map(x => x.id)', monthlyContext)), ['student']);

// A stale tab request must never replace the newest user list or its summaries.
const talents = read('admin/talents.html');
const pending = [];
const nodes = new Map();
const talentContext = vm.createContext({
  console,
  document: { getElementById(id) { if (!nodes.has(id)) nodes.set(id, {}); return nodes.get(id); } },
  session: { permissionRank: 100, isSuperAdmin: true },
  fetchUsers(opts) { return new Promise(resolve => pending.push({ opts, resolve })); },
  loadBatchSummary: async ids => Object.fromEntries(ids.map(id => [id, { earned: 1, used: 0, returned: 0 }])),
  loadAttendanceThisWeek: async () => ({ given: new Set(), transactions: {} }),
  prioritizeCurrentUserDeptClass: list => list,
  sortUserList: list => list,
  getDeptName: () => '부서',
  renderTalentTable() { talentContext.lastRender = vm.runInContext('talentUserList.map(u=>u.id).join() + ":" + currentTab', talentContext); }
});
vm.runInContext(`let usersLoadSequence=0, currentTab='student', currentDeptFilter='', talentUserList=[], talentSummaryMap={}, _attendanceGivenThisWeek=new Set(), _attendanceTxnMap={}; ${section(talents, '    async function loadUsers()', '    function renderTalentTable()')}`, talentContext);
const oldLoad = vm.runInContext('loadUsers()', talentContext);
vm.runInContext("currentTab='teacher'", talentContext);
const newLoad = vm.runInContext('loadUsers()', talentContext);
pending[1].resolve({ data: [{ id: 'teacher' }] });
await newLoad;
pending[0].resolve({ data: [{ id: 'student' }] });
await oldLoad;
assert.equal(talentContext.lastRender, 'teacher:teacher');
assert.equal(nodes.get('userList').innerHTML.includes('불러오는 중'), true);

const summaries = [];
talentContext.loadBatchSummary = ids => new Promise(resolve => summaries.push({ ids, resolve }));
vm.runInContext("currentTab='student'", talentContext);
const oldSummaryLoad = vm.runInContext('loadUsers()', talentContext);
pending[2].resolve({ data: [{ id: 'student' }] });
await new Promise(resolve => setImmediate(resolve));
vm.runInContext("currentTab='teacher'", talentContext);
const newSummaryLoad = vm.runInContext('loadUsers()', talentContext);
pending[3].resolve({ data: [{ id: 'teacher' }] });
await new Promise(resolve => setImmediate(resolve));
summaries[1].resolve({ teacher: { earned: 2, used: 0, returned: 0 } });
await newSummaryLoad;
summaries[0].resolve({ student: { earned: 9, used: 0, returned: 0 } });
await oldSummaryLoad;
assert.equal(talentContext.lastRender, 'teacher:teacher');
assert.equal(vm.runInContext('talentUserList[0]._totalTalent', talentContext), 2);

// A burst of image errors produces one bounded record with the real event count.
const logs = read('js/activity-log.js');
const calls = [];
let timer;
const logContext = vm.createContext({
  URL, Date, Math,
  window: { location: { pathname: '/shop.html', href: 'https://example.test/shop.html' }, addEventListener() {} },
  setTimeout(fn) { timer = fn; return 1; }, clearTimeout() {},
  logError(action, details) { calls.push({ action, details }); }
});
vm.runInContext(section(logs, 'function _clientErrorFingerprint(', 'window.addEventListener(\'error\','), logContext);
for (let i = 0; i < 25; i++) vm.runInContext(`_queueImageFailure(_getResourceLoadDetails({src:'https://cdn.test/${i}.jpg?token=secret'}, 'IMG'))`, logContext);
timer();
assert.equal(calls.length, 1);
assert.equal(calls[0].details.resourceFailureCount, 25);
assert.equal(calls[0].details.resourceUrlSamples.length, 20);
assert.equal(calls[0].details.resourceOrigins['https://cdn.test'], 25);
assert.ok(calls[0].details.resourceUrlSamples.every(url => !url.includes('?')));
vm.runInContext("_queueImageFailure({resourceUrl:'https://other.test/image.png'})", logContext);
vm.runInContext('_flushImageFailureBatch()', logContext);
assert.equal(calls.length, 2);
assert.equal(calls[1].details.resourceFailureCount, 1);
assert.equal(calls[1].details.resourceUrlSamples[0], 'https://other.test/image.png');
console.log('PASS: syntax, monthly daily-prayer selection, stale user requests, image error aggregation');
