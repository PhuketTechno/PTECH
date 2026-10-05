(() => {
  'use strict';

  const CONFIG_URL = 'config.json';
  const el = {
    status:    document.getElementById('status'),
    actionBar: document.getElementById('actionBar'),
    form:      document.getElementById('dynForm'),
    output:    document.getElementById('output'),
    embedCard: document.getElementById('embedCard'),
    frame:     document.getElementById('gasFrame')
  };

  let CONFIG = null;

  /* ---------- helpers ---------- */
  const setStatus = (text, kind = 'idle') => {
    el.status.textContent = text;
    el.status.className = `badge badge--${kind}`;
  };

  const render = (data) => {
    el.output.textContent =
      typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  };

  const buildUrl = (base, params = {}) => {
    const url = new URL(base);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    return url.toString();
  };

  /* ---------- Apps Script transport ----------
     POST uses text/plain so the browser skips the CORS preflight that
     Apps Script web apps cannot answer. Parse the body with
     JSON.parse(e.postData.contents) on the server side.                */
  async function callAppsScript(action, payload = {}) {
    const { baseUrl, timeoutMs } = CONFIG.appsScript;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs || 20000);

    try {
      const isPost = (action.method || 'GET').toUpperCase() === 'POST';
      const options = { method: isPost ? 'POST' : 'GET',
                        redirect: 'follow', signal: ctrl.signal };
      let url;

      if (isPost) {
        url = buildUrl(baseUrl, { action: action.id });
        options.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
        options.body = JSON.stringify({ action: action.id, data: payload });
      } else {
        url = buildUrl(baseUrl, { action: action.id, ...(action.params || {}), ...payload });
      }

      const res  = await fetch(url, options);
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);

      try { return JSON.parse(text); }
      catch { return { raw: text }; }      // Apps Script error page fallback
    } finally {
      clearTimeout(timer);
    }
  }

  /* ---------- dynamic form from JSON ---------- */
  function showForm(action) {
    el.form.innerHTML = '';
    el.form.classList.remove('hidden');
    el.form.dataset.actionId = action.id;

    (action.fields || []).forEach(f => {
      const row = document.createElement('div');
      const id  = `f_${f.name}`;
      const input = f.type === 'textarea'
        ? `<textarea id="${id}" name="${f.name}" ${f.required ? 'required' : ''}></textarea>`
        : `<input id="${id}" name="${f.name}" type="${f.type || 'text'}" ${f.required ? 'required' : ''}>`;
      row.innerHTML = `<label for="${id}">${f.label}${f.required ? ' *' : ''}</label>${input}`;
      el.form.appendChild(row);
    });

    const bar = document.createElement('div');
    bar.className = 'action-bar';
    bar.innerHTML =
      `<button type="submit">Submit</button>
       <button type="button" class="ghost" data-cancel>Cancel</button>`;
    el.form.appendChild(bar);
  }

  async function runAction(action, payload) {
    setStatus(`running ${action.id}…`, 'busy');
    el.actionBar.querySelectorAll('button').forEach(b => (b.disabled = true));
    try {
      const result = await callAppsScript(action, payload);
      render(result);
      setStatus(result && result.ok === false ? 'script error' : 'done',
                result && result.ok === false ? 'err' : 'ok');
    } catch (err) {
      render(`Error: ${err.message}`);
      setStatus('failed', 'err');
    } finally {
      el.actionBar.querySelectorAll('button').forEach(b => (b.disabled = false));
    }
  }

  /* ---------- bootstrap ---------- */
  async function init() {
    try {
      const res = await fetch(CONFIG_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`cannot load ${CONFIG_URL}`);
      CONFIG = await res.json();
    } catch (err) {
      setStatus('config error', 'err');
      render(`Failed to load config: ${err.message}`);
      return;
    }

    CONFIG.actions.forEach(action => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = action.label;
      btn.addEventListener('click', () => {
        el.form.classList.add('hidden');
        if (action.fields && action.fields.length) showForm(action);
        else runAction(action, action.params || {});
      });
      el.actionBar.appendChild(btn);
    });

    el.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const action  = CONFIG.actions.find(a => a.id === el.form.dataset.actionId);
      const payload = Object.fromEntries(new FormData(el.form).entries());
      runAction(action, payload);
    });

    el.form.addEventListener('click', (e) => {
      if (e.target.matches('[data-cancel]')) el.form.classList.add('hidden');
    });

    const embed = CONFIG.appsScript.embed || {};
    if (embed.enabled) {
      el.embedCard.hidden = false;
      el.frame.style.height = `${embed.height || 480}px`;
      el.frame.src = CONFIG.appsScript.baseUrl + '?view=embed';
    }

    setStatus('ready', 'ok');
  }

  document.addEventListener('DOMContentLoaded', init);
})();