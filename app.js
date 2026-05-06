/* Recipe Roulette - main app */
(function() {
  'use strict';

  const RECIPES = window.RECIPES || [];
  const SWEETS  = window.SWEETS  || []; // optional dessert library
  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const CATEGORY_ORDER = ['produce','meat & fish','dairy & eggs','pantry','baking & sweets','other'];

  /* ---------- HelloFresh spice mix decoder ----------
     Sources:
       - github.com/Schischu/hello_fresh_gewuerze (German label data)
       - spicebar.de Hello Mediterraneo / Mexico / Südseetraum bio
       - joesdaily.com & 3boysandadog.com (DIY copycats)
       - reddit.com/r/hellofresh (DIY blends)
     Each entry has:
       - components: list of plain English ingredients you can buy at the supermarket
       - copycat:    a simple proportional recipe to recreate the blend yourself
  */
  const SPICE_MIX_COMPOSITIONS = {
    'hello aloha spice mix': {
      components: ['salt', 'sugar', 'mango powder', 'turmeric', 'ground rosemary', 'cumin', 'dried basil', 'lemon zest', 'chili'],
      copycat: '2 tsp salt + 2 tsp sugar + 1 tsp mango powder + 1 tsp turmeric + 1 tsp dried rosemary + 1 tsp cumin + 1 tsp dried basil + 1 tsp lemon zest + ½ tsp chili powder'
    },
    'hello buon appetito spice mix': {
      components: ['dried tomato', 'salt', 'rosemary', 'oregano', 'basil', 'thyme', 'onion', 'chili', 'garlic', 'porcini powder'],
      copycat: '1 tbsp tomato powder + 1 tsp salt + ½ tsp each rosemary, oregano, basil, thyme + ½ tsp onion powder + ½ tsp garlic powder + pinch chili + pinch porcini powder'
    },
    'hello curry spice mix': {
      components: ['coriander', 'turmeric', 'fenugreek', 'cumin', 'nutmeg', 'paprika'],
      copycat: '2 tsp ground coriander + 2 tsp turmeric + ½ tsp fenugreek + 1 tsp cumin + ¼ tsp nutmeg + 1 tsp sweet paprika'
    },
    'hello fiesta spice mix': {
      components: ['paprika', 'cumin', 'garlic', 'allspice', 'cinnamon', 'chili', 'sea salt', 'tomato powder'],
      copycat: '2 tsp paprika + 1 tsp cumin + 1 tsp garlic powder + ¼ tsp allspice + ¼ tsp cinnamon + ½ tsp chili powder + 1 tsp salt + 1 tsp tomato powder'
    },
    'hello harissa spice mix': {
      components: ['chili', 'paprika', 'cumin', 'garlic', 'coriander', 'allspice', 'sea salt'],
      copycat: '2 tsp chili powder + 2 tsp paprika + 1 tsp cumin + 1 tsp garlic powder + 1 tsp ground coriander + ¼ tsp allspice + 1 tsp salt'
    },
    'hello mediterraneo spice mix': {
      components: ['dried tomato', 'salt', 'rosemary', 'oregano', 'basil', 'thyme', 'onion', 'chili', 'garlic', 'porcini powder'],
      copycat: '1 tbsp tomato powder + 1 tsp salt + ½ tsp each rosemary, oregano, basil, thyme + ½ tsp onion powder + ½ tsp garlic powder + pinch chili + pinch porcini powder'
    },
    'hello mexico spice mix': {
      components: ['paprika', 'cumin', 'garlic', 'allspice', 'cinnamon', 'habanero chili', 'sea salt', 'tomato powder'],
      copycat: '2 tsp sweet paprika + 1 tsp cumin + 1 tsp garlic powder + ¼ tsp allspice + ¼ tsp cinnamon + ¼ tsp chili powder + 1 tsp salt + 1 tsp tomato powder'
    },
    'hello mezze spice mix': {
      components: ['tomato powder', 'garlic powder', 'cumin', 'chili'],
      copycat: '1 tbsp tomato powder + 1 tsp garlic powder + 1 tsp cumin + ½ tsp chili powder'
    },
    'hello muskat spice mix': {
      components: ['salt', 'dried vegetables (leek, parsnip, carrot, mushroom, celery, onion, tomato)', 'nutmeg', 'turmeric', 'parsley', 'lovage', 'garlic'],
      copycat: '1 tsp vegetable stock powder + ¼ tsp nutmeg + pinch turmeric + ½ tsp dried mixed herbs (parsley & lovage)'
    },
    'hello paprika spice mix': {
      components: ['paprika', 'garlic', 'black pepper', 'onion', 'salt', 'roasted onion powder', 'tomato powder'],
      copycat: '2 tsp paprika + 1 tsp garlic powder + ¼ tsp black pepper + 1 tsp onion powder + 1 tsp salt + 1 tsp tomato powder'
    },
    'hello smoky paprika spice mix': {
      components: ['salt', 'smoked paprika', 'black pepper', 'mustard powder', 'chili', 'sugar', 'natural smoke flavor'],
      copycat: '1 tsp salt + 2 tsp smoked paprika + ¼ tsp black pepper + ¼ tsp mustard powder + pinch chili + ½ tsp sugar'
    },
    'south sea dream spice mix': {
      components: ['salt', 'cane sugar', 'mango', 'turmeric', 'rosemary', 'cumin', 'lemon zest', 'basil', 'chili', 'fennel'],
      copycat: '2 tsp salt + 2 tsp brown sugar + 1 tsp mango powder + 1 tsp turmeric + 1 tsp dried rosemary + 1 tsp cumin + 1 tsp lemon zest + 1 tsp dried basil + ½ tsp chili powder + ½ tsp fennel'
    },
  };

  function spiceMixInfo(name) {
    if (!name) return null;
    return SPICE_MIX_COMPOSITIONS[name.toLowerCase().trim()] || null;
  }

  let currentWeek = [null, null, null, null, null, null, null]; // array of recipe ids
  let currentSweet = null; // id of the sweet for the week, null if none picked

  function sweetById(id) {
    return SWEETS.find(s => s.id === id) || null;
  }

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
  function pickSweet() {
    if (!SWEETS.length) return null;
    return SWEETS[Math.floor(Math.random() * SWEETS.length)].id;
  }

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
    renderSweet();
    renderShoppingList();
    saveWeek();
    const hasAny = currentWeek.some(id => id !== null) || currentSweet != null;
    updateSavedHint(hasAny ? Date.now() : null);
  }

  function renderSweet() {
    const section = document.getElementById('sweet-section');
    const host = document.getElementById('sweet-card-host');
    if (!section || !host) return;
    // Hide entirely if there are no sweets in the library
    if (!SWEETS.length) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    const s = currentSweet != null ? sweetById(currentSweet) : null;
    host.innerHTML = '';
    if (!s) {
      const empty = document.createElement('div');
      empty.className = 'sweet-empty';
      empty.innerHTML = `<p>No sweet picked yet. <button type="button" id="pick-sweet-btn" class="link-btn">Pick one for the week</button></p>`;
      host.appendChild(empty);
      const btn = document.getElementById('pick-sweet-btn');
      if (btn) btn.addEventListener('click', () => { currentSweet = pickSweet(); render(); });
      return;
    }
    const card = document.createElement('article');
    card.className = 'sweet-card';
    card.innerHTML = `
      <div class="sweet-card-body">
        <div class="sweet-eyebrow">This week’s treat</div>
        <h3 class="sweet-title">${escapeHTML(toTitleCase(s.title))}</h3>
        <p class="sweet-subtitle">${escapeHTML(s.subtitle || '')}</p>
        <div class="sweet-meta">
          <span class="tag">${s.prep_time_min || '?'} min</span>
          ${s.difficulty ? `<span class="tag">★${s.difficulty}/5</span>` : ''}
          ${s.servings ? `<span class="tag">${s.servings} servings</span>` : ''}
        </div>
        <div class="sweet-actions">
          <button type="button" class="day-action-btn primary" id="sweet-view-btn">View recipe</button>
          <button type="button" class="day-action-btn" id="sweet-swap-btn">Pick another</button>
        </div>
      </div>
    `;
    host.appendChild(card);
    document.getElementById('sweet-view-btn').addEventListener('click', () => openSweetModal(s.id));
    document.getElementById('sweet-swap-btn').addEventListener('click', () => {
      // pick a different sweet if possible
      if (SWEETS.length > 1) {
        let next = currentSweet;
        while (next === currentSweet) next = pickSweet();
        currentSweet = next;
      } else {
        currentSweet = pickSweet();
      }
      render();
    });
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

  // Aliases to merge near-duplicate ingredient names from imperfect OCR/translation.
  // Applied AFTER prefix stripping (so 'organic sour cream' → 'sour cream' first).
  const NAME_ALIASES = {
    'red chilis': 'red chili',
    'red chilies': 'red chili',
    'chili pepper': 'red chili',
    'lemons': 'lemon',
    'limes': 'lime',
    'red onions': 'red onion',
    'spring onions': 'spring onion',
    // Tortillas / wraps — same product, just labelled differently
    'wheat tortillas': 'tortilla wrap',
    'wheat tortilla': 'tortilla wrap',
    'tortilla wraps': 'tortilla wrap',
    'tortillas': 'tortilla wrap',
    'wraps': 'tortilla wrap',
    // Yogurt variants — "creamy"/"plain" are just descriptors of the same dairy item
    'plain yogurt': 'yogurt',
    'creamy yogurt': 'yogurt',
    'yoghurt': 'yogurt',
    // Salad leaves variants
    'mixed salad leaves': 'salad leaves',
    // Brioche bun plural
    'brioche buns with sesame': 'brioche bun with sesame',
    // Chicken breast variants — different products kept separate, only plural collapses
    'chicken breasts': 'chicken breast',
    // Flour variants — "wheat flour" is just flour for shopping purposes
    'wheat flour': 'flour',
    'garlic cloves': 'garlic clove',
    'cucumbers': 'cucumber',
    'small salad cucumber': 'cucumber',
    'tomatoes': 'tomato',
    'cherry tomatoes': 'cherry tomato',
    'carrots': 'carrot',
    'potatoes': 'potato',
    'baby potatoes': 'baby potato',
    'waxy potatoes': 'waxy potato',
    'sweet potatoes': 'sweet potato',
    'mini flatbreads': 'mini flatbread',
    'mixed bell peppers': 'bell pepper',
    'beets': 'beet',
    'radishes': 'radish',
    'shallots': 'shallot',
    'pears': 'pear',
    'apples': 'apple',
    'hazelnuts': 'hazelnut',
    'pumpkin seeds': 'pumpkin seed',
    'flaked almonds': 'flaked almond',
    'black beans': 'black bean',
    'brown lentils': 'brown lentil',
    'chickpeas': 'chickpea',
    'goat cheese rounds': 'goat cheese',
    'fresh goat cheese rounds': 'goat cheese',
    // Hard / grating cheese — all the parmesan-style variants collapse to one
    'grated hard cheese': 'grated hard cheese',
    'grated hard cheese (parmesan-style)': 'grated hard cheese',
    'grated italian-style hard cheese': 'grated hard cheese',
    'italian-style hard cheese': 'grated hard cheese',
    'parmesan': 'grated hard cheese',
    'parmigiano': 'grated hard cheese',
    'grana padano': 'grated hard cheese',
    // Parsley + alternate-herb labels ("X / Y" means "either of these") collapse
    // to parsley as the common denominator since parsley is in every variant.
    'flat-leaf parsley': 'parsley',
    'flat-leaf parsley / thyme': 'parsley',
    'flat-leaf parsley / chives': 'parsley',
    'cilantro / flat-leaf parsley': 'parsley',
    'parsley / thyme': 'parsley',
    'parsley / chives': 'parsley',
    'parsley & thyme': 'parsley',
    'mint / parsley': 'parsley',
    'dill / parsley': 'parsley',
    'basil / parsley': 'parsley',
    // Chives variants
    'dill / chives': 'chives',
    // Thyme + sage variants
    'sage / thyme': 'thyme',
    'dried thyme': 'thyme',
    'dried oregano': 'oregano',
    'baking potato': 'potato',
    'diced tomatoes': 'diced tomato',
    // Oyster mushrooms (king oyster mushrooms are botanically different but used
    // similarly; keep separate). Just normalise plurals here.
    'oyster mushroom': 'oyster mushrooms',
    'king oyster mushroom': 'king oyster mushrooms',
    'white mushroom': 'white mushrooms',
    // Cashews
    'roasted cashews': 'cashews',
    // Breadcrumbs (panko is distinct enough texture-wise; leave separate)
    // Spätzle
    'egg spätzle': 'spätzle',
    // Vinegar generic
    'wine vinegar': 'vinegar',
    // Spice mixes — "hello"-less labels collapse to the canonical Hello X form
    'buon appetito spice mix': 'hello buon appetito spice mix',
    'harissa spice mix': 'hello harissa spice mix',
    'paprika spice mix': 'hello paprika spice mix',
  };

  // Strip generic adjective prefixes that don't change the underlying ingredient.
  // Keep meaningful modifiers like 'smoked', 'sweet', 'red', 'dried', etc.
  const STRIP_PREFIXES = ['organic', 'fresh', 'creamy', 'plain'];

  function normName(n) {
    let k = n.toLowerCase().trim();
    // strip leading generic adjectives (loop in case of multiple, e.g. 'fresh organic ...')
    let changed = true;
    while (changed) {
      changed = false;
      for (const p of STRIP_PREFIXES) {
        if (k.startsWith(p + ' ')) { k = k.slice(p.length + 1); changed = true; }
      }
    }
    return NAME_ALIASES[k] || k;
  }

  // Group dimensionally-compatible units so we can merge them.
  // 'spice' is a synthetic group for tbsp/tsp/pinch — added together as tsp.
  const UNIT_GROUP = {
    'g': 'mass', 'kg': 'mass',
    'ml': 'volume', 'l': 'volume',
    'tbsp': 'spice', 'tsp': 'spice', 'pinch': 'spice',
    'pc': 'count', 'bunch': 'count', 'pack': 'count',
  };
  // Convert qty into the canonical unit for its group (g, ml, tsp, pc).
  function toCanonical(qty, unit) {
    if (qty == null) return null;
    if (unit === 'kg') return qty * 1000;
    if (unit === 'l') return qty * 1000;
    if (unit === 'tbsp') return qty * 3;   // 1 tbsp = 3 tsp
    if (unit === 'pinch') return qty / 8;  // ~8 pinches = 1 tsp
    return qty;
  }
  function canonUnit(unit) {
    const g = UNIT_GROUP[unit];
    if (g === 'mass') return 'g';
    if (g === 'volume') return 'ml';
    if (g === 'spice') return 'tsp';
    if (g === 'count') return unit; // keep pc/bunch/pack distinct labels
    return unit;
  }

  function buildShoppingList(weekIds, sweetId) {
    // First pass: bucket by (name|unit). Then second pass: collapse buckets with
    // dimensionally-compatible units onto a single shopping-list row that lists
    // every quantity together so the user sees, e.g. "250 g + 2 pcs sour cream".
    const buckets = new Map(); // key name|unit → { name, unit, qty, category, recipeCount }
    function addIngredients(ings, defaultCategory) {
      (ings || []).forEach(ing => {
        const rawName = (ing.name || '').trim();
        if (!rawName) return;
        const name = normName(rawName);
        const unit = normUnit(ing.unit);
        const qty = parseQty(ing.quantity);
        const key = name + '|' + unit;
        const existing = buckets.get(key);
        if (existing) {
          if (qty != null && existing.qty != null) existing.qty += qty;
          else if (qty != null && existing.qty == null) existing.qty = qty;
          existing.recipeCount += 1;
        } else {
          buckets.set(key, { name, unit, qty, category: ing.category || defaultCategory || 'other', recipeCount: 1 });
        }
      });
    }
    weekIds.filter(id => id !== null).forEach(id => {
      const r = recipeById(id);
      if (r) addIngredients(r.ingredients, 'other');
    });
    // Sweet ingredients fold into the same shopping list under category 'baking & sweets'
    if (sweetId != null) {
      const s = sweetById(sweetId);
      if (s) addIngredients(s.ingredients, 'baking & sweets');
    }

    // Second pass: group by name. Within a name, collect all unit→qty pairs.
    // Dimensionally compatible units (mass/volume/spice) get merged in canonical units;
    // 'count' units stay as-is so users still see "2 pcs".
    const byName = new Map(); // name → { name, category, recipeCount, parts: [{label, qty (canon), unit (canon)}] }
    for (const b of buckets.values()) {
      if (!byName.has(b.name)) byName.set(b.name, { name: b.name, category: b.category, recipeCount: 0, parts: [] });
      const entry = byName.get(b.name);
      entry.recipeCount += b.recipeCount;
      entry.parts.push({ qty: toCanonical(b.qty, b.unit), unit: canonUnit(b.unit) });
    }

    // Collapse parts: same canonical unit → sum.
    const items = [];
    for (const entry of byName.values()) {
      const merged = new Map();
      for (const p of entry.parts) {
        const k = p.unit || '';
        if (!merged.has(k)) merged.set(k, { qty: null, unit: p.unit });
        const m = merged.get(k);
        if (p.qty != null) m.qty = (m.qty || 0) + p.qty;
      }
      items.push({
        name: entry.name,
        category: entry.category,
        recipeCount: entry.recipeCount,
        parts: Array.from(merged.values()),
      });
    }
    return items;
  }

  function formatPart(qty, unit, name) {
    if (qty == null) return unit ? '— ' + unit : '—';
    let q = qty;
    if (Math.abs(q) < 1) q = Math.round(q * 100) / 100;
    else if (Math.abs(q) < 10) q = Math.round(q * 10) / 10;
    else q = Math.round(q);
    let unitLabel = unit || '';
    // For countable produce/items the unit 'pc' is redundant if the name
    // already reads as a countable noun (garlic clove, onion, lemon, etc.).
    // We just show the number and let the name carry the meaning, with simple
    // English pluralisation handled in the name display below.
    if (unit === 'pc') unitLabel = '';
    return q + (unitLabel ? ' ' + unitLabel : '');
  }

  // Naive English pluralisation for countable produce names. Only applies when
  // the shopping-list quantity is a whole number > 1 in 'pc' units.
  function pluraliseName(name, totalPcs) {
    if (totalPcs == null || totalPcs <= 1) return name;
    // Already plural
    if (/s$/i.test(name) && !/(ss|us|is)$/i.test(name)) return name;
    // Special cases
    const specials = {
      'garlic clove': 'garlic cloves',
      'tomato': 'tomatoes',
      'potato': 'potatoes',
      'sweet potato': 'sweet potatoes',
      'baking potato': 'baking potatoes',
      'waxy potato': 'waxy potatoes',
      'baby potato': 'baby potatoes',
      'tortilla wrap': 'tortilla wraps',
      'brioche bun with sesame': 'brioche buns with sesame',
      'mini flatbread': 'mini flatbreads',
      'cherry tomato': 'cherry tomatoes',
    };
    const key = name.toLowerCase();
    if (specials[key]) return specials[key];
    // Default: add 's'
    return name + 's';
  }

  function formatQty(item) {
    // item now has parts: [{qty, unit}]. Show all parts joined by '+' so users can
    // see e.g. "250 g + 2 sour cream".
    if (!item.parts || !item.parts.length) return '—';
    return item.parts.map(p => formatPart(p.qty, p.unit, item.name)).join(' + ');
  }

  // Total countable pieces for this item (used to decide pluralisation of the name)
  function totalPcs(item) {
    if (!item.parts) return null;
    let total = 0;
    let hasPc = false;
    item.parts.forEach(p => {
      if (p.unit === 'pc' && p.qty != null) { total += p.qty; hasPc = true; }
    });
    return hasPc ? total : null;
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

    const items = buildShoppingList(currentWeek, currentSweet);
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
        const note = item.recipeCount > 1 ? ` <small style="color:var(--ink-muted)">(in ${item.recipeCount} recipes)</small>` : '';
        // Spice-mix rows get a small breakdown line beneath so the user knows what to actually buy.
        const mix = spiceMixInfo(item.name);
        const mixLine = mix ? `<div class="shop-spice-breakdown">→ made of: ${mix.components.map(c=>escapeHTML(c)).join(', ')}</div>` : '';
        const displayName = pluraliseName(item.name, totalPcs(item));
        text.innerHTML = `<span class="shop-qty">${formatQty(item)}</span> <span class="shop-name">${escapeHTML(displayName)}</span>${note}${mixLine}`;
        label.appendChild(cb);
        label.appendChild(text);
        block.appendChild(label);
      });
      container.appendChild(block);
    });

    // Append a dedicated spice-mix reference card so the user can see all the
    // copycat blends in one place (these aren't sold in supermarkets).
    const usedMixes = new Set();
    items.forEach(it => { if (spiceMixInfo(it.name)) usedMixes.add(it.name); });
    if (usedMixes.size > 0) {
      const mixBlock = document.createElement('div');
      mixBlock.className = 'shop-category shop-spice-reference';
      const h = document.createElement('h3');
      h.textContent = 'HelloFresh spice mixes — build your own';
      mixBlock.appendChild(h);
      const intro = document.createElement('p');
      intro.className = 'shop-spice-intro';
      intro.textContent = 'These mixes aren’t sold in supermarkets. Either skip them and use the components from your pantry, or pre-mix the copycat blend below.';
      mixBlock.appendChild(intro);
      Array.from(usedMixes).sort().forEach(name => {
        const mix = spiceMixInfo(name);
        const card = document.createElement('div');
        card.className = 'spice-card';
        card.innerHTML = `
          <div class="spice-card-name">${escapeHTML(name)}</div>
          <div class="spice-card-components"><strong>Made of:</strong> ${mix.components.map(c=>escapeHTML(c)).join(', ')}</div>
          <div class="spice-card-copycat"><strong>Copycat blend:</strong> ${escapeHTML(mix.copycat)}</div>
        `;
        mixBlock.appendChild(card);
      });
      container.appendChild(mixBlock);
    }
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
      // If this is a HelloFresh spice mix, expose the component breakdown so the
      // user can buy individual supermarket spices instead of the proprietary mix.
      const mix = spiceMixInfo(ing.name);
      const mixHTML = mix ? `
        <div class="spice-breakdown">
          <div class="spice-breakdown-label">= ${mix.components.map(c => escapeHTML(c)).join(', ')}</div>
          <div class="spice-breakdown-copycat"><strong>Copycat blend:</strong> ${escapeHTML(mix.copycat)}</div>
        </div>` : '';
      return `
      <li${mix ? ' class="ing-with-breakdown"' : ''}>
        <div class="ing-row">
          <span class="ing-name">${escapeHTML(ing.name)}</span>
          <span class="ing-qty">${escapeHTML(ing.quantity)} ${escapeHTML(unitDisplay)}</span>
        </div>
        ${mixHTML}
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

  function openSweetModal(id) {
    const s = sweetById(id);
    if (!s) return;
    const modal = document.getElementById('recipe-modal');
    const content = document.getElementById('modal-content');

    const ingredientsHTML = (s.ingredients || []).map(ing => {
      const u = normUnit(ing.unit);
      let unitDisplay = u;
      if (u === 'pc') unitDisplay = parseQty(ing.quantity) === 1 ? 'pc' : 'pcs';
      if (!u) unitDisplay = '';
      return `
      <li>
        <div class="ing-row">
          <span class="ing-name">${escapeHTML(ing.name)}</span>
          <span class="ing-qty">${escapeHTML(ing.quantity || '')} ${escapeHTML(unitDisplay)}</span>
        </div>
      </li>`;
    }).join('');
    const stepsHTML = (s.steps || []).map(st => `<li>${escapeHTML(st)}</li>`).join('');

    content.innerHTML = `
      <h2 id="modal-title" class="modal-title">${escapeHTML(toTitleCase(s.title))}</h2>
      <p class="modal-subtitle">${escapeHTML(s.subtitle || '')}</p>
      <div class="modal-meta">
        <span class="tag tag-sweet">sweet</span>
        ${s.prep_time_min ? `<span class="tag">${s.prep_time_min} min</span>` : ''}
        ${s.difficulty ? `<span class="tag">Difficulty ★${s.difficulty}/5</span>` : ''}
        ${s.servings ? `<span class="tag">${s.servings} servings</span>` : ''}
      </div>
      <h3 class="modal-section-title">Ingredients</h3>
      <ul class="modal-ingredients">${ingredientsHTML}</ul>
      <h3 class="modal-section-title">Steps</h3>
      <ol class="modal-steps">${stepsHTML}</ol>
      ${s.source ? `<p style="margin-top:24px;font-size:12px;color:var(--ink-muted);">Source: ${escapeHTML(s.source)}</p>` : ''}
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
    // Defaults baked in: always balance proteins, no time filter.
    return { balanceProteins: true, quickOnly: false };
  }

  /* ---------- Persistence ----------
     Stores the current week + timestamp in localStorage so the plan survives
     page navigation/reloads. Wrapped in try/catch because some embed contexts
     (sandboxed iframes, private mode) block storage — in that case we silently
     fall back to in-memory only.
  */
  const STORAGE_KEY = 'recipeRoulette.currentWeek.v1';

  function safeStorage() {
    try {
      const t = '__rr_test__';
      window.localStorage.setItem(t, '1');
      window.localStorage.removeItem(t);
      return window.localStorage;
    } catch (e) {
      return null;
    }
  }

  function saveWeek() {
    const store = safeStorage();
    if (!store) return;
    try {
      const hasAny = currentWeek.some(id => id !== null) || currentSweet != null;
      if (!hasAny) {
        store.removeItem(STORAGE_KEY);
        return;
      }
      store.setItem(STORAGE_KEY, JSON.stringify({
        week: currentWeek,
        sweet: currentSweet,
        savedAt: Date.now(),
      }));
    } catch (e) { /* quota or other error — ignore */ }
  }

  function loadWeek() {
    const store = safeStorage();
    if (!store) return null;
    try {
      const raw = store.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.week) || data.week.length !== 7) return null;
      // validate every id still exists in the recipe library
      const valid = data.week.every(id => id === null || recipeById(id) != null);
      if (!valid) return null;
      // Validate sweet id (if present — may be null/undefined for old saves or empty library)
      if (data.sweet != null && sweetById(data.sweet) == null) data.sweet = null;
      return data;
    } catch (e) { return null; }
  }

  function clearWeek() {
    const store = safeStorage();
    if (store) { try { store.removeItem(STORAGE_KEY); } catch (e) {} }
    currentWeek = [null, null, null, null, null, null, null];
    currentSweet = null;
    render();
    updateSavedHint(null);
  }

  function formatSavedDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    if (sameDay) return 'today at ' + time;
    const diffDays = Math.round((today - d) / 86400000);
    if (diffDays === 1) return 'yesterday at ' + time;
    if (diffDays < 7) return diffDays + ' days ago';
    return d.toLocaleDateString();
  }

  function updateSavedHint(savedAt) {
    const el = document.getElementById('saved-hint');
    if (!el) return;
    if (savedAt) {
      el.hidden = false;
      el.innerHTML = `· Saved ${formatSavedDate(savedAt)} <button type="button" id="clear-week-btn" class="link-btn">Clear week</button>`;
      const btn = document.getElementById('clear-week-btn');
      if (btn) btn.addEventListener('click', clearWeek);
    } else {
      el.hidden = true;
      el.textContent = '';
    }
  }

  /* ---------- Copy / print ---------- */
  function shoppingListAsText() {
    const items = buildShoppingList(currentWeek, currentSweet);
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
    if (currentSweet != null) {
      const s = sweetById(currentSweet);
      if (s) lines.push(`Sweet of the week: ${toTitleCase(s.title)}`);
    }
    lines.push('');
    CATEGORY_ORDER.filter(c => byCat[c]).forEach(cat => {
      lines.push('— ' + cat.toUpperCase() + ' —');
      byCat[cat].sort((a,b)=>a.name.localeCompare(b.name)).forEach(it => {
        const mix = spiceMixInfo(it.name);
        lines.push('  [ ] ' + formatQty(it) + '  ' + it.name);
        if (mix) lines.push('         → made of: ' + mix.components.join(', '));
      });
      lines.push('');
    });
    // Spice mix copycat reference
    const usedMixes = new Set();
    items.forEach(it => { if (spiceMixInfo(it.name)) usedMixes.add(it.name); });
    if (usedMixes.size) {
      lines.push('— HELLOFRESH SPICE MIXES (build your own) —');
      Array.from(usedMixes).sort().forEach(name => {
        const mix = spiceMixInfo(name);
        lines.push(name + ':');
        lines.push('  Made of: ' + mix.components.join(', '));
        lines.push('  Copycat: ' + mix.copycat);
        lines.push('');
      });
    }
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
    const sweetSummary = SWEETS.length ? ` · ${SWEETS.length} sweets` : '';
    info.textContent = `${RECIPES.length} recipes loaded — ${summary}${sweetSummary}`;

    document.getElementById('generate-btn').addEventListener('click', () => {
      currentWeek = pickWeek(getOpts());
      // also pick a sweet if any are available; user can still swap or clear it
      if (SWEETS.length) currentSweet = pickSweet();
      render();
    });
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('recipe-modal').addEventListener('click', e => {
      if (e.target === document.getElementById('recipe-modal')) closeModal();
    });
    document.getElementById('copy-list-btn').addEventListener('click', copyShoppingList);
    document.getElementById('print-list-btn').addEventListener('click', () => window.print());

    // Restore saved week from localStorage if available
    const saved = loadWeek();
    if (saved) {
      currentWeek = saved.week;
      currentSweet = saved.sweet != null ? saved.sweet : null;
      renderWeek();
      renderSweet();
      renderShoppingList();
      updateSavedHint(saved.savedAt);
    } else {
      renderWeek();
      renderSweet();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
