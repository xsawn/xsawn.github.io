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
