/**
 * User Management Module - Supabase Auth + RPC 기반 보안 사용자 관리
 */

const _CIRCLE = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮'];

function resolveDisplayNames(users) {
  const groups = {};
  users.forEach(u => {
    const key = (u.display_name||'') + '|' + (u.user_type||'') + '|' + (u.department_id||'');
    if (!groups[key]) groups[key] = [];
    groups[key].push(u);
  });
  const map = {};
  Object.values(groups).forEach(g => {
    if (g.length > 1) {
      g.sort((a, b) => (a.created_at||'').localeCompare(b.created_at||''));
      g.forEach((u, i) => { map[u.id] = (u.display_name||u.username) + (_CIRCLE[i]||('('+String(i+1)+')')); });
    }
  });
  users.forEach(u => { if (!map[u.id]) map[u.id] = u.display_name || u.username; });
  return map;
}

function isAdminLevel(session) {
  return session && (session.permissionLevel === 'admin' || session.isSuperAdmin);
}

const _PERM_SORT_RANK = { admin:100, evangelist:90, chief:80, purchase_teacher:70, dept_teacher:60, teacher:40, student:20 };
const _TYPE_SORT_RANK = { teacher:1, student:2 };

function sortUserList(list, getDeptNameFn) {
  return list.sort((a, b) => {
    const dA = (getDeptNameFn ? getDeptNameFn(a.department_id) : a._deptName) || '';
    const dB = (getDeptNameFn ? getDeptNameFn(b.department_id) : b._deptName) || '';
    const dCmp = dA.localeCompare(dB, 'ko');
    if (dCmp !== 0) return dCmp;
    const cA = a.class_number != null ? a.class_number : 9999;
    const cB = b.class_number != null ? b.class_number : 9999;
    if (cA !== cB) return cA - cB;
    const nA = a.display_name || a.username || '';
    const nB = b.display_name || b.username || '';
    return nA.localeCompare(nB, 'ko');
  });
}

async function fetchUsers(options = {}) {
  if (!_sb) return { data: [], error: 'Supabase not initialized' };
  try {
    const { data, error } = await _sb.rpc('admin_list_users', {
      p_user_type: options.userType || null,
      p_department_id: options.departmentId || null
    });
    if (error) return { data: [], error: error.message };
    return { data: data || [], error: null };
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
      p_department_id: userData.departmentId || null,
      p_managed_dept_id: userData.managedDeptId || null,
      p_user_type: userData.userType || 'student',
      p_permission_level: userData.permissionLevel || 'student',
      p_class_number: userData.classNumber != null ? userData.classNumber : null
    });
    if (error) {
      await logError('USER_CREATE_FAIL', { 대상: userData.username, 오류: error.message });
      return { data: null, error: error.message };
    }
    if (!data.success) {
      await logWarn('USER_CREATE_DENIED', { 대상: userData.username, 사유: data.error });
      return { data: null, error: data.error };
    }
    await logInfo('USER_CREATE', buildChangeLogDetails({
      targetName: userData.displayName || userData.username,
      targetType: '사용자',
      targetId: data.user_id || data.id || null,
      changes: buildChangeSet({}, {
        username: userData.username,
        displayName: userData.displayName || userData.username,
        departmentId: userData.departmentId || null,
        managedDeptId: userData.managedDeptId || null,
        userType: userData.userType || 'student',
        permissionLevel: userData.permissionLevel || 'student',
        classNumber: userData.classNumber != null ? userData.classNumber : null
      })
    }));
    return { data, error: null };
  } catch (err) {
    await logError('USER_CREATE_ERROR', { 오류: String(err) });
    return { data: null, error: String(err) };
  }
}

async function updateUser(id, updates) {
  if (!_sb) return { data: null, error: 'Supabase not initialized' };
  try {
    const { data: beforeUsers } = await fetchUsers();
    const before = (beforeUsers || []).find(user => user.id === id) || {};
    const { data, error } = await _sb.rpc('admin_update_user', {
      p_user_id: id,
      p_display_name: updates.displayName || null,
      p_department_id: updates.departmentId || null,
      p_managed_dept_id: updates.managedDeptId !== undefined ? updates.managedDeptId : null,
      p_user_type: updates.userType || null,
      p_permission_level: updates.permissionLevel || null,
      p_class_number: updates.classNumber != null ? updates.classNumber : null
    });
    if (error) {
      await logError('USER_UPDATE_FAIL', { id, 오류: error.message });
      return { data: null, error: error.message };
    }
    if (!data.success) {
      await logWarn('USER_UPDATE_DENIED', { id, 사유: data.error });
      return { data: null, error: data.error };
    }
    await logInfo('USER_UPDATE', buildChangeLogDetails({
      targetName: updates.displayName || before.display_name || before.displayName || before.username,
      targetType: '사용자',
      targetId: id,
      changes: buildChangeSet(before, {
        display_name: updates.displayName,
        department_id: updates.departmentId,
        managed_dept_id: updates.managedDeptId,
        user_type: updates.userType,
        permission_level: updates.permissionLevel,
        class_number: updates.classNumber
      })
    }));
    return { data, error: null };
  } catch (err) {
    await logError('USER_UPDATE_ERROR', { id, 오류: String(err) });
    return { data: null, error: String(err) };
  }
}

async function deleteUser(id) {
  if (!_sb) return { error: 'Supabase not initialized' };
  try {
    const { data: beforeUsers } = await fetchUsers();
    const before = (beforeUsers || []).find(user => user.id === id) || {};
    const { data, error } = await _sb.rpc('admin_delete_user', { p_user_id: id });
    if (error) {
      await logError('USER_DELETE_FAIL', { id, 오류: error.message });
      return { error: error.message };
    }
    if (!data.success) {
      await logWarn('USER_DELETE_DENIED', { id, 사유: data.error });
      return { error: data.error };
    }
    await logInfo('USER_DELETE', buildChangeLogDetails({
      targetName: before.display_name || before.displayName || before.username,
      targetType: '사용자',
      targetId: id,
      changes: buildChangeSet(before, {}, { fields:['username', 'display_name', 'department_id', 'managed_dept_id', 'user_type', 'permission_level', 'class_number'] })
    }));
    return { error: null };
  } catch (err) {
    await logError('USER_DELETE_ERROR', { id, 오류: String(err) });
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
      await logError('PASSWORD_RESET_FAIL', { id, 오류: error.message });
      return { error: error.message };
    }
    if (!data.success) {
      await logWarn('PASSWORD_RESET_DENIED', { id, 대상: username, 사유: data.error });
      return { error: data.error };
    }
    await logInfo('PASSWORD_RESET', buildChangeLogDetails({
      targetName: username,
      targetType: '사용자',
      targetId: id,
      extra: { 처리내용:'초기 비밀번호로 재설정 (비밀번호 값 미기록)' }
    }));
    return { error: null };
  } catch (err) {
    await logError('PASSWORD_RESET_ERROR', { id, 오류: String(err) });
    return { error: String(err) };
  }
}

async function fetchDepartments() {
  if (!_sb) return { data: [], error: 'Supabase not initialized' };
  return await _sb.from('departments').select('*').eq('is_active', true).order('name');
}

async function createDepartment(name, description, classCount) {
  if (!_sb) return { data: null, error: 'Supabase not initialized' };
  try {
    const row = { name, description };
    if (classCount != null) row.class_count = classCount;
    const { data, error } = await _sb.from('departments').insert(row).select();
    if (error) {
      await logError('DEPT_CREATE_FAIL', { 대상: name, 오류: error.message });
      return { data: null, error: error.message };
    }
    const created = data && data[0] ? data[0] : row;
    await logInfo('DEPT_CREATE', buildChangeLogDetails({
      targetName: name,
      targetType: '부서',
      targetId: created.id,
      changes: buildChangeSet({}, created)
    }));
    return { data: created, error: null };
  } catch (err) {
    await logError('DEPT_CREATE_ERROR', { 오류: String(err) });
    return { data: null, error: String(err) };
  }
}

async function updateDepartment(id, updates) {
  if (!_sb) return { data: null, error: 'Supabase not initialized' };
  try {
    const { data: before } = await _sb.from('departments').select('*').eq('id', id).maybeSingle();
    const { data, error } = await _sb.from('departments').update(updates).eq('id', id).select();
    if (error) {
      await logError('DEPT_UPDATE_FAIL', { id, 오류: error.message });
      return { data: null, error: error.message };
    }
    const updated = data && data[0] ? data[0] : null;
    await logInfo('DEPT_UPDATE', buildChangeLogDetails({
      targetName: (updated && updated.name) || (before && before.name) || updates.name,
      targetType: '부서',
      targetId: id,
      changes: buildChangeSet(before || {}, updated || updates)
    }));
    return { data: updated, error: null };
  } catch (err) {
    await logError('DEPT_UPDATE_ERROR', { id, 오류: String(err) });
    return { data: null, error: String(err) };
  }
}

async function deleteDepartment(id) {
  if (!_sb) return { error: 'Supabase not initialized' };
  try {
    const { data: before } = await _sb.from('departments').select('*').eq('id', id).maybeSingle();
    const { data, error } = await _sb.from('departments').update({ is_active: false }).eq('id', id).select();
    if (error) {
      await logError('DEPT_DELETE_FAIL', { id, 오류: error.message });
      return { error: error.message };
    }
    const updated = data && data[0] ? data[0] : null;
    await logInfo('DEPT_DELETE', buildChangeLogDetails({
      targetName: (updated && updated.name) || (before && before.name),
      targetType: '부서',
      targetId: id,
      changes: buildChangeSet(before || {}, updated || { is_active:false }, { fields:['is_active'] })
    }));
    return { error: null };
  } catch (err) {
    await logError('DEPT_DELETE_ERROR', { id, 오류: String(err) });
    return { error: String(err) };
  }
}
