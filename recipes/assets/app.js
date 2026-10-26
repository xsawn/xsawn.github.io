(function () {
  var RECIPES = (window.RECIPES || []).map(function (r, i) {
    return {
      id: i,
      name: r.name || "未命名",
      tags: Array.isArray(r.tags) ? r.tags : [],
      ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
      steps: Array.isArray(r.steps) ? r.steps : []
    };
  });

  var state = { keyword: "", tags: [] };

  var $sub = document.getElementById("sub");
  var $grid = document.getElementById("grid");
  var $tags = document.getElementById("tags");
  var $search = document.getElementById("search");
  var $empty = document.getElementById("empty");
  var $reset = document.getElementById("reset");
  var $modal = document.getElementById("modal");
  var $luckyBox = document.getElementById("luckyBox");
  var luckyPick = null;

  /* ---------- 筛选 ---------- */
  function filtered() {
    var kw = state.keyword.trim().toLowerCase();
    return RECIPES.filter(function (r) {
      var okTags = state.tags.every(function (t) {
        return r.tags.indexOf(t) > -1;
      });
      if (!okTags) return false;
      if (!kw) return true;
      var hay = [r.name].concat(r.tags, r.ingredients).join(" ").toLowerCase();
      return hay.indexOf(kw) > -1;
    });
  }

  function tagCounts() {
    var map = {};
    RECIPES.forEach(function (r) {
      r.tags.forEach(function (t) {
        map[t] = (map[t] || 0) + 1;
      });
    });
    return Object.keys(map)
      .map(function (t) { return { tag: t, n: map[t] }; })
      .sort(function (a, b) { return b.n - a.n || a.tag.localeCompare(b.tag, "zh"); });
  }

  /* ---------- 渲染 ---------- */
  function renderTags() {
    $tags.innerHTML = "";
    tagCounts().forEach(function (item) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.setAttribute("aria-pressed", state.tags.indexOf(item.tag) > -1 ? "true" : "false");
      b.innerHTML = '<span></span><span class="n"></span>';
      b.children[0].textContent = item.tag;
      b.children[1].textContent = item.n;
      b.addEventListener("click", function () {
        var i = state.tags.indexOf(item.tag);
        if (i > -1) state.tags.splice(i, 1);
        else state.tags.push(item.tag);
        renderTags();
        renderGrid();
      });
      $tags.appendChild(b);
    });
  }

  function renderGrid() {
    var list = filtered();
    var total = RECIPES.length;
    var parts = ["共 " + total + " 道菜"];
    if (state.tags.length || state.keyword.trim()) {
      parts.push("筛出 " + list.length + " 道");
    }
    $sub.textContent = parts.join(" · ");

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
      r.tags.forEach(function (t) {
        var s = document.createElement("span");
        s.className = "tag";
        s.textContent = t;
        tags.appendChild(s);
      });

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

    var mt = document.getElementById("mTags");
    mt.innerHTML = "";
    r.tags.forEach(function (t) {
      var s = document.createElement("span");
      s.className = "tag";
      s.textContent = t;
      mt.appendChild(s);
    });

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

    var lt = document.getElementById("luckyTags");
    lt.innerHTML = "";
    next.tags.forEach(function (t) {
      var s = document.createElement("span");
      s.className = "tag";
      s.textContent = t;
      lt.appendChild(s);
    });
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
    state.tags = [];
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
