/**
 * User Management Module - Supabase Auth + RPC 기반 보안 사용자 관리
 */

async function fetchUsers(options = {}) {
  if (!_sb) return { data: [], error: 'Supabase not initialized' };
  try {
    const { data, error } = await _sb.rpc('admin_list_users', {
      p_role: options.role || null,
      p_department_id: options.departmentId || null
    });
    if (error) return { data: [], error: error.message };
    if (!data || !data.success) return { data: [], error: data?.error || 'Unknown error' };
    return { data: data.users || [], error: null };
  } catch (err) {
    return { data: [], error: String(err) };
  }
}

async function createUser(userData) {
  if (!_sb) return { data: null, error: 'Supabase not initialized' };
  try {
    const { data, error } = await _sb.rpc('admin_create_user', {
      p_username: userData.username,
      p_password: userData.password || '1234',
      p_display_name: userData.displayName || userData.username,
      p_role: userData.role || 'student',
      p_department_id: userData.departmentId || null,
      p_managed_dept_id: userData.managedDeptId || null
    });
    if (error) {
      await logError('USER_CREATE_FAIL', { username: userData.username, error: error.message });
      return { data: null, error: error.message };
    }
    if (!data.success) {
      return { data: null, error: data.error };
    }
    await logInfo('USER_CREATE', { username: userData.username, role: userData.role });
    return { data, error: null };
  } catch (err) {
    await logError('USER_CREATE_ERROR', { error: String(err) });
    return { data: null, error: String(err) };
  }
}

async function updateUser(id, updates) {
  if (!_sb) return { data: null, error: 'Supabase not initialized' };
  try {
    const { data, error } = await _sb.rpc('admin_update_user', {
      p_user_id: id,
      p_display_name: updates.displayName || null,
      p_role: updates.role || null,
      p_department_id: updates.departmentId || null,
      p_managed_dept_id: updates.managedDeptId !== undefined ? updates.managedDeptId : null
    });
    if (error) {
      await logError('USER_UPDATE_FAIL', { id, error: error.message });
      return { data: null, error: error.message };
    }
    if (!data.success) {
      return { data: null, error: data.error };
    }
    await logInfo('USER_UPDATE', { id });
    return { data, error: null };
  } catch (err) {
    await logError('USER_UPDATE_ERROR', { id, error: String(err) });
    return { data: null, error: String(err) };
  }
}

async function deleteUser(id) {
  if (!_sb) return { error: 'Supabase not initialized' };
  try {
    const { data, error } = await _sb.rpc('admin_delete_user', { p_user_id: id });
    if (error) {
      await logError('USER_DELETE_FAIL', { id, error: error.message });
      return { error: error.message };
    }
    if (!data.success) {
      return { error: data.error };
    }
    await logInfo('USER_DELETE', { id });
    return { error: null };
  } catch (err) {
    await logError('USER_DELETE_ERROR', { id, error: String(err) });
    return { error: String(err) };
  }
}

async function resetUserPassword(id, username) {
  if (!_sb) return { error: 'Supabase not initialized' };
  try {
    const { data, error } = await _sb.rpc('admin_reset_password', {
      p_user_id: id,
      p_new_password: '1234'
    });
    if (error) {
      await logError('PASSWORD_RESET_FAIL', { id, error: error.message });
      return { error: error.message };
    }
    if (!data.success) {
      return { error: data.error };
    }
    await logInfo('PASSWORD_RESET', { id, username });
    return { error: null };
  } catch (err) {
    await logError('PASSWORD_RESET_ERROR', { id, error: String(err) });
    return { error: String(err) };
  }
}

async function fetchDepartments() {
  if (!_sb) return { data: [], error: 'Supabase not initialized' };
  return await _sb.from('departments').select('*').eq('is_active', true).order('name');
}

async function createDepartment(name, description) {
  if (!_sb) return { data: null, error: 'Supabase not initialized' };
  try {
    const { data, error } = await _sb.from('departments').insert({ name, description }).select();
    if (error) {
      await logError('DEPT_CREATE_FAIL', { name, error: error.message });
      return { data: null, error: error.message };
    }
    await logInfo('DEPT_CREATE', { name });
    return { data: data[0], error: null };
  } catch (err) {
    await logError('DEPT_CREATE_ERROR', { error: String(err) });
    return { data: null, error: String(err) };
  }
}

async function updateDepartment(id, updates) {
  if (!_sb) return { data: null, error: 'Supabase not initialized' };
  try {
    const { data, error } = await _sb.from('departments').update(updates).eq('id', id).select();
    if (error) {
      await logError('DEPT_UPDATE_FAIL', { id, error: error.message });
      return { data: null, error: error.message };
    }
    await logInfo('DEPT_UPDATE', { id, name: updates.name });
    return { data: data[0], error: null };
  } catch (err) {
    await logError('DEPT_UPDATE_ERROR', { id, error: String(err) });
    return { data: null, error: String(err) };
  }
}

async function deleteDepartment(id) {
  if (!_sb) return { error: 'Supabase not initialized' };
  try {
    const { error } = await _sb.from('departments').update({ is_active: false }).eq('id', id);
    if (error) {
      await logError('DEPT_DELETE_FAIL', { id, error: error.message });
      return { error: error.message };
    }
    await logInfo('DEPT_DELETE', { id });
    return { error: null };
  } catch (err) {
    await logError('DEPT_DELETE_ERROR', { id, error: String(err) });
    return { error: String(err) };
  }
}
