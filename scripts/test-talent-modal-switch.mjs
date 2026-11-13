import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('admin/talents.html', 'utf8');
const modalCode = html.slice(html.indexOf('    async function openTalentModal('), html.indexOf('    let _weeklyGivenMap ='));
const historyCode = html.slice(html.indexOf('    async function loadTalentHistory('), html.indexOf('    let returnCtx ='));
function deferred() {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return { promise, resolve };
}
function element() {
  return { textContent: '', innerHTML: '', value: '', style: {}, disabled: false, open: false,
    classList: { add() {}, remove() {} } };
}
const elements = Object.fromEntries(['talentItemBtns', 'talentHistory', 'btnConfirmGive', 'btnManualGive',
  'talentAmount', 'talentDesc', 'manualGiveSection', 'talentTitle', 'talentBalance', 'talentError',
  'overrideWeekLimit', 'overrideReason', 'talentModal', 'earnSection'].map(id => [id, element()]));
const pending = {};
const context = vm.createContext({
  document: { getElementById: id => elements[id] },
  talentItemsRenderToken: 0, talentHistoryLoadToken: 0, talentItemsLoading: false,
  _weeklyGivenMap: { old: {} }, _weeklyGivenRecordsMap: { old: [{}] },
  _giveItemsBusy: false, _manualTalentBusy: false,
  talentUserId: 'old', talentUserName: '', talentUserDeptId: null, talentType: 'earn',
  talentUserList: [{ id: 'a', display_name: 'A' }, { id: 'b', display_name: 'B' }],
  session: { permissionRank: 100 }, fmtNum: String, syncOverrideControls() {},
  renderTalentItemButtons: async () => {},
  fetchTalentHistory: id => (pending[id] = deferred()).promise,
  getTalentHistoryTypeMeta: () => ({ bg: '', color: '', amountColor: '', label: '적립', sign: '+' }),
  formatKSTShort: () => 'date', maskTalentDesc: x => x
});
vm.runInContext(modalCode + historyCode, context);
elements.talentItemBtns.textContent = '이전 학생 항목';
elements.talentHistory.textContent = '이전 학생 내역';
elements.talentAmount.value = '50';
elements.talentDesc.value = '이전 사유';
await context.openTalentModal('a', 'A', 10);
assert.match(elements.talentItemBtns.textContent, /불러오는 중/);
assert.match(elements.talentHistory.textContent, /불러오는 중/);
assert.equal(elements.btnManualGive.disabled, true);
assert.equal(elements.talentAmount.value, '');
assert.equal(elements.talentDesc.value, '');
assert.equal(Object.keys(context._weeklyGivenMap).length, 0);

const oldRequest = pending.a;
context.closeTalentModal();
await context.openTalentModal('b', 'B', 20);
const currentRequest = pending.b;
currentRequest.resolve({ data: [{ description: 'B 내역', amount: 3, type: 'earn' }], error: null });
await currentRequest.promise;
await Promise.resolve();
assert.match(elements.talentHistory.innerHTML, /B 내역/);
oldRequest.resolve({ data: [{ description: 'A 내역', amount: 5, type: 'earn' }], error: null });
await oldRequest.promise;
await Promise.resolve();
assert.match(elements.talentHistory.innerHTML, /B 내역/);
assert.doesNotMatch(elements.talentHistory.innerHTML, /A 내역/);

const older = context.loadTalentHistory('b');
const olderRequest = pending.b;
const newer = context.loadTalentHistory('b');
const newerRequest = pending.b;
newerRequest.resolve({ data: [{ description: '최신 내역', amount: 10, type: 'earn' }], error: null });
await newer;
olderRequest.resolve({ data: [{ description: '오래된 내역', amount: 5, type: 'earn' }], error: null });
await older;
assert.match(elements.talentHistory.innerHTML, /최신 내역/);
assert.doesNotMatch(elements.talentHistory.innerHTML, /오래된 내역/);

const renderCode = html.slice(html.indexOf('    async function renderTalentItemButtons()'), html.indexOf('    async function cancelTalentItem('));
const firstEarns = deferred();
let activeUser = '';
let failEarns = false;
const renderElements = {
  talentItemBtns: element(), btnConfirmGive: element(), btnManualGive: element(),
  prayerDateWrap: element(), prayerDate: { options: [], value: '' }
};
const result = data => ({ data, error: null });
const renderContext = vm.createContext({
  talentItemsRenderToken: 0, talentItemsLoading: false, talentUserId: 'a', currentTab: 'student',
  talentItems: [{ id: 'item', name: '출석', talent_amount: 5, is_active: true, target_type: 'student' }],
  _weeklyGivenMap: {}, _weeklyGivenRecordsMap: {},
  document: { getElementById: id => renderElements[id], documentElement: { getAttribute: () => 'default' } },
  _sb: {
    from: () => {
      const q = {
        select: () => q,
        eq: (field, value) => { if (field === 'user_id') activeUser = value; return q; },
        not: () => q,
        order: () => failEarns ? Promise.resolve({ data: null, error: { message: 'network' } })
          : activeUser === 'a' ? firstEarns.promise : Promise.resolve(result([])),
        like: () => Promise.resolve(result([]))
      };
      return q;
    },
    rpc: async (_name, args) => result([{ item_id: 'item', amount: args.p_user_id === 'b' ? 10 : 5, is_event: args.p_user_id === 'b' }])
  },
  isOverrideWeekLimitEnabled: () => false, getUpcomingSundayKSTDate: () => '2026-11-15',
  fmtNum: String, updateConfirmBtn() {}, console: { error() {}, warn() {} }, Object, String
});
vm.runInContext(renderCode, renderContext);
const firstRender = renderContext.renderTalentItemButtons();
assert.match(renderElements.talentItemBtns.textContent, /불러오는 중/);
assert.equal(renderElements.btnManualGive.disabled, true);
renderContext.talentUserId = 'b';
await renderContext.renderTalentItemButtons();
assert.match(renderElements.talentItemBtns.innerHTML, /\+10 \(2배 이벤트\)/);
assert.equal(renderElements.btnManualGive.disabled, false);
firstEarns.resolve(result([{ id: 'old', talent_item_id: 'item', amount: 5, description: '이전 학생' }]));
await firstRender;
assert.match(renderElements.talentItemBtns.innerHTML, /\+10 \(2배 이벤트\)/);
assert.doesNotMatch(renderElements.talentItemBtns.innerHTML, /이전 학생/);
failEarns = true;
await renderContext.renderTalentItemButtons();
assert.match(renderElements.talentItemBtns.textContent, /불러오지 못했습니다/);
assert.equal(renderElements.btnManualGive.disabled, true);

const giveCode = html.slice(html.indexOf('    async function confirmGiveItems()'), html.indexOf('    async function submitManualTalent()'));
const requests = [];
const selected = { value: 'item', dataset: { name: '출석', amount: '10' } };
const giveElements = { overrideReason: { value: '' }, talentError: { classList: { add() {}, remove() {}, contains: () => false } }, talentBalance: element() };
const giveContext = vm.createContext({
  _giveItemsBusy: false, talentItemsLoading: true, talentUserId: 'b', talentUserName: 'B',
  _weeklyGivenMap: {}, _weeklyGivenRecordsMap: {}, currentTab: 'student', session: { id: 'teacher' },
  document: { querySelectorAll: () => [selected], getElementById: id => giveElements[id] },
  isOverrideWeekLimitEnabled: () => false, canApproveOverrideTalent: () => true,
  getTalentTargetLogContext: () => ({}), getTalentItemLogContext: () => ({}),
  confirm: () => true, updateConfirmBtn() {}, fmtNum: String, tErr: String,
  giveTalentByItem: async (...args) => { requests.push(args); return { success: true, amount: 10, balance: 30, txn_id: 'tx', description: '출석 (2배 이벤트)' }; },
  logInfo: async () => {}, logError: async () => {}, renderTalentItemButtons: async () => {},
  loadTalentHistory: async () => {}, loadUsers: async () => {}, fetchTalentBalance: async () => 30
});
vm.runInContext(giveCode, giveContext);
await giveContext.confirmGiveItems();
assert.equal(requests.length, 0, '조회 중 지급은 차단되어야 함');
giveContext.talentItemsLoading = false;
await giveContext.confirmGiveItems();
assert.equal(requests.length, 1);
assert.equal(requests[0][0], 'b');
assert.equal(requests[0][1], 'item');
assert.equal(giveElements.talentBalance.textContent, '30');

console.log('학생 전환, 이전 응답 지연, 동일 학생 중복 조회 및 입력 초기화 검사 통과');
