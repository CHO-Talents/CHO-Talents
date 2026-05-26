/**
 * Supabase Configuration
 *
 * 아래 값을 본인의 Supabase 프로젝트 정보로 교체하세요.
 * Supabase 대시보드 > Settings > API 에서 확인할 수 있습니다.
 */
const SUPABASE_URL = 'https://blitrrcdkkkszvgylnus.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_TgsQePzjxca9Hr3Lh_dHvA_O1JqRAQ6';

let supabase = null;

function initSupabase() {
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    console.warn('[Supabase] API 키가 설정되지 않았습니다. supabase-config.js를 확인하세요.');
    return null;
  }

  try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('[Supabase] 클라이언트 초기화 완료');
    return supabase;
  } catch (err) {
    console.error('[Supabase] 초기화 실패:', err);
    return null;
  }
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
