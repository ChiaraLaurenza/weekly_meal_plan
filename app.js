/* Recipe Roulette - main app */
(function() {
  'use strict';

  const RECIPES = window.RECIPES || [];
  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const CATEGORY_ORDER = ['produce','meat & fish','dairy & eggs','pantry','other'];
  const STORAGE_KEY = 'recipe_roulette_week_v1';

  let currentWeek = [null, null, null, null, null, null, null]; // array of recipe ids

  /* ---------- Utilities ---------- */
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function recipeById(id) {
    return RECIPES.find(r => r.id === id) || null;
  }

  /* ---------- Week generation ---------- */
  function pickWeek(opts) {
    const balanceProteins = opts.balanceProteins;
    const quickOnly = opts.quickOnly;

    let pool = RECIPES.slice();
    if (quickOnly) pool = pool.filter(r => r.prep_time_min <= 40);
    if (pool.length < 7) pool = RECIPES.slice(); // fallback

    if (!balanceProteins) {
      // simple random
      return shuffle(pool).slice(0, 7).map(r => r.id);
    }

    // Balanced: don't repeat protein two days in a row, and try to spread variety
    const byProtein = {};
    pool.forEach(r => {
      (byProtein[r.protein_type] = byProtein[r.protein_type] || []).push(r);
    });
    const proteins = Object.keys(byProtein);
    // shuffle each bucket
    proteins.forEach(p => byProtein[p] = shuffle(byProtein[p]));

    const week = [];
    const used = new Set();
    let lastProtein = null;

    for (let day = 0; day < 7; day++) {
      // weight proteins by remaining count, exclude lastProtein
      const candidates = proteins
        .filter(p => p !== lastProtein && byProtein[p].some(r => !used.has(r.id)));
      let pickedProtein;
      if (candidates.length) {
        // weighted by remaining bucket size (favor proteins we have more of)
        const weights = candidates.map(p => byProtein[p].filter(r => !used.has(r.id)).length);
        const total = weights.reduce((a,b)=>a+b,0);
        let r = Math.random() * total;
        for (let i = 0; i < candidates.length; i++) {
          r -= weights[i];
          if (r <= 0) { pickedProtein = candidates[i]; break; }
        }
        if (!pickedProtein) pickedProtein = candidates[candidates.length-1];
      } else {
        // fallback: any protein with remaining
        pickedProtein = proteins.find(p => byProtein[p].some(r => !used.has(r.id))) || proteins[0];
      }
      const recipe = byProtein[pickedProtein].find(r => !used.has(r.id))
                  || byProtein[pickedProtein][0];
      used.add(recipe.id);
      week.push(recipe.id);
      lastProtein = pickedProtein;
    }
    return week;
  }

  function swapDay(dayIndex, opts) {
    const balanceProteins = opts.balanceProteins;
    const quickOnly = opts.quickOnly;
    let pool = RECIPES.slice();
    if (quickOnly) pool = pool.filter(r => r.prep_time_min <= 40);
    if (pool.length < 2) pool = RECIPES.slice();
    // exclude already-used recipes in the week
    const usedIds = new Set(currentWeek.filter(id => id !== null));
    let candidates = pool.filter(r => !usedIds.has(r.id));
    // also exclude same protein as adjacent days when balancing
    if (balanceProteins) {
      const prev = currentWeek[dayIndex - 1] != null ? recipeById(currentWeek[dayIndex - 1]) : null;
      const next = currentWeek[dayIndex + 1] != null ? recipeById(currentWeek[dayIndex + 1]) : null;
      const banned = new Set([prev && prev.protein_type, next && next.protein_type].filter(Boolean));
      const filtered = candidates.filter(r => !banned.has(r.protein_type));
      if (filtered.length > 0) candidates = filtered;
    }
    if (candidates.length === 0) candidates = pool.filter(r => r.id !== currentWeek[dayIndex]);
    if (candidates.length === 0) return;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    currentWeek[dayIndex] = pick.id;
  }

  /* ---------- Rendering ---------- */
  function render() {
    renderWeek();
    renderShoppingList();
    saveWeek();
  }

  function renderWeek() {
    const grid = document.getElementById('week-grid');
    const hint = document.getElementById('week-hint');
    grid.innerHTML = '';
    const hasAny = currentWeek.some(id => id !== null);
    hint.style.display = hasAny ? 'none' : 'block';

    DAYS.forEach((day, i) => {
      const id = currentWeek[i];
      const recipe = id != null ? recipeById(id) : null;
      const card = document.createElement('article');
      card.className = 'day-card' + (recipe ? '' : ' day-card-empty');
      if (!recipe) {
        card.innerHTML = `<span>${day}<br><small>—</small></span>`;
        grid.appendChild(card);
        return;
      }
      const proteinTag = recipe.protein_type === 'seafood' ? 'fish' : recipe.protein_type;
      card.innerHTML = `
        <div class="day-name">${day}</div>
        <h3 class="day-title">${escapeHTML(toTitleCase(recipe.title))}</h3>
        <div class="day-meta">
          <span class="tag tag-protein-${proteinTag}">${recipe.protein_type}</span>
          <span class="tag">${recipe.prep_time_min} min</span>
          <span class="tag">★${recipe.difficulty}/5</span>
        </div>
        <div class="day-actions">
          <button class="day-action-btn primary" data-act="view" data-day="${i}">View recipe</button>
          <button class="day-action-btn" data-act="swap" data-day="${i}">Swap</button>
        </div>
      `;
      grid.appendChild(card);
    });

    grid.querySelectorAll('button[data-act]').forEach(btn => {
      btn.addEventListener('click', e => {
        const day = parseInt(btn.dataset.day, 10);
        const act = btn.dataset.act;
        if (act === 'view') openRecipeModal(currentWeek[day]);
        if (act === 'swap') {
          swapDay(day, getOpts());
          render();
        }
      });
    });
  }

  /* ---------- Shopping list (quantity aggregation) ---------- */
  // Normalise units to a canonical form
  const UNIT_NORMALISE = {
    'g': 'g', 'gr': 'g', 'gramm': 'g',
    'kg': 'kg',
    'ml': 'ml', 'l': 'l',
    'el': 'tbsp', 'tbsp': 'tbsp', 'tablespoon': 'tbsp',
    'tl': 'tsp', 'tsp': 'tsp', 'teaspoon': 'tsp',
    'stück': 'pc', 'stuck': 'pc', 'stk': 'pc', 'st': 'pc', 'pc': 'pc', 'piece': 'pc',
    'bund': 'bunch', 'bunch': 'bunch',
    'pck.': 'pack', 'pck': 'pack', 'packung': 'pack', 'pack': 'pack',
    'pkg': 'pack',
    'tk': 'tk',
    'prise': 'pinch', 'pinch': 'pinch',
  };

  function parseQty(q) {
    if (!q) return null;
    const s = String(q).trim().replace(',', '.').replace(/[^\d.\-/]/g, '');
    if (!s) return null;
    if (s.includes('/')) {
      const [a,b] = s.split('/').map(parseFloat);
      if (!isNaN(a) && !isNaN(b) && b !== 0) return a/b;
    }
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  }

  function normUnit(u) {
    if (!u) return '';
    const k = String(u).trim().toLowerCase().replace('.', '');
    return UNIT_NORMALISE[k] || k;
  }

  // Aliases to merge near-duplicate ingredient names from imperfect OCR/translation
  const NAME_ALIASES = {
    'chicken breasts': 'chicken breast',
    'red chilis': 'red chili',
    'red chilies': 'red chili',
    'chili pepper': 'red chili',
    'lemons': 'lemon',
    'limes': 'lime',
    'red onions': 'red onion',
    'spring onions': 'spring onion',
    'garlic cloves': 'garlic clove',
    'cucumbers': 'cucumber',
    'tomatoes': 'tomato',
    'carrots': 'carrot',
    'potatoes': 'potato',
    'sweet potatoes': 'sweet potato',
    'mini flatbreads': 'mini flatbread',
    'brioche buns with sesame': 'brioche bun with sesame',
    'small salad cucumber': 'cucumber',
    'baby potatoes': 'baby potato',
  };
  function normName(n) {
    const k = n.toLowerCase().trim();
    return NAME_ALIASES[k] || k;
  }

  function buildShoppingList(weekIds) {
    // map: key (name + unit) -> { name, unit, qty (number|null), category }
    const map = new Map();
    weekIds.filter(id => id !== null).forEach(id => {
      const r = recipeById(id);
      if (!r) return;
      r.ingredients.forEach(ing => {
        const rawName = (ing.name || '').trim();
        if (!rawName) return;
        const name = normName(rawName).replace(/\b\w/g, c => c); // keep lowercase canonical
        const unit = normUnit(ing.unit);
        const qty = parseQty(ing.quantity);
        const key = name + '|' + unit;
        const existing = map.get(key);
        if (existing) {
          if (qty != null && existing.qty != null) existing.qty += qty;
          else if (qty != null && existing.qty == null) existing.qty = qty;
          existing.recipeCount += 1;
        } else {
          map.set(key, {
            name: name,
            displayName: name,
            unit: unit,
            qty: qty,
            category: ing.category || 'other',
            recipeCount: 1,
          });
        }
      });
    });
    return Array.from(map.values());
  }

  function formatQty(item) {
    let q = item.qty;
    let u = item.unit;
    if (q == null) return '—';
    // round
    if (Math.abs(q) < 1) q = Math.round(q * 100) / 100;
    else if (Math.abs(q) < 10) q = Math.round(q * 10) / 10;
    else q = Math.round(q);
    let unitLabel = u;
    if (u === 'pc') unitLabel = q === 1 ? 'pc' : 'pcs';
    if (!u) unitLabel = '';
    return q + (unitLabel ? ' ' + unitLabel : '');
  }

  function renderShoppingList() {
    const section = document.getElementById('shopping-section');
    const container = document.getElementById('shopping-list');
    const hasAny = currentWeek.some(id => id !== null);
    if (!hasAny) {
      section.hidden = true;
      return;
    }
    section.hidden = false;

    const items = buildShoppingList(currentWeek);
    // group by category
    const byCat = {};
    items.forEach(it => {
      (byCat[it.category] = byCat[it.category] || []).push(it);
    });
    // sort categories by our preferred order, then items alphabetically by name
    const categories = CATEGORY_ORDER.filter(c => byCat[c]);

    container.innerHTML = '';
    categories.forEach(cat => {
      const items = byCat[cat].sort((a,b) => a.name.localeCompare(b.name));
      const block = document.createElement('div');
      block.className = 'shop-category';
      const title = document.createElement('h3');
      title.textContent = cat;
      block.appendChild(title);
      items.forEach(item => {
        const label = document.createElement('label');
        label.className = 'shop-item';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.addEventListener('change', () => {
          label.classList.toggle('checked', cb.checked);
        });
        const text = document.createElement('span');
        text.className = 'shop-item-text';
        const note = item.recipeCount > 1 ? ` <small style="color:var(--ink-muted)">(×${item.recipeCount})</small>` : '';
        text.innerHTML = `<span class="shop-qty">${formatQty(item)}</span> <span class="shop-name">${escapeHTML(item.name)}</span>${note}`;
        label.appendChild(cb);
        label.appendChild(text);
        block.appendChild(label);
      });
      container.appendChild(block);
    });
  }

  /* ---------- Recipe modal ---------- */
  function openRecipeModal(id) {
    const r = recipeById(id);
    if (!r) return;
    const modal = document.getElementById('recipe-modal');
    const content = document.getElementById('modal-content');
    const proteinTag = r.protein_type === 'seafood' ? 'fish' : r.protein_type;

    const ingredientsHTML = r.ingredients.map(ing => {
      const u = normUnit(ing.unit);
      let unitDisplay = u;
      if (u === 'pc') unitDisplay = parseQty(ing.quantity) === 1 ? 'pc' : 'pcs';
      if (!u) unitDisplay = '';
      return `
      <li>
        <span class="ing-name">${escapeHTML(ing.name)}</span>
        <span class="ing-qty">${escapeHTML(ing.quantity)} ${escapeHTML(unitDisplay)}</span>
      </li>
      `;
    }).join('');

    const stepsHTML = r.steps.map(s => `<li>${escapeHTML(s)}</li>`).join('');

    content.innerHTML = `
      <h2 id="modal-title" class="modal-title">${escapeHTML(toTitleCase(r.title))}</h2>
      <p class="modal-subtitle">${escapeHTML(r.subtitle || '')}</p>
      <div class="modal-meta">
        <span class="tag tag-protein-${proteinTag}">${r.protein_type}</span>
        <span class="tag">${r.prep_time_min} min</span>
        <span class="tag">Difficulty ★${r.difficulty}/5</span>
        <span class="tag">For 2 people</span>
      </div>
      <h3 class="modal-section-title">Ingredients</h3>
      <ul class="modal-ingredients">${ingredientsHTML}</ul>
      <h3 class="modal-section-title">Steps</h3>
      <ol class="modal-steps">${stepsHTML}</ol>
      <p style="margin-top:24px;font-size:12px;color:var(--ink-muted);">
        Original German title: <em>${escapeHTML(r.title_de)}</em> · Source: ${escapeHTML(r.source)}
      </p>
    `;
    modal.showModal();
  }

  function closeModal() {
    document.getElementById('recipe-modal').close();
  }

  /* ---------- Helpers ---------- */
  function escapeHTML(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function toTitleCase(s) {
    if (!s) return '';
    // input may be ALL CAPS - convert nicely
    return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()).replace(/\b(And|With|In|On|The|A|An|Of|To|For|Mit|Und|Auf)\b/gi, m => {
      // keep small words lowercase except first
      return m;
    });
  }

  function getOpts() {
    return {
      balanceProteins: document.getElementById('balance-proteins').checked,
      quickOnly: document.getElementById('quick-only').checked,
    };
  }

  /* ---------- Persistence ---------- */
  function saveWeek() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentWeek));
    } catch(e) {}
  }
  function loadWeek() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 7) return parsed;
    } catch(e) {}
    return null;
  }

  /* ---------- Copy / print ---------- */
  function shoppingListAsText() {
    const items = buildShoppingList(currentWeek);
    const byCat = {};
    items.forEach(it => (byCat[it.category] = byCat[it.category] || []).push(it));
    const lines = ['Shopping list — for 2 people\n'];
    DAYS.forEach((day, i) => {
      const id = currentWeek[i];
      if (id != null) {
        const r = recipeById(id);
        lines.push(`${day}: ${toTitleCase(r.title)}`);
      }
    });
    lines.push('');
    CATEGORY_ORDER.filter(c => byCat[c]).forEach(cat => {
      lines.push('— ' + cat.toUpperCase() + ' —');
      byCat[cat].sort((a,b)=>a.name.localeCompare(b.name)).forEach(it => {
        lines.push('  [ ] ' + formatQty(it) + '  ' + it.name);
      });
      lines.push('');
    });
    return lines.join('\n');
  }

  function copyShoppingList() {
    const text = shoppingListAsText();
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('copy-list-btn');
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = orig, 1600);
    }).catch(() => {
      alert('Could not copy. Here it is to copy manually:\n\n' + text.slice(0, 200) + '...');
    });
  }

  /* ---------- Init ---------- */
  function init() {
    const info = document.getElementById('library-info');
    const proteinCounts = {};
    RECIPES.forEach(r => proteinCounts[r.protein_type] = (proteinCounts[r.protein_type]||0)+1);
    const summary = Object.entries(proteinCounts).map(([k,v])=>`${v} ${k}`).join(' · ');
    info.textContent = `${RECIPES.length} recipes loaded — ${summary}`;

    document.getElementById('generate-btn').addEventListener('click', () => {
      currentWeek = pickWeek(getOpts());
      render();
    });
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('recipe-modal').addEventListener('click', e => {
      if (e.target === document.getElementById('recipe-modal')) closeModal();
    });
    document.getElementById('copy-list-btn').addEventListener('click', copyShoppingList);
    document.getElementById('print-list-btn').addEventListener('click', () => window.print());

    // restore previous week
    const saved = loadWeek();
    if (saved) {
      currentWeek = saved;
      render();
    } else {
      renderWeek();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
