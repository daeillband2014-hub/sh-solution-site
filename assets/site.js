/* SH Solution — shared UI enhancements (no calculation logic here) */
(function(){
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* theme toggle for pages without their own handler */
  Array.prototype.forEach.call(document.querySelectorAll('[data-theme-toggle]'), function(b){
    b.addEventListener('click', function(){
      var r = document.documentElement, cur = r.getAttribute('data-theme');
      var dark = cur ? cur === 'dark' : !(window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);
      r.setAttribute('data-theme', dark ? 'light' : 'dark');
    });
  });

  /* ---------- count-up on result numbers ---------- */
  var NUM_SEL = '.big .v, .big .num, .fc .big > strong';
  function countUp(el){
    if (reduce || !el || el.dataset.cu === el.textContent) return;
    var tn = null;
    for (var i = 0; i < el.childNodes.length; i++){ if (el.childNodes[i].nodeType === 3 && /\d/.test(el.childNodes[i].nodeValue)){ tn = el.childNodes[i]; break; } }
    if (!tn) return;
    var src = tn.nodeValue, m = src.match(/^(\D*?)(-?\d{1,3}(?:,\d{3})+|-?\d+)(?![\d.])(.*)$/);
    if (!m) return;
    var target = parseInt(m[2].replace(/,/g, ''), 10);
    if (!isFinite(target) || Math.abs(target) < 10){ el.dataset.cu = el.textContent; return; }
    var comma = m[2].indexOf(',') > -1, t0 = null, dur = 700;
    function fmt(n){ return comma ? n.toLocaleString('ko-KR') : String(n); }
    function step(ts){
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      tn.nodeValue = m[1] + fmt(Math.round(target * e)) + m[3];
      if (p < 1) requestAnimationFrame(step); else { tn.nodeValue = src; el.dataset.cu = el.textContent; }
    }
    requestAnimationFrame(step);
  }
  function scan(root){ Array.prototype.forEach.call(root.querySelectorAll(NUM_SEL), countUp); }
  Array.prototype.forEach.call(document.querySelectorAll('#out, #res, #result'), function(box){
    var pending = false;
    new MutationObserver(function(){
      if (pending) return; pending = true;
      requestAnimationFrame(function(){ pending = false; Array.prototype.forEach.call(box.querySelectorAll(NUM_SEL), function(el){ delete el.dataset.cu; }); scan(box); });
    }).observe(box, {childList: true, subtree: true});
    scan(box);
  });

  /* ---------- inline validation (visual only, never blocks the calculator) ---------- */
  function wrapOf(i){ return i.closest('.inp, .in, .box'); }
  function msgFor(i){
    var v = String(i.value).trim();
    if (i.type === 'date') return (i.required && !v) ? '날짜를 선택해 주세요' : (i.validity && !i.validity.valid ? '날짜를 다시 확인해 주세요' : '');
    var numeric = i.classList.contains('num') || i.hasAttribute('data-comma') || /numeric|decimal/.test(i.getAttribute('inputmode') || '') || i.type === 'number';
    if (!numeric) return '';
    if (!v) return '숫자를 입력해 주세요';
    var n = parseFloat(v.replace(/,/g, ''));
    if (i.hasAttribute('min') && n < parseFloat(i.getAttribute('min'))) return i.getAttribute('min') + ' 이상으로 입력해 주세요';
    if (i.hasAttribute('max') && n > parseFloat(i.getAttribute('max'))) return i.getAttribute('max') + ' 이하로 입력해 주세요';
    return '';
  }
  function validate(i){
    var w = wrapOf(i); if (!w) return;
    var msg = msgFor(i), id = (i.id || 'f') + '-err', err = document.getElementById(id);
    if (msg){
      w.classList.add('is-invalid'); i.setAttribute('aria-invalid', 'true');
      if (!err){ err = document.createElement('p'); err.className = 'field-err'; err.id = id; err.setAttribute('role', 'alert'); w.parentNode.insertBefore(err, w.nextSibling); }
      err.textContent = msg; i.setAttribute('aria-describedby', id);
    } else {
      w.classList.remove('is-invalid'); i.removeAttribute('aria-invalid');
      if (err) err.parentNode.removeChild(err);
    }
  }
  Array.prototype.forEach.call(document.querySelectorAll('main form input'), function(i){
    if (!wrapOf(i)) return;
    i.addEventListener('blur', function(){ validate(i); });
    i.addEventListener('input', function(){ if (wrapOf(i).classList.contains('is-invalid')) validate(i); });
  });

  /* ---------- hub search / filter ---------- */
  var q = document.getElementById('q');
  if (q){
    var cards = Array.prototype.slice.call(document.querySelectorAll('.hub .card[data-cat]'));
    var cats = Array.prototype.slice.call(document.querySelectorAll('.cat'));
    var chips = Array.prototype.slice.call(document.querySelectorAll('.chip'));
    var cnt = document.getElementById('count'), empty = document.getElementById('empty'), clr = document.getElementById('clr');
    var cur = 'all';
    var norm = function(s){ return String(s).toLowerCase().replace(/[\s·・,()\-]/g, ''); };
    cards.forEach(function(c){ c._t = norm(c.textContent + ' ' + (c.getAttribute('data-k') || '')); });
    function apply(){
      var term = norm(q.value), shown = 0;
      cards.forEach(function(c){
        var ok = (cur === 'all' || c.getAttribute('data-cat') === cur) && (!term || c._t.indexOf(term) > -1);
        c.hidden = !ok; if (ok) shown++;
      });
      cats.forEach(function(s){ var n = s.querySelectorAll('.card:not([hidden])').length; s.hidden = !n; var b = s.querySelector('.cat-h .n'); if (b) b.textContent = n + '개'; });
      cnt.textContent = (term || cur !== 'all') ? '계산기 ' + shown + '개를 찾았어요' : '계산기 ' + shown + '개';
      empty.hidden = shown > 0; clr.hidden = !q.value;
    }
    q.addEventListener('input', apply);
    clr.addEventListener('click', function(){ q.value = ''; apply(); q.focus(); });
    chips.forEach(function(ch){
      ch.addEventListener('click', function(){
        cur = ch.getAttribute('data-f');
        chips.forEach(function(x){ x.setAttribute('aria-pressed', x === ch ? 'true' : 'false'); });
        apply();
      });
    });
    document.addEventListener('keydown', function(e){ if (e.key === '/' && document.activeElement !== q && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){ e.preventDefault(); q.focus(); } });
    apply();
  }
})();
