/**
 * User Management Module - 사용자 계정 관리 모듈
 */

async function fetchUsers(options = {}) {
  if (!_sb) return { data: [], error: 'Supabase not initialized' };

  let query = _sb.from('admin_users')
    .select('id, username, display_name, role, department_id, managed_dept_id, talent_balance, is_first_login, created_at');

  if (options.role) query = query.eq('role', options.role);
  if (options.departmentId) query = query.eq('department_id', options.departmentId);
  if (options.managedDeptId) query = query.eq('managed_dept_id', options.managedDeptId);

  query = query.order('created_at', { ascending: false });
  return await query;
}

async function createUser(userData) {
  if (!_sb) return { data: null, error: 'Supabase not initialized' };
  try {
    const passwordHash = await hashPassword(userData.password || '1234');
    const row = {
      username: userData.username,
      password_hash: passwordHash,
      display_name: userData.displayName || userData.username,
      role: userData.role,
      department_id: userData.departmentId || null,
      managed_dept_id: userData.managedDeptId || null,
      talent_balance: 0,
      is_first_login: true
    };
    const { data, error } = await _sb.from('admin_users').insert(row).select();
    if (error) {
      await logError('USER_CREATE_FAIL', { username: userData.username, error: error.message });
      return { data: null, error: error.message };
    }
    await logInfo('USER_CREATE', { username: userData.username, role: userData.role });
    return { data: data[0], error: null };
  } catch (err) {
    await logError('USER_CREATE_ERROR', { error: String(err) });
    return { data: null, error: String(err) };
  }
}

async function updateUser(id, updates) {
  if (!_sb) return { data: null, error: 'Supabase not initialized' };
  try {
    const row = {};
    if (updates.displayName !== undefined) row.display_name = updates.displayName;
    if (updates.role !== undefined) row.role = updates.role;
    if (updates.departmentId !== undefined) row.department_id = updates.departmentId;
    if (updates.managedDeptId !== undefined) row.managed_dept_id = updates.managedDeptId;
    row.updated_at = new Date().toISOString();

    const { data, error } = await _sb.from('admin_users').update(row).eq('id', id).select();
    if (error) {
      await logError('USER_UPDATE_FAIL', { id, error: error.message });
      return { data: null, error: error.message };
    }
    await logInfo('USER_UPDATE', { id });
    return { data: data[0], error: null };
  } catch (err) {
    await logError('USER_UPDATE_ERROR', { id, error: String(err) });
    return { data: null, error: String(err) };
  }
}

async function deleteUser(id) {
  if (!_sb) return { error: 'Supabase not initialized' };
  try {
    const { error } = await _sb.from('admin_users').delete().eq('id', id);
    if (error) {
      await logError('USER_DELETE_FAIL', { id, error: error.message });
      return { error: error.message };
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
    const defaultHash = await hashPassword('1234');
    const { error } = await _sb.from('admin_users')
      .update({ password_hash: defaultHash, is_first_login: true, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      await logError('PASSWORD_RESET_FAIL', { id, error: error.message });
      return { error: error.message };
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
