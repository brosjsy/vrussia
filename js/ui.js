(function () {
  const $ = id => document.getElementById(id);
  let s = null, selected = RU.origins[0].id;

  /* ---------- Title ---------- */
  function renderOrigins() {
    $('origins').innerHTML = RU.origins.map(o => `<button class="ocard ${o.id === selected ? 'sel' : ''}" data-o="${o.id}">
      <b>${o.icon} ${o.label}</b><p>${o.blurb}</p><div class="m">Starts in ${o.city} · ${RU.money(o.money)}</div></button>`).join('');
    document.querySelectorAll('.ocard').forEach(b => b.onclick = () => { selected = b.dataset.o; renderOrigins(); });
  }
  $('randomBtn').onclick = () => { selected = RU.util.pick(RU.origins).id; renderOrigins(); };
  $('citySel').innerHTML += RU.CITIES.map(c => `<option>${c}</option>`).join('');
  $('startBtn').onclick = () => { s = RU.newState($('nameInput').value.trim() || 'Player', selected, $('citySel').value); show('game'); turn(); };
  $('continueBtn').onclick = () => { s = RU.load(); if (s) { show('game'); turn(); } };
  $('menuBtn').onclick = () => { if (confirm('Leave this game? Progress is saved automatically.')) show('title'); };
  $('closeModal').onclick = () => { $('modal').hidden = true; };
  $('logBtn').onclick = () => {
    $('modalBody').innerHTML = '<h3>Journal</h3><ul>' + (s.log.length ? s.log.map(l => `<li><b>Day ${l.day + 1}</b> — ${esc(l.text)}</li>`).join('') : '<li>Nothing yet.</li>') + '</ul>';
    $('modal').hidden = false;
  };
  function show(id) {
    ['title', 'game', 'end'].forEach(x => { $(x).hidden = x !== id; });
    if (id === 'title') { $('continueBtn').hidden = !RU.load(); }
  }
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- Game ---------- */
  const STAT = [['energy', 'Energy', '#3ec27a'], ['health', 'Health', '#3b6fe0'], ['stress', 'Stress', '#e0373f'], ['rep', 'Reputation', '#f0b43c'], ['know', 'Knowledge', '#a56be0'], ['clothes', 'Clothing', '#2bb5c9'], ['famLove', 'Family bond', '#e07bb0']];
  function header() {
    const d = RU.dateOf(s);
    $('who').textContent = `${s.icon} ${s.name} — ${s.label}`;
    $('where').textContent = `${s.city} · ${s.job ? RU.jobById(s.job).name : 'unemployed'} · ${s.status}`;
    $('date').textContent = `${d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · ${RU.SLOTS[s.slot]} · ${RU.WEATHER[s.weather]}`;
    $('moneyBox').textContent = RU.money(s.money);
    $('stats').innerHTML = STAT.map(([k, l, c]) => `<div class="stat"><span>${l}<b>${Math.round(s[k])}</b></span><div class="bar"><i style="width:${s[k]}%;background:${c}"></i></div></div>`).join('')
      + `<div class="stat"><span>Legal strikes<b>${s.strikes}${s.status !== 'citizen' ? ' / 3' : ''}</b></span></div>`;
    const ch = [];
    if (s.status === 'citizen') ch.push('<span class="chip ok">Russian citizen</span>');
    else if (s.flags.rvp) ch.push('<span class="chip ok">RVP residence</span>');
    else {
      const f = (n, v) => `<span class="chip ${v <= 0 ? 'bad' : v < 15 ? 'warn' : 'ok'}">${n}: ${v <= 0 ? 'none' : v + 'd'}</span>`;
      ch.push(f('Registration', s.docs.reg));
      if (s.status === 'migrant') ch.push(f('Patent', s.docs.patent), `<span class="chip ${s.flags.med ? 'ok' : 'warn'}">Medical: ${s.flags.med ? 'done' : 'needed'}</span>`);
      if (s.status === 'student') ch.push(f('Visa', s.docs.visa));
    }
    if (s.flags.vnzh) ch.push('<span class="chip ok">VNZh ✓</span>');
    const banks = Object.keys(s.bank).filter(k => s.bank[k]);
    ch.push(`<span class="chip ${banks.length ? 'ok' : 'warn'}">Bank: ${banks.length ? banks.join(', ') : 'none'}</span>`);
    if (s.partner) ch.push(`<span class="chip ok">💞 ${esc(s.partner.name)} (${Math.round(s.partner.love)})${s.flags.married ? ' · married' : ''}</span>`);
    if (s.kids) ch.push(`<span class="chip ok">👶 ${s.kids} child${s.kids > 1 ? 'ren' : ''}</span>`);
    if (s.flags.pregnant) ch.push('<span class="chip warn">Baby expected</span>');
    ch.push(`<span class="chip">Friends: ${s.friends}</span>`);
    if (s.flags.rutest) ch.push('<span class="chip ok">Language test ✓</span>');
    if (s.flags.admitted) ch.push('<span class="chip ok">University ✓</span>');
    $('docs').innerHTML = ch.join('');
    $('goals').innerHTML = RU.goals.map(g => `<li class="${g.done(s) ? 'done' : ''}">${g.done(s) ? '✔' : '○'} ${g.label}</li>`).join('');
  }

  function turn() {
    RU.save(s);
    header();
    if (s.over) return end();
    if (s.queue.length) { const sc = RU.get(s.queue.shift(), s); if (sc) return showScenario(sc, [], ''); }
    const probs = RU.problems(s);
    $('stage').innerHTML = `<div class="cat">${RU.SLOTS[s.slot]}</div><h2>What now?</h2><p>${probs.length ? '⚠ Warning: ' + probs.join('; ') + '.' : 'Pick how to spend this part of the day.'}</p>`;
    $('actions').innerHTML = RU.actions.map(a => `<button data-a="${a.id}">${a.icon} ${a.label}<small>${a.hint}</small></button>`).join('');
    $('actions').querySelectorAll('button').forEach(b => b.onclick = () => act(b.dataset.a));
  }

  function act(id) {
    const r = RU.perform(s, id);
    header();
    if (!r.sc) return turn();
    showScenario(r.sc, r.notes, r.pre);
  }

  function noteHtml(notes) {
    return notes.length ? '<div class="notes">' + notes.map(n => `<span class="note ${n.v > 0 ? (n.k === 'stress' || n.k === 'strike' ? 'neg' : 'pos') : (n.k === 'stress' ? 'pos' : 'neg')}">${n.label} ${n.v ? (n.v > 0 ? '+' : '') + (n.k === 'money' ? RU.money(n.v) : n.v) : ''}</span>`).join('') + '</div>' : '';
  }

  function mapSvg() {
    const dots = RU.PLACES.filter(p => p.id !== 'work' || s.job).map(p => {
      const cls = p.id === s.loc ? 'here' : s.known[p.id] ? 'known' : 'unk';
      return `<circle class="${cls}" cx="${p.x}" cy="${p.y}" r="2.6"/><text x="${p.x + 3.6}" y="${p.y + 1.2}">${p.n}${p.id === s.loc ? ' (you)' : ''}</text>`;
    }).join('');
    const snow = (s.weather === 'snow') ? Array.from({ length: 40 }, (_, i) => `<circle class="snow" cx="${(i * 37) % 100}" cy="${(i * 53) % 100}" r=".7"/>`).join('') : '';
    return `<div class="mapbox"><svg viewBox="0 0 100 100" width="100%" height="260" role="img" aria-label="City map"><rect width="100" height="100" fill="none"/>
      <path d="M14 20 L50 52 L88 62 M50 52 L72 24 M50 52 L12 62 M50 52 L62 84 M50 52 L30 80 M50 52 L40 28 M50 52 L55 10 M50 52 L82 40" stroke="currentColor" stroke-opacity=".25" stroke-width=".8" fill="none"/>${dots}${snow}</svg></div>`;
  }

  function showScenario(sc, notes, pre) {
    $('actions').innerHTML = '';
    $('stage').innerHTML = `<div class="cat">${esc(sc.cat)}</div><h2>${esc(RU.fill(sc.title, s))}</h2>${pre ? `<p class="sub">${esc(pre)}</p>` : ''}${noteHtml(notes)}${sc.map ? mapSvg() : ''}<p>${esc(RU.fill(sc.text, s))}</p>
      <div class="choices">${sc.choices.map((c, i) => `<button data-i="${i}">${esc(RU.fill(c.t, s))}</button>`).join('')}</div>`;
    $('stage').querySelectorAll('.choices button').forEach(b => b.onclick = () => {
      const res = RU.choose(s, sc, +b.dataset.i);
      header();
      $('stage').innerHTML = `<div class="cat">Result</div><h2>${esc(RU.fill(sc.title, s))}</h2><p>${esc(res.msg)}</p>${noteHtml(res.notes)}${res.dayNotes.map(t => `<p class="sub">${esc(t)}</p>`).join('')}
        <div class="choices"><button class="primary" id="nextBtn">Continue</button></div>`;
      $('nextBtn').onclick = turn;
    });
  }

  function end() {
    const [title, text] = RU.endings[s.over] || ['The end', ''];
    RU.clear();
    $('end').innerHTML = `<div class="end"><div class="flagbar"><i></i><i></i><i></i></div><h1>${title}</h1><p>${text}</p>
      <div class="score">${RU.score(s)}</div><p class="sub">final score</p>
      <p>Day ${s.day + 1} · ${RU.money(s.money)} · ${s.strikes} strikes · ${s.label}</p>
      <ul style="list-style:none;padding:0">${RU.goals.map(g => `<li>${g.done(s) ? '✔' : '○'} ${g.label}</li>`).join('')}</ul>
      <button class="primary" id="againBtn">Play again</button></div>`;
    show('end');
    $('againBtn').onclick = () => show('title');
  }

  renderOrigins();
  show('title');
  const st = RU.countStats();
  document.querySelector('.tag b').textContent = st.total.toLocaleString('en-US') + ' scenarios';
})();
