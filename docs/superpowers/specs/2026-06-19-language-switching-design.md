# Language Switching Feature — Design

## Problem
The app is fully in Arabic. User wants a toggle to switch between Arabic and English for all static UI text, while preserving user-created content (habit names, task names, etc.).

## Scope
Only `src/index.html` (worktree version) — the main UI file. Other files (`habits.html`, `mobile/`, docs) are out of scope.

## Design

### 1. Translation System
- A `window.__lang` variable stores current language (`'ar'` or `'en'`)
- A `window.__translations` object maps keys to `{ ar: '...', en: '...' }` pairs
- A `window.__t(key)` function looks up the translation for the current language
- All static Arabic strings in the JS are replaced with `__t('key')` calls

### 2. Strings to Translate
All strings from Group 1 in the scope analysis (~25 strings + 7 day names).

Day names are stored as two arrays:
```js
var dayNamesAr = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
var dayNamesEn = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
```
Selected based on `window.__lang`.

### 3. RTL/LTR Handling
- `dir` attribute on containers switches between `"rtl"` and `"ltr"`
- `text-right`/`text-left` classes switch accordingly
- Font-family switches between Tajawal (Arabic) and system sans-serif (English)

### 4. Persistence
- Language choice saved via `window.db.setSetting('appLang', 'ar'|'en')`
- Loaded at startup via `window.db.getSetting('appLang')`
- Default is `'ar'`

### 5. Settings UI: General Tab
- New tab "General" added to settings popup, next to "Developer" tab
- Contains a language selector: label + rectangle button showing current language
- Clicking the rectangle toggles between Arabic/English
- On toggle: saves to DB, updates `window.__lang`, re-renders affected parts of the page

### 6. What DOES NOT Change
- User-created habit names (from `window.db.getHabits()`)
- User-created task names in sessions
- Default sample habit names (these are seed data, not static UI)
- Comments in JS/CSS files
- Old HTML files outside the worktree

### 7. What Re-renders on Language Change
- Habits table (call `render()`)
- Settings popup (re-open to reflect new language)
- Modal content (re-built when opened)
- Day labels in table headers
- Week labels ("الأسبوع 1" ↔ "Week 1")
