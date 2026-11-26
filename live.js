/* Climate Threshold Lab: 관리자 화면에서 고친 내용을 홈페이지에 반영합니다.
   Supabase에 닿지 못하면 페이지에 이미 들어 있는 내용이 그대로 보입니다. */
(function () {
  var SITE = window.SITE || {};
  var CTL = window.CTL = {};

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function sp(ko, en) {
    return '<span class="ko">' + esc(ko) + '</span><span class="en">' + esc(en || ko) + '</span>';
  }
  function safeUrl(u) {
    u = String(u || '').trim();
    if (!u) return '';
    if (/^(https?:)?\/\//i.test(u) || /^[\w\-./#?=&%]+$/.test(u)) return u;
    return '';
  }
  CTL.esc = esc; CTL.sp = sp;

  function api(path) {
    if (!SITE.url || !SITE.key) return Promise.reject(new Error('no supabase'));
    var h = { apikey: SITE.key };
    if (SITE.key.indexOf('sb_') !== 0) h.Authorization = 'Bearer ' + SITE.key;
    return fetch(SITE.url.replace(/\/$/, '') + '/rest/v1/' + path, { headers: h })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }

  /* ── 기술 장부 ── */
  var PST = { filed: ['출원', 'Filed', ''], fast: ['우선심사 신청', 'Expedited exam.', 'go'], granted: ['보유', 'Held', 'ok'] };
  var PS = { pre: ['프리프린트', 'Preprint', 'pre'], rev: ['심사 중', 'Under review', ''], pub: ['게재', 'Published', 'pub'] };

  function fromFallback(list) {
    return list.map(function (r) {
      return {
        tech_ko: r.ko, tech_en: r.en, desc_ko: r.dko, desc_en: r.den,
        patent_no: r.pat ? r.pat.no : null,
        patent_status: r.pat ? r.pat.st : null,
        patent_label: r.pat && r.pat.note ? 'MK-PRISM 강수 보간' : null,
        papers: (r.papers || []).map(function (x) {
          return { status: x.s, title: x.t, title_ko: x.ko, title_en: x.en, doi: x.doi, venue: x.venue };
        })
      };
    });
  }

  CTL.renderLedger = function (rows, isFallback) {
    var list = document.getElementById('ledgerList');
    if (!list) return;
    if (isFallback) rows = fromFallback(rows);
    while (list.children.length > 1) list.removeChild(list.lastChild);
    var nPat = 0, nPub = 0, nRev = 0;
    rows.forEach(function (r) {
      var li = document.createElement('li');
      var t = '<div class="t"><b>' + sp(r.tech_ko, r.tech_en) + '</b>' + (r.desc_ko ? '<span>' + sp(r.desc_ko, r.desc_en) + '</span>' : '') + '</div>';
      var p = '<div class="p"><span class="lab-k">' + sp('특허', 'Patent') + '</span>';
      if (r.patent_status) {
        nPat++;
        var s = PST[r.patent_status] || PST.filed;
        p += (r.patent_no ? '<code>' + esc(r.patent_no) + '</code><br>'
          : (r.patent_label ? esc(r.patent_label) + '<br>' : sp('번호 확인 중', 'Number to be confirmed') + '<br>'))
          + '<span class="chip ' + s[2] + '">' + sp(s[0], s[1]) + '</span>';
      } else {
        p += '<span class="hint">' + sp('공개 연구', 'Open research') + '</span>';
      }
      p += '</div>';
      var q = '<div><span class="lab-k">' + sp('논문', 'Paper') + '</span><ul class="ps">';
      var papers = (r.papers || []).slice().sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); });
      if (!papers.length) q += '<li class="hint">—</li>';
      papers.forEach(function (x) {
        var s = PS[x.status] || PS.rev;
        if (x.status === 'rev') nRev++; else nPub++;
        var title = x.title ? esc(x.title) : sp(x.title_ko, x.title_en);
        var doi = String(x.doi || '').replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').trim();
        var link = doi ? ' <a href="https://doi.org/' + esc(doi) + '">doi:' + esc(doi) + '</a>' : '';
        var venue = x.venue ? ' <span class="hint">' + esc(x.venue) + '</span>' : '';
        q += '<li><span class="chip ' + s[2] + '">' + sp(s[0], s[1]) + '</span> ' + title + venue + link + '</li>';
      });
      q += '</ul></div>';
      li.innerHTML = t + p + q;
      list.appendChild(li);
    });
    var sum = document.getElementById('ledgerSum');
    if (sum) sum.innerHTML =
      '<span><b>' + nPat + '</b>' + sp('특허', 'patents') + '</span>' +
      '<span><b>' + nPub + '</b>' + sp('공개 논문·프리프린트', 'published or preprint') + '</span>' +
      '<span><b>' + nRev + '</b>' + sp('심사 중 논문', 'under review') + '</span>';
  };

  /* ── 앱·서비스 카드 ── */
  CTL.renderApps = function (apps) {
    var box = document.getElementById('trackCards');
    if (!box || !apps.length) return;
    box.innerHTML = apps.map(function (a) {
      var url = safeUrl(a.url), img = safeUrl(a.image_url);
      return '<article class="card" style="--c:var(--c-' + esc(a.color || 'slide') + ')">' +
        (img ? '<img class="cardImg" src="' + esc(img) + '" alt="" loading="lazy">' : '') +
        (a.status_ko ? '<span class="status">' + sp(a.status_ko, a.status_en) + '</span>' : '') +
        '<h3>' + sp(a.title_ko, a.title_en) + '</h3>' +
        (a.body_ko ? '<p>' + sp(a.body_ko, a.body_en) + '</p>' : '') +
        (a.by_ko ? '<span class="by">' + sp(a.by_ko, a.by_en) + '</span>' : '') +
        (url ? '<a class="go" href="' + esc(url) + '">' + sp('서비스 보기 →', 'Open the service →') + '</a>' : '') +
        '</article>';
    }).join('');
  };

  /* ── 소식 ── */
  CTL.renderPosts = function (posts) {
    var sec = document.getElementById('news'), list = document.getElementById('newsList');
    if (!sec || !list) return;
    if (!posts.length) { sec.hidden = true; return; }
    list.innerHTML = posts.slice(0, 6).map(function (p) {
      var url = safeUrl(p.link), img = safeUrl(p.image_url);
      return '<li>' +
        '<time datetime="' + esc(p.published_at) + '">' + esc(String(p.published_at || '').replace(/-/g, '.')) + '</time>' +
        '<div>' + (img ? '<img src="' + esc(img) + '" alt="" loading="lazy">' : '') +
        '<h3>' + (url ? '<a href="' + esc(url) + '">' + sp(p.title_ko, p.title_en) + '</a>' : sp(p.title_ko, p.title_en)) + '</h3>' +
        (p.body_ko ? '<p>' + sp(p.body_ko, p.body_en) + '</p>' : '') + '</div></li>';
    }).join('');
    sec.hidden = false;
  };

  /* ── 설정 ── */
  CTL.applySettings = function (kv) {
    function v(k) { return safeUrl(kv[k]); }
    if (v('photo_url')) document.querySelectorAll('.photo img').forEach(function (i) { i.src = v('photo_url'); });
    var hv = document.getElementById('heroVid');
    if (hv) {
      if (v('hero_poster')) hv.poster = v('hero_poster');
      if (v('hero_video') && hv.getAttribute('src') !== v('hero_video')) { hv.src = v('hero_video'); if (hv.autoplay) hv.play().catch(function () {}); }
    }
    var dv = document.querySelector('.shot.demo video');
    if (dv) { if (v('demo_poster')) dv.poster = v('demo_poster'); if (v('demo_video')) dv.src = v('demo_video'); }
    ['linkedin', 'linkedin_me', 'scholar', 'newsletter', 'landslide_app'].forEach(function (k) {
      if (k in kv && !String(kv[k] || '').trim()) {   /* 관리자에서 비우면 숨김 */
        document.querySelectorAll('[data-wrap="' + k + '"],[data-link="' + k + '"]').forEach(function (e) { e.hidden = true; });
        return;
      }
      if (!v(k)) return;
      document.querySelectorAll('[data-link="' + k + '"]').forEach(function (a) { a.href = v(k); a.hidden = false; });
      document.querySelectorAll('[data-wrap="' + k + '"]').forEach(function (w) { w.hidden = false; });
    });
    if (v('replay_url')) {
      var l = document.getElementById('replayLink'), s = document.getElementById('replayStatus');
      if (l) { l.href = v('replay_url'); l.hidden = false; }
      if (s) s.innerHTML = sp('공개', 'Public');
    }
  };

  /* ── 불러오기 ── */
  CTL.boot = function (opt) {
    opt = opt || {};
    api('settings?select=key,value').then(function (rows) {
      var kv = {}; rows.forEach(function (r) { kv[r.key] = r.value; }); CTL.applySettings(kv);
    }).catch(function () {});
    if (opt.page !== 'index') return;
    api('ledger_rows?select=*,papers(*)&visible=eq.true&papers.visible=eq.true&order=sort.asc,id.asc')
      .then(function (rows) { if (rows.length) CTL.renderLedger(rows); }).catch(function () {});
    api('apps?select=*&visible=eq.true&order=sort.asc,id.asc')
      .then(CTL.renderApps).catch(function () {});
    api('posts?select=*&visible=eq.true&order=published_at.desc,id.desc&limit=6')
      .then(CTL.renderPosts).catch(function () {});
  };
})();
