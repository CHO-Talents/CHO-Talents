/**
 * Activity Log Module
 * 모든 페이지에서 사용하는 공통 로그 기록/조회 모듈
 */

const LOG_LEVELS = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL', 'CRITICAL'];
const ERROR_LEVELS = ['ERROR', 'FATAL', 'CRITICAL'];

async function writeLog(level, action, page, details) {
  if (!_sb) {
    console.warn('[Log] Supabase not initialized, log skipped:', level, action);
    return;
  }
  const session = getSession();
  const row = {
    level,
    action,
    page: page || window.location.pathname,
    details: details || null,
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

/* ===== Session Helpers ===== */

function getSession() {
  try {
    const raw = sessionStorage.getItem('cho_admin_session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function setSession(data) {
  sessionStorage.setItem('cho_admin_session', JSON.stringify(data));
}

function clearSession() {
  sessionStorage.removeItem('cho_admin_session');
}

function requireAuth(loginPath) {
  const session = getSession();
  if (!session) {
    window.location.href = loginPath || 'login.html';
    return null;
  }
  return session;
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
