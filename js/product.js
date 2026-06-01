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

async function uploadProductImage(file) {
  if (!_sb) return { url: null, error: 'Supabase not initialized' };
  try {
    const ext = file.name.split('.').pop().toLowerCase();
    const fileName = `product_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { data, error } = await _sb.storage.from('Talents_Items').upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });
    if (error) {
      await logError('IMAGE_UPLOAD_FAIL', { error: error.message });
      return { url: null, error: error.message };
    }
    const { data: urlData } = _sb.storage.from('Talents_Items').getPublicUrl(data.path);
    await logInfo('IMAGE_UPLOAD', { path: data.path });
    return { url: urlData.publicUrl, error: null };
  } catch (err) {
    await logError('IMAGE_UPLOAD_ERROR', { error: String(err) });
    return { url: null, error: String(err) };
  }
}

async function deleteProductImage(imageUrl) {
  if (!_sb || !imageUrl) return;
  try {
    const path = imageUrl.split('/Talents_Items/').pop();
    if (path) await _sb.storage.from('Talents_Items').remove([path]);
  } catch (err) {
    logWarn('IMAGE_DELETE_FAIL', { imageUrl, error: String(err) });
  }
}

async function deleteProduct(id) {
  if (!_sb) return { error: 'Supabase not initialized' };
  try {
    const { error } = await _sb.from('products').delete().eq('id', id);
    if (error) {
      if (/foreign key|violates|referenced/i.test(error.message)) {
        return { error: error.message, fkConflict: true };
      }
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

async function deactivateProduct(id) {
  if (!_sb) return { error: 'Supabase not initialized' };
  try {
    const { error } = await _sb.from('products').update({ is_active: false }).eq('id', id);
    if (error) {
      await logError('PRODUCT_DEACTIVATE_FAIL', { id, error: error.message });
      return { error: error.message };
    }
    await logInfo('PRODUCT_DEACTIVATE', { id });
    return { error: null };
  } catch (err) {
    await logError('PRODUCT_DEACTIVATE_ERROR', { id, error: String(err) });
    return { error: String(err) };
  }
}
