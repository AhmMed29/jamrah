# Language Switching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a language toggle (Arabic/English) in a new "General" settings tab that switches all static UI text and RTL/LTR direction.

**Architecture:** A translation object `__tr` maps keys to `{ar, en}` pairs. A `__t(key)` function looks up current language. `window.__lang` stores state. Persisted via `window.db.setSetting('appLang')`. All static Arabic strings in inline JS are replaced with `__t('key')` calls.

**Tech Stack:** Vanilla JS (single inline script in `src/index.html`), Electron IPC for persistence.

**Files modified:** `src/index.html` only.

---

### Task 1: Add translation infrastructure

**File:** `src/index.html` (script section, after line ~189 `dayNames`)

- [ ] **Step 1: Add `__lang`, `__tr`, `__t` and `dayNames` arrays right after `dayNames`**

Insert after line 189 `const dayNames = [...]`:
```js
var __lang = window.db.getSetting('appLang') || 'ar';
var __tr = {
  habitsTable: { ar: 'جدول العادات', en: 'Habits Table' },
  addHabit:     { ar: 'إضافة عادة', en: 'Add Habit' },
  addNewHabit:  { ar: 'إضافة عادة جديدة', en: 'Add New Habit' },
  habitName:    { ar: 'اسم العادة', en: 'Habit Name' },
  placeholder:  { ar: 'مثال: أذكار الصباح', en: 'Example: Morning Athkar' },
  color:        { ar: 'اللون', en: 'Color' },
  trackType:    { ar: 'نوع المتابعة', en: 'Tracking Type' },
  yesNo:        { ar: 'متابعة بنعم/لا', en: 'Yes/No Tracking' },
  countTrack:   { ar: 'عدد (عدّاد)', en: 'Count (Counter)' },
  saveHabit:    { ar: 'حفظ العادة', en: 'Save Habit' },
  cancel:       { ar: 'إلغاء', en: 'Cancel' },
  totalDays:    { ar: 'إجمالي الأيام', en: 'Total Days' },
  completed:    { ar: 'تم الإنجاز', en: 'Completed' },
  longestStreak:{ ar: 'أطول سلسلة', en: 'Longest Streak' },
  editHabit:    { ar: 'تعديل العادة', en: 'Edit Habit' },
  delete:       { ar: 'حذف', en: 'Delete' },
  saveLocation: { ar: 'مكان الحفظ', en: 'Save Location' },
  currentPath:  { ar: 'المسار الحالي', en: 'Current Path' },
  change:       { ar: 'تغيير', en: 'Change' },
  addedSuccess: { ar: 'تم إضافة', en: 'Added' },
  week:         { ar: 'الأسبوع', en: 'Week' },
  general:      { ar: 'عام', en: 'General' },
  language:     { ar: 'اللغة', en: 'Language' },
  arabic:       { ar: 'العربية', en: 'Arabic' },
  english:      { ar: 'الإنجليزية', en: 'English' },
  habitAddedAlert: { ar: 'تم إضافة "', en: 'Habit "' },
  habitAddedSuccess: { ar: '" بنجاح 🎉', en: '" added successfully 🎉' },
};
var dayNamesAr = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
var dayNamesEn = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function __t(k) { var e = __tr[k]; return e ? (e[__lang] || k) : k; }
```

---

### Task 2: Replace dayNames with language-aware version

**File:** `src/index.html` (line 189)

- [ ] **Step 1: Change the hardcoded dayNames to use language**

Replace line 189:
```js
const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
```
with:
```js
const dayNames = __lang === 'ar' ? dayNamesAr : dayNamesEn;
```

---

### Task 3: Replace Arabic static strings with `__t()` calls in render function

**File:** `src/index.html` (render function, lines ~288, ~308, ~328)

- [ ] **Step 1: Replace modal template strings (line ~288 area)**

In the `openModal` function, replace these Arabic strings in the modal content:
- `إجمالي الأيام` → `__t('totalDays')`
- `تم الإنجاز` → `__t('completed')`
- `أطول سلسلة` → `__t('longestStreak')`
- `تعديل العادة` → `__t('editHabit')`
- `حذف` → `__t('delete')`

- [ ] **Step 2: Replace add-modal template strings**

In the `openAddModal` function (around line 308), replace:
- `إضافة عادة جديدة` → `__t('addNewHabit')`
- `اسم العادة` → `__t('habitName')`
- `مثال: أذكار الصباح` → `__t('placeholder')`
- `اللون` → `__t('color')`
- `نوع المتابعة` → `__t('trackType')`
- `متابعة بنعم/لا` → `__t('yesNo')`
- `عدد (عدّاد)` → `__t('countTrack')`
- `حفظ العادة` → `__t('saveHabit')`
- `إلغاء` → `__t('cancel')`

- [ ] **Step 3: Replace alert text**

Replace line ~328:
```js
alert('تم إضافة "' + name + '" بنجاح 🎉');
```
with:
```js
alert(__t('habitAddedAlert') + name + __t('habitAddedSuccess'));
```

- [ ] **Step 4: Replace page title and button text**

In the HTML (static parts before the script), replace:
- Line 146: `<h1>جدول العادات</h1>` — this is hardcoded HTML, need to make it dynamic. Add id="habits-page-title" and set in script.
- Line 163: `<span>إضافة عادة</span>` — add id="add-habit-label" and set in script.

After the translation infrastructure, add:
```js
document.title = __t('habitsTable');
document.getElementById('habits-page-title').textContent = __t('habitsTable');
document.getElementById('add-habit-label').textContent = __t('addHabit');
```

Add `id="habits-page-title"` to the `<h1>` tag and `id="add-habit-label"` to the `<span>` tag.

- [ ] **Step 5: Replace week labels in render function**

In `render()`, line ~306, replace the week label:
```js
h += '<th class="week-label...>' + __t('week') + ' ' + (g.num + 1) + '</th>';
```

---

### Task 4: Add RTL/LTR switching

**File:** `src/index.html`

- [ ] **Step 1: Add a `setDir()` function**

After the `__t` function, add:
```js
function applyLang() {
  var isAr = __lang === 'ar';
  document.documentElement.dir = isAr ? 'rtl' : 'ltr';
  document.documentElement.lang = isAr ? 'ar' : 'en';
  document.getElementById('page-habits').dir = isAr ? 'rtl' : 'ltr';
  // Update any RTL-dependent CSS classes in rendered content
}
```

- [ ] **Step 2: Change `text-right` to dynamic in render function**

In the `render()` function (the sticky-col th), change `text-right` to:
```js
b += '<th class="sticky-col py-4 px-6 ' + (__lang === 'ar' ? 'text-right' : 'text-left') + ' font-normal ...';
```

- [ ] **Step 3: Apply language on load**

After `applyLang()` definition, call it:
```js
applyLang();
```

---

### Task 5: Add General tab to settings UI

**File:** `src/index.html` (settings HTML, ~lines 585-656) and `src/js/theme.js`

- [ ] **Step 1: Add "General" tab button in settings sidebar**

After the "Appearance" tab button (before "Developer"), add:
```html
<button class="settings-tab" data-tab="general" onclick="switchSettingsTab('general')">
  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
  <span class="tab-label">__t('general')</span>
</button>
```

- [ ] **Step 2: Add General tab panel**

After the Data panel (`#settings-data`), add:
```html
<div id="settings-general" class="settings-panel hidden">
  <div class="bg-gray-50 rounded-xl p-5">
    <h4 class="text-sm font-medium text-gray-800 mb-4">__t('general')</h4>
    <div class="flex items-center justify-between">
      <div>
        <div class="text-sm text-gray-700">__t('language')</div>
        <div class="text-xs text-gray-400 mt-0.5">__t('arabic') / __t('english')</div>
      </div>
      <div id="langToggle" class="flex items-center gap-3 cursor-pointer select-none" onclick="toggleLang()">
        <span id="langLabel" class="text-sm font-medium" style="color:#3b82f6">__t('arabic')</span>
        <div class="w-[52px] h-[28px] rounded-full relative transition-all" id="langSwitchTrack" style="background-color:#3b82f6">
          <div class="absolute top-[3px] left-[3px] w-[22px] h-[22px] rounded-full bg-white shadow-sm transition-all" id="langSwitchKnob"></div>
        </div>
        <span id="langLabelEn" class="text-sm font-medium text-gray-400">__t('english')</span>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Add `toggleLang()` function**

After `applyLang()`, add:
```js
function toggleLang() {
  __lang = __lang === 'ar' ? 'en' : 'ar';
  window.db.setSetting('appLang', __lang);
  applyLang();
  dayNames = __lang === 'ar' ? dayNamesAr : dayNamesEn;
  calcHabitsDates();
  render();
  // Update settings UI
  document.getElementById('langLabel').textContent = __t('arabic');
  document.getElementById('langLabelEn').textContent = __t('english');
  var track = document.getElementById('langSwitchTrack');
  var knob = document.getElementById('langSwitchKnob');
  if (__lang === 'en') {
    track.style.backgroundColor = '#3b82f6';
    knob.style.left = '27px';
  } else {
    track.style.backgroundColor = '#3b82f6';
    knob.style.left = '3px';
  }
  // Update dynamic text in settings
  document.querySelectorAll('.settings-tab .tab-label').forEach(function(el) {
    var tab = el.closest('[data-tab]');
    if (tab) {
      var key = tab.dataset.tab === 'general' ? 'general' : tab.dataset.tab;
      el.textContent = __t(key === 'general' ? 'general' : key === 'developer' ? 'developer' : key);
    }
  });
  // Re-open settings to refresh content
  var sp = document.getElementById('settings-data');
  if (sp) {
    sp.querySelector('h4').textContent = __t('saveLocation');
    sp.querySelector('.text-xs.text-gray-500').textContent = __t('currentPath');
    sp.querySelector('button').textContent = __t('change');
  }
  // Update the habits page title and button
  document.getElementById('habits-page-title').textContent = __t('habitsTable');
  document.getElementById('add-habit-label').textContent = __t('addHabit');
}
```

---

### Task 6: Rebuild settings content generation for i18n

**File:** `src/index.html` (settings HTML)

- [ ] **Step 1: Add IDs to settings elements for runtime translation**

Add `id` attributes to:
- Storage Location section title `<h4>` → `id="settings-storage-title"`
- Current path text `<span>` → `id="settings-current-path-label"` 
- Change button `<button>` → keep `onclick="selectStoragePath()"` but use `__t()` for text
- Tab labels: ensure they have translatable content

Actually, a cleaner approach: replace static text in settings HTML with `__t()` calls via JS on open.

- [ ] **Step 2: Update `openSettings()` in theme.js**

Replace `openSettings()`:
```js
function openSettings() {
  var popup = document.getElementById('settingsPopup');
  if (popup) popup.classList.add('open');
  var spd = document.getElementById('storagePathDisplay');
  if (spd && typeof STORAGE !== 'undefined' && STORAGE.getPath) spd.textContent = STORAGE.getPath();
  var dow = document.getElementById('firstDayOfWeek');
  if (dow) {
    var saved = window.db.getSetting('firstDayOfWeek');
    if (saved !== null) dow.value = saved;
  }
  // Apply i18n to settings labels
  document.querySelectorAll('.settings-tab .tab-label').forEach(function(el) {
    var tab = el.closest('[data-tab]');
    if (tab) {
      var key = tab.dataset.tab;
      el.textContent = __t(key);
    }
  });
  document.getElementById('settings-storage-title').textContent = __t('saveLocation');
  document.getElementById('settings-current-path-label').textContent = __t('currentPath');
  document.querySelector('#settings-data button[onclick="selectStoragePath()"]').textContent = __t('change');
  // Update General tab if visible
  var genPanel = document.getElementById('settings-general');
  if (genPanel && !genPanel.classList.contains('hidden')) {
    genPanel.querySelector('h4').textContent = __t('general');
  }
  // Update lang toggle labels
  var ll = document.getElementById('langLabel');
  var le = document.getElementById('langLabelEn');
  if (ll) ll.textContent = __t('arabic');
  if (le) le.textContent = __t('english');
}
```

---

### Task 7: Add IDs to static HTML elements

**File:** `src/index.html`

- [ ] **Step 1: Add `id="habits-page-title"` to the habits `<h1>` title tag**

Line 146: `<h1 id="habits-page-title" class="text-xl font-bold text-gray-800">جدول العادات</h1>`

- [ ] **Step 2: Add `id="add-habit-label"` to the add button `<span>` tag**

Find: `<span class="text-base">إضافة عادة</span>`
Change to: `<span id="add-habit-label" class="text-base">إضافة عادة</span>`

- [ ] **Step 3: Add `id="settings-storage-title"` to storage section title**

In settings HTML: `<h4 id="settings-storage-title" class="text-sm font-medium text-gray-800 mb-4">Storage Location</h4>`

- [ ] **Step 4: Add `id="settings-current-path-label"` to current path span**

In settings HTML: `<span id="settings-current-path-label" class="text-xs text-gray-500">Current path</span>`

- [ ] **Step 5: Add `class="tab-label"` to all tab button text spans OR just wrap text**

Actually, looking at the settings tab buttons, they have text directly as text nodes. The cleanest approach is to wrap the text in a `<span class="tab-label">`. Let me do that.

---

### Task 8: Add `id="page-habits"` to habits container

**File:** `src/index.html`

- [ ] **Step 1: Check if `#page-habits` already has an id**

Line 143: `<div id="page-habits" class="hidden flex-1 flex flex-col overflow-hidden" dir="rtl">` — already has `id="page-habits"`. Good, `applyLang()` can target it.

---

### Task 9: Add `enum` English text for the Sample Habits (optional — user said NOT to translate user content)

The user said not to change user-created content. The sample habits (lines 206-214) are default seeds. I'll skip them since they're effectively "user content" that the user chose to keep or modify.

---

### Task 10: Verify the implementation

- [ ] **Step 1: Read final file to confirm all changes are correct**
- [ ] **Step 2: Run linter if available**
- [ ] **Step 3: Report to user for testing**
