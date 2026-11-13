import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const talent = fs.readFileSync('js/talent.js', 'utf8');
const context = vm.createContext({ Intl, Date });
vm.runInContext(talent, context);
const label = context.getTalentStatsItemLabel;
assert.equal(label({ talent_item_id: 'a', description: '출석 (2배 이벤트)' }), '출석');
assert.equal(label({ talent_item_id: 'a', description: '출석' }), '출석');
assert.equal(label({ talent_item_id: null, description: '특별 지급 (2배 이벤트)' }), '특별 지급 (2배 이벤트)');
assert.equal(label({ talent_item_id: 'a', description: '출석 (2배 이벤트) 추가' }), '출석 (2배 이벤트) 추가');
for (const [date, expected] of [
  ['2026-11-14T14:59:59Z', '2026-11-15'],
  ['2026-11-15T14:59:59Z', '2026-11-15'],
  ['2026-11-15T15:00:00Z', '2026-11-22'],
  ['2026-11-22T15:00:00Z', '2026-11-29']
]) assert.equal(context.getUpcomingSundayKSTDate(new Date(date)), expected);

const statsHtml = fs.readFileSync('admin/talent-stats.html', 'utf8');
const overallCode = statsHtml.slice(statsHtml.indexOf('    function renderOverallStats('), statsHtml.indexOf('    function renderDeptStats('));
const content = { innerHTML: '' };
const statsContext = vm.createContext({ document: { getElementById: () => content }, fmtNum: String, getTalentStatsItemLabel: label });
vm.runInContext(overallCode, statsContext);
statsContext.renderOverallStats([
  { user_id: 'u', talent_item_id: 'a', description: '출석', amount: 5 },
  { user_id: 'u', talent_item_id: 'a', description: '출석 (2배 이벤트)', amount: 10 },
  { user_id: 'u', talent_item_id: 'b', description: '암송', amount: 3 }
], []);
assert.match(content.innerHTML, /출석<\/td><td class="num">15<\/td><td class="num">2/);
assert.doesNotMatch(content.innerHTML, /출석 \(2배 이벤트\)/);
const returnCode = statsHtml.slice(statsHtml.indexOf('    function extractReturnedTxnId('), statsHtml.indexOf('    async function fetchAllTalentTransactions('));
vm.runInContext(returnCode, statsContext);
const transactionId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const adjusted = statsContext.applyReturnAdjustments([
  { id: transactionId, user_id: 'u', talent_item_id: 'a', description: '출석 (2배 이벤트)', amount: 10 },
  { id: 'other', user_id: 'u', talent_item_id: 'a', description: '출석', amount: 5 }
], [{ user_id: 'u', amount: 10, description: `반환: [${transactionId}] 출석 (2배 이벤트)` }]);
assert.equal(adjusted.length, 1);
assert.equal(adjusted[0].amount, 5);

const adminHtml = fs.readFileSync('admin/talents.html', 'utf8');
const renderCode = adminHtml.slice(adminHtml.indexOf('    async function renderTalentItemButtons()'), adminHtml.indexOf('    async function cancelTalentItem('));
async function renderButtons({ previewRows, earns = [] }) {
  const elements = {
    talentItemBtns: { innerHTML: '' }, btnConfirmGive: { style: {} },
    prayerDateWrap: { style: {} }, prayerDate: { options: [], value: '' }
  };
  const result = data => ({ data, error: null });
  const query = data => {
    const q = { select: () => q, eq: () => q, not: () => q, order: () => Promise.resolve(result(data)), like: () => Promise.resolve(result(data)) };
    return q;
  };
  let call = 0;
  const c = vm.createContext({
    talentItemsRenderToken: 0, talentUserId: 'student', currentTab: 'student',
    talentItems: [{ id: 'a', name: '출석', talent_amount: 5, is_active: true, target_type: 'student' }],
    _weeklyGivenMap: {}, _weeklyGivenRecordsMap: {},
    document: { getElementById: id => elements[id], documentElement: { getAttribute: () => 'default' } },
    _sb: { from: () => query(call++ === 0 ? earns : []), rpc: async () => previewRows === null ? { error: { message: 'missing' } } : result(previewRows) },
    isOverrideWeekLimitEnabled: () => false, getUpcomingSundayKSTDate: () => '2026-11-15',
    fmtNum: String, updateConfirmBtn: () => {}, console, Object, String
  });
  vm.runInContext(renderCode, c);
  await c.renderTalentItemButtons();
  return elements.talentItemBtns.innerHTML;
}
assert.match(await renderButtons({ previewRows: [{ item_id: 'a', amount: 10, is_event: true }] }), /\+10 \(2배 이벤트\)/);
assert.match(await renderButtons({ previewRows: [{ item_id: 'a', amount: 5, is_event: false }] }), /\+5/);
assert.match(await renderButtons({ previewRows: null }), /기본 \+5/);
assert.match(await renderButtons({ previewRows: [{ item_id: 'a', amount: 10, is_event: true }], earns: [{ id: 't', talent_item_id: 'a', amount: 5, description: '출석' }] }), /출석 <strong[^>]*>\+5<\/strong>/);
assert.match(await renderButtons({ previewRows: [{ item_id: 'a', amount: 10, is_event: true }], earns: [{ id: 't', talent_item_id: 'a', amount: 10, description: '출석 (2배 이벤트)' }] }), /\+10 \(2배 이벤트\)/);

for (const file of ['admin/talents.html', 'admin/monthly-talents.html', 'admin/talent-stats.html', 'talent-receive.html', 'my-talents.html']) {
  const html = fs.readFileSync(file, 'utf8');
  for (const [, code] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)) if (code.trim()) new vm.Script(code, { filename: file });
}
console.log('이벤트 지급 표시, 일반 지급 표시, 기존 지급 내역, 통계 통합 및 기준일 검사 통과');
