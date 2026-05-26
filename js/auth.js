/**
 * Authentication Module
 * SHA-256 해싱 + Supabase RPC 기반 커스텀 인증
 */

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function login(username, password) {
  if (!supabase) return { success: false, error: 'Supabase 연결 실패' };
  if (!username || !password) return { success: false, error: '아이디와 비밀번호를 입력해주세요.' };

  try {
    const passwordHash = await hashPassword(password);
    const { data, error } = await supabase.rpc('verify_admin', {
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
      isFirstLogin: data.is_first_login
    });

    await logInfo('LOGIN_SUCCESS', { username });
    return { success: true, data };
  } catch (err) {
    await logError('LOGIN_ERROR', { username, error: String(err) });
    return { success: false, error: '로그인 처리 중 오류가 발생했습니다.' };
  }
}

async function logout() {
  const session = getSession();
  if (session) {
    await logInfo('LOGOUT', { username: session.username });
  }
  clearSession();
  window.location.href = 'login.html';
}

async function changePassword(username, newPassword) {
  if (!supabase) return { success: false, error: 'Supabase 연결 실패' };
  if (!newPassword || newPassword.length < 4) {
    return { success: false, error: '비밀번호는 4자 이상이어야 합니다.' };
  }

  try {
    const newHash = await hashPassword(newPassword);
    const { data, error } = await supabase.rpc('update_password', {
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
