/* ── api.js — UMD + PlanetTerp + Anthropic helpers ── */

const UMD_BASE = 'https://api.umd.io/v0';
const PT_BASE  = 'https://planetterp.com/api/v1';

async function umdCourses(dept, limit = 15) {
  const r = await fetch(`${UMD_BASE}/courses?dept_id=${dept}&per_page=${limit}&sort=course_id`);
  const d = await r.json();
  return Array.isArray(d) ? d : (d.data || []);
}

async function umdCourseById(code) {
  const r = await fetch(`${UMD_BASE}/courses?course_id=${encodeURIComponent(code.toUpperCase())}`);
  const d = await r.json();
  const arr = Array.isArray(d) ? d : [d];
  return arr[0] || null;
}

async function ptCourse(code) {
  try {
    const r = await fetch(`${PT_BASE}/course?name=${encodeURIComponent(code.toUpperCase())}`);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

async function claudeChat(messages, system = '') {
  const body = {
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    messages,
  };
  if (system) body.system = system;
  const r = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  return d.content?.find(b => b.type === 'text')?.text || '';
}

async function claudeJSON(prompt, maxTokens = 2000) {
  const r = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const d = await r.json();
  let txt = d.content?.find(b => b.type === 'text')?.text || '{}';
  txt = txt.replace(/```json|```/g, '').trim();
  return JSON.parse(txt);
}

/* ── Chat widget helper ── */
function ChatWidget(areaId, inputId, btnId, systemPrompt) {
  this.history = [];
  this.area = document.getElementById(areaId);
  this.input = document.getElementById(inputId);
  this.btn = document.getElementById(btnId);
  this.system = systemPrompt;

  this.appendMsg = function (role, text) {
    const d = document.createElement('div');
    d.className = 'msg ' + role;
    const lbl = document.createElement('span');
    lbl.className = 'msg-lbl';
    lbl.textContent = role === 'user' ? 'You' : 'Terp Advisor';
    const b = document.createElement('div');
    b.className = 'bubble';
    b.textContent = text;
    d.appendChild(lbl);
    d.appendChild(b);
    this.area.appendChild(d);
    this.area.scrollTop = this.area.scrollHeight;
    return b;
  };

  this.showTyping = function () {
    const d = document.createElement('div');
    d.className = 'msg assistant';
    d.id = 'typing-ind';
    d.innerHTML = '<span class="msg-lbl">Terp Advisor</span><div class="bubble" style="padding:10px 14px;"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>';
    this.area.appendChild(d);
    this.area.scrollTop = this.area.scrollHeight;
  };

  this.removeTyping = function () {
    const t = document.getElementById('typing-ind');
    if (t) t.remove();
  };

  this.send = async function (text) {
    if (!text) return;
    this.btn.disabled = true;
    this.appendMsg('user', text);
    this.history.push({ role: 'user', content: text });
    this.showTyping();
    try {
      const reply = await claudeChat(this.history, this.system);
      this.removeTyping();
      this.appendMsg('assistant', reply);
      this.history.push({ role: 'assistant', content: reply });
    } catch {
      this.removeTyping();
      this.appendMsg('assistant', 'Something went wrong — please try again.');
    }
    this.btn.disabled = false;
  };

  this.bindInput = function () {
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendFromInput(); }
    });
    this.btn.addEventListener('click', () => this.sendFromInput());
  };

  this.sendFromInput = function () {
    const t = this.input.value.trim();
    this.input.value = '';
    this.send(t);
  };

  this.inject = function (userMsg, assistantMsg) {
    this.history.push({ role: 'user', content: userMsg });
    this.history.push({ role: 'assistant', content: assistantMsg });
  };
}

/* ── Tab switcher ── */
function bindTabs(containerSelector) {
  const btns = document.querySelectorAll(containerSelector + ' .tab-btn');
  const panes = document.querySelectorAll(containerSelector + ' .tab-pane');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add('active');
    });
  });
}

/* ── Day/time toggle helpers ── */
function toggleBtn(btn, cls = 'on') {
  btn.classList.toggle(cls);
}
function selectedVals(selector) {
  return [...document.querySelectorAll(selector + '.on, ' + selector + '.on-blue')].map(b => b.dataset.val);
}

/* ── Render weekly calendar (SVG) ── */
function renderWeekCalSVG(courses) {
  const LABEL_W = 46, COL_W = 96, ROW_H = 20, TOP = 28;
  const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8am–7pm
  const W = LABEL_W + 5 * COL_W;
  const H = TOP + HOURS.length * ROW_H + 6;
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const PALETTE = ['#185FA5', '#3B6D11', '#854F0B', '#533AB7', '#6B3272', '#0F6E56', '#993C1D'];

  function parseDays(str) {
    if (!str) return [];
    if (/MWF/i.test(str)) return [0, 2, 4];
    if (/TuTh/i.test(str) || /TTh/i.test(str)) return [1, 3];
    if (/MW$/i.test(str)) return [0, 2];
    if (/MTuWThF/i.test(str)) return [0, 1, 2, 3, 4];
    const r = [];
    if (/\bM\b/.test(str)) r.push(0);
    if (/Tu/.test(str)) r.push(1);
    if (/\bW\b/.test(str)) r.push(2);
    if (/Th/.test(str)) r.push(3);
    if (/\bF\b/.test(str)) r.push(4);
    return r;
  }

  function parseHour(t) {
    if (!t) return null;
    const m = t.match(/(\d+):(\d+)\s*(am|pm)/i);
    if (!m) return null;
    let h = parseInt(m[1]), min = parseInt(m[2]);
    const ap = m[3].toLowerCase();
    if (ap === 'pm' && h !== 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    return h + min / 60;
  }

  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;font-family:'DM Sans',sans-serif;">`;
  svg += `<rect width="${W}" height="${H}" rx="10" fill="#F5F4F0"/>`;

  DAYS.forEach((d, i) => {
    const x = LABEL_W + i * COL_W;
    svg += `<rect x="${x}" y="${TOP}" width="${COL_W}" height="${H - TOP}" fill="#FAFAF8" opacity="0.8"/>`;
    svg += `<text x="${x + COL_W / 2}" y="18" text-anchor="middle" font-size="11" fill="#9B9890" font-weight="500">${d}</text>`;
    if (i < 4) svg += `<line x1="${x + COL_W}" y1="${TOP}" x2="${x + COL_W}" y2="${H}" stroke="#ECEAE4" stroke-width="1"/>`;
  });

  HOURS.forEach((h, i) => {
    const y = TOP + i * ROW_H;
    const lbl = h === 12 ? '12pm' : h > 12 ? `${h - 12}pm` : `${h}am`;
    svg += `<text x="${LABEL_W - 5}" y="${y + 12}" text-anchor="end" font-size="9" fill="#9B9890">${lbl}</text>`;
    svg += `<line x1="${LABEL_W}" y1="${y}" x2="${W}" y2="${y}" stroke="#ECEAE4" stroke-width="0.5"/>`;
  });

  courses.forEach((c, ci) => {
    if (/online|async/i.test(c.days || '')) return;
    const days = parseDays(c.days || '');
    const parts = (c.time || '').split(/[–-]/);
    const start = parseHour(parts[0]?.trim());
    const end = parseHour(parts[1]?.trim());
    if (start === null) return;
    const dur = end ? end - start : 1;
    const color = PALETTE[ci % PALETTE.length];
    days.forEach(di => {
      const x = LABEL_W + di * COL_W + 2;
      const y = TOP + (start - 8) * ROW_H;
      const bh = Math.max(dur * ROW_H - 2, 14);
      svg += `<rect x="${x}" y="${y}" width="${COL_W - 4}" height="${bh}" rx="4" fill="${color}" opacity="0.88"/>`;
      svg += `<text x="${x + 5}" y="${y + 12}" font-size="9" fill="#fff" font-weight="600">${c.code}</text>`;
      if (bh > 23) svg += `<text x="${x + 5}" y="${y + 22}" font-size="8" fill="rgba(255,255,255,0.8)">${c.time || ''}</text>`;
    });
  });

  svg += '</svg>';
  return svg;
}
