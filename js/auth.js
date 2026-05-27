/**
 * Authentication Module
 * Supabase Auth 기반 인증 (유형 + 6단계 권한 체계)
 */

const PERMISSION_RANK = {
  admin: 100, evangelist: 90, chief: 80,
  dept_teacher: 60, teacher: 40, student: 20
};

const PERMISSION_LABELS = {
  admin: '관리자', evangelist: '전도사님', chief: '부장',
  dept_teacher: '부서 담당 교사', teacher: '일반 교사', student: '학생'
};

const PERMISSION_EMOJI = {
  admin: '👑', evangelist: '✝️', chief: '📋',
  dept_teacher: '👩‍🏫', teacher: '👨‍🏫', student: '🎒'
};

const TYPE_LABELS = { teacher: '교사', student: '학생' };

const PERMISSION_REDIRECT = {
  admin: 'admin/index.html',
  evangelist: 'admin/index.html',
  chief: 'admin/index.html',
  dept_teacher: 'admin/talents.html',
  teacher: 'my-talents.html',
  student: 'my-talents.html'
};

const ROLE_LABELS = {
  admin: '관리자', dept_manager: '부서 관리자', teacher: '교사', student: '학생'
};

const ROLE_EMOJI = {
  admin: '👑', dept_manager: '📋', teacher: '👩‍🏫', student: '🎒'
};

const ROLE_REDIRECT = {
  admin: 'admin/index.html',
  dept_manager: 'admin/talents.html',
  teacher: 'my-talents.html',
  student: 'my-talents.html'
};

function getPermRank(level) {
  return PERMISSION_RANK[level] || 0;
}

function applyPermNav(rank) {
  document.querySelectorAll('[data-min-perm]').forEach(el => {
    const minPerm = parseInt(el.dataset.minPerm, 10);
    if (rank < minPerm) el.style.display = 'none';
  });
}

function applyRoleNav(role) {
  document.querySelectorAll('[data-role]').forEach(el => {
    const allowed = el.dataset.role.split(',').map(r => r.trim());
    if (!allowed.includes(role)) el.style.display = 'none';
  });
}

function renderRoleBadge(elementId, session, basePath) {
  const el = document.getElementById(elementId);
  if (!el || !session) return;
  const perm = session.permissionLevel;
  const emoji = PERMISSION_EMOJI[perm] || '👤';
  const label = PERMISSION_LABELS[perm] || perm;
  const name = session.displayName || session.username;
  const redirect = PERMISSION_REDIRECT[perm] || '#';
  const href = (basePath || '') + redirect;
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
    const { data: authData, error: authError } = await _sb.auth.signInWithPassword({ email, password });

    if (authError) {
      await logWarn('LOGIN_FAIL', { username, reason: authError.message });
      return { success: false, error: '아이디 또는 비밀번호가 일치하지 않습니다.' };
    }

    const { data: profile } = await _sb.rpc('get_my_profile');
    if (!profile) {
      await _sb.auth.signOut();
      return { success: false, error: '프로필 정보를 불러올 수 없습니다.' };
    }

    const perm = profile.permission_level;
    setSession({
      id: profile.id,
      username: profile.username,
      displayName: profile.display_name,
      userType: profile.user_type || 'teacher',
      permissionLevel: perm,
      permissionRank: getPermRank(perm),
      isSuperAdmin: profile.is_super_admin || false,
      isFirstLogin: profile.is_first_login,
      departmentId: profile.department_id,
      managedDeptId: profile.managed_dept_id,
      talentBalance: profile.talent_balance || 0,
      departmentName: profile.department_name
    });

    await logInfo('LOGIN_SUCCESS', { username, permissionLevel: perm });
    return { success: true, data: profile };
  } catch (err) {
    await logError('LOGIN_ERROR', { username, error: String(err) });
    return { success: false, error: '로그인 처리 중 오류가 발생했습니다.' };
  }
}

function getRedirectUrl(session, basePath) {
  const base = basePath || '';
  const perm = session.permissionLevel;
  const path = PERMISSION_REDIRECT[perm] || 'login.html';
  return base + path;
}

function getRoleRedirectUrl(role, basePath) {
  const base = basePath || '';
  const path = PERMISSION_REDIRECT[role] || ROLE_REDIRECT[role] || 'login.html';
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

function requirePermission(minRank, loginPath) {
  const session = getSession();
  if (!session) {
    window.location.href = loginPath || '../login.html';
    return null;
  }
  const rank = session.permissionRank || getPermRank(session.permissionLevel);
  if (rank < minRank) {
    window.location.href = loginPath || '../login.html';
    return null;
  }
  return session;
}

function requireRole(allowedRoles, loginPath) {
  const session = getSession();
  if (!session) {
    window.location.href = loginPath || '../login.html';
    return null;
  }
  const perm = session.permissionLevel;
  if (!allowedRoles.includes(perm)) {
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

async function initPage(allowedRolesOrMinRank, loginPath) {
  const session = await loadAuthSession();
  if (!session) {
    window.location.href = loginPath || '../login.html';
    return null;
  }

  if (session.isFirstLogin && !window.location.pathname.includes('change-password')) {
    const basePath = loginPath ? loginPath.replace(/[^/]*$/, '') : '../';
    window.location.href = basePath + 'admin/change-password.html';
    return null;
  }

  const rank = session.permissionRank || getPermRank(session.permissionLevel);

  if (typeof allowedRolesOrMinRank === 'number') {
    if (rank < allowedRolesOrMinRank) {
      const basePath = loginPath ? loginPath.replace(/[^/]*$/, '') : '../';
      window.location.href = getRedirectUrl(session, basePath);
      return null;
    }
  } else if (Array.isArray(allowedRolesOrMinRank) && allowedRolesOrMinRank.length) {
    const perm = session.permissionLevel;
    if (!allowedRolesOrMinRank.includes(perm)) {
      const basePath = loginPath ? loginPath.replace(/[^/]*$/, '') : '../';
      window.location.href = getRedirectUrl(session, basePath);
      return null;
    }
  }

  document.body.classList.add('auth-ready');
  return session;
}

async function changePassword(username, newPassword) {
  if (!_sb) return { success: false, error: 'Supabase 연결 실패' };
  if (!newPassword || newPassword.length < 4) {
    return { success: false, error: '비밀번호는 4자 이상이어야 합니다.' };
  }

  try {
    const { data, error } = await _sb.rpc('change_my_password', { p_new_password: newPassword });

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
