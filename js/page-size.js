(function () {
  let _pageSizes = null;
  let _saveTimer = null;

  async function _loadPageSizes() {
    if (_pageSizes !== null) return _pageSizes;
    try {
      const session = getSession();
      if (!session || !session.id || !_sb) { _pageSizes = {}; return _pageSizes; }
      const { data } = await _sb.from('user_preferences')
        .select('page_sizes')
        .eq('user_id', session.id)
        .single();
      _pageSizes = (data && data.page_sizes) ? data.page_sizes : {};
    } catch (e) {
      _pageSizes = {};
    }
    return _pageSizes;
  }

  async function loadPageSize(key, defaultSize) {
    const sizes = await _loadPageSizes();
    return sizes[key] || defaultSize;
  }

  async function savePageSize(key, size) {
    if (!_pageSizes) _pageSizes = {};
    _pageSizes[key] = size;
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(async () => {
      try {
        const session = getSession();
        if (!session || !session.id || !_sb) return;
        await _sb.from('user_preferences').upsert({
          user_id: session.id,
          page_sizes: _pageSizes,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
      } catch (e) { }
    }, 500);
  }

  function renderPageSizeSelector(key, currentSize, onChange) {
    const options = [3, 5, 10, 15, 20, 25, 30];
    return '<select class="page-size-select" onchange="' + onChange + '" style="padding:0.25rem 0.4rem;border:1px solid var(--t-border, #dee2e6);border-radius:6px;font-size:0.75rem;background:var(--t-input-bg, #fff);color:var(--t-text, #333);cursor:pointer;">'
      + options.map(n => '<option value="' + n + '"' + (n === currentSize ? ' selected' : '') + '>' + n + '개</option>').join('')
      + '</select>';
  }

  window.loadPageSize = loadPageSize;
  window.savePageSize = savePageSize;
  window.renderPageSizeSelector = renderPageSizeSelector;
})();
