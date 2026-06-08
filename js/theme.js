/**
 * Theme Module - 테마 로드/저장/적용
 * Themes: default, dark, spring, summer, autumn, winter
 */

const THEMES = [
  { id: 'default', icon: '🎨', label: '일반 모드' },
  { id: 'dark',    icon: '🌙', label: '다크 모드' },
  { id: 'spring',  icon: '🌸', label: '봄 모드' },
  { id: 'summer',  icon: '🌊', label: '여름 모드' },
  { id: 'autumn',  icon: '🍂', label: '가을 모드' },
  { id: 'winter',  icon: '❄️', label: '겨울 모드' }
];

const THEME_STORAGE_KEY = 'cho_theme';

function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') || 'default';
}

function applyTheme(themeId) {
  if (!THEMES.find(t => t.id === themeId)) themeId = 'default';
  document.documentElement.setAttribute('data-theme', themeId);
  localStorage.setItem(THEME_STORAGE_KEY, themeId);
  updateThemePickerUI(themeId);
}

function loadThemeFromLocal() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved && THEMES.find(t => t.id === saved)) {
    document.documentElement.setAttribute('data-theme', saved);
    return saved;
  }
  return 'default';
}

async function loadThemeFromDB() {
  if (typeof _sb === 'undefined' || !_sb) return null;
  const session = typeof getSession === 'function' ? getSession() : null;
  if (!session) return null;
  try {
    const { data } = await _sb.from('user_preferences')
      .select('theme')
      .eq('user_id', session.id)
      .single();
    if (data && data.theme && THEMES.find(t => t.id === data.theme)) {
      return data.theme;
    }
  } catch(e) {}
  return null;
}

async function saveThemeToDB(themeId) {
  if (typeof _sb === 'undefined' || !_sb) return;
  const session = typeof getSession === 'function' ? getSession() : null;
  if (!session) return;
  try {
    await _sb.from('user_preferences').upsert({
      user_id: session.id,
      theme: themeId,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
  } catch(e) { console.warn('[THEME] DB save failed:', e.message); }
}

async function initTheme() {
  let theme = loadThemeFromLocal();
  const dbTheme = await loadThemeFromDB();
  if (dbTheme && dbTheme !== theme) {
    theme = dbTheme;
    applyTheme(theme);
  }
  return theme;
}

async function setTheme(themeId) {
  applyTheme(themeId);
  await saveThemeToDB(themeId);
}

function positionThemeDropdown(dropdown, btn) {
  if (!dropdown || !btn || !dropdown.classList.contains('open')) return;

  const margin = 8;
  const btnRect = btn.getBoundingClientRect();
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const maxWidth = Math.max(160, viewportWidth - margin * 2);
  const maxHeight = Math.max(160, viewportHeight - margin * 2);

  dropdown.style.position = 'fixed';
  dropdown.style.right = 'auto';
  dropdown.style.left = '0px';
  dropdown.style.top = '0px';
  dropdown.style.maxWidth = `${maxWidth}px`;
  dropdown.style.maxHeight = `${maxHeight}px`;
  dropdown.style.overflowY = 'auto';

  const width = Math.min(Math.max(dropdown.offsetWidth || 180, 180), maxWidth);
  dropdown.style.width = `${width}px`;

  const height = Math.min(dropdown.offsetHeight || 0, maxHeight);
  const left = Math.min(
    Math.max(btnRect.right - width, margin),
    Math.max(margin, viewportWidth - width - margin)
  );
  let top = btnRect.bottom + margin;
  if (top + height > viewportHeight - margin) {
    top = btnRect.top - height - margin;
  }
  top = Math.min(Math.max(top, margin), Math.max(margin, viewportHeight - height - margin));

  dropdown.style.left = `${left}px`;
  dropdown.style.top = `${top}px`;
}

function renderThemePicker(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const current = getCurrentTheme();
  const info = THEMES.find(t => t.id === current) || THEMES[0];

  container.innerHTML = `
    <div class="theme-picker-wrap">
      <button class="theme-picker-btn" id="themePickerBtn" title="테마 변경" aria-label="테마 변경">
        ${info.icon}
      </button>
      <div class="theme-picker-dropdown" id="themePickerDropdown">
        ${THEMES.map(t => `
          <button class="theme-option${t.id === current ? ' active' : ''}" data-theme-id="${t.id}">
            <span class="theme-option-icon">${t.icon}</span>
            <span class="theme-option-label">${t.label}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;

  const btn = document.getElementById('themePickerBtn');
  const dropdown = document.getElementById('themePickerDropdown');

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
    if (dropdown.classList.contains('open')) {
      requestAnimationFrame(() => positionThemeDropdown(dropdown, btn));
    }
  });

  dropdown.querySelectorAll('.theme-option').forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = opt.getAttribute('data-theme-id');
      setTheme(id);
      dropdown.classList.remove('open');
    });
  });

  document.addEventListener('click', () => {
    dropdown.classList.remove('open');
  });

  const reposition = () => positionThemeDropdown(dropdown, btn);
  window.addEventListener('resize', reposition);
  window.addEventListener('scroll', reposition, true);
}

function updateThemePickerUI(themeId) {
  const btn = document.getElementById('themePickerBtn');
  const dropdown = document.getElementById('themePickerDropdown');
  if (!btn || !dropdown) return;
  const info = THEMES.find(t => t.id === themeId) || THEMES[0];
  btn.textContent = info.icon;
  dropdown.querySelectorAll('.theme-option').forEach(opt => {
    opt.classList.toggle('active', opt.getAttribute('data-theme-id') === themeId);
  });
}

// Apply theme immediately on script load (prevents flash)
(function() {
  loadThemeFromLocal();
})();
