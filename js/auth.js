/**
 * Authentication Module
 * SHA-256 해싱 + Supabase RPC 기반 인증 (전 역할 지원)
 */

const ROLE_LABELS = {
  admin: '관리자',
  dept_manager: '부서 관리자',
  teacher: '교사',
  student: '학생'
};

const ROLE_REDIRECT = {
  admin: 'admin/index.html',
  dept_manager: 'manager/index.html',
  teacher: 'teacher/my-talents.html',
  student: 'student/my-talents.html'
};

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function login(username, password) {
  if (!_sb) return { success: false, error: 'Supabase 연결 실패' };
  if (!username || !password) return { success: false, error: '아이디와 비밀번호를 입력해주세요.' };

  try {
    const passwordHash = await hashPassword(password);

    const { data, error } = await _sb.rpc('verify_user', {
      p_username: username,
      p_password_hash: passwordHash
    });

    if (error) {
      await logWarn('LOGIN_FAIL', { username, reason: error.message });
      return { success: false, error: '로그인 처리 중 오류가 발생했습니다.' };
    }

    if (!data) {
      await logWarn('LOGIN_FAIL', { username, reason: 'Invalid credentials' });
      return { success: false, error: '아이디 또는 비밀번호가 일치하지 않습니다.' };
    }

    setSession({
      id: data.id,
      username: data.username,
      displayName: data.display_name,
      role: data.role,
      isFirstLogin: data.is_first_login,
      departmentId: data.department_id,
      managedDeptId: data.managed_dept_id,
      talentBalance: data.talent_balance || 0,
      departmentName: data.department_name
    });

    await logInfo('LOGIN_SUCCESS', { username, role: data.role });
    return { success: true, data };
  } catch (err) {
    await logError('LOGIN_ERROR', { username, error: String(err) });
    return { success: false, error: '로그인 처리 중 오류가 발생했습니다.' };
  }
}

function getRoleRedirectUrl(role, basePath) {
  const base = basePath || '';
  const path = ROLE_REDIRECT[role] || 'login.html';
  return base + path;
}

function logout(loginPath) {
  const session = getSession();
  if (session) {
    logInfo('LOGOUT', { username: session.username });
  }
  clearSession();
  window.location.href = loginPath || '../login.html';
}

function requireRole(allowedRoles, loginPath) {
  const session = getSession();
  if (!session) {
    window.location.href = loginPath || '../login.html';
    return null;
  }
  if (!allowedRoles.includes(session.role)) {
    window.location.href = loginPath || '../login.html';
    return null;
  }
  return session;
}

async function changePassword(username, newPassword) {
  if (!_sb) return { success: false, error: 'Supabase 연결 실패' };
  if (!newPassword || newPassword.length < 4) {
    return { success: false, error: '비밀번호는 4자 이상이어야 합니다.' };
  }

  try {
    const newHash = await hashPassword(newPassword);
    const { data, error } = await _sb.rpc('update_password', {
      p_username: username,
      p_new_password_hash: newHash
    });

    if (error) {
      await logError('PASSWORD_CHANGE_FAIL', { username, reason: error.message });
      return { success: false, error: '비밀번호 변경 중 오류가 발생했습니다.' };
    }

    const session = getSession();
    if (session) {
      session.isFirstLogin = false;
      setSession(session);
    }

    await logInfo('PASSWORD_CHANGE', { username });
    return { success: true };
  } catch (err) {
    await logError('PASSWORD_CHANGE_ERROR', { username, error: String(err) });
    return { success: false, error: '비밀번호 변경 중 오류가 발생했습니다.' };
  }
}
