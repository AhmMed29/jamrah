// ── Habits Page (Home/Habits table) ──

const today = new Date();
const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
function formatDate(d) {
return String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0');
}
const startDate = new Date(today.getFullYear(), 4, 1);
const DAY_COUNT = Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1;
function getDates() {
const dates = [];
for (let i = 0; i < DAY_COUNT; i++) {
const d = new Date(today);
d.setDate(d.getDate() - i);
dates.push(d);
}
return dates;
}
const dates = getDates();
const habits = [
{ name: 'أذكار الصباح', color: '#f59e0b', bg: '#fffbeb', border: 'border-amber-100', bold: true, textColor: '#f59e0b', hoverClass: '', pct: 100, checked: Array(DAY_COUNT).fill(1) },
{ name: 'جلسة 10د (تدبر لمعاني القرآن)', color: '#8b5cf6', bg: '#ffffff', border: 'border-gray-100', bold: false, textColor: '#8b5cf6', hoverClass: 'hvo', pct: Math.round(4/DAY_COUNT*100), checked: (()=>{let a=Array(DAY_COUNT).fill(0);a[DAY_COUNT-1]=a[DAY_COUNT-3]=a[DAY_COUNT-5]=a[DAY_COUNT-7]=1;return a})() },
{ name: 'أذكار المساء', color: '#3b82f6', bg: '#ffffff', border: 'border-gray-100', bold: false, textColor: '#3b82f6', hoverClass: 'hbl', pct: Math.round(5/DAY_COUNT*100), checked: (()=>{let a=Array(DAY_COUNT).fill(0);[DAY_COUNT-1,DAY_COUNT-3,DAY_COUNT-4,DAY_COUNT-7,DAY_COUNT-9].forEach(i=>a[i]=1);return a})() },
{ name: 'قراءة الورد اليومي', color: '#22c55e', bg: '#f0fdf4', border: 'border-green-100', bold: true, textColor: '#22c55e', hoverClass: '', pct: 100, checked: Array(DAY_COUNT).fill(1) },
{ name: 'سماع قرآن', color: '#06b6d4', bg: '#ffffff', border: 'border-gray-100', bold: false, textColor: '#06b6d4', hoverClass: 'hcy', pct: Math.round(3/DAY_COUNT*100), checked: (()=>{let a=Array(DAY_COUNT).fill(0);[DAY_COUNT-2,DAY_COUNT-5,DAY_COUNT-9].forEach(i=>a[i]=1);return a})() },
{ name: 'ذكر الله (لسان + حضور قلب)', color: '#f43f5e', bg: '#ffffff', border: 'border-gray-100', bold: false, textColor: '#f43f5e', hoverClass: 'hro', pct: Math.round(12/DAY_COUNT*100), checked: (()=>{let a=Array(DAY_COUNT).fill(0);[0,1,2,3,5,6,7,9,10,11,13,14].forEach(i=>{let idx=DAY_COUNT-15+i;if(idx>=0)a[idx]=1});return a})() },
{ name: 'الاستغفار (5 دقائق فقط)', color: '#6366f1', bg: '#ffffff', border: 'border-gray-100', bold: false, textColor: '#6366f1', hoverClass: 'hin', pct: Math.round(1/DAY_COUNT*100), checked: (()=>{let a=Array(DAY_COUNT).fill(0);a[DAY_COUNT-1]=1;return a})() },
{ name: 'سبحان الله وبحمده 100 مرة', color: '#ec4899', bg: '#ffffff', border: 'border-gray-100', bold: false, textColor: '#ec4899', hoverClass: 'hpi', pct: 50, checked: (()=>{let a=Array(DAY_COUNT).fill(0);for(let i=0;i<DAY_COUNT;i+=2)a[i]=1;return a})() },
{ name: 'فيديو يذكرك بالله', color: '#f97316', bg: '#ffffff', border: 'border-gray-100', bold: false, textColor: '#f97316', hoverClass: 'hor', pct: Math.round(5/DAY_COUNT*100), checked: (()=>{let a=Array(DAY_COUNT).fill(0);[DAY_COUNT-3,DAY_COUNT-4,DAY_COUNT-5,DAY_COUNT-9,DAY_COUNT-10].forEach(i=>a[i]=1);return a})() },
{ name: '🏆 Dot Net 90 Days Challenge', color: '#a855f7', bg: '#ffffff', border: 'border-gray-100', bold: false, textColor: '#a855f7', hoverClass: 'hpu', pct: Math.round(13/DAY_COUNT*100), checked: (()=>{let a=Array(DAY_COUNT).fill(0);for(let i=0;i<13;i++){let idx=DAY_COUNT-15+i;if(idx>=0)a[idx]=1}return a})() },
];
function render() {
let h = '<tr>';
h += '<th class="sticky-corner min-w-[350px] p-2"></th>';
h += '<th class="sticky-header px-1 py-4 align-bottom text-gray-300 border-b border-gray-100"></th>';
dates.forEach((d, i) => {
const isToday = i === DAY_COUNT - 1;
const tc = isToday ? '#2563eb' : '#6b7280';
h += '<th class="sticky-header min-w-[60px] px-2 py-4 border-b border-gray-100 text-center font-medium text-sm" style="color:' + tc + '"><div>' + formatDate(d) + '</div><div class="mt-1">' + dayNames[d.getDay()] + '</div></th>';
});
h += '</tr>';
document.getElementById('table-head').innerHTML = h;
let b = '';
habits.forEach((habit, idx) => {
const hasBg = habit.bg !== '#ffffff';
const cls = hasBg ? '' : habit.hoverClass;
b += '<tr class="' + cls + '" style="background-color:' + habit.bg + '">';
const isEng = habit.name.includes('Dot Net');
const spanSty = 'color:' + habit.textColor + ';font-weight:' + (habit.bold ? '700' : '500');
b += '<th class="sticky-col py-4 px-6 text-right font-normal text-[15px] border-l ' + habit.border + '" data-habit-index="' + idx + '" style="cursor:pointer;background-color:' + habit.bg + ';color:#333">';
b += '<div class="flex items-center justify-end gap-3">';
b += '<span style="' + spanSty + '"' + (isEng ? ' dir="ltr"' : '') + '>' + habit.name + '</span>';
b += '<svg class="-rotate-90 w-[28px] h-[28px]" viewBox="0 0 36 36">';
b += '<path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" stroke-width="4"></path>';
b += '<path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="' + habit.color + '" stroke-dasharray="' + habit.pct + ', 100" stroke-linecap="round" stroke-width="4"></path>';
b += '</svg></div></th>';
b += '<td class="text-center px-1"></td>';
habit.checked.forEach((status) => {
b += '<td class="text-center" style="padding:6px 0">';
if (status) {
b += '<div class="w-[22px] h-[22px] rounded-md mx-auto flex items-center justify-center shadow-sm cursor-pointer transition-all transform hover:scale-110" style="background-color:' + habit.color + '"><svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg></div>';
} else {
b += '<div class="w-[22px] h-[22px] rounded-md border-2 mx-auto bg-white cursor-pointer transition-all hover:opacity-70" style="border-color:' + habit.color + '40"></div>';
}
b += '</td>';
});
b += '</tr>';
});
b += '<tr><td style="height:96px" colspan="' + (DAY_COUNT + 2) + '"></td></tr>';
document.getElementById('table-body').innerHTML = b;
}
render();
const sc = document.getElementById('main-scroll');
sc.addEventListener('wheel', function(e) {
if (e.target.closest('thead')) {
this.scrollBy({ left: -e.deltaY });
e.preventDefault();
}
}, { passive: false });
var pb = document.getElementById('pomodoro-btn');
if (pb) {
var body = document.getElementById('pomo-body');
var pa = false;
pb.addEventListener('click', function() {
pa = !pa;
if (pa) { body.setAttribute('fill', 'currentColor'); body.setAttribute('stroke', 'none'); }
else { body.setAttribute('fill', 'none'); body.setAttribute('stroke', 'currentColor'); }
});
}
const modal = document.getElementById('habit-modal');
const modalContent = document.getElementById('modal-content');
const modalClose = document.getElementById('modal-close');
function openModal(habit) {
const checked = habit.checked.filter(v => v === 1).length;
const streak = (() => {
let max = 0, cur = 0;
for (let i = 0; i < habit.checked.length; i++) {
if (habit.checked[i] === 1) { cur++; max = Math.max(max, cur); }
else cur = 0;
}
return max;
})();
modalContent.innerHTML = '<div class="flex items-center gap-3 mb-6"><div class="w-4 h-4 rounded-full" style="background:' + habit.color + '"></div><h2 class="text-lg font-bold text-gray-800" style="font-family:\'Tajawal\',sans-serif">' + habit.name + '</h2></div><div class="flex items-center justify-center mb-6"><svg class="w-20 h-20 -rotate-90" viewBox="0 0 36 36"><path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" stroke-width="3"></path><path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="' + habit.color + '" stroke-dasharray="' + habit.pct + ', 100" stroke-linecap="round" stroke-width="3"></path></svg></div><div class="grid grid-cols-3 gap-3 text-center mb-6"><div class="bg-gray-50 rounded-xl py-3 px-2"><div class="text-2xl font-bold text-gray-800">' + DAY_COUNT + '</div><div class="text-xs text-gray-500 mt-1">إجمالي الأيام</div></div><div class="bg-gray-50 rounded-xl py-3 px-2"><div class="text-2xl font-bold" style="color:' + habit.color + '">' + checked + '</div><div class="text-xs text-gray-500 mt-1">تم الإنجاز</div></div><div class="bg-gray-50 rounded-xl py-3 px-2"><div class="text-2xl font-bold text-gray-800">' + streak + '</div><div class="text-xs text-gray-500 mt-1">أطول سلسلة</div></div></div><div class="flex gap-3"><button class="flex-1 py-2.5 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90" style="background:' + habit.color + '">تعديل العادة</button><button class="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border-2 text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700" style="background:#fff">حذف</button></div>';
modal.classList.add('open');
}
document.getElementById('table-body').addEventListener('click', function(e) {
const th = e.target.closest('th[data-habit-index]');
if (th) {
const idx = parseInt(th.dataset.habitIndex);
openModal(habits[idx]);
}
});
modalClose.addEventListener('click', () => modal.classList.remove('open'));
modal.addEventListener('click', (e) => {
if (e.target === modal) modal.classList.remove('open');
});
const addModal = document.getElementById('add-modal');
const addContent = document.getElementById('add-modal-content');
const addClose = document.getElementById('add-modal-close');
const colorPresets = ['#f59e0b','#8b5cf6','#3b82f6','#22c55e','#06b6d4','#f43f5e','#6366f1','#ec4899','#f97316','#a855f7'];
function openAddModal() {
const colorSwatches = colorPresets.map(c => '<div class="w-7 h-7 rounded-full cursor-pointer transition-all hover:scale-110 color-swatch ' + (c === '#3b82f6' ? 'ring-2 ring-offset-2 ring-blue-400' : '') + '" style="background:' + c + '" data-color="' + c + '"></div>').join('');
addContent.innerHTML = '<h2 class="text-lg font-bold text-gray-800 mb-5">إضافة عادة جديدة</h2><label class="block text-sm font-medium text-gray-600 mb-1.5">اسم العادة</label><input id="habit-name-input" type="text" dir="rtl" placeholder="مثال: أذكار الصباح" class="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:border-blue-400 focus:ring-0 transition-all outline-none mb-4" style="font-family:\'Tajawal\',sans-serif"><label class="block text-sm font-medium text-gray-600 mb-2.5">اللون</label><div class="flex gap-2.5 flex-wrap mb-5" id="color-picker">' + colorSwatches + '</div><label class="block text-sm font-medium text-gray-600 mb-1.5">نوع المتابعة</label><div class="grid grid-cols-2 gap-3 mb-5" id="track-type-group"><label class="track-type-label flex items-center gap-3 border-2 rounded-xl px-4 py-3 cursor-pointer transition-all hover:border-blue-300" data-value="check" style="border-color:#3b82f6;background:#eff6ff"><input type="radio" name="track-type" value="check" checked class="text-blue-600 focus:ring-blue-400"><span class="text-sm text-gray-700 font-medium">متابعة بنعم/لا</span></label><label class="track-type-label flex items-center gap-3 border-2 border-gray-200 rounded-xl px-4 py-3 cursor-pointer transition-all hover:border-blue-300" data-value="count"><input type="radio" name="track-type" value="count" class="text-blue-600 focus:ring-blue-400"><span class="text-sm text-gray-700 font-medium">عدد (عدّاد)</span></label></div><div class="flex gap-3 mt-6"><button id="save-habit-btn" class="flex-1 py-2.5 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90" style="background:#3b82f6">حفظ العادة</button><button id="cancel-add-btn" class="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border-2 text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700" style="background:#fff">إلغاء</button></div>';
addContent.querySelectorAll('.color-swatch').forEach(function(el) {
el.addEventListener('click', function() {
addContent.querySelectorAll('.color-swatch').forEach(function(s) { s.classList.remove('ring-2', 'ring-offset-2', 'ring-blue-400'); });
this.classList.add('ring-2', 'ring-offset-2', 'ring-blue-400');
});
});
addContent.querySelectorAll('.track-type-label').forEach(function(label) {
label.addEventListener('click', function() {
addContent.querySelectorAll('.track-type-label').forEach(function(l) { l.style.borderColor = '#e5e7eb'; l.style.background = '#fff'; });
this.style.borderColor = '#3b82f6';
this.style.background = '#eff6ff';
});
});
addContent.querySelector('#cancel-add-btn').addEventListener('click', function() { addModal.classList.remove('open'); });
addContent.querySelector('#save-habit-btn').addEventListener('click', function() {
const name = addContent.querySelector('#habit-name-input').value.trim();
if (!name) { addContent.querySelector('#habit-name-input').focus(); return; }
const color = addContent.querySelector('.color-swatch.ring-2')?.dataset.color || '#3b82f6';
const type = addContent.querySelector('input[name="track-type"]:checked')?.value || 'check';
alert('تم إضافة "' + name + '" بنجاح 🎉');
addModal.classList.remove('open');
});
addModal.classList.add('open');
}
document.getElementById('add-habit-btn').addEventListener('click', openAddModal);
addClose.addEventListener('click', function() { addModal.classList.remove('open'); });
addModal.addEventListener('click', function(e) {
if (e.target === addModal) addModal.classList.remove('open');
});
