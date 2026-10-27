(function () {
  var TYPE = ["荤菜", "素菜", "汤", "主食"];
  var FEATURE = ["快手", "下饭", "清淡", "重口", "宴客"];
  var MEAT = ["猪肉", "鸡肉", "牛羊肉", "鱼", "海鲜", "蛋", "豆腐", "蔬菜"];

  var RECIPES = (window.RECIPES || []).map(function (r) {
    var tags = Array.isArray(r.tags) ? r.tags : [];
    var type = tags.filter(function (t) { return TYPE.indexOf(t) > -1; });
    var feat = tags.filter(function (t) { return FEATURE.indexOf(t) > -1; });
    var meat = Array.isArray(r.meat) ? r.meat : [];
    return {
      id: r.name,
      name: r.name || "未命名",
      type: type,
      meat: meat,
      feat: feat,
      allTags: type.concat(meat, feat),
      ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
      steps: Array.isArray(r.steps) ? r.steps : []
    };
  });

  var state = { keyword: "", type: [], meat: [], feat: [] };

  /* ---------- 固定搭配 ---------- */
  var COMBO_TYPE = ["两菜一汤", "三菜一汤"];
  var COMBO_SCENE = ["快手", "家常", "清淡", "重口", "海鲜", "宴客"];
  var byName = {};
  RECIPES.forEach(function (r) { byName[r.name] = r; });
  var COMBOS = (window.COMBOS || []).map(function (c) {
    return {
      name: c.name,
      type: c.type,
      scene: c.scene,
      note: c.note || "",
      dishes: (c.dishes || []).map(function (n) {
        return byName[n] || { name: n, type: [], meat: [], feat: [], allTags: [], ingredients: [], steps: [] };
      })
    };
  });
  var cstate = { type: [], scene: [] };
  var view = "dishes";

  var $sub = document.getElementById("sub");
  var $grid = document.getElementById("grid");
  var $search = document.getElementById("search");
  var $empty = document.getElementById("empty");
  var $reset = document.getElementById("reset");
  var $modal = document.getElementById("modal");
  var $luckyBox = document.getElementById("luckyBox");
  var luckyPick = null;

  /* ---------- 筛选区折叠（移动端默认收起） ---------- */
  var $filters = document.getElementById("filters");
  var $filterToggle = document.getElementById("filterToggle");
  var $ftCount = document.getElementById("ftCount");
  function isMobile() { return window.matchMedia("(max-width:640px)").matches; }
  function setCollapsed(v) {
    $filters.classList.toggle("collapsed", v);
    $filterToggle.setAttribute("aria-expanded", String(!v));
  }
  setCollapsed(isMobile());
  $filterToggle.addEventListener("click", function () {
    setCollapsed(!$filters.classList.contains("collapsed"));
  });

  /* ---------- 筛选 ----------
     同组内 (type/meat/feat) 多选 = 或（满足任一即可）
     组间多选 = 且（同时满足）                                              */
  function filtered() {
    var kw = state.keyword.trim().toLowerCase();
    return RECIPES.filter(function (r) {
      var okType = !state.type.length || state.type.some(function (t) { return r.type.indexOf(t) > -1; });
      var okMeat = !state.meat.length || state.meat.some(function (t) { return r.meat.indexOf(t) > -1; });
      var okFeat = !state.feat.length || state.feat.some(function (t) { return r.feat.indexOf(t) > -1; });
      if (!(okType && okMeat && okFeat)) return false;
      if (!kw) return true;
      var hay = [r.name].concat(r.allTags, r.ingredients).join(" ").toLowerCase();
      return hay.indexOf(kw) > -1;
    });
  }

  function groupTags() {
    var typeMap = {}, meatMap = {}, featMap = {};
    RECIPES.forEach(function (r) {
      r.type.forEach(function (t) { typeMap[t] = (typeMap[t] || 0) + 1; });
      r.meat.forEach(function (t) { meatMap[t] = (meatMap[t] || 0) + 1; });
      r.feat.forEach(function (t) { featMap[t] = (featMap[t] || 0) + 1; });
    });
    function toArr(m) {
      return Object.keys(m)
        .map(function (t) { return { tag: t, n: m[t] }; })
        .sort(function (a, b) { return b.n - a.n || a.tag.localeCompare(b.tag, "zh"); });
    }
    return { type: toArr(typeMap), meat: toArr(meatMap), feat: toArr(featMap) };
  }

  /* ---------- 渲染 ---------- */
  function makeGroup($el, items, bucket) {
    $el.innerHTML = "";
    items.forEach(function (item) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.setAttribute("aria-pressed", state[bucket].indexOf(item.tag) > -1 ? "true" : "false");
      b.innerHTML = '<span></span><span class="n"></span>';
      b.children[0].textContent = item.tag;
      b.children[1].textContent = item.n;
      b.addEventListener("click", function () {
        var arr = state[bucket];
        var i = arr.indexOf(item.tag);
        if (i > -1) arr.splice(i, 1); else arr.push(item.tag);
        renderTags();
        renderGrid();
      });
      $el.appendChild(b);
    });
  }

  function renderTags() {
    var g = groupTags();
    makeGroup(document.getElementById("tagType"), g.type, "type");
    makeGroup(document.getElementById("tagMeat"), g.meat, "meat");
    makeGroup(document.getElementById("tagFeature"), g.feat, "feat");
  }

  function tagSpans(el, tags) {
    el.innerHTML = "";
    tags.forEach(function (t) {
      var s = document.createElement("span");
      s.className = "tag";
      s.textContent = t;
      el.appendChild(s);
    });
  }

  function renderGrid() {
    var list = filtered();
    var total = RECIPES.length;
    var parts = ["共 " + total + " 道菜"];
    var active = state.type.length + state.meat.length + state.feat.length + (state.keyword.trim() ? 1 : 0);
    if (active) parts.push("筛出 " + list.length + " 道");
    $sub.textContent = parts.join(" · ");
    $ftCount.textContent = active ? " · " + active : "";

    $grid.innerHTML = "";
    list.forEach(function (r) {
      var card = document.createElement("button");
      card.type = "button";
      card.className = "card";

      var name = document.createElement("div");
      name.className = "card-name";
      name.textContent = r.name;

      var ing = document.createElement("div");
      ing.className = "card-ing";
      ing.textContent = r.ingredients.slice(0, 3).join(" · ") || "还没有写食材";

      var tags = document.createElement("div");
      tags.className = "card-tags";
      tagSpans(tags, r.allTags);

      card.appendChild(name);
      card.appendChild(ing);
      card.appendChild(tags);
      card.addEventListener("click", function () { openRecipe(r); });
      $grid.appendChild(card);
    });

    $empty.hidden = list.length > 0;
  }

  /* ---------- 搭配视图 ---------- */
  var $comboView = document.getElementById("comboView");
  var $comboGrid = document.getElementById("comboGrid");
  var $comboEmpty = document.getElementById("comboEmpty");

  function comboFiltered() {
    return COMBOS.filter(function (c) {
      var okType = !cstate.type.length || cstate.type.indexOf(c.type) > -1;
      var okScene = !cstate.scene.length || cstate.scene.indexOf(c.scene) > -1;
      return okType && okScene;
    });
  }

  function renderComboTags() {
    var typeCounts = {}, sceneCounts = {};
    COMBOS.forEach(function (c) { typeCounts[c.type] = (typeCounts[c.type] || 0) + 1; });
    COMBOS.forEach(function (c) { sceneCounts[c.scene] = (sceneCounts[c.scene] || 0) + 1; });
    function fill($el, keys, counts, bucket) {
      $el.innerHTML = "";
      keys.forEach(function (t) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "chip";
        b.setAttribute("aria-pressed", cstate[bucket].indexOf(t) > -1 ? "true" : "false");
        b.innerHTML = '<span></span><span class="n"></span>';
        b.children[0].textContent = t;
        b.children[1].textContent = counts[t] || 0;
        b.addEventListener("click", function () {
          var arr = cstate[bucket];
          var i = arr.indexOf(t);
          if (i > -1) arr.splice(i, 1); else arr.push(t);
          renderComboTags();
          renderCombos();
        });
        $el.appendChild(b);
      });
    }
    fill(document.getElementById("comboType"), COMBO_TYPE, typeCounts, "type");
    fill(document.getElementById("comboScene"), COMBO_SCENE, sceneCounts, "scene");
  }

  function renderCombos() {
    var list = comboFiltered();
    $sub.textContent = "共 " + COMBOS.length + " 套搭配" + (list.length < COMBOS.length ? " · 筛出 " + list.length + " 套" : "");
    $comboGrid.innerHTML = "";
    list.forEach(function (c) {
      var card = document.createElement("div");
      card.className = "combo-card";

      var head = document.createElement("div");
      head.className = "combo-head";
      var title = document.createElement("span");
      title.className = "combo-name";
      title.textContent = c.name;
      var badges = document.createElement("span");
      badges.className = "combo-badges";
      [c.type, c.scene].forEach(function (t) {
        var s = document.createElement("span");
        s.className = "tag";
        s.textContent = t;
        badges.appendChild(s);
      });
      head.appendChild(title);
      head.appendChild(badges);

      var listEl = document.createElement("div");
      listEl.className = "combo-dishes";
      c.dishes.forEach(function (d, i) {
        var row = document.createElement("button");
        row.type = "button";
        row.className = "combo-dish";
        var idx = document.createElement("span");
        idx.className = "combo-idx";
        idx.textContent = (i + 1);
        var nm = document.createElement("span");
        nm.className = "combo-dish-name";
        nm.textContent = d.name;
        var tg = document.createElement("span");
        tg.className = "combo-dish-tags";
        (d.allTags || []).forEach(function (t) {
          var s = document.createElement("span");
          s.className = "tag mini";
          s.textContent = t;
          tg.appendChild(s);
        });
        row.appendChild(idx);
        row.appendChild(nm);
        row.appendChild(tg);
        if (byName[d.name]) {
          row.addEventListener("click", function () { openRecipe(byName[d.name]); });
        } else {
          row.disabled = true;
        }
        listEl.appendChild(row);
      });

      var note = document.createElement("p");
      note.className = "combo-note";
      note.textContent = c.note;

      card.appendChild(head);
      card.appendChild(listEl);
      card.appendChild(note);
      $comboGrid.appendChild(card);
    });
    $comboEmpty.hidden = list.length > 0;
  }

  function setView(v) {
    view = v;
    var dishes = v === "dishes";
    document.getElementById("filters").hidden = !dishes;
    document.getElementById("filterToggle").hidden = !dishes;
    document.getElementById("lucky").hidden = !dishes;
    $grid.hidden = !dishes;
    $empty.hidden = !dishes;
    $comboView.hidden = dishes;
    document.querySelectorAll("#tabs .tab").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-view") === v);
    });
    if (dishes) renderGrid();
    else { renderComboTags(); renderCombos(); }
  }

  document.querySelectorAll("#tabs .tab").forEach(function (b) {
    b.addEventListener("click", function () { setView(b.getAttribute("data-view")); });
  });

  /* ---------- 详情 ---------- */
  function openRecipe(r) {
    document.getElementById("mName").textContent = r.name;
    tagSpans(document.getElementById("mTags"), r.allTags);

    var ing = document.getElementById("mIng");
    ing.innerHTML = "";
    r.ingredients.forEach(function (x) {
      var li = document.createElement("li");
      li.textContent = x;
      li.addEventListener("click", function () { li.classList.toggle("done"); });
      ing.appendChild(li);
    });

    var steps = document.getElementById("mSteps");
    steps.innerHTML = "";
    r.steps.forEach(function (x) {
      var li = document.createElement("li");
      li.textContent = x;
      li.addEventListener("click", function () { li.classList.toggle("done"); });
      steps.appendChild(li);
    });

    open($modal);
  }

  /* ---------- 今天吃什么 ---------- */
  function rollLucky() {
    var pool = filtered();
    if (!pool.length) pool = RECIPES;
    if (!pool.length) return;
    var next = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1 && luckyPick && next.id === luckyPick.id) {
      return rollLucky();
    }
    luckyPick = next;

    var nameEl = document.getElementById("luckyName");
    nameEl.textContent = next.name;
    nameEl.style.animation = "none";
    void nameEl.offsetWidth;
    nameEl.style.animation = "";

    tagSpans(document.getElementById("luckyTags"), next.allTags);
  }

  /* ---------- 开关 ---------- */
  function open(el) {
    el.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function close(el) {
    el.hidden = true;
    document.body.style.overflow = "";
  }

  document.querySelectorAll("[data-close]").forEach(function (el) {
    el.addEventListener("click", function () { close(el.closest(".modal, .lucky")); });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (!$modal.hidden) close($modal);
      if (!$luckyBox.hidden) close($luckyBox);
    }
  });

  $search.addEventListener("input", function () {
    state.keyword = $search.value;
    renderGrid();
  });

  $reset.addEventListener("click", function () {
    state.keyword = "";
    state.type = []; state.meat = []; state.feat = [];
    $search.value = "";
    renderTags();
    renderGrid();
  });

  document.getElementById("lucky").addEventListener("click", function () {
    if (!RECIPES.length) return;
    rollLucky();
    open($luckyBox);
  });

  document.getElementById("again").addEventListener("click", rollLucky);

  document.getElementById("confirm").addEventListener("click", function () {
    if (!luckyPick) return;
    close($luckyBox);
    openRecipe(luckyPick);
  });

  renderTags();
  renderGrid();
})();
