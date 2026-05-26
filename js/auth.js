/**
 * Authentication Module
 * Supabase Auth 기반 인증 (전 역할 지원)
 */

const ROLE_LABELS = {
  admin: '관리자',
  dept_manager: '부서 관리자',
  teacher: '교사',
  student: '학생'
};

const ROLE_EMOJI = {
  admin: '👑',
  dept_manager: '📋',
  teacher: '👩‍🏫',
  student: '🎒'
};

const ROLE_REDIRECT = {
  admin: 'admin/index.html',
  dept_manager: 'manager/index.html',
  teacher: 'teacher/my-talents.html',
  student: 'student/my-talents.html'
};

function renderRoleBadge(elementId, session, basePath) {
  const el = document.getElementById(elementId);
  if (!el || !session) return;
  const emoji = ROLE_EMOJI[session.role] || '👤';
  const label = ROLE_LABELS[session.role] || session.role;
  const name = session.displayName || session.username;
  const href = (basePath || '') + (ROLE_REDIRECT[session.role] || '#');
  el.innerHTML = `<a href="${href}" style="text-decoration:none;color:inherit;display:inline-flex;align-items:center;gap:0.3rem;" title="${label} 페이지로 이동">
    <span style="font-size:1.1rem;">${emoji}</span>
    <span>${name}</span>
    <span style="font-size:0.7rem;background:rgba(255,255,255,0.2);padding:0.1rem 0.4rem;border-radius:50px;">${label}</span>
  </a>`;
}

async function login(username, password) {
  if (!_sb) return { success: false, error: 'Supabase 연결 실패' };
  if (!username || !password) return { success: false, error: '아이디와 비밀번호를 입력해주세요.' };

  try {
    const email = username + AUTH_EMAIL_DOMAIN;
    const { data: authData, error: authError } = await _sb.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      await logWarn('LOGIN_FAIL', { username, reason: authError.message });
      return { success: false, error: '아이디 또는 비밀번호가 일치하지 않습니다.' };
    }

    const { data: profile } = await _sb.rpc('get_my_profile');
    if (!profile) {
      await _sb.auth.signOut();
      return { success: false, error: '프로필 정보를 불러올 수 없습니다.' };
    }

    setSession({
      id: profile.id,
      username: profile.username,
      displayName: profile.display_name,
      role: profile.role,
      isFirstLogin: profile.is_first_login,
      departmentId: profile.department_id,
      managedDeptId: profile.managed_dept_id,
      talentBalance: profile.talent_balance || 0,
      departmentName: profile.department_name
    });

    await logInfo('LOGIN_SUCCESS', { username, role: profile.role });
    return { success: true, data: profile };
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

async function logout(loginPath) {
  const session = getSession();
  if (session) {
    await logInfo('LOGOUT', { username: session.username });
  }
  if (_sb) {
    await _sb.auth.signOut();
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

async function validateAuthSession(loginPath) {
  if (!_sb) return null;
  const { data: { session: authSession } } = await _sb.auth.getSession();
  if (!authSession) {
    clearSession();
    window.location.href = loginPath || '../login.html';
    return null;
  }
  return getSession();
}

async function initPage(allowedRoles, loginPath) {
  const session = await loadAuthSession();
  if (!session) {
    window.location.href = loginPath || '../login.html';
    return null;
  }
  if (allowedRoles && allowedRoles.length && !allowedRoles.includes(session.role)) {
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
    const { data, error } = await _sb.rpc('change_my_password', {
      p_new_password: newPassword
    });

    if (error) {
      await logError('PASSWORD_CHANGE_FAIL', { username, reason: error.message });
      return { success: false, error: '비밀번호 변경 중 오류가 발생했습니다.' };
    }

    if (data && !data.success) {
      return { success: false, error: data.error || '비밀번호 변경 실패' };
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
