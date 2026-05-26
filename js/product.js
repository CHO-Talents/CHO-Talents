/**
 * Product Module - 달란트 상품 조회/관리 모듈
 */

async function fetchProducts(targetRole, options = {}) {
  if (!_sb) return { data: [], error: 'Supabase not initialized' };

  let query = _sb.from('products').select('*');

  if (targetRole) query = query.eq('target_role', targetRole);
  if (options.activeOnly !== false) query = query.eq('is_active', true);
  if (options.category) query = query.eq('category', options.category);

  query = query.order('category').order('created_at', { ascending: false });
  return await query;
}

async function createProduct(productData) {
  if (!_sb) return { data: null, error: 'Supabase not initialized' };
  try {
    const { data, error } = await _sb.from('products').insert(productData).select();
    if (error) {
      await logError('PRODUCT_CREATE_FAIL', { error: error.message });
      return { data: null, error: error.message };
    }
    await logInfo('PRODUCT_CREATE', { name: productData.name });
    return { data: data[0], error: null };
  } catch (err) {
    await logError('PRODUCT_CREATE_ERROR', { error: String(err) });
    return { data: null, error: String(err) };
  }
}

async function updateProduct(id, updates) {
  if (!_sb) return { data: null, error: 'Supabase not initialized' };
  try {
    const { data, error } = await _sb.from('products').update(updates).eq('id', id).select();
    if (error) {
      await logError('PRODUCT_UPDATE_FAIL', { id, error: error.message });
      return { data: null, error: error.message };
    }
    await logInfo('PRODUCT_UPDATE', { id, name: updates.name });
    return { data: data[0], error: null };
  } catch (err) {
    await logError('PRODUCT_UPDATE_ERROR', { id, error: String(err) });
    return { data: null, error: String(err) };
  }
}

async function deleteProduct(id) {
  if (!_sb) return { error: 'Supabase not initialized' };
  try {
    const { error } = await _sb.from('products').delete().eq('id', id);
    if (error) {
      await logError('PRODUCT_DELETE_FAIL', { id, error: error.message });
      return { error: error.message };
    }
    await logInfo('PRODUCT_DELETE', { id });
    return { error: null };
  } catch (err) {
    await logError('PRODUCT_DELETE_ERROR', { id, error: String(err) });
    return { error: String(err) };
  }
}
