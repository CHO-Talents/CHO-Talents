/**
 * Talent Module - 달란트 조회/적립/사용 공통 모듈
 */

async function fetchTalentBalance(userId) {
  if (!_sb) return 0;
  const { data, error } = await _sb
    .from('admin_users')
    .select('talent_balance')
    .eq('id', userId)
    .single();
  if (error || !data) return 0;
  return data.talent_balance || 0;
}

async function fetchTalentHistory(userId, options = {}) {
  if (!_sb) return { data: [], error: 'Supabase not initialized' };

  let query = _sb.from('talent_transactions').select('*').eq('user_id', userId);

  if (options.type) query = query.eq('type', options.type);
  if (options.dateFrom) query = query.gte('created_at', options.dateFrom);
  if (options.dateTo) query = query.lte('created_at', options.dateTo);

  query = query.order('created_at', { ascending: false });

  if (options.limit) query = query.limit(options.limit);
  if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 50) - 1);

  return await query;
}

async function fetchTalentSummary(userId) {
  if (!_sb) return { earned: 0, used: 0, balance: 0 };

  const [balanceRes, earnRes, useRes] = await Promise.all([
    fetchTalentBalance(userId),
    _sb.from('talent_transactions').select('amount').eq('user_id', userId).eq('type', 'earn'),
    _sb.from('talent_transactions').select('amount').eq('user_id', userId).eq('type', 'use')
  ]);

  const earned = (earnRes.data || []).reduce((s, r) => s + r.amount, 0);
  const used = (useRes.data || []).reduce((s, r) => s + r.amount, 0);

  return { earned, used, balance: balanceRes };
}

async function giveTalent(userId, amount, description, createdBy) {
  if (!_sb) return { success: false, error: 'Supabase not initialized' };
  try {
    const { data, error } = await _sb.rpc('give_talent', {
      p_user_id: userId,
      p_amount: amount,
      p_description: description,
      p_created_by: createdBy
    });
    if (error) {
      await logError('TALENT_GIVE_FAIL', { userId, amount, error: error.message });
      return { success: false, error: error.message };
    }
    await logInfo('TALENT_GIVE', { userId, amount, description });
    return data;
  } catch (err) {
    await logError('TALENT_GIVE_ERROR', { userId, error: String(err) });
    return { success: false, error: String(err) };
  }
}

async function useTalent(userId, amount, description, createdBy) {
  if (!_sb) return { success: false, error: 'Supabase not initialized' };
  try {
    const { data, error } = await _sb.rpc('use_talent', {
      p_user_id: userId,
      p_amount: amount,
      p_description: description,
      p_created_by: createdBy
    });
    if (error) {
      await logError('TALENT_USE_FAIL', { userId, amount, error: error.message });
      return { success: false, error: error.message };
    }
    await logInfo('TALENT_USE', { userId, amount, description });
    return data;
  } catch (err) {
    await logError('TALENT_USE_ERROR', { userId, error: String(err) });
    return { success: false, error: String(err) };
  }
}
