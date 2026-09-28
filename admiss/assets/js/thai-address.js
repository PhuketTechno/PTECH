(function () {
  const DATA_URL = 'assets/data/thailand-address.json';
  const MAX_RESULTS = 12;
  const FIELD_INDEX = { district: 0, amphoe: 1, province: 2, zipcode: 3 };

  let records = null;
  let loadingPromise = null;

  function loadData() {
    if (records) return Promise.resolve(records);
    if (loadingPromise) return loadingPromise;
    loadingPromise = fetch(DATA_URL)
      .then(r => r.json())
      .then(data => { records = data; return records; })
      .catch(err => {
        console.error('โหลดฐานข้อมูลที่อยู่ไม่สำเร็จ:', err);
        records = [];
        return records;
      });
    return loadingPromise;
  }

  function search(field, query) {
    if (!records || !query) return [];
    const idx = FIELD_INDEX[field];
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const results = [];
    for (let i = 0; i < records.length && results.length < MAX_RESULTS; i++) {
      const val = String(records[i][idx]).toLowerCase();
      if (val.includes(q)) results.push(records[i]);
    }
    return results;
  }

  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function renderSuggestions(suggestEl, items, onPick) {
    if (items.length === 0) { suggestEl.classList.remove('show'); suggestEl.innerHTML = ''; return; }
    suggestEl.innerHTML = items.map((r, i) => `
      <div class="thai-addr-suggest-item" data-idx="${i}">
        <span class="thai-addr-suggest-main">${escapeHtml(r[0])}</span>
        <span class="thai-addr-suggest-sub">${escapeHtml(r[1])}▪️${escapeHtml(r[2])}▪️${r[3]}</span>
      </div>`).join('');
    suggestEl.classList.add('show');
    suggestEl.querySelectorAll('.thai-addr-suggest-item').forEach(el => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault(); 
        onPick(items[Number(el.dataset.idx)]);
      });
    });
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function fillGroup(container, record) {
    const [district, amphoe, province, zipcode] = record;
    const map = { district, amphoe, province, zipcode };
    Object.entries(map).forEach(([field, value]) => {
      const el = container.querySelector(`[data-thai-addr="${field}"]`);
      if (el) {
        el.value = value;
        el.classList.remove('is-invalid');
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }

  function setupField(input) {
    const field = input.dataset.thaiAddr;
    const container = input.closest('.thai-addr-field')?.parentElement; 
    const suggestEl = document.getElementById(input.id + '_suggest');
    if (!container || !suggestEl) return;

    let activeIndex = -1;
    let currentItems = [];

    const runSearch = debounce(async () => {
      await loadData();
      currentItems = search(field, input.value);
      activeIndex = -1;
      renderSuggestions(suggestEl, currentItems, (record) => {
        fillGroup(container, record);
        suggestEl.classList.remove('show');
      });
    }, 150);

    input.addEventListener('focus', loadData);
    input.addEventListener('input', runSearch);

    input.addEventListener('keydown', (e) => {
      if (!suggestEl.classList.contains('show')) return;
      const items = suggestEl.querySelectorAll('.thai-addr-suggest-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, items.length - 1);
        updateActive(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        updateActive(items);
      } else if (e.key === 'Enter') {
        if (activeIndex >= 0 && currentItems[activeIndex]) {
          e.preventDefault();
          fillGroup(container, currentItems[activeIndex]);
          suggestEl.classList.remove('show');
        }
      } else if (e.key === 'Escape') {
        suggestEl.classList.remove('show');
      }
    });

    function updateActive(items) {
      items.forEach((el, i) => el.classList.toggle('active', i === activeIndex));
      if (items[activeIndex]) items[activeIndex].scrollIntoView({ block: 'nearest' });
    }

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !suggestEl.contains(e.target)) {
        suggestEl.classList.remove('show');
      }
    });
  }

  function init() {
    document.querySelectorAll('[data-thai-addr]').forEach(setupField);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }


    loadData();
})();
