// Verifică logica din calcul_fulger.html fără browser: răspunsuri, pașii nivelurilor, trucuri, desene, runde, stele, test.
const fs = require('fs'), vm = require('vm'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, 'calcul_fulger.html'), 'utf8');
const js = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
const ctx = { console, Math, Date, performance, TextEncoder, globalThis: null };
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(js, ctx);
const CF = ctx.CF;
if (!CF) throw new Error('CF lipsește');

let fails = 0, checks = 0;
const bad = msg => { fails++; if (fails <= 40) console.log('FAIL:', msg); };
const ok = (cond, msg) => { checks++; if (!cond) bad(msg); };

const strip = s => String(s || '').replace(/<[^>]+>/g, '');
const fmt = n => (n < 0 ? '−' + (-n) : String(n));
const toJs = s => s.replace(/−/g, '-').replace(/·/g, '*').replace(/ : /g, ' / ');
function evalExpr(e) {
  const j = toJs(e).trim();
  if (!j || !/^[\d\s+\-*/().]+$/.test(j) || !/\d/.test(j)) return null;
  try { return Function('"use strict";return (' + j + ')')(); } catch (x) { return null; }
}
// „jumătate din 28 = 14” și „dublul lui 35 = 70” din rânduri devin „... e ...”, ca să fie verificate ca atare.
const prep = s => strip(s).replace(/(jumătate din|dublul lui) (\S+) = (\S+)/g, '$1 $2 e $3');
// Verifică toate egalitățile dintr-un text (A = B = C), lanțurile de dubluri, „dublul lui X e Y”, „jumătate din X e Y”.
function checkLine(line, where) {
  if (!line) return;
  const t = strip(line).replace(/(\S):/g, '$1;');   // „Faci 10:” e etichetă; „56 : 8” e împărțire
  const runs = t.match(/[0-9\s+−·:()=?]+/g) || [];
  for (const run of runs) {
    if (run.indexOf('=') < 0) continue;
    const parts = run.split('=').map(p => p.trim()).filter(p => p !== '');
    if (parts.length < 2 || parts.some(p => p.indexOf('?') >= 0)) continue;
    const vals = parts.map(evalExpr);
    if (vals.some(v => v === null)) { bad(where + ': nu pot evalua „' + run.trim() + '” în „' + strip(line) + '”'); continue; }
    checks++;
    if (!vals.every(v => Math.abs(v - vals[0]) < 1e-9)) bad(where + ': fals „' + run.trim() + '” în „' + strip(line) + '”');
  }
  const s = strip(line);
  const chains = s.match(/\d+(\s*→\s*\d+)+/g) || [];
  // un lanț cu săgeți e ori numai dubluri (7 → 14 → 28), ori numai jumătăți (28 → 14 → 7)
  for (const c of chains) { const n = c.split('→').map(x => +x.trim()), dbl = n.every((x, i) => !i || x === 2 * n[i - 1]), half = n.every((x, i) => !i || 2 * x === n[i - 1]); ok(dbl || half, where + ': lanț greșit ' + c); }
  let m; const re1 = /dublul lui (\d+) e (\d+)/gi; while ((m = re1.exec(s))) ok(+m[2] === 2 * +m[1], where + ': ' + m[0]);
  const re2 = /jumătate din (\d+) (?:e|este) (\d+)/gi; while ((m = re2.exec(s))) ok(+m[2] * 2 === +m[1], where + ': ' + m[0]);
}
// O întrebare sau un ajutor nu are voie să spună valoarea căsuței („= 56”, „e 56”, „este 56”).
function states(text, v) {
  if (!text) return false;
  const f = (typeof v === 'number' ? fmt(v) : String(v)).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('(=|(^|\\s)e|(^|\\s)este)\\s*' + f + '(?!\\d)').test(strip(text));
}

// ---- 1. antrenamentul cu hartă: cele 36 de calcule în trei moduri ----
for (const mode of ['mul', 'div', 'add']) for (const f of CF.FAM) for (let rep = 0; rep < 20; rep++) {
  const q = CF.famQuestion(mode, f), w = 'antrenament ' + mode + ' ' + q.text;
  ok(evalExpr(q.text) === q.ans, w + ': răspunsul ' + q.ans);
  ok(q.post.some(l => l.indexOf('<b>' + fmt(q.ans) + '</b>') >= 0), w + ': explicația nu arată răspunsul');
  ok(q.pre.some(l => l.indexOf('?') >= 0) && !q.pre.some(l => l.indexOf('<b>' + fmt(q.ans) + '</b>') >= 0), w + ': indiciul');
  q.pre.concat(q.post).forEach(l => checkLine(l, w));
}

// ---- 2. toate nivelurile: fiecare pas, fiecare căsuță ----
function checkItem(it, where, wid) {
  ok(evalExpr(it.q) === it.ans, where + ': întrebarea ' + it.q + ' nu dă ' + it.ans);
  const n = it.slots.length, last = it.slots[n - 1];
  ok(n >= 1 && last.kind === 'num' && last.v === it.ans, where + ': ultima căsuță nu e răspunsul');
  const seen = [];
  it.rows.forEach(row => row.forEach(tok => {
    if (typeof tok !== 'object') return;
    if (tok.s !== undefined) seen.push(tok.s);
    else ok(seen.indexOf(tok.m) >= 0, where + ': oglinda ' + tok.m + ' apare înaintea căsuței ei');
  }));
  ok(seen.join(',') === it.slots.map((s, i) => i).join(','), where + ': căsuțele nu apar o dată fiecare, în ordine (' + seen.join(',') + ')');
  const val = i => (it.slots[i].kind === 'choice' ? String(it.slots[i].v) : fmt(it.slots[i].v));
  it.rows.forEach((row, ri) => checkLine(prep(row.map(tok => (typeof tok === 'string' ? tok : val(tok.s !== undefined ? tok.s : tok.m))).join('')), where + ' rândul ' + (ri + 1)));
  it.slots.forEach((s, i) => {
    if (s.kind === 'choice') ok(s.opts.indexOf(s.v) >= 0 && s.opts.length === 2, where + ': alegerea ' + i);
    else ok(strip(s.why).indexOf(fmt(s.v)) >= 0, where + ': explicația căsuței ' + i + ' nu spune ' + fmt(s.v) + ': „' + s.why + '”');
    ok(s.ask && s.why, where + ': căsuța ' + i + ' fără întrebare sau explicație');
    ok(!states(s.ask, s.v), where + ': întrebarea dă răspunsul: „' + s.ask + '”');
    ok(!states(s.help, s.v), where + ': ajutorul dă răspunsul: „' + s.help + '”');
    [s.why, s.ask, s.help].forEach(t => checkLine(prep(t), where + ' căsuța ' + i));
  });
  const v = it.vis;
  if (wid === 'mul') ok(v && v.t === 'dots' && v.r * v.g.reduce((a, b) => a + b, 0) === it.ans, where + ': desenul cu puncte');
  if (v && v.t === 'dots' && wid === 'div') ok(v.g.reduce((a, b) => a + b, 0) === it.ans && v.r * it.ans === evalExpr(it.q.split(' : ')[0]), where + ': desenul împărțirii');
  if (v && v.t === 'frames') { const c = v.c, n1 = c.filter(x => x === 1).length, n2 = c.filter(x => x === 2).length, n3 = c.filter(x => x === 3).length;
    if (it.q.indexOf('+') >= 0) ok(n1 + n2 === it.ans && !n3, where + ': cadrele adunării');
    else if (n3) ok(n1 === it.ans, where + ': cadrele scăderii');
    else ok(n2 === it.ans, where + ': cadrul perechii lui 10'); }
  if (v && v.t === 'jumps') ok(v.start + v.steps.reduce((a, b) => a + b, 0) === it.ans && v.steps.every(x => x !== 0), where + ': săriturile');
  if (v && v.t === 'line') ok(v.to === it.ans && v.from !== v.to, where + ': axa');
  if (it.fk) ok(CF.FAMK[it.fk.k] && ['mul', 'div', 'add'].indexOf(it.fk.m) >= 0, where + ': calculul de pe hartă');
}
let nLevels = 0, nItems = 0;
CF.WORLDS.forEach(w => w.levels.forEach((L, li) => {
  nLevels++;
  ok(L.name && L.rule && L.ex && L.short && L.fast > 0, w.id + ' nivelul ' + (li + 1) + ': lipsesc texte');
  checkLine(prep(L.rule), w.id + ' ' + L.id + ' regula');
  for (let rep = 0; rep < 40; rep++) {
    const pool = L.pool();
    pool.slice(0, 40).forEach(p => { const it = L.make(p); nItems++; checkItem(it, w.id + ' ' + L.id + ' „' + it.q + '”', w.id); });
  }
}));
ok(nLevels === 39, 'sunt ' + nLevels + ' niveluri, nu 39');
// tabla lui n cuprinde toate calculele n·2 … n·9
[2, 4, 8, 9, 5, 3, 6, 7].forEach(n => { const L = CF.WORLDK.mul.levels.find(x => x.id === 'mul' + n), got = new Set(); L.pool().forEach(p => got.add(L.make(p).ans)); ok(got.size === 8, 'tabla lui ' + n + ' nu are toate cele 8 calcule'); });
// pătratele: 2 · 2 … 9 · 9, înainte de nivelul final; la tablă: 3 de completat, 12 singur
{
  const ms = CF.WORLDK.mul.levels, P = ms.find(x => x.id === 'mulP'), got = new Set();
  P.pool().forEach(p => { const it = P.make(p), xy = CF.mulXY(it.q); got.add(it.q); ok(xy && xy[0] === xy[1], 'pătratele: ' + it.q); });
  ok(got.size === 8 && ms.indexOf(P) === ms.length - 2 && ms[ms.length - 1].boss, 'pătratele: toate 8, chiar înainte de nivelul final');
  ok(ms.every(L => (L.boss ? L.ns === 20 : L.nf === 3 && L.ns === 12)), 'la tablă: 3 de completat și 12 singur');
  ok(CF.WORLDS.filter(w => w.id !== 'mul').every(w => w.levels.every(L => (L.boss ? L.ns === 20 : L.nf === 7 && L.ns === 8))), 'celelalte lumi: 7 de completat și 8 singur');
}

// ---- 3. planul unui nivel și stelele ----
const s3 = CF.blankState(); CF.setS(s3);
CF.WORLDS.forEach(w => w.levels.forEach(L => {
  // p2 = încercarea de după un nivel trecut (varianta scurtă); pf = după un nivel picat (tot ajutorul, 2026-10-27)
  s3.lv[L.id] = { s: 1, p: 1, b: 0 }; const pf = CF.levelPlan(L, false);
  s3.lv[L.id] = { s: 2, p: 1, b: 8 }; const p2 = CF.levelPlan(L, false);
  delete s3.lv[L.id];
  const p1 = CF.levelPlan(L, !L.boss), qs = p1.map(e => e.it.q);
  ok(qs.every((q, i) => !i || q !== qs[i - 1]), L.id + ': același calcul de două ori la rând');
  if (L.boss) {
    ok(p1.length === 20 && p1.every(e => e.mode === 'solo' && e.counted), L.id + ': nivelul final are 20 singur'); ok(new Set(qs).size >= 16, L.id + ': prea puține calcule diferite la final (' + new Set(qs).size + ')');
    // nivelul final amestecat: exact câte calcule din fiecare nivel, fiecare cu timpul nivelului lui
    if (L.mix) {
      const per = {}; p1.forEach(e => { per[e.it.src] = (per[e.it.src] || 0) + 1; ok(CF.fastOf(L, e.it) === CF.LVK[e.it.src].fast, L.id + ': timpul calculului din ' + e.it.src); });
      ok(Object.keys(L.mix).every(id => per[id] === L.mix[id]) && Object.keys(per).length === Object.keys(L.mix).length, L.id + ': amestecul nu e ' + JSON.stringify(L.mix) + ' ci ' + JSON.stringify(per));
      ok(Object.values(L.mix).reduce((a, b) => a + b, 0) === 20, L.id + ': amestecul nu are 20 de calcule');
    }
    return;
  }
  ok(pf.length === L.nf + L.ns && pf.slice(0, L.nf).every((e, i) => e.mode === 'fill' && e.blanks === Math.min(e.it.slots.length, i + 1)), L.id + ': după un nivel picat, toate cele ' + L.nf + ' de completat');
  if (L.demos) ok(p1[0].mode === 'demo' && p1[1].mode === 'demo', L.id + ': exemplele alese');
  const solo = new Set(p1.filter(e => e.mode === 'solo').map(e => e.it.q)), f = L.nf;
  ok(solo.size >= 6, L.id + ': doar ' + solo.size + ' calcule diferite la „singur”');
  ok(p1.length === 17, L.id + ': prima dată 17 pași, nu ' + p1.length);
  ok(p1.slice(0, 2).every(e => e.mode === 'demo') && p1.slice(2, 2 + f).every(e => e.mode === 'fill') && p1.slice(2 + f).every(e => e.mode === 'solo' && e.counted) && p1.length - 2 - f === L.ns, L.id + ': ordinea exemple, completare, singur');
  p1.slice(2, 2 + f).forEach((e, i) => ok(e.blanks === Math.min(e.it.slots.length, i + 1), L.id + ': căsuțele goale cresc câte una'));
  ok(p1[1 + f].blanks === p1[1 + f].it.slots.length, L.id + ': ultimul de completat are toate căsuțele goale');
  ok(p2.length === 2 + L.ns && p2.slice(0, 2).every(e => e.mode === 'fill' && e.blanks === e.it.slots.length), L.id + ': după un nivel trecut, 2 de completat și ' + L.ns + ' singur');
}));
// exemplele arată ce spune regula (2026-10-27): minus ori minus, + (−), paranteza cu înmulțire, ordinea de la stânga
for (let rep = 0; rep < 200; rep++) {
  const d = id => CF.LVK[id].demos();
  const n4 = d('neg4'); ok((n4[0].q.match(/−/g) || []).length === 2 && n4[0].ans > 0 && n4[1].ans < 0, 'semnele la ·: exemplele ' + n4.map(x => x.q).join(' / '));
  const n6 = d('neg6'); ok(/ − \(−/.test(n6[0].q) && / \+ \(−/.test(n6[1].q), 'două semne lipite: exemplele ' + n6.map(x => x.q).join(' / '));
  const o4 = d('ord4'); ok(o4[0].q.indexOf('·') < 0 && /· \(/.test(o4[1].q), 'parantezele: exemplele ' + o4.map(x => x.q).join(' / '));
  const o5 = d('ord5'); ok(/\(/.test(o5[0].q) && !/\(/.test(o5[1].q), 'cu numere negative: exemplele ' + o5.map(x => x.q).join(' / '));
  // fără calcule nepredate: produsul cu paranteza e din tablă (cel mult 9 · 10), câtul de la stânga e cel mult 10
  const p = CF.LVK.ord4.make(); const m = /(\d+) · \((\d+) ([+−]) (\d+)\)/.exec(p.q);
  if (m) { const inner = m[3] === '+' ? +m[2] + +m[4] : +m[2] - +m[4]; ok(inner >= 2 && inner <= 10, 'parantezele: ' + p.q + ' cere ' + m[1] + ' · ' + inner); }
  const lr = /^(\d) · (\d) : (\d)$/.exec(CF.LVK.ord3.make().q); if (lr) ok(lr[1] * lr[2] / lr[3] <= 10, 'de la stânga: câtul ' + lr[0]);
}
const lv8 = CF.WORLDK.add.levels[0], lv12 = CF.WORLDK.mul.levels[0], boss = CF.WORLDK.mul.levels.find(L => L.boss);
[[8, 6, 3], [8, 5, 2], [7, 7, 2], [6, 0, 2], [5, 5, 1], [0, 0, 1]].forEach(t => ok(CF.starsFor(lv8, t[0], t[1]) === t[2], 'stele din 8 pentru ' + t[0] + ' corecte, ' + t[1] + ' fulgere'));
[[12, 9, 3], [12, 8, 2], [11, 11, 2], [9, 0, 2], [8, 8, 1], [0, 0, 1]].forEach(t => ok(CF.starsFor(lv12, t[0], t[1]) === t[2], 'stele din 12 pentru ' + t[0] + ' corecte, ' + t[1] + ' fulgere'));
[[19, 15, 3], [20, 14, 2], [16, 0, 2], [15, 15, 1]].forEach(t => ok(CF.starsFor(boss, t[0], t[1]) === t[2], 'stele la final pentru ' + t[0] + '/' + t[1]));

// ---- 4. deblocarea și de unde continuă ----
{
  const s = CF.blankState(); CF.setS(s);
  s.lv.addB = { s: 2, p: 1, b: 16, bf: 12, g: 1 };   // adunările trecute: tabla e deschisă
  ok(CF.isUnlocked('mul', 0) && !CF.isUnlocked('mul', 1), 'la început e deschis doar nivelul 1');
  s.lv.mul2 = { s: 2, p: 1, b: 6 }; ok(CF.isUnlocked('mul', 1) && CF.nextLevel('mul') === 1, 'cu 2 stele se deschide nivelul 2');
  s.lv.mul4 = { s: 1, p: 1, b: 4 }; ok(!CF.isUnlocked('mul', 2) && CF.nextLevel('mul') === 1, 'cu 1 stea nu se deschide nivelul următor');
  s.lv.mul8 = { s: 2, p: 0, b: 0, t: 1 }; ok(CF.isUnlocked('mul', 2) && CF.nextLevel('mul') === 1, 'un nivel știut la test e deschis, dar continuă de la primul neterminat');
  CF.setAdmin(true); ok(CF.isUnlocked('mul', 8) && CF.isUnlocked('neg', 6), 'modul profesor deschide tot'); CF.setAdmin(false);
  ok(CF.worldStars('mul').s === 5 && CF.worldStars('mul').passed === 2, 'stelele lumii');
}

// ---- 4b. lumile se deschid după harta de dependențe (2026-10-14) ----
{
  const s = CF.blankState(); CF.setS(s);
  ok(CF.WORLDS.map(w => w.id).join(',') === 'add,mul,big,div,neg,ord', 'ordinea lumilor: ' + CF.WORLDS.map(w => w.id).join(','));
  ok(CF.worldOpen('add') && ['mul', 'big', 'div', 'neg'].every(w => !CF.worldOpen(w)), 'la început e deschisă doar lumea adunărilor');
  ok(!CF.isUnlocked('mul', 0) && CF.nextLevel('mul') === -1, 'o lume închisă nu are niveluri deschise');
  const addB = CF.WORLDK.add.levels[CF.WORLDK.add.levels.length - 1];
  let r = CF.recordLevel(addB, 15, 15);
  ok(r.stars === 1 && !CF.worldPassed('add') && !CF.worldOpen('mul') && !r.newWorlds.length, '15 corecte, chiar rapide: tabla rămâne închisă');
  ['add10', 'addUp', 'addDown'].forEach(id => { s.lv[id] = { s: 3, p: 1, b: 8 }; });
  ok(CF.nextLevel('add') === 3, 'cât timp tabla e închisă, propune nivelul final al adunărilor');
  r = CF.recordLevel(addB, 16, 3);
  ok(r.stars === 2 && CF.worldPassed('add') && CF.worldOpen('mul') && CF.worldOpen('big') && !CF.worldOpen('div') && r.newWorlds.map(w => w.id).join(',') === 'mul,big', '16 corecte, oricât de încet (2 stele), deschid tabla și numerele mari');
  ok(s.lv[addB.id].b === 16 && s.lv[addB.id].bf === 15 && s.lv[addB.id].s === 2, 'ține minte cele mai bune rezultate');
  const mulB = CF.WORLDK.mul.levels[CF.WORLDK.mul.levels.length - 1];
  CF.recordLevel(mulB, 20, 20);
  ok(CF.worldOpen('div') && !CF.worldOpen('neg'), 'împărțirile după tablă; negativele cer și numerele mari');
  const bigB = CF.WORLDK.big.levels[CF.WORLDK.big.levels.length - 1], divB = CF.WORLDK.div.levels[CF.WORLDK.div.levels.length - 1];
  CF.recordLevel(bigB, 17, 13); ok(!CF.worldOpen('neg'), 'negativele cer și împărțirile');
  CF.recordLevel(divB, 19, 15); ok(CF.worldOpen('neg'), 'negativele se deschid la final');
  // o lume în care a jucat deja rămâne deschisă (progresul vechi nu se pierde)
  const s2 = CF.blankState(); CF.setS(s2); s2.lv.mul2 = { s: 2, p: 3, b: 7 };
  ok(CF.worldOpen('mul') && CF.isUnlocked('mul', 1) && !CF.worldOpen('div'), 'progresul vechi la tablă rămâne deschis');
  // jurnalul: fiecare răspuns cu secundele lui
  CF.logAns('mul2', '7 · 2', '14', true, 3456, false); CF.logAns('mul2', '8 · 2', '', false, 10020, true);
  ok(s2.log.length === 2 && s2.log[0].s === 3.5 && s2.log[0].c === 1 && s2.log[1].h === 1 && s2.log[1].a === '', 'jurnalul răspunsurilor');
  const t2 = CF.reportText();
  ok(t2.indexOf('Secundele de azi') >= 0 && t2.indexOf('8 · 2 → trucul (10 s)') >= 0 && t2.indexOf('7 · 2 → 14 (3,5 s)') >= 0, 'secundele în raport');
  for (let i = 0; i < 4100; i++) CF.logAns('sprint', '2 · 2', '4', true, 1000, false);
  ok(s2.log.length === 4000, 'jurnalul păstrează ultimele 4000 de răspunsuri');
}

// ---- 5. testul de pornire ----
{
  const s = CF.blankState(); CF.setS(s);
  ok(CF.testList().length === 33, 'testul are ' + CF.testList().length + ' tipuri, nu 33');
  ok(CF.testVerdict([{ c: 0, f: 0 }]) === 'x' && CF.testVerdict([{ c: 1, f: 1 }, { c: 0, f: 0 }]) === 'x' && CF.testVerdict([{ c: 1, f: 1 }, { c: 1, f: 1 }]) === 'k' && CF.testVerdict([{ c: 1, f: 0 }, { c: 1, f: 1 }]) === 's', 'verdictele testului (două întrebări)');
  // două întrebări diferite pe nivel, din partea grea (2026-10-27)
  CF.WORLDS.forEach(w => w.levels.filter(L => !L.boss).forEach(L => { for (let rep = 0; rep < 30; rep++) {
    const a = CF.testPair(L); ok(a.length === 2 && a[0].q !== a[1].q, L.id + ': testul pune două întrebări diferite');
    a.forEach(it => checkItem(it, 'test ' + L.id + ' „' + it.q + '”', w.id));
    if (w.id === 'mul') a.forEach(it => { const xy = CF.mulXY(it.q), n = L.id === 'mulP' ? xy[0] : +L.id.slice(3), other = xy[0] === n ? xy[1] : xy[0]; ok(other >= 6, L.id + ': la test, calculul ușor ' + it.q); });
    if (L.id === 'neg4') ok(a.some(it => (it.q.match(/−/g) || []).length === 2), 'test neg4: fără minus ori minus');
    if (L.id === 'big5') ok(a.every(it => { const m = /(\d+) − (\d+)/.exec(it.q); return m && m[2] % 10 > m[1] % 10; }), 'test big5: fără împrumut ' + a.map(x => x.q).join(' / '));
  } }));
  ok(CF.mergeTest({ a: 'k', b: 's', c: 'x' }, { a: 'x', b: 'k', c: '-' }).a === 'k' && CF.mergeTest({ b: 's' }, { b: 'k' }).b === 'k' && CF.mergeTest({ c: 'x' }, { c: '-' }).c === 'x', 'testul refăcut păstrează cel mai bun verdict');
  const res = { mul2: 'k', mul4: 'x', mul8: 'k', add10: 'k', addUp: 's' };
  CF.applyTest(res);
  ok(s.lv.mul2.s === 2 && s.lv.mul8.s === 2 && !s.lv.mul4 && !s.lv.addUp, 'testul dă 2 stele doar nivelurilor știute repede');
  ok(s.last === 'add' && CF.nextLevel('add') === 1, 'după test continuă de la primul gol (adunările sunt prima lume)');
  {
    const s2 = CF.blankState(); CF.setS(s2);
    const r2 = { add10: 'k', addUp: 's', addDown: 'k', big1: 'k', big2: 'k', big3: 'k', big4: 'k', big5: 'x' };
    s2.test = { done: true, date: '2026-10-22', res: r2, partial: null };
    ok(CF.worldPassed('add') && CF.worldOpen('mul') && CF.worldOpen('big') && !CF.worldPassed('big') && !CF.worldOpen('div') && !CF.worldOpen('neg'), 'testul deschide lumile știute (și încet), nu și pe cele cu un tip greșit');
    s2.test.done = false;
    ok(!CF.worldOpen('mul'), 'un test neterminat nu deschide lumi');
    // o lume știută la test e deschisă chiar dacă lumea de dinainte nu e (2026-10-27)
    const r3 = { add10: 'x' }; CF.WORLDK.mul.levels.filter(L => !L.boss).forEach(L => { r3[L.id] = 's'; });
    s2.test = { done: true, date: '2026-10-27', res: r3, partial: null };
    ok(CF.worldOpen('mul') && CF.worldOpen('div') && !CF.worldOpen('big'), 'tabla știută la test: tabla și împărțirile deschise, numerele mari nu');
    ok(CF.dailyLevels().length === 9, 'nivelurile știute încet la test intră în runda zilei');
    CF.setS(s);
  }
  // butonul mare: după lumea adunărilor, la tabla lui 2, nu înapoi la a treia stea (2026-10-27)
  {
    const s4 = CF.blankState(); CF.setS(s4);
    CF.WORLDK.add.levels.forEach(L => { s4.lv[L.id] = { s: 2, p: 1, b: 16 }; }); s4.last = 'add';
    let pk = CF.ctaPick(); ok(pk && pk.wid === 'mul' && pk.li === 0, 'butonul mare după adunări: ' + JSON.stringify(pk));
    s4.lv.mul2 = { s: 2, p: 1, b: 9 }; s4.last = 'big';
    pk = CF.ctaPick(); ok(pk && pk.wid === 'big' && pk.li === 0, 'butonul mare rămâne în lumea jucată ultima dată: ' + JSON.stringify(pk));
    const s5 = CF.blankState(); CF.setS(s5); const all = {}; CF.testList().forEach(t => { all[CF.WORLDK[t.wid].levels[t.li].id] = 's'; });
    s5.test = { done: true, date: '2026-10-27', res: all, partial: null }; CF.applyTest(all);
    ok(CF.WORLDS.every(w => CF.worldOpen(w.id)) && CF.ctaPick() !== null, 'test corect, dar încet: toate lumile deschise, butonul mare are un nivel');
    CF.setS(s);
  }
  s.test = { done: true, date: '2026-10-01', res, partial: null }; s.name = 'Andrei';
  const txt = CF.reportText();
  ok(txt.indexOf('Andrei') >= 0 && txt.indexOf('Testul de pornire') >= 0 && txt.indexOf('știe ·2, ·8') >= 0 && txt.indexOf('încet 8 + 5') >= 0, 'raportul cu testul');
  ok(txt.indexOf('undefined') < 0 && txt.indexOf('NaN') < 0, 'raportul are „undefined” sau „NaN”');
  { // codul de control: se potriveste cu textul, se strica la o schimbare, nu tine cont de spatii
    const m = /\n\nCod de control: ([0-9A-F]{4}-[0-9A-F]{4})$/.exec(txt);
    ok(!!m, 'raportul se termina cu codul de control');
    const body = txt.slice(0, m.index);
    ok(CF.repCode(body) === m[1], 'codul de control nu se potriveste cu raportul');
    ok(CF.repCode(body.replace('Andrei', 'Andre1')) !== m[1], 'o litera schimbata nu schimba codul');
    ok(CF.repCode(body.replace(/\n/g, '\r\n  ').replace(/ /g, '  ')) === m[1], 'spatiile in plus schimba codul');
  }
  console.log('--- exemplu de raport ---\n' + txt + '\n------------------------');
}

// ---- 6. rundele de antrenament ----
function stateWith(fn) { const s = CF.blankState(); s.modes.mul.placed = true; CF.FAM.forEach((f, i) => fn(s.modes.mul.f[f.k], f, i)); CF.setS(s); return s; }
function checkRound(label, s, expectMin) {
  const items = CF.buildFamRound('mul'), levels = {}; CF.FAM.forEach(f => { levels[f.k] = s.modes.mul.f[f.k].l; });
  ok(items.length >= expectMin && items.length <= 24, label + ': lungimea rundei ' + items.length);
  const taught = new Set(); let adj = 0;
  items.forEach((it, i) => {
    if (it.type === 'teach') { ok(levels[it.k] === 0, label + ': învață un calcul care nu e nou'); taught.add(it.k); }
    else if (levels[it.k] === 0) ok(taught.has(it.k), label + ': întreabă un calcul nou înainte să-l învețe');
    if (i && items[i - 1].k === it.k) adj++;
  });
  ok(adj === 0, label + ': calcule identice unul după altul');
}
const today = CF.dayIdx();
// 1500 de runde pe fiecare stare: calculele lipite apăreau cam o dată la 1000 de runde (reparat 2026-09-30).
for (let rep = 0; rep < 1500; rep++) {
  checkRound('toate gri', stateWith(x => { x.l = 0; x.n = 1; }), 9);
  checkRound('amestec', stateWith(x => { x.l = Math.floor(Math.random() * 5); x.n = 3; x.ok = 2; x.last = today - Math.floor(Math.random() * 5); x.d = x.last; }), 12);
  checkRound('toate verzi', stateWith(x => { x.l = 3 + (Math.random() < 0.5 ? 1 : 0); x.n = 5; x.ok = 5; x.last = today - 2; x.d = today - 2; }), 20);
  checkRound('multe portocalii', stateWith((x, f, i) => { x.l = i < 20 ? 1 : 3; x.n = 4; x.ok = 1; x.last = today - 1; x.d = today - 1; }), 18);
}

// ---- 7. cum crește un calcul pe hartă ----
{
  const s = stateWith(x => { x.l = 0; }), f = s.modes.mul.f['7x8'];
  CF.famUpdate('mul', '7x8', { correct: true, dt: 2000, place: true }); ok(f.l === 3, 'harta: corect și repede = verde');
  f.l = 0; CF.famUpdate('mul', '7x8', { correct: false, dt: 2000, place: true }); ok(f.l === 0, 'harta: greșit = gri');
  CF.famTeach('mul', '7x8'); ok(f.l === 1, 'după „învață”: portocaliu');
  CF.famUpdate('mul', '7x8', { correct: true, dt: 1500 }); ok(f.l === 2, 'corect: galben');
  CF.famUpdate('mul', '7x8', { correct: true, dt: 1500 }); ok(f.l === 2, 'aceeași zi: rămâne galben');
  f.d = today - 1; CF.famUpdate('mul', '7x8', { correct: true, dt: 1500 }); ok(f.l === 3, 'a doua zi, repede: verde');
  f.d = today - 1; CF.famUpdate('mul', '7x8', { correct: true, dt: 1500 }); ok(f.l === 4, 'încă o zi, repede: verde cu fulger');
  CF.famUpdate('mul', '7x8', { correct: false, dt: 1000 }); ok(f.l === 1, 'greșit: portocaliu');
}

// ---- 7b. sprinturile, runda de exersat, progresul stricat (2026-10-27) ----
{
  const s = CF.blankState(); CF.setS(s);
  ok(!CF.sprintsOpen().length && !CF.sprintNeeded(), 'la început: niciun sprint, ținta zilei fără sprint');
  s.lv.add10 = { s: 2, p: 1, b: 7 };
  ok(CF.sprintsOpen().join(',') === 'add' && !CF.sprintNeeded(), 'după perechile lui 10: sprintul adunărilor, ținta tot fără sprint');
  for (let rep = 0; rep < 50; rep++) { const it = CF.sprintItems('add'); ok(it.length === 40 && it.every((x, i) => /^10 − \d$/.test(x.q) && (!i || x.q !== it[i - 1].q)), 'sprintul adunărilor: doar perechile lui 10, fără două la rând'); }
  CF.WORLDK.add.levels.forEach(L => { s.lv[L.id] = { s: 2, p: 1, b: 16 }; });
  ok(CF.sprintNeeded() && CF.sprintsOpen().indexOf('mul') < 0, 'lumea adunărilor trecută: ținta zilei are sprint; tabla încă fără sprint');
  CF.WORLDK.mul.levels.forEach(L => { s.lv[L.id] = { s: 2, p: 1, b: 16 }; });
  const paper = CF.sprintItems('mul');
  ok(paper.length === 30 && paper.every((x, i) => x.q === CF.SPRINT[i][0] + ' · ' + CF.SPRINT[i][1] && x.ans === CF.SPRINT[i][0] * CF.SPRINT[i][1]), 'toată tabla trecută: sprintul e foaia');
  ok(CF.sprintsOpen().indexOf('mix') >= 0, 'două lumi trecute: sprintul amestecat');
  const s2 = CF.blankState(); CF.setS(s2); s2.lv.add10 = { s: 2 }; s2.lv.addUp = { s: 2 }; s2.lv.addDown = { s: 2 }; s2.lv.addB = { s: 2 }; s2.lv.mul2 = { s: 2, p: 1 };
  ok(CF.sprintItems('mul').every(x => /(^2 ·)|(· 2$)/.test(x.q)), 'doar tabla lui 2 trecută: sprintul are doar ·2');
  s2.sprint = [{ d: '2026-10-20', s: 18 }, { d: '2026-10-21', s: 22, w: 'add' }, { d: '2026-10-22', s: 9, w: 'add' }];
  ok(CF.sprintRecord('mul') === 18 && CF.sprintRecord('add') === 22, 'recordurile sunt pe sprint (cele vechi erau cu tabla)');
  // runda de exersat de după un nivel final picat
  for (let rep = 0; rep < 50; rep++) {
    const a = CF.practiceItems(CF.LVK.bigB, [{ src: 'big5' }]); ok(a.length === CF.PRACTICE_N && a.every(it => it.src === 'big5' && / − /.test(it.q)), 'exersat: calcule de felul celor greșite');
    const b = CF.practiceItems(CF.LVK.mulB, [{ fk: '7x8' }, { fk: '6x9' }]); ok(b.every(it => ['7 · 8', '8 · 7', '6 · 9', '9 · 6'].indexOf(it.q) >= 0) && b.every((x, i) => !i || x.q !== b[i - 1].q), 'exersat la tablă: exact calculele greșite');
    [a, b].forEach(l => l.forEach(it => checkItem(it, 'exersat „' + it.q + '”', /·/.test(it.q) ? 'mul' : 'big')));
  }
}
{ // a doua verificare GPT (2026-10-27): amestecul fix la nivelul final, sprinturi cât să bată recordul, fără dubluri lipite
  const s = CF.blankState(); CF.setS(s);
  CF.WORLDS.forEach(w => w.levels.filter(L => L.mix).forEach(L => { for (let rep = 0; rep < 300; rep++) {
    const per = {}; CF.levelPlan(L, false).forEach(e => { per[e.it.src] = (per[e.it.src] || 0) + 1; });
    ok(Object.keys(L.mix).every(id => per[id] === L.mix[id]), L.id + ': amestecul ' + JSON.stringify(per));
  } }));
  s.lv.add10 = { s: 2 }; s.sprint = [{ d: '2026-10-20', s: 45, w: 'add' }];
  ok(CF.sprintItems('add').length >= 46, 'sprintul are destule calcule pentru recordul + 1');
  for (let rep = 0; rep < 500; rep++) { const p = CF.dailyPlan(); ok(p.length === CF.DAILY_N && p.every((e, i) => !i || e.it.q !== p[i - 1].it.q), 'runda zilei cu un singur nivel: calcule identice lipite'); }
  // ultima încercare picată: tot ajutorul, chiar dacă nivelul fusese trecut
  const L = CF.LVK.big4; s.lv.big4 = { s: 2, p: 2, b: 7 }; CF.recordLevel(L, 3, 0);
  const pf = CF.levelPlan(L, false); ok(pf.filter(e => e.mode === 'fill').length === L.nf, 'după o încercare picată, la un nivel trecut: tot ajutorul');
  CF.recordLevel(L, 8, 8); ok(CF.levelPlan(L, false).filter(e => e.mode === 'fill').length === 2, 'după o încercare reușită: varianta scurtă');
  const bad = CF.blankState(); bad.sprint = [{ d: '2026-10-20', s: 'Infinity' }, { s: 4 }];
  const fx = CF.repair(JSON.parse(JSON.stringify(bad))); ok(fx.sprint.length === 1 && Number.isFinite(fx.sprint[0].s) && fx.sprint[0].s <= 200, 'sprintul stricat se repară');
}
{ // un progres stricat se repară, nu blochează jocul (rangul cu „Infinity” bucla la nesfârșit)
  const bad = CF.blankState(); bad.xp = 'Infinity'; bad.days = { '2026-10-20': { r: 1 }, x: null }; bad.lv = { add10: { s: 9 }, addUp: 'x' }; bad.sprint = [null, { d: '2026-10-20', s: 3 }];
  const fixed = CF.repair(JSON.parse(JSON.stringify(bad)));
  ok(Number.isFinite(fixed.xp) && CF.levelOf(fixed.xp) < 200 && fixed.days['2026-10-20'].q === 0 && !fixed.days.x && fixed.lv.add10.s === 3 && !fixed.lv.addUp && fixed.sprint.length === 1, 'progresul stricat se repară');
}
// ---- 8. gramatica și sprintul ----
ok(CF.nr(1, 'zi', 'zile') === '1 zi' && CF.nr(19, 'zi', 'zile') === '19 zile' && CF.nr(20, 'zi', 'zile') === '20 de zile' && CF.nr(101, 'zi', 'zile') === '101 zile', 'gramatica numerelor');
ok(CF.rankName(1) === 'Începător' && CF.rankName(12) === 'Legendă 3', 'rangurile');
ok(CF.SPRINT.map(p => p[0] * p[1]).join(',') === '14,30,24,36,42,40,28,63,18,64,54,16,49,24,27,35,48,27,56,36,32,81,45,56,24,21,54,35,72,36', 'sprintul = cel de pe foaie');

// ---- 9. vecinii: ajutorul după o greșeală la tablă ----
{
  let nb = 0;
  for (let x = 2; x <= 9; x++) for (let y = 2; y <= 9; y++) {
    const w = 'vecinii ' + x + '·' + y, c = CF.nbCands(x, y);
    ok(c.length === 2 && c[0].z === y - 1 && c[1].z === y + 1 && c.every(o => o.v === x * o.z && o.q === x + ' · ' + o.z), w + ': vecinii');
    c.forEach(o => ok(o.fk ? (o.z >= 2 && o.z <= 9 && !!CF.FAMK[o.fk.k]) : (o.z === 1 || o.z === 10), w + ': vecinul pe hartă'));
    c.forEach(o => { const it = CF.nbBridge(x, y, o); nb++; checkItem(it, w + ' din ' + o.q, 'mul'); ok(it.q === x + ' · ' + y && it.fk && it.fk.k === Math.min(x, y) + 'x' + Math.max(x, y), w + ': podul'); });
    const st = CF.nbSteps(x, y); nb++; checkItem(st, w + ' pașii', 'mul'); ok(st.q === x + ' · ' + y, w + ': pașii sunt pentru ' + st.q);
    ok(String(CF.mulXY(x + ' · ' + y)) === x + ',' + y, w + ': citirea calculului');
  }
  // orice calcul din lumea tablei poate primi ajutorul vecinilor; celelalte nu
  CF.WORLDK.mul.levels.forEach(L => { for (let rep = 0; rep < 5; rep++) L.pool().forEach(p => { const it = L.make(p), xy = CF.mulXY(it.q); ok(xy && xy[0] * xy[1] === it.ans, L.id + ' ' + it.q + ': vecinii nu-l pot citi'); }); });
  ok(CF.mulXY('−3 · (−4)') === null && CF.mulXY('56 : 8') === null && CF.mulXY('12 · 3') === null, 'vecinii doar la tabla de la 2 la 9');
  // exemplul profesorului: 7 · 8 greșit → 7 · 7 sus, 7 · 9 jos; din 7 · 9: 7 · 8 = 63 − 7
  const c78 = CF.nbCands(7, 8), b = CF.nbBridge(7, 8, c78[1]);
  ok(b.rows[0][0] === '7 · 8 = 63 − 7 = ' && b.slots[0].v === 56, 'exemplul profesorului: 7 · 8 = 63 − 7');
  ok(CF.nbFirst(7, c78) === 0 && CF.nbFirst(7, CF.nbCands(7, 9)) === 1 && CF.nbFirst(4, CF.nbCands(4, 2)) === 0 && CF.nbFirst(3, CF.nbCands(3, 4)) === 1, 'vecinul deschis la început');
  console.log(nb + ' ajutoare cu vecini verificate');
}
// ---- runda zilei: calcule amestecate din nivelurile trecute, întâi cele nevăzute de mult ----
{
  const s = CF.blankState(); CF.setS(s);
  ok(CF.dailyPlan().length === 0, 'runda zilei e goală fără niveluri trecute');
  const ids = CF.WORLDS.flatMap(w => w.levels.filter(L => !L.boss).map(L => L.id)).slice(0, 14);
  ids.forEach(id => { s.lv[id] = { s: 2, p: 1, b: 8 }; });
  const fresh = [ids[0], ids[1]], k = CF.dayKey();
  fresh.forEach(id => s.log.push({ d: k, w: id, q: 'x', a: '1', c: 1, s: 2, h: 0 }));
  for (let rep = 0; rep < 30; rep++) {
    const plan = CF.dailyPlan(), qs = plan.map(e => e.it.q), per = {};
    plan.forEach(e => { per[e.L.id] = (per[e.L.id] || 0) + 1; });
    ok(plan.length === CF.DAILY_N && new Set(qs).size === qs.length, 'runda zilei: ' + CF.DAILY_N + ' calcule diferite');
    ok(plan.every(e => e.mode === 'solo' && e.counted && !e.L.boss && ids.indexOf(e.L.id) >= 0), 'runda zilei: doar din nivelurile trecute');
    ok(Object.values(per).every(n => n === 1) && fresh.every(id => !per[id]), 'runda zilei: câte unul pe nivel, fără cele jucate azi');
    plan.forEach(e => checkItem(e.it, 'runda zilei ' + e.L.id + ' „' + e.it.q + '”', e.L.wid));
  }
  s.lv = { add10: { s: 2 }, addUp: { s: 3 } };
  ok(CF.dailyPlan().length === CF.DAILY_N, 'runda zilei cu doar două niveluri are tot ' + CF.DAILY_N + ' calcule');
}
// Răspunsul se verifică doar la OK: nicio căsuță nu primește singură răspunsul corect.
ok(js.indexOf("'auto'") < 0 && !/input\.length === fmt/.test(js), 'răspunsul se primește singur, fără OK');

console.log(nLevels + ' niveluri, ' + nItems + ' exerciții generate');
console.log((fails ? 'GREȘELI: ' + fails : 'TOTUL CORECT') + ' (' + checks + ' verificări)');
process.exit(fails ? 1 : 0);
