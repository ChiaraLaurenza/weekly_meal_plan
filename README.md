# Recipe Roulette — Weekly Meal Plan

A self-hosted weekly meal randomizer built from scanned HelloFresh recipe books.
One main meal per day, balanced proteins, auto-generated shopping list for two,
HelloFresh spice mix decoder, and an optional "sweet of the week" treat.

---

## How to use the app

1. Open `index.html` in a modern browser (or run a tiny local server — see below).
2. Click **Generate this week** — 7 random recipes (and one optional sweet) appear.
3. Click any day to **swap** that recipe for another.
4. Click **View recipe** to read the full ingredient list and cooking steps.
5. Scroll down to the **Shopping list** for a 2-person grocery list, sorted by aisle.
6. Click **Copy as text** or **Print** to take it shopping.

The chosen week is saved automatically in your browser (localStorage). Close the tab,
come back later in the week, and it's still there. Click **Clear week** in the header
hint to reset, or just press **Generate this week** again to roll a new plan.

### Running locally

The simplest method:

```bash
cd path/to/meal_planner
python3 -m http.server 8000
# then open http://localhost:8000 in your browser
```

You can also double-click `index.html`, but localStorage may behave inconsistently
on the `file://` protocol depending on the browser.

---

## File structure

```
meal_planner/
├── index.html       # Main page
├── styles.css       # All styles (warm cream/rust palette, Fraunces+Inter)
├── app.js           # All logic: week picker, shopping list, modals, persistence
├── recipes.json     # The 64 main-meal recipes (source of truth)
├── recipes.js       # Bundled JS export of recipes.json (do not edit by hand)
├── sweets.json      # The dessert library (currently empty — add to it!)
├── sweets.js        # Bundled JS export of sweets.json (do not edit by hand)
├── assets/          # Static assets (icons etc.)
└── README.md        # This file
```

`recipes.json` and `sweets.json` are the two data sources. After editing either,
you must regenerate the matching `.js` bundle (see below).

---

## Adding new recipes (savory mains)

Each recipe is a JSON object. Append new recipes to the array in `recipes.json`,
then regenerate `recipes.js` (one line of Python).

### Recipe schema

```json
{
  "id": 65,
  "title": "Chicken with chili noodles",
  "title_de": "Hähnchen mit Chili-Nudeln",
  "subtitle": "with bok choy and peanuts",
  "protein_type": "chicken",
  "prep_time_min": 30,
  "difficulty": 2,
  "source": "PDF8 page 12",
  "ingredients": [
    { "name": "chicken breast", "quantity": "300", "unit": "g", "category": "meat & fish" },
    { "name": "chili noodles",  "quantity": "250", "unit": "g", "category": "pantry" }
  ],
  "steps": [
    "Boil 1 L water and cook noodles per package directions.",
    "Slice chicken, pan-fry with garlic and chili."
  ]
}
```

**Required fields:**

- `id` — must be unique. Pick the next integer after the highest existing id.
- `title` — English imperative-style name.
- `protein_type` — one of: `chicken`, `fish`, `seafood`, `vegetarian`, `vegan`,
  `pork`, `beef`, `other_meat`. Avoid red meat unless you want it included.
- `ingredients` — for **2 servings** (matches HelloFresh "2P" column).
  - `unit` accepts: `g`, `kg`, `ml`, `l`, `tbsp` (or `EL`), `tsp` (or `TL`), `pc`
    (or `Stück`), `bunch`, `pack`, `pinch`. Other units pass through unchanged.
  - `category` should be one of: `produce`, `meat & fish`, `dairy & eggs`,
    `pantry`, `baking & sweets`, `other`. The shopping list groups by these.
- `steps` — array of imperative-mood instructions (English).

**Optional fields:**

- `title_de` — original German title (shown in the modal footer).
- `subtitle` — short tagline.
- `prep_time_min` — integer minutes.
- `difficulty` — 1–5.
- `source` — free text noting which PDF/page/cookbook it came from.

---

## Adding sweets / desserts

Same schema, lives in `sweets.json`. Difference: `protein_type` is irrelevant
(omit it). Add a `servings` field to indicate how many portions one bake yields
(useful for "one cake to last the week").

```json
{
  "id": 1,
  "title": "Apple cinnamon banana bread",
  "subtitle": "moist loaf, 8 slices",
  "prep_time_min": 60,
  "difficulty": 2,
  "servings": 8,
  "ingredients": [
    { "name": "ripe banana",       "quantity": "3",   "unit": "pc", "category": "produce" },
    { "name": "wheat flour",       "quantity": "250", "unit": "g",  "category": "baking & sweets" },
    { "name": "brown sugar",       "quantity": "150", "unit": "g",  "category": "baking & sweets" },
    { "name": "egg",               "quantity": "2",   "unit": "pc", "category": "dairy & eggs" },
    { "name": "butter",            "quantity": "100", "unit": "g",  "category": "dairy & eggs" },
    { "name": "ground cinnamon",   "quantity": "2",   "unit": "tsp","category": "pantry" }
  ],
  "steps": [
    "Preheat oven to 175 °C.",
    "Mash bananas, mix with sugar, butter, eggs.",
    "Fold in flour and cinnamon, pour into a loaf tin, bake 50 min."
  ]
}
```

The app will:

- Show a "Sweet of the week" card under the daily meal grid.
- Pick one sweet at random whenever you click **Generate this week**.
- Add the sweet's ingredients to the shopping list (in a new
  "baking & sweets" group). Quantities sum into the same merging logic as
  meal ingredients, so eggs from a meal and eggs from the sweet collapse onto
  one line.
- Let you swap the sweet independently with **Pick another**.

---

## Regenerating the JS bundles after edits

Whenever you edit `recipes.json` or `sweets.json`, regenerate the matching `.js`
bundle so the browser picks up the changes:

```bash
cd meal_planner
python3 - <<'PY'
import json
data = json.load(open('recipes.json'))
open('recipes.js','w').write('window.RECIPES = ' + json.dumps(data, ensure_ascii=False) + ';')
data = json.load(open('sweets.json'))
open('sweets.js','w').write('window.SWEETS = ' + json.dumps(data, ensure_ascii=False) + ';')
print('OK', len(json.load(open('recipes.json'))), 'recipes,', len(json.load(open('sweets.json'))), 'sweets')
PY
```

Reload your browser and the new recipes/sweets appear.

---

## Adding more scanned recipe books in the future

The original 64 recipes were extracted from 5 scanned PDFs through a multi-step
pipeline:

1. **OCR** the PDF page-by-page to capture the German text.
2. **Translate** ingredients and steps to English (HelloFresh-style imperative).
3. **Categorize** ingredients into produce / meat & fish / dairy & eggs / pantry.
4. **Filter** unwanted protein types (e.g. red meat).
5. **Append** to `recipes.json`, bump ids, regenerate `recipes.js`.

When you have new scans, the cleanest path is to ask Computer to repeat the
pipeline for those PDFs, producing JSON snippets you can append. Or, if you
prefer the manual route: type up each recipe by hand following the schema above.

---

## Spice mix decoder

The app understands all 12 HelloFresh proprietary spice mixes used in the
recipe set (Hello Aloha, Buon Appetito, Curry, Fiesta, Harissa, Mediterraneo,
Mexico, Mezze, Muskat, Paprika, Smoky Paprika, South Sea Dream).

In each recipe modal, spice-mix ingredients show their component breakdown
plus a copycat blend recipe. The shopping list also includes a "build your
own" reference card listing the components for every mix used that week.

To add another mix in the future, edit the `SPICE_MIX_COMPOSITIONS` object at
the top of `app.js` and provide a `components` list and a `copycat` string.

---

## Customizing

- **Color palette** — edit the CSS variables at the top of `styles.css`
  (`--accent`, `--bg`, `--ink`, etc.).
- **Number of recipes per week** — currently fixed at 7 (one per day). The
  `pickWeek()` function in `app.js` controls this.
- **Servings** — recipe quantities are for 2 people. To scale, adjust your
  shopping list output manually or add a multiplier in `formatPart()`.
- **Avoiding ingredients** — to filter out an ingredient or protein type,
  add a check inside `pickWeek()` in `app.js`.

---

## Credits

Built with vanilla HTML/CSS/JavaScript — no frameworks, no build step.
Recipes scanned from your personal HelloFresh recipe collection. Spice mix
data sourced from
[github.com/Schischu/hello_fresh_gewuerze](https://github.com/Schischu/hello_fresh_gewuerze),
[spicebar.de](https://www.spicebar.de/), and
[joesdaily.com](https://joesdaily.com/food-drink/hellofresh-spice-blends-how-to-make-them/).
