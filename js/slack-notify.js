/**
 * Slack Notification Module
 * Supabase Edge Function 'slack-notify'를 호출하여 Slack 채널에 알림을 전송하는 공통 유틸리티
 *
 * 채널 라우팅:
 *   purchase_new, user_register, dept_transfer → 부서별 채널 (data.부서/이동부서 기준)
 *   purchase_status (requested→preparing) → 상품 관리 채널
 *   log_alert (WARN+) → 운영 채널
 *   qna_new → Q&A 채널
 */

const _slackNotifyState = {
  lastSent: {},
  THROTTLE_MS: 5000
};

/**
 * Slack 알림 전송 (fire-and-forget)
 * @param {string} type - 알림 유형: purchase_new, purchase_status, user_register, dept_transfer, log_alert, qna_new
 * @param {Object} data - 알림 데이터
 */
function sendSlackNotify(type, data) {
  if (!_sb || !type) return;

  const payloadData = Object.assign({}, data || {});
  let session = null;
  try {
    session = (typeof getSession === 'function') ? getSession() : null;
  } catch (e) {}
  if (!payloadData['사용자계정']) {
    payloadData['사용자계정'] = session?.username || payloadData['아이디'] || payloadData['계정'] || '계정 없음';
  }
  if (!payloadData['사용자이름']) {
    payloadData['사용자이름'] = session?.displayName || payloadData['이름'] || payloadData['신청자'] || payloadData['등록자'] || '이름 없음';
  }

  const key = type + '_' + JSON.stringify(payloadData);
  const now = Date.now();
  if (_slackNotifyState.lastSent[key] && now - _slackNotifyState.lastSent[key] < _slackNotifyState.THROTTLE_MS) {
    return;
  }
  _slackNotifyState.lastSent[key] = now;

  const oldKeys = Object.keys(_slackNotifyState.lastSent);
  if (oldKeys.length > 50) {
    const cutoff = now - 60000;
    oldKeys.forEach(function(k) {
      if (_slackNotifyState.lastSent[k] < cutoff) delete _slackNotifyState.lastSent[k];
    });
  }

  _sb.functions.invoke('slack-notify', {
    body: { type: type, data: payloadData }
  }).catch(function(err) {
    console.warn('[SlackNotify] Failed:', err);
  });
}
