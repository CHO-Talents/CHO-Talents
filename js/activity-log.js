/**
 * Activity Log Module
 * 모든 페이지에서 사용하는 공통 로그 기록/조회 모듈
 */

const LOG_LEVELS = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL', 'CRITICAL'];
const ERROR_LEVELS = ['ERROR', 'FATAL', 'CRITICAL'];

let _clientInfo = null;
let _clientIp = null;

function _parseUA() {
  const ua = navigator.userAgent || '';
  let browser = 'Unknown', os = 'Unknown', deviceType = 'desktop';

  if (/Edg\//i.test(ua)) browser = 'Edge ' + (ua.match(/Edg\/([\d.]+)/)||[])[1];
  else if (/OPR\//i.test(ua)) browser = 'Opera ' + (ua.match(/OPR\/([\d.]+)/)||[])[1];
  else if (/Chrome\//i.test(ua)) browser = 'Chrome ' + (ua.match(/Chrome\/([\d.]+)/)||[])[1];
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari ' + (ua.match(/Version\/([\d.]+)/)||[])[1];
  else if (/Firefox\//i.test(ua)) browser = 'Firefox ' + (ua.match(/Firefox\/([\d.]+)/)||[])[1];

  if (/Windows NT 10/i.test(ua)) os = 'Windows 10/11';
  else if (/Windows NT/i.test(ua)) os = 'Windows';
  else if (/Mac OS X/i.test(ua)) os = 'macOS ' + ((ua.match(/Mac OS X ([\d_]+)/)||[])[1]||'').replace(/_/g,'.');
  else if (/Android/i.test(ua)) os = 'Android ' + (ua.match(/Android ([\d.]+)/)||[])[1];
  else if (/iPhone|iPad/i.test(ua)) os = 'iOS ' + ((ua.match(/OS ([\d_]+)/)||[])[1]||'').replace(/_/g,'.');
  else if (/Linux/i.test(ua)) os = 'Linux';
  else if (/CrOS/i.test(ua)) os = 'Chrome OS';

  if (/Mobi|Android.*Mobile|iPhone/i.test(ua)) deviceType = 'mobile';
  else if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) deviceType = 'tablet';

  return { browser, os, deviceType, userAgent: ua };
}

function getClientInfo() {
  if (_clientInfo) return _clientInfo;
  const { browser, os, deviceType, userAgent } = _parseUA();
  _clientInfo = {
    ip: _clientIp || null,
    browser,
    os,
    screenRes: screen.width + 'x' + screen.height,
    windowSize: window.innerWidth + 'x' + window.innerHeight,
    deviceType,
    language: navigator.language || navigator.userLanguage || 'unknown'
  };
  return _clientInfo;
}

function _fetchIp() {
  fetch('https://api.ipify.org?format=json')
    .then(r => r.json())
    .then(d => {
      _clientIp = d.ip;
      if (_clientInfo) _clientInfo.ip = d.ip;
    })
    .catch(() => {});
}
_fetchIp();

async function writeLog(level, action, page, details) {
  if (!_sb) {
    console.warn('[Log] Supabase not initialized, log skipped:', level, action);
    return;
  }
  const session = getSession();
  const ci = getClientInfo();
  const merged = details ? Object.assign({}, details, { _client: ci }) : { _client: ci };
  const row = {
    level,
    action,
    page: page || window.location.pathname,
    details: merged,
    username: session ? session.username : null,
    is_acknowledged: !ERROR_LEVELS.includes(level)
  };
  try {
    await _sb.from('activity_logs').insert(row);
  } catch (err) {
    console.error('[Log] Failed to write log:', err);
  }
}

function logTrace(action, details) { return writeLog('TRACE', action, null, details); }
function logDebug(action, details) { return writeLog('DEBUG', action, null, details); }
function logInfo(action, details)  { return writeLog('INFO', action, null, details); }
function logWarn(action, details)  { return writeLog('WARN', action, null, details); }
function logError(action, details) { return writeLog('ERROR', action, null, details); }
function logFatal(action, details) { return writeLog('FATAL', action, null, details); }
function logCritical(action, details) { return writeLog('CRITICAL', action, null, details); }

async function fetchLogs(options = {}) {
  if (!_sb) return { data: [], error: 'Supabase not initialized' };

  let query = _sb.from('activity_logs').select('*');

  if (options.levels && options.levels.length > 0) {
    query = query.in('level', options.levels);
  }
  if (options.action) {
    query = query.eq('action', options.action);
  }
  if (options.dateFrom) {
    query = query.gte('created_at', options.dateFrom);
  }
  if (options.dateTo) {
    query = query.lte('created_at', options.dateTo);
  }
  if (options.unacknowledgedOnly) {
    query = query.eq('is_acknowledged', false).in('level', ERROR_LEVELS);
  }

  query = query.order('created_at', { ascending: false });

  if (options.limit) query = query.limit(options.limit);
  if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 50) - 1);

  return await query;
}

async function getUnacknowledgedCount() {
  if (!_sb) return 0;
  const { count, error } = await _sb
    .from('activity_logs')
    .select('*', { count: 'exact', head: true })
    .eq('is_acknowledged', false)
    .in('level', ERROR_LEVELS);
  return error ? 0 : (count || 0);
}

async function acknowledgeLog(logId, username, note) {
  if (!_sb) return { error: 'Supabase not initialized' };
  return await _sb.from('activity_logs').update({
    is_acknowledged: true,
    acknowledged_by: username,
    acknowledged_at: new Date().toISOString(),
    resolution_note: note
  }).eq('id', logId).select();
}

/* ===== Session Helpers (Supabase Auth 연동) ===== */

function getSession() {
  try {
    const raw = sessionStorage.getItem('cho_session');
    if (raw) return JSON.parse(raw);
    const old = sessionStorage.getItem('cho_admin_session');
    return old ? JSON.parse(old) : null;
  } catch { return null; }
}

function setSession(data) {
  sessionStorage.setItem('cho_session', JSON.stringify(data));
  sessionStorage.removeItem('cho_admin_session');
}

function clearSession() {
  sessionStorage.removeItem('cho_session');
  sessionStorage.removeItem('cho_admin_session');
}

async function loadAuthSession() {
  if (!_sb) return null;
  const { data: { session } } = await _sb.auth.getSession();
  if (!session) return null;

  const cached = getSession();
  if (cached && cached.id === session.user.id) return cached;

  const { data } = await _sb.rpc('get_my_profile');
  if (!data) return null;

  const perm = data.permission_level;
  const profile = {
    id: data.id,
    username: data.username,
    displayName: data.display_name,
    userType: data.user_type || 'teacher',
    permissionLevel: perm,
    permissionRank: (typeof getPermRank === 'function') ? getPermRank(perm) : ({ admin: 100, evangelist: 90, chief: 80, dept_teacher: 60, teacher: 40, student: 20 }[perm] || 0),
    isSuperAdmin: data.is_super_admin || false,
    isFirstLogin: data.is_first_login,
    departmentId: data.department_id,
    managedDeptId: data.managed_dept_id,
    talentBalance: data.talent_balance || 0,
    departmentName: data.department_name
  };
  setSession(profile);
  return profile;
}

/* ===== Global Error Handler ===== */

window.addEventListener('error', (e) => {
  logError('JS_ERROR', {
    message: e.message,
    filename: e.filename,
    lineno: e.lineno,
    colno: e.colno
  });
});

window.addEventListener('unhandledrejection', (e) => {
  logError('PROMISE_REJECTION', {
    reason: e.reason ? String(e.reason) : 'Unknown'
  });
});

/* ===== Auto Page View Log ===== */

function autoLogPageView() {
  if (_sb) {
    logInfo('PAGE_VIEW', { url: window.location.href });
  }
}
