/**
 * Supabase Configuration & Global Utilities
 */
const SUPABASE_URL = 'https://blitrrcdkkkszvgylnus.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_TgsQePzjxca9Hr3Lh_dHvA_O1JqRAQ6';

let supabase = null;

function initSupabase() {
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    console.warn('[Supabase] API 키가 설정되지 않았습니다.');
    return null;
  }
  try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabase;
  } catch (err) {
    console.error('[Supabase] 초기화 실패:', err);
    return null;
  }
}

/* ===== KST Time Utilities ===== */

function toKST(date) {
  return new Date((date || new Date()).toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
}

function formatKST(date, opts) {
  const d = date ? new Date(date) : new Date();
  const defaults = {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  };
  return d.toLocaleString('ko-KR', { ...defaults, ...opts });
}

function formatKSTShort(date) {
  const d = date ? new Date(date) : new Date();
  return d.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  });
}

/* ===== CRUD Helper Functions ===== */

async function dbSelect(table, options = {}) {
  if (!supabase) return { data: null, error: 'Supabase not initialized' };

  let query = supabase.from(table).select(options.columns || '*');

  if (options.filter) {
    for (const [col, val] of Object.entries(options.filter)) {
      query = query.eq(col, val);
    }
  }
  if (options.order) {
    query = query.order(options.order.column, { ascending: options.order.ascending ?? true });
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }

  return await query;
}

async function dbInsert(table, rows) {
  if (!supabase) return { data: null, error: 'Supabase not initialized' };
  return await supabase.from(table).insert(rows).select();
}

async function dbUpdate(table, updates, filter) {
  if (!supabase) return { data: null, error: 'Supabase not initialized' };

  let query = supabase.from(table).update(updates);
  for (const [col, val] of Object.entries(filter)) {
    query = query.eq(col, val);
  }
  return await query.select();
}

async function dbDelete(table, filter) {
  if (!supabase) return { data: null, error: 'Supabase not initialized' };

  let query = supabase.from(table).delete();
  for (const [col, val] of Object.entries(filter)) {
    query = query.eq(col, val);
  }
  return await query;
}
