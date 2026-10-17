const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function sanitizeUrl(url) {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(trimmed)) {
    return trimmed;
  }
  return '#';
}

function isValidDriveId(id) {
  return /^[a-zA-Z0-9_-]{10,80}$/.test(String(id || '').trim());
}

function toViewDriveUrl(fileId) {
  if (!fileId) return '';
  const cleanId = String(fileId).trim();
  if (cleanId.startsWith('http://') || cleanId.startsWith('https://')) {
    return sanitizeUrl(cleanId);
  }
  if (!isValidDriveId(cleanId)) return '';
  return `https://drive.google.com/file/d/${encodeURIComponent(cleanId)}/view`;
}

function toDriveImgSrc(urlOrId) {
  if (!urlOrId) return '';
  const clean = String(urlOrId).trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) return sanitizeUrl(clean);
  if (!isValidDriveId(clean)) return '';
  return `https://lh3.googleusercontent.com/d/${encodeURIComponent(clean)}`;
}

function extractYouTubeId(urlOrId) {
  if (!urlOrId) return '';
  const clean = String(urlOrId).trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
  const match = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : '';
}

async function fetchAsBlobSafe(fileIdOrUrl) {
  if (!fileIdOrUrl) return null;
  let fileId = fileIdOrUrl.trim();
  const driveMatch = fileId.match(/(?:(?:\/d\/)|(?:[?&]id=))([a-zA-Z0-9_-]{25,})/);
  if (driveMatch && driveMatch[1]) fileId = driveMatch[1];
  try {
    const { data, error } = await sb.functions.invoke('fetch-file', {
      body: { mode: 'fetch_file', fileId: fileId },
    });
    if (!error && data && data.base64) {
      const binaryStr = atob(data.base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      return new Blob([bytes], { type: data.mimeType || 'application/octet-stream' });
    }
    if (data && data.error) console.warn('fetchAsBlobSafe: Edge Function error →', data.error);
    if (error) console.warn('fetchAsBlobSafe: invoke error →', error);
  } catch (e) {
    console.warn('fetchAsBlobSafe ล้มเหลว →', e.message);
  }
  return null;
}

function showToast(message, variant = 'primary') {
  let host = document.getElementById('toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toast-host';
    host.className = 'toast-container position-fixed top-0 end-0 p-3';
    host.style.zIndex = 3000;
    document.body.appendChild(host);
  }
  const el = document.createElement('div');
  el.className = `toast align-items-center text-bg-${variant} border-0`;
  el.setAttribute('role', 'alert');
  el.innerHTML = `
    <div class="d-flex">
      <div class="toast-body" id="__toast_msg"></div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`;
  // ใช้ textContent แทน innerHTML เพื่อป้องกัน XSS จาก error message ที่อาจมี HTML แฝง
  el.querySelector('#__toast_msg').textContent = message;
  el.querySelector('#__toast_msg').removeAttribute('id');
  host.appendChild(el);
  const toast = new bootstrap.Toast(el, { delay: 4500 });
  toast.show();
  el.addEventListener('hidden.bs.toast', () => el.remove());
}

function showLoader(text = 'กำลังโหลด...') {
  let el = document.getElementById('brand-loader');
  if (!el) {
    el = document.createElement('div');
    el.id = 'brand-loader';
    el.className = 'brand-loader';
    el.innerHTML = `<div class="spin"></div><div class="text-brand fw-medium" id="brand-loader-text"></div>`;
    document.body.appendChild(el);
  }
  document.getElementById('brand-loader-text').textContent = text;
  el.classList.remove('hidden');
}
function hideLoader() {
  const el = document.getElementById('brand-loader');
  if (el) el.classList.add('hidden');
}

async function fetchConfig(includeSensitive = false) {
  try {
    let q = sb.from('config').select('key,value');
    if (!includeSensitive) {
      q = q.not('key', 'in', '("line_access_token","line_group_id")');
    }
    const { data, error } = await q;
    if (error) { console.error('fetchConfig:', error); return {}; }
    const map = {};
    (data || []).forEach(r => {
      if (!includeSensitive && (r.key === 'line_access_token' || r.key === 'line_group_id')) return;
      map[r.key] = r.value;
    });
    return map;
  } catch (err) {
    console.error('fetchConfig threw:', err);
    return {};
  }
}

async function fetchBranches(level) {
  try {
    let q = sb.from('branches').select('*').eq('active', true).order('sort_order', { ascending: true });
    if (level) q = q.eq('level', level);
    const { data, error } = await q;
    if (error) { console.error('fetchBranches:', error); return []; }
    return data || [];
  } catch (err) {
    console.error('fetchBranches threw:', err);
    return [];
  }
}

async function fetchPromotions() {
  try {
    const { data, error } = await sb.from('promotions').select('*').order('level').order('sort_order');
    if (error) { console.error('fetchPromotions:', error); return []; }
    return data || [];
  } catch (err) {
    console.error('fetchPromotions threw:', err);
    return [];
  }
}

async function fetchSocialLinks() {
  try {
    const { data, error } = await sb.from('social_links').select('*').eq('active', true).order('sort_order');
    if (error) { console.error('fetchSocialLinks:', error); return []; }
    return data || [];
  } catch (err) {
    console.error('fetchSocialLinks threw:', err);
    return [];
  }
}

function formatBaht(n) {
  const num = Number(n) || 0;
  return num.toLocaleString('th-TH') + ' บาท';
}

function branchDisplayName(b) {
  return b.track ? `${b.name} (${b.track})` : b.name;
}

function skeletonBox(width = '100%', height = '0.9em', extraStyle = '') {
  return `<span class="skeleton" style="width:${width};height:${height};${extraStyle}"></span>`;
}


function skeletonBranchChips(n = 6) {
  let html = '';
  for (let i = 0; i < n; i++) {
    html += `
      <div class="branch-item-card card border-0 rounded-4 p-3 p-sm-4 shadow-sm bg-white position-relative overflow-hidden" style="border: 1.5px solid #E2E8F0 !important; min-height: 135px;">
        <div class="mb-2">
          ${skeletonBox('35%', '0.75rem', 'border-radius: 999px; margin-bottom: 0.6rem;')}
          ${skeletonBox('75%', '1.1rem', 'border-radius: 4px; margin-bottom: 0.4rem;')}
        </div>
        <div class="mt-auto pt-3 border-top border-light-subtle d-flex justify-content-between align-items-center">
          ${skeletonBox('65px', '0.8rem')}
          ${skeletonBox('80px', '1.05rem')}
        </div>
      </div>`;
  }
  return html;
}


function skeletonPromoCard() {
  return `
    <div class="card border-0 shadow-sm rounded-4 w-100 h-100" style="background: #FFFDF8; border: 1.5px solid #FFE69C !important; min-height: 250px;">
      <div class="card-body p-3 p-xl-4 d-flex flex-column">
        <div class="d-flex justify-content-between mb-3">
          ${skeletonBox('90px', '1.3em', 'border-radius:999px;')}
          ${skeletonBox('60px', '1.3em', 'border-radius:999px;')}
        </div>
        ${skeletonBox('100%', '160px', 'border-radius:12px; margin-bottom: 1rem;')}
        ${skeletonBox('80%', '1.1em', 'margin-bottom:0.5rem;')}
        ${skeletonBox('95%', '0.9em', 'margin-bottom:0.35rem;')}
        ${skeletonBox('60%', '0.9em')}
      </div>
    </div>`;
}


function skeletonTableRows(n = 4, cols = 4) {
  let html = '';
  for (let i = 0; i < n; i++) {
    html += '<tr class="skeleton-row">' +
      Array.from({ length: cols }).map(() => `<td>${skeletonBox('75%')}</td>`).join('') +
      '</tr>';
  }
  return html;
}


function skeletonStatCards(n = 5) {
  let html = '';
  for (let i = 0; i < n; i++) {
    html += `<div class="col-6 col-lg-3">
      <div class="card-soft bg-white p-3 text-center">
        ${skeletonBox('28px', '28px', 'border-radius:50%;margin-bottom:0.5rem;')}
        <div>${skeletonBox('48px', '1.6em', 'margin:0.25rem auto;')}</div>
        ${skeletonBox('70%', '0.8em', 'margin:0 auto;')}
      </div>
    </div>`;
  }
  return html;
}


function skeletonPromoAdminCards(n = 2) {
  let html = '';
  for (let i = 0; i < n; i++) {
    html += `<div class="card-soft bg-white p-3">
      ${skeletonBox('60%', '1em', 'margin-bottom:0.5rem;')}
      ${skeletonBox('90%', '0.8em', 'margin-bottom:0.3rem;')}
      ${skeletonBox('50%', '0.8em')}
    </div>`;
  }
  return html;
}


function skeletonFormLines(n = 6) {
  let html = '';
  for (let i = 0; i < n; i++) {
    html += `<div class="mb-3">
      ${skeletonBox('35%', '0.8em', 'margin-bottom:0.4rem;')}
      ${skeletonBox('100%', '2.3em', 'border-radius:8px;')}
    </div>`;
  }
  return html;
}
