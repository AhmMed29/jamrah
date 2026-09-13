using System;
using System.Collections.Generic;
using System.Globalization;

namespace Jamrah.Application.Services
{
    /// <summary>
    /// App-wide Arabic/English localization. Language is stored in
    /// <see cref="Preferences"/> (synchronous, available before any WebView
    /// or SQLite init) under key "app_language" ("ar" default, "en").
    /// Components subscribe to <see cref="OnLanguageChanged"/> and refresh.
    /// Static/non-component code can pass <see cref="CurrentLang"/> explicitly.
    /// </summary>
    public sealed class LocalizationService
    {
        private const string PrefKey = "app_language";

        private static readonly Dictionary<string, (string Ar, string En)> Strings = new()
        {
            // ─── Common ───
            ["com.save"] = ("حفظ", "Save"),
            ["com.cancel"] = ("إلغاء", "Cancel"),
            ["com.delete"] = ("حذف", "Delete"),
            ["com.edit"] = ("تعديل", "Edit"),
            ["com.close"] = ("إغلاق", "Close"),
            ["com.add"] = ("إضافة", "Add"),
            ["com.reset"] = ("إعادة ضبط", "Reset"),
            ["com.search"] = ("بحث...", "Search..."),
            ["com.on"] = ("ON", "ON"),
            ["com.off"] = ("OFF", "OFF"),
            ["com.today"] = ("اليوم", "Today"),
            ["com.allday"] = ("طوال اليوم", "All day"),
            ["com.duration"] = ("المدة", "Duration"),
            ["com.notes"] = ("ملاحظات", "Notes"),
            ["com.date"] = ("التاريخ", "Date"),
            ["com.time"] = ("الوقت", "Time"),
            ["com.title"] = ("العنوان", "Title"),
            ["com.start"] = ("بدء", "Start"),
            ["com.pause"] = ("إيقاف مؤقت", "Pause"),
            ["com.complete"] = ("إتمام", "Complete"),
            ["com.resetTitle"] = ("تصفير", "Reset"),

            // ─── Language selector ───
            ["lang.title"] = ("اللغة", "Language"),
            ["lang.language"] = ("اللغة", "Language"),
            ["lang.arabic"] = ("العربية", "Arabic"),
            ["lang.english"] = ("الإنجليزية", "English"),

            // ─── Sidebar nav ───
            ["nav.tasks"] = ("المهام", "Tasks"),
            ["nav.pomodoro"] = ("البومودورو", "Pomodoro"),
            ["nav.calendar"] = ("التقويم", "Calendar"),
            ["nav.planning"] = ("التخطيط", "Planning"),
            ["nav.bookmarks"] = ("المحفوظات", "Bookmarks"),
            ["nav.library"] = ("المكتبة", "Library"),
            ["nav.home"] = ("الرئيسية", "Home"),
            ["nav.all"] = ("كل العناصر", "All Items"),
            ["nav.quran"] = ("القرآن · الختمة", "Quran · Khatma"),
            ["nav.clipboard"] = ("الحافظة", "Clipboard"),
            ["nav.favorites"] = ("المفضلة", "Favorites"),
            ["nav.pinned"] = ("المثبتة", "Pinned"),
            ["nav.recent"] = ("الأخيرة", "Recent"),
            ["nav.collections"] = ("المجموعات — تحتوي مجلدات", "Collections — contain folders"),
            ["nav.newCollection"] = ("مجموعة جديدة", "New collection"),
            ["nav.newSmart"] = ("مجموعة ذكية جديدة", "New smart collection"),
            ["nav.newFolder"] = ("مجلد جديد", "New folder"),
            ["nav.newPage"] = ("صفحة جديدة", "New page"),
            ["nav.standalone"] = ("مجلدات مستقلة", "Standalone folders"),
            ["nav.system"] = ("النظام", "System"),
            ["nav.archive"] = ("الأرشيف", "Archive"),
            ["nav.trash"] = ("المحذوفات", "Trash"),
            ["nav.tags"] = ("الوسوم", "Tags"),
            ["nav.templates"] = ("القوالب", "Templates"),
            ["nav.settings"] = ("الإعدادات", "Settings"),
            ["nav.addFolderOrPage"] = ("إضافة مجلد أو صفحة", "Add folder or page"),
            ["nav.collapse"] = ("طي القائمة", "Collapse sidebar"),
            ["nav.openSidebar"] = ("فتح القائمة", "Open sidebar"),
            ["nav.foot"] = ("عنصر · محفوظة محلياً على هذا الجهاز فقط.", "items · stored locally, on this machine only."),

            // ─── Tasks ───
            ["tasks.todayView"] = ("اليوم", "Today"),
            ["tasks.doneView"] = ("تم الإنجاز", "Completed"),
            ["tasks.archivedView"] = ("الأرشيف", "Archive"),
            ["tasks.upcomingView"] = ("القادمة", "Upcoming"),
            ["tasks.new"] = ("مهمة جديدة", "New task"),
            ["tasks.prevDay"] = ("اليوم السابق", "Previous day"),
            ["tasks.nextDay"] = ("اليوم التالي", "Next day"),
            ["tasks.pickDate"] = ("اختيار تاريخ", "Pick a date"),
            ["tasks.todayProgress"] = ("إنجاز اليوم", "Today's progress"),
            ["tasks.quickAdd"] = ("أضف مهمة بسرعة...", "Quick add a task..."),
            ["tasks.quickHint"] = ("Enter للإضافة", "Enter to add"),
            ["tasks.details"] = ("تفاصيل المهمة", "Task details"),
            ["tasks.name"] = ("اسم المهمة", "Task name"),
            ["tasks.priority"] = ("الأولوية", "Priority"),
            ["tasks.priLow"] = ("منخفضة", "Low"),
            ["tasks.priMed"] = ("متوسطة", "Medium"),
            ["tasks.priHigh"] = ("عالية", "High"),
            ["tasks.repeat"] = ("التكرار", "Repeat"),
            ["tasks.repNone"] = ("بدون تكرار", "None"),
            ["tasks.repDaily"] = ("يومي", "Daily"),
            ["tasks.repWeekly"] = ("أسبوعي", "Weekly"),
            ["tasks.repMonthly"] = ("شهري", "Monthly"),
            ["tasks.status"] = ("الحالة", "Status"),
            ["tasks.done"] = ("✓ تم الإنجاز", "✓ Done"),
            ["tasks.doing"] = ("○ قيد التنفيذ", "○ In progress"),
            ["tasks.notesPh"] = ("أضف أي تفاصيل تحتاجها...", "Add any details you need..."),
            ["tasks.doneAt"] = ("تم الإنجاز:", "Completed:"),
            ["tasks.inArchive"] = ("هذه المهمة موجودة في الأرشيف.", "This task is in the archive."),
            ["tasks.archiveTitle"] = ("أرشفة", "Archive"),
            ["tasks.deleteDay"] = ("حذف اليوم فقط", "Delete today only"),
            ["tasks.saveChanges"] = ("حفظ التغييرات", "Save changes"),
            ["tasks.deleteSeries"] = ("⛔ حذف نهائياً (لن تتكرر بعد اليوم)", "⛔ Delete forever (won't repeat again)"),
            ["tasks.addTitle"] = ("إضافة مهمة جديدة", "Add new task"),
            ["tasks.nameEx"] = ("مثلاً: مراجعة LINQ", "e.g. Review LINQ"),
            ["tasks.cancelSchedule"] = ("إلغاء الجدولة", "Cancel scheduling"),
            ["tasks.schedule"] = ("+ جدولة المهمة", "+ Schedule task"),
            ["tasks.notesOpt"] = ("اختياري...", "Optional..."),
            ["tasks.addTask"] = ("إضافة المهمة", "Add task"),
            ["tasks.ctxEdit"] = ("✎ تعديل", "✎ Edit"),
            ["tasks.ctxDelete"] = ("× حذف اليوم فقط", "× Delete today only"),
            ["tasks.ctxDeleteSeries"] = ("⛔ حذف نهائياً (لن تتكرر)", "⛔ Delete forever (won't repeat)"),
            ["tasks.deleteTitleConfirm"] = ("حذف نهائي؟ سيتم حذف كل النسخ القادمة.", "Delete forever? All upcoming copies will be removed."),
            ["tasks.board"] = ("لوحة", "Board"),
            ["tasks.matrix"] = ("مصفوفة", "Eisenhower"),
            ["tasks.dayMorning"] = ("☀️ مهام الصباح", "☀️ Morning tasks"),
            ["tasks.dayUntimed"] = ("مهام بدون وقت", "Untimed tasks"),
            ["tasks.dayEvening"] = ("🌙 مهام المساء", "🌙 Evening tasks"),
            ["tasks.noUpcoming"] = ("مفيش مهام قادمة", "No upcoming tasks"),
            ["tasks.noDone"] = ("لسه مفيش إنجازات", "No completions yet"),
            ["tasks.noToday"] = ("لا توجد مهام لهذا اليوم", "No tasks for this day"),
            ["tasks.inprogress"] = ("قيد التنفيذ", "In progress"),
            ["tasks.noDate"] = ("بدون تاريخ", "No date"),
            ["tasks.historyHint"] = ("المهام اللي هتخلصها هتظهر هنا كـ History.", "Finished tasks will show here as history."),
            ["tasks.restoreAll"] = ("استرجاع الكل", "Restore all"),
            ["tasks.dayUnit"] = ("يوم", "day"),
            ["tasks.weekUnit"] = ("أسبوع", "week"),
            ["tasks.monthUnit"] = ("شهر", "month"),
            ["tasks.yearUnit"] = ("سنة", "year"),
            ["tasks.tasksCount"] = ("مهام", "tasks"),
            ["tasks.tomorrow"] = ("غدًا", "Tomorrow"),
            ["tasks.emptyAdd"] = ("ابدأ بإضافة أول مهمة ليومك.", "Start by adding your first task for the day."),
            ["tasks.morning"] = ("الصباح", "Morning"),
            ["tasks.evening"] = ("المساء", "Evening"),
            ["tasks.untimed"] = ("بدون وقت", "Untimed"),
            ["tasks.doneShort"] = ("تم الإنجاز", "Done"),
            ["tasks.noDoneHere"] = ("لا توجد مهام منجزة هنا", "No completed tasks here"),
            ["tasks.noTimedHere"] = ("لا توجد مهام موقوتة هنا", "No timed tasks here"),
            ["tasks.noUntimedHere"] = ("لا توجد مهام بدون وقت — أضف من فوق ⬆", "No untimed tasks — add from above ⬆"),
            ["tasks.sort"] = ("ترتيب:", "Sort:"),
            ["tasks.changeSort"] = ("تغيير الترتيب", "Change order"),
            ["tasks.sortPriority"] = ("أولوية", "Priority"),
            ["tasks.sortOldest"] = ("الأقدم", "Oldest"),
            ["tasks.sortNewest"] = ("الأحدث", "Newest"),
            ["tasks.notesMeta"] = ("ملاحظات", "Notes"),
            ["tasks.toggleState"] = ("تغيير الحالة", "Toggle state"),
            ["tasks.allDone"] = ("كل الإنجازات", "All completions"),
            ["tasks.doneFilter"] = ("✓ منجز", "✓ Done"),
            ["tasks.deletedFilter"] = ("🗑 محذوف", "🗑 Deleted"),
            ["tasks.noDeleted"] = ("لا توجد مهام محذوفة", "No deleted tasks"),
            ["tasks.deletedHere"] = ("المهام المحذوفة ستظهر هنا.", "Deleted tasks will show here."),
            ["tasks.noDoneArch"] = ("لا توجد مهام منجزة", "No completed tasks"),
            ["tasks.doneHere"] = ("المهام التي تنجزها ستظهر هنا.", "Tasks you complete will show here."),
            ["tasks.deletedOne"] = ("محذوف", "Deleted"),
            ["tasks.doneOne"] = ("منجز", "Done"),
            ["tasks.upcomingEmpty"] = ("أي مهمة تضيف لها تاريخ مستقبلي هتظهر هنا.", "Any task with a future date will show here."),
            ["tasks.boardNoDate"] = ("بدون تاريخ", "No date"),
            ["tasks.boardEmpty"] = ("فاضي", "Empty"),
            ["tasks.pageTasks"] = ("المهام", "Tasks"),
            ["tasks.pageBoard"] = ("لوحة", "Board"),
            ["tasks.pageMatrix"] = ("أيزنهاور", "Eisenhower"),
            ["tasks.priUrgent"] = ("عاجلة", "Urgent"),
            ["tasks.seriesConfirm"] = ("حذف نهائي؟ سيتم حذف كل النسخ القادمة لهذه المهمة المتكررة، مع الاحتفاظ بالمنجز في الأرشيف.", "Delete forever? All upcoming copies of this recurring task will be removed; completed ones stay in the archive."),
            ["tasks.archiveBtn"] = ("أرشفة", "Archive"),
            ["tasks.q1"] = ("مهم وعاجل", "Important & urgent"),
            ["tasks.q1sub"] = ("اعمله الآن", "Do it now"),
            ["tasks.q2"] = ("مهم وغير عاجل", "Important, not urgent"),
            ["tasks.q2sub"] = ("خطط له", "Schedule it"),
            ["tasks.q3"] = ("غير مهم وعاجل", "Not important, urgent"),
            ["tasks.q3sub"] = ("فوّضه", "Delegate it"),
            ["tasks.q4"] = ("غير مهم وغير عاجل", "Neither important nor urgent"),
            ["tasks.q4sub"] = ("احذفه أو أجّله", "Drop it or defer"),
            ["tasks.noTasks"] = ("لا توجد مهام", "No tasks"),

            // ─── Calendar ───
            ["cal.title"] = ("التقويم", "Calendar"),
            ["cal.upcoming"] = ("القادم", "Upcoming"),
            ["cal.noEvents"] = ("لا أحداث", "No events"),
            ["cal.noUpcoming"] = ("لا أحداث قادمة", "No upcoming events"),
            ["cal.agendaEmpty"] = ("Agenda فاضي — أضف حدث جديد", "Agenda is empty — add a new event"),
            ["cal.holiday"] = ("عطلة", "Holiday"),
            ["cal.weekStart"] = ("بداية", "Week starts"),
            ["cal.sat"] = ("السبت", "Saturday"),
            ["cal.sun"] = ("الأحد", "Sunday"),
            ["cal.mon"] = ("الإثنين", "Monday"),
            ["cal.collapse"] = ("طي", "Collapse"),
            ["cal.today"] = ("اليوم", "Today"),
            ["cal.month"] = ("الشهر", "Month"),
            ["cal.week"] = ("الأسبوع", "Week"),
            ["cal.day"] = ("اليوم", "Day"),
            ["cal.agenda"] = ("الأجندة", "Agenda"),
            ["cal.newEvent"] = ("+ حدث", "+ Event"),
            ["cal.eventsCount"] = ("أحداث", "events"),
            ["cal.createTitle"] = ("حدث جديد", "New Event"),
            ["cal.editTitle"] = ("تعديل الحدث", "Edit Event"),
            ["cal.titlePh"] = ("عنوان الحدث", "Event title"),
            ["cal.cancel"] = ("إلغاء", "Cancel"),
            ["cal.save"] = ("حفظ", "Save"),
            ["cal.edit"] = ("تعديل", "Edit"),
            ["cal.delete"] = ("حذف", "Delete"),
            ["cal.more"] = ("المزيد", "more"),

            // ─── Planning ───
            ["plan.title"] = ("التخطيط", "Planning"),
            ["plan.preview"] = ("👁 معاينة", "👁 Preview"),
            ["plan.edit"] = ("✎ تعديل", "✎ Edit"),
            ["plan.saved"] = ("✓ تم الحفظ", "✓ Saved"),
            ["plan.save"] = ("💾 حفظ", "💾 Save"),
            ["plan.bold"] = ("عريض", "Bold"),
            ["plan.italic"] = ("مائل", "Italic"),
            ["plan.strike"] = ("مشطوب", "Strikethrough"),
            ["plan.code"] = ("كود", "Code"),
            ["plan.toggle"] = ("توجل", "Toggle"),
            ["plan.bullets"] = ("قائمة نقطية", "Bullet list"),
            ["plan.numbers"] = ("قائمة رقمية", "Numbered list"),
            ["plan.quote"] = ("اقتباس", "Quote"),
            ["plan.hr"] = ("فاصل", "Divider"),
            ["plan.phBold"] = ("نص عريض", "bold text"),
            ["plan.phItalic"] = ("نص مائل", "italic text"),
            ["plan.phStrike"] = ("مشطوب", "strikethrough"),
            ["plan.phCode"] = ("كود", "code"),
            ["plan.phTask"] = ("مهمة", "task"),
            ["plan.phItem"] = ("عنصر", "item"),
            ["plan.phQuote"] = ("اقتباس", "quote"),
            ["plan.phHeading"] = ("عنوان", "heading"),
            ["plan.editorPh"] = ("ابدأ الكتابة هنا... # عنوان, **عريض**, - [ ] توجل", "Start writing here... # heading, **bold**, - [ ] toggle"),
            ["plan.savedSt"] = ("محفوظ", "Saved"),
            ["plan.unsavedSt"] = ("غير محفوظ", "Unsaved"),
            ["plan.chars"] = ("حرف", "chars"),
            ["plan.emptyPreview"] = ("لا يوجد محتوى للمعاينة", "Nothing to preview"),

            // ─── Pomodoro ───
            ["pomo.startTime"] = ("وقت البداية", "Start time"),
            ["pomo.endTime"] = ("وقت النهاية", "End time"),
            ["pomo.soundSettings"] = ("اعدادات الصوت", "Sound settings"),
            ["pomo.prayerTimes"] = ("مواقيت الصلاة", "Prayer times"),
            ["pomo.prayer"] = ("الصلاة", "Prayer"),
            ["pomo.adhan"] = ("الأذان", "Adhan"),
            ["pomo.loading"] = ("جاري التحميل...", "Loading..."),
            ["pomo.changeRegion"] = ("تغيير المنطقة", "Change region"),
            ["pomo.tags"] = ("التاجات", "Tags"),
            ["pomo.search"] = ("بحث...", "Search..."),
            ["pomo.addTag"] = ("إضافة تاج", "Add tag"),
            ["pomo.newSession"] = ("جلسة جديدة", "New session"),
            ["pomo.sessionName"] = ("اسم الجلسة", "Session name"),
            ["pomo.sessionNotes"] = ("ملاحظات", "Notes"),
            ["pomo.notesPh"] = ("اكتب ملاحظاتك هنا...", "Write your notes here..."),
            ["pomo.sessionDetails"] = ("تفاصيل الجلسة", "Session details"),
            ["pomo.spent"] = ("المدة المقضية", "Time spent"),
            ["pomo.durationMin"] = ("المدة (دقيقة)", "Duration (minutes)"),
            ["pomo.ofMinutes"] = ("من {0} دقيقة", "of {0} minutes"),
            ["pomo.running"] = ("جلسة شغالة", "Session running"),
            ["pomo.alreadyRunning"] = ("هناك جلسة تعمل بالفعل", "A session is already running"),
            ["pomo.cancelCurrent"] = ("الغاء الجلسة الحالية (حذفها)", "Cancel current session (delete it)"),
            ["pomo.saveAndNew"] = ("حفظ الجلسة وبدأ جلسة جديدة مدتها: {0} دقيقة", "Save session and start a new {0}-minute session"),
            ["pomo.lat"] = ("خط العرض (Latitude)", "Latitude"),
            ["pomo.lon"] = ("خط الطول (Longitude)", "Longitude"),
            ["pomo.mapsHint"] = ("ابحث عن إحداثياتك على Google Maps", "Find your coordinates on Google Maps"),
            ["pomo.overtime"] = ("الوقت الفعلي تجاوز المخطط — هل تحذف الجلسة؟", "Actual time exceeded the plan — delete the session?"),
            ["pomo.clear"] = ("مسح", "Delete"),
            ["pomo.daily"] = ("يومي", "Daily"),
            ["pomo.weekly"] = ("اسبوعي", "Weekly"),
            ["pomo.monthly"] = ("شهري", "Monthly"),
            ["pomo.yearly"] = ("سنوي", "Yearly"),
            ["pomo.weekN"] = ("الأسبوع {0}", "Week {0}"),
            ["pomo.monthN"] = ("شهر {0}", "Month {0}"),
            ["pomo.showAllDays"] = ("عرض جميع الأيام", "Show all days"),
            ["pomo.noTag"] = ("بدون تاج", "No tag"),
            ["pomo.noSessions"] = ("لا جلسات", "No sessions"),
            ["pomo.oneSession"] = ("جلسة واحدة", "1 session"),
            ["pomo.twoSessions"] = ("جلستان", "2 sessions"),
            ["pomo.nSessionsFew"] = ("{0} جلسات", "{0} sessions"),
            ["pomo.nSessionsMany"] = ("{0} جلسة", "{0} sessions"),
            ["pomo.untitled"] = ("بدون عنوان", "Untitled"),
            ["pomo.work"] = ("شغل", "Work"),
            ["pomo.minus5"] = ("إنقاص 5 دقائق", "-5 minutes"),
            ["pomo.minus1"] = ("إنقاص دقيقة", "-1 minute"),
            ["pomo.plus5"] = ("زيادة 5 دقائق", "+5 minutes"),
            ["pomo.plus1"] = ("زيادة دقيقة", "+1 minute"),
            ["pomo.deleteTitle"] = ("حذف", "Delete"),
            // prayer names (key-based, never compare localized text in logic)
            ["prayer.fajr"] = ("الفجر", "Fajr"),
            ["prayer.sunrise"] = ("الشروق", "Sunrise"),
            ["prayer.dhuhr"] = ("الظهر", "Dhuhr"),
            ["prayer.asr"] = ("العصر", "Asr"),
            ["prayer.maghrib"] = ("المغرب", "Maghrib"),
            ["prayer.isha"] = ("العشاء", "Isha"),

            // ─── Sound settings ───
            ["snd.title"] = ("إعدادات الصوت", "Sound settings"),
            ["snd.general"] = ("الإعدادات العامة", "General settings"),
            ["snd.master"] = ("تشغيل المؤثرات الصوتية", "Enable sound effects"),
            ["snd.volume"] = ("مستوى الصوت", "Volume"),
            ["snd.alerts"] = ("التنبيهات", "Notifications"),
            ["snd.minimized"] = ("التشغيل عند تصغير البرنامج", "Play when minimized"),
            ["snd.events"] = ("أحداث المؤقت", "Timer events"),
            ["snd.sessionStart"] = ("بدء الجلسة", "Session start"),
            ["snd.sessionDone"] = ("اكتمال الجلسة", "Session complete"),
            ["snd.breakStart"] = ("بداية الاستراحة", "Break start"),
            ["snd.breakDone"] = ("انتهاء الاستراحة", "Break end"),
            ["snd.preview"] = ("تجربة", "Preview"),
            ["snd.noSound"] = ("بدون صوت", "No sound"),
            ["snd.begin1"] = ("بداية (1)", "Begin (1)"),
            ["snd.begin2"] = ("بداية (2)", "Begin (2)"),
            ["snd.end1"] = ("نهاية (1)", "End (1)"),
            ["snd.end2"] = ("نهاية (2)", "End (2)"),
            ["snd.confirm"] = ("تأكيد", "Confirm"),
            ["snd.unconfirm"] = ("إلغاء تأكيد", "Unconfirm"),
            ["snd.swipe"] = ("سحب", "Swipe"),
            ["snd.alhamd"] = ("وقالوا الحمدلله", "Alhamdulillah"),

            // ─── Bookmarks ───
            ["bmk.settings"] = ("الإعدادات", "Settings"),
            ["bmk.backupTitle"] = ("النسخ الاحتياطي والاختصارات", "Backup & shortcuts"),
            ["bmk.backupJson"] = ("النسخ الاحتياطي للمكتبة (JSON)", "Library backup (JSON)"),
            ["bmk.export"] = ("تصدير JSON", "Export JSON"),
            ["bmk.import"] = ("استيراد JSON", "Import JSON"),
            ["bmk.importWarn"] = ("الاستيراد يستبدل المكتبة كلها — صدّر نسخة أولاً للأمان.", "Import replaces the whole library — export first to be safe."),
            ["bmk.searchOps"] = ("عوامل البحث", "Search operators"),
            ["bmk.zoomTitle"] = ("اختصارات الزوم (لكل صفحة)", "Zoom shortcuts (per page)"),
            ["bmk.zoomHint"] = ("عجلة الفأرة", "mouse wheel"),
            ["bmk.loading"] = ("جاري تحميل المكتبة...", "Loading library..."),
            ["bmk.searchPh"] = ("ابحث في مكتبتك...", "Search your library..."),
            ["bmk.searchHint"] = ("البحث — جرّب type:book tag:backend favorite:true", "Search — try type:book tag:backend favorite:true"),
            ["bmk.searchHintShort"] = ("للبحث", "to search"),
            ["bmk.recentAdded"] = ("المضافة حديثاً", "Recently Added"),
            ["bmk.continue"] = ("أكمل", "Continue"),
            ["bmk.viewAll"] = ("عرض الكل ←", "View all →"),
            ["bmk.quran"] = ("القرآن", "Quran"),
            ["bmk.newKhatm"] = ("ختمة جديدة +", "+ New khatma"),
            ["bmk.noKhatm"] = ("لا توجد ختمة نشطة.", "No active khatma."),
            ["bmk.currentPage"] = ("الصفحة الحالية", "Current page"),
            ["bmk.logWird"] = ("سجّل ورد اليوم", "Log today's wird"),
            ["bmk.dailyWird"] = ("الورد اليومي: {0} صفحة", "Daily wird: {0} pages"),
            ["bmk.juz"] = ("الجزء {0}", "Juz {0}"),
            ["bmk.readingLog"] = ("سجل القراءة", "Reading log"),
            ["bmk.clipboard"] = ("الحافظة", "Clipboard"),
            ["bmk.recentCopies"] = ("النسخ الأخيرة", "Recent copies"),
            ["bmk.openAll"] = ("فتح الكل ←", "Open all →"),
            ["bmk.openTracker"] = ("فتح المتابعة ←", "Open tracker →"),
            ["bmk.capture"] = ("الالتقاط", "Capture"),
            ["bmk.onOff"] = ("تشغيل/إيقاف", "On/Off"),
            ["bmk.startWin"] = ("البدء مع ويندوز", "Start with Windows"),
            ["bmk.agentOn"] = ("الوكيل يعمل", "Agent running"),
            ["bmk.copy"] = ("نسخ", "Copy"),
            ["bmk.pin"] = ("تثبيت", "Pin"),
            ["bmk.unpin"] = ("إلغاء التثبيت", "Unpin"),
            ["bmk.open"] = ("فتح", "Open"),
            ["bmk.fav"] = ("مفضلة", "Favorite"),
            ["bmk.restore"] = ("استرجاع", "Restore"),
            ["bmk.deleteForever"] = ("حذف نهائي", "Delete forever"),
            ["bmk.emptyTrash"] = ("إفراغ المحذوفات", "Empty trash"),
            ["bmk.resultsFor"] = ("نتائج “{0}”", "Results for “{0}”"),
            ["bmk.emptyLib"] = ("مكتبتك فاضية.", "Your library is empty."),
            ["bmk.noResults"] = ("لا توجد نتائج.", "No results."),
            ["bmk.nothingHere"] = ("لا يوجد شيء هنا بعد.", "Nothing here yet."),
            ["bmk.addItem"] = ("إضافة عنصر", "Add item"),
            ["bmk.sortBy"] = ("ترتيب حسب", "Sort by"),
            ["bmk.filters"] = ("الفلاتر", "Filters"),
            ["bmk.type"] = ("النوع", "Type"),
            ["bmk.flags"] = ("علامات", "Flags"),
            ["bmk.minRating"] = ("أقل تقييم", "Min rating"),
            ["bmk.any"] = ("الكل", "Any"),
            ["bmk.clearAll"] = ("مسح الكل", "Clear all"),
            ["bmk.metadata"] = ("البيانات", "Metadata"),
            ["bmk.link"] = ("الرابط", "Link"),
            ["bmk.added"] = ("أُضيفت", "Added"),
            ["bmk.updated"] = ("حُدّثت", "Updated"),
            ["bmk.addTagPh"] = ("أضف وسماً...", "Add a tag..."),
            ["bmk.saveNote"] = ("حفظ ملاحظة", "Save note"),
            ["bmk.related"] = ("عناصر مرتبطة", "Related items"),
            ["bmk.relateTo"] = ("اربط بـ...", "Relate to..."),
            ["bmk.chooseType"] = ("اختر نوعاً", "Choose a type"),
            ["bmk.searchTypes"] = ("ابحث في الأنواع...", "Search types..."),
            ["bmk.newItem"] = ("عنصر جديد", "New item"),
            ["bmk.editItem"] = ("تعديل العنصر", "Edit item"),
            ["bmk.fetch"] = ("جلب", "Fetch"),
            ["bmk.advOptions"] = ("خيارات متقدمة", "Advanced options"),
            ["bmk.thumbnail"] = ("صورة مصغرة", "Thumbnail"),
            ["bmk.description"] = ("الوصف", "Description"),
            ["bmk.folder"] = ("مجلد", "Folder"),
            ["bmk.page"] = ("صفحة", "Page"),
            ["bmk.collections"] = ("المجموعات", "Collections"),
            ["bmk.newFolder"] = ("مجلد جديد", "New folder"),
            ["bmk.editFolder"] = ("تعديل المجلد", "Edit folder"),
            ["bmk.newCollection"] = ("مجموعة جديدة", "New collection"),
            ["bmk.parentFolder"] = ("المجلد الأب", "Parent folder"),
            ["bmk.collection"] = ("المجموعة", "Collection"),
            ["bmk.cardStyleHint"] = ("شكل البطاقة — العنصر هيظهر بالشكل ده في كل مكان", "Card style — this item will look like this everywhere"),
            ["bmk.currentKhatm"] = ("الختمة الحالية", "Current khatma"),
            ["bmk.khatmWird"] = ("الختمة والورد اليومي", "Khatma & daily wird"),
            ["bmk.sortAdded"] = ("الأحدث إضافة", "Recently added"),
            ["bmk.sortUpdated"] = ("الأحدث تحديثاً", "Recently updated"),
            ["bmk.sortOpened"] = ("الأحدث فتحاً", "Recently opened"),
            ["bmk.sortTitle"] = ("أبجدي", "Alphabetical"),
            ["bmk.sortRating"] = ("التقييم", "Rating"),
            ["bmk.sortProgress"] = ("التقدم", "Progress"),
            ["bmk.titleHome"] = ("الرئيسية", "Home"),
            ["bmk.titleAll"] = ("كل العناصر", "All Items"),
            ["bmk.titleRecent"] = ("المفتوحة حديثاً", "Recently Opened"),
            ["bmk.yes"] = ("نعم", "Yes"),
            ["bmk.no"] = ("لا", "No"),
            ["bmk.pinnedClip"] = ("مثبتة", "pinned"),
            ["bmk.stats"] = ("الإحصائيات", "Statistics"),
            ["bmk.countItems"] = ("عنصر", "items"),
            ["bmk.countFolders"] = ("مجلد", "folders"),
            ["bmk.countCollections"] = ("مجموعة", "collections"),
            ["bmk.noKhatmHint"] = ("ابدأ ختمة جديدة لتتبع الـ 604 صفحة.", "Start a new khatma to track your 604 pages."),
            ["bmk.completePct"] = ("مكتمل", "complete"),
            ["bmk.pagesRead"] = ("الصفحات المقروءة", "Pages read"),
            ["bmk.wirdHint"] = ("سجّل عدد الصفحات التي قرأتها — صفحة الختمة تتقدم تلقائياً.", "Log how many pages you read — the khatma page advances automatically."),
            ["bmk.juz30"] = ("الأجزاء (30)", "Ajza (30)"),
            ["bmk.noEntries"] = ("لا توجد إدخالات بعد.", "No entries yet."),
            ["bmk.savedClip"] = ("محفوظة", "saved"),
            ["bmk.capOn"] = ("⏺ الالتقاط يعمل", "⏺ Capture on"),
            ["bmk.capOff"] = ("○ الالتقاط متوقف", "○ Capture off"),
            ["bmk.agentIdle"] = ("الوكيل متوقف", "agent idle"),
            ["bmk.autosave"] = ("كل نسخة تُحفظ تلقائياً", "every copy is auto-saved"),
            ["bmk.clipPh"] = ("الصق نصاً أو رابطاً للاحتفاظ به هنا...", "Paste text or a link to keep it here..."),
            ["bmk.saveClip"] = ("حفظ القصاصة", "Save clip"),
            ["bmk.clipEmpty"] = ("الحافظة فاضية.", "Clipboard is empty."),
            ["bmk.clipEmptyHint"] = ("احفظ أي شيء تنسخه كثيراً — مقتطفات، روابط، عناوين.", "Save anything you copy often — snippets, links, addresses."),
            ["bmk.tagsSub"] = ("وسوم · اضغط على واحد للتصفح", "tags · click one to browse"),
            ["bmk.noTags"] = ("لا توجد وسوم بعد.", "No tags yet."),
            ["bmk.noTagsHint"] = ("الوسوم تظهر هنا كلما أضفتها للعناصر.", "Tags appear here as you add them to items."),
            ["bmk.tplSub"] = ("22 شكل بطاقة جاهز · تُطبق تلقائياً حسب النوع", "22 built-in card styles · applied automatically per type"),
            ["bmk.archivedLbl"] = ("مؤرشف", "archived"),
            ["bmk.foundCount"] = ("نتيجة", "found"),
            ["bmk.confirmAgain"] = ("اضغط مجدداً للتأكيد", "Click again to confirm"),
            ["bmk.thTitle"] = ("العنوان", "Title"),
            ["bmk.thMeta"] = ("بيانات", "Meta"),
            ["bmk.tagsCol"] = ("الوسوم", "Tags"),
            ["bmk.thRating"] = ("التقييم", "Rating"),
            ["bmk.trashHint"] = ("العناصر المحذوفة تبقى حتى إزالتها", "deleted items stay until removed"),
            ["bmk.trashEmptied"] = ("تم إفراغ المحذوفات", "Trash emptied"),
            ["bmk.wirdSaved"] = ("تم حفظ الورد ✓", "Wird saved ✓"),
            ["bmk.khatmStarted"] = ("بدأت ختمة جديدة ✓", "New khatma started ✓"),
            ["bmk.clipSaved"] = ("تم حفظ القصاصة ✓", "Clip saved ✓"),
            ["bmk.copied"] = ("تم النسخ ✓", "Copied ✓"),
            ["bmk.copyFailed"] = ("فشل النسخ", "Copy failed"),
            ["bmk.exported"] = ("تم التصدير ✓", "Exported ✓"),
            ["bmk.exportFailed"] = ("فشل التصدير", "Export failed"),
            ["bmk.imported"] = ("تم الاستيراد ✓", "Imported ✓"),
            ["bmk.invalidBackup"] = ("ملف نسخة غير صالح", "Invalid backup file"),
            ["bmk.favOnly"] = ("المفضلة فقط", "favorites only"),
            ["bmk.pinOnly"] = ("المثبتة فقط", "pinned only"),
            ["bmk.ratingChip"] = ("التقييم", "rating"),
            ["bmk.statusChip"] = ("الحالة", "status"),
            ["bmk.emptyLibHint"] = ("الصق أي رابط في “إضافة عنصر” واضغط جلب — مكتبة تجريبية محملة بالأسفل.", "Paste any link in “Add item” and press Fetch — the sample library is already loaded below."),
            ["bmk.addFirst"] = ("أضف أول عنصر", "Add your first item"),
            ["bmk.noResultsHint"] = ("لا يوجد ما يطابق", "Nothing matches"),
            ["bmk.noResultsHint2"] = ("جرّب كلمات مختلفة أو عوامل مثل", "Try different words or operators like"),
            ["bmk.clearSearch"] = ("مسح البحث", "Clear search"),
            ["bmk.nothingHint"] = ("جرّب فلاتر مختلفة، أو أضف شيئاً جديداً.", "Try different filters, or add something new."),
            ["bmk.openVideo"] = ("فتح الفيديو", "Open video"),
            ["bmk.editSmall"] = ("تعديل", "edit"),
            ["bmk.noNotes"] = ("لا توجد ملاحظات بعد.", "No notes yet."),
            ["bmk.writeOne"] = ("اكتب واحدة ←", "Write one →"),
            ["bmk.fName"] = ("الاسم", "Name"),
            ["bmk.fNameExSmart"] = ("مثال: أساسيات الباك إند", "e.g. Backend essentials"),
            ["bmk.fNameEx"] = ("مثال: برمجة", "e.g. Programming"),
            ["bmk.fIcon"] = ("الأيقونة (إيموجي أو اسم أيقونة)", "Icon (emoji or icon name)"),
            ["bmk.fIconPh"] = ("إيموجي أو اسم Svg...", "emoji or Svg name..."),
            ["bmk.topLevel"] = ("— المستوى الأعلى —", "— top level —"),
            ["bmk.standaloneOpt"] = ("— مستقلة —", "— standalone —"),
            ["bmk.includeTypes"] = ("الأنواع المشمولة", "Include types"),
            ["bmk.mustTags"] = ("يجب أن تحتوي كل هذه الوسوم (مفصولة بفاصلة)", "Must have all these tags (comma separated)"),
            ["bmk.newFolder"] = ("مجلد جديد", "New folder"),
            ["bmk.editFolder"] = ("تعديل المجلد", "Edit folder"),
            ["bmk.newSmartCol"] = ("مجموعة ذكية جديدة", "New smart collection"),
            ["bmk.editSmartCol"] = ("تعديل المجموعة الذكية", "Edit smart collection"),
            ["bmk.newCollection"] = ("مجموعة جديدة", "New collection"),
            ["bmk.editCollection"] = ("تعديل المجموعة", "Edit collection"),
            ["bmk.savedToast"] = ("تم الحفظ ✓", "Saved ✓"),
            ["bmk.archivedToast"] = ("تم النقل للأرشيف", "Moved to Archive"),
            ["bmk.newPage"] = ("صفحة جديدة", "New page"),
            ["bmk.editPage"] = ("تعديل الصفحة", "Edit page"),
            ["bmk.pNameEx"] = ("مثال: ملاحظات الباك إند", "e.g. Backend notes"),
            ["bmk.noneOpt"] = ("— لا شيء —", "— none —"),
            ["bmk.parentPage"] = ("الصفحة الأب (متداخلة تحت)", "Parent page (nested under)"),
            ["bmk.backBtn"] = ("رجوع", "Back"),
            ["bmk.typeHint"] = ("أنت تختار النوع — المكتبة لا تخمن أبداً. (الجلب من الإنترنت يقترح نوعاً؛ ويمكنك تغييره دائماً.)", "You choose the type — the library never guesses. (Fetch from the internet suggests one; you can always change it.)"),
            ["bmk.changeType"] = ("تغيير النوع", "Change type"),
            ["bmk.linkEmbed"] = ("الرابط · تضمين من الإنترنت", "Link · embed from the internet"),
            ["bmk.linkPh"] = ("الصق رابط أي منشور — يوتيوب · فيسبوك · إكس · انستجرام · تيك توك · ريديت... أو أي صفحة", "Paste any post URL — YouTube · Facebook · X · Instagram · TikTok · Reddit… or any page"),
            ["bmk.coverLbl"] = ("الغلاف", "Cover"),
            ["bmk.coverHint"] = ("الغلاف · محفوظ كمصغرة لهذا العنصر", "cover · saved as this item's thumbnail"),
            ["bmk.fetchHint"] = ("الجلب يستخدم خدمات تضمين عامة مجانية (بدون حسابات أو مفاتيح) — العنوان والنص والغلاف والمؤلف والمنصة تُملأ تلقائياً، ومنشورات السوشيال تُضمّن مباشرة عند الفتح.", "Fetch calls free public embed services (no accounts, no keys) — title, text, cover, author & platform are filled automatically, and social posts embed live when opened."),
            ["bmk.autoLink"] = ("تلقائي من الرابط", "Auto from link"),
            ["bmk.fieldsSuffix"] = (" حقول، ", " fields, "),
            ["bmk.advnRest"] = ("وسوم، مجلدات، ملاحظات...", "tags, folders, notes..."),
            ["bmk.thumbPh"] = ("الصق رابط صورة...", "Paste image URL..."),
            ["bmk.pasteUrl"] = ("الصق رابطاً", "paste a URL"),
            ["bmk.tagPh"] = ("اكتب وسماً واضغط Enter...", "type a tag, press Enter..."),
            ["bmk.noCollections"] = ("لا توجد مجموعات بعد.", "No collections yet."),
            ["bmk.addPrefix"] = ("إضافة ", "Add "),
            ["bmk.saveChangesBtn"] = ("حفظ التغييرات", "Save changes"),
            ["bmk.fetchFail1"] = ("تعذر جلب البيانات من", "Couldn't fetch data from"),
            ["bmk.fetchFail2"] = ("— محجوب بتسجيل الدخول.", "— it's behind a login wall."),
            ["bmk.fetchFailLive"] = ("سيُضمّن مباشرة عند فتح العنصر.", "It will still embed live when you open the item."),
            ["bmk.fetchFail3"] = ("املأ ما تشاء يدوياً.", "Fill anything you like manually."),
            ["bmk.fetchOk1"] = ("تم الجلب من", "Fetched from"),
            ["bmk.fetchOk2"] = ("— التفاصيل مُلئت تلقائياً. عدّل بحرية.", "— details filled automatically. Edit anything freely."),
            ["bmk.rateEx"] = ("مثال: 8.5", "e.g. 8.5"),
            ["bmk.fileRef"] = ("مرجع الملف...", "file reference..."),
            ["bmk.storedRef"] = ("يُحفظ كمرجع", "stored as a reference"),
            ["bmk.relateHint"] = ("اربط الكورسات بمستودعاتها، والكتب بفيديوهاتها...", "Connect courses to their repos, books to their videos..."),
            ["bmk.relateBtn"] = ("+ ربط", "+ Relate"),
            ["bmk.unfav"] = ("إلغاء المفضلة", "Unfavorite"),
            ["bmk.unarchive"] = ("إلغاء الأرشفة", "Unarchive"),
            ["bmk.archiveBtn"] = ("أرشفة", "Archive"),
            ["bmk.tagsOrg"] = ("الوسوم والتنظيم", "Tags & organization"),
            ["bmk.updated"] = ("حُدّثت", "Updated"),

            // ─── Splash / startup ───
            ["splash.preparing"] = ("جاري تجهيز الإعدادات...", "Preparing settings..."),
            ["splash.tasks"] = ("جاري تحميل المهام...", "Loading tasks..."),
            ["splash.pomo"] = ("جاري تحميل البومودورو...", "Loading pomodoro..."),
            ["splash.bookmarks"] = ("جاري تحميل المحفوظات...", "Loading library..."),
            ["splash.finishing"] = ("اللمسات الأخيرة...", "Finishing touches..."),
            ["splash.done"] = ("اكتمل التحميل ✓", "Ready ✓"),
        };

        private static readonly Dictionary<string, (string Ar, string En)> TypeNames = new()
        {
            ["link"] = ("رابط", "Link"), ["post"] = ("منشور", "Post"), ["website"] = ("موقع", "Website"),
            ["article"] = ("مقال", "Article"), ["documentation"] = ("توثيق", "Documentation"),
            ["tool"] = ("أداة", "Tool"), ["video"] = ("فيديو", "Video"), ["image"] = ("صورة", "Image"),
            ["movie"] = ("فيلم", "Movie"), ["tvshow"] = ("مسلسل", "TV Show"), ["anime"] = ("أنمي", "Anime"),
            ["podcast"] = ("بودكاست", "Podcast"), ["music"] = ("موسيقى", "Music"), ["book"] = ("كتاب", "Book"),
            ["ebook"] = ("كتاب إلكتروني", "E-book"), ["research"] = ("ورقة بحثية", "Research Paper"),
            ["repo"] = ("مستودع", "Repository"), ["snippet"] = ("مقتطف كود", "Code Snippet"),
            ["library"] = ("مكتبة", "Library"), ["api"] = ("API", "API"), ["course"] = ("كورس", "Course"),
            ["game"] = ("لعبة", "Game"), ["pdf"] = ("PDF", "PDF"), ["document"] = ("مستند", "Document"),
            ["audio"] = ("صوتي", "Audio"), ["file"] = ("ملف", "File"), ["note"] = ("ملاحظة", "Note"),
            ["idea"] = ("فكرة", "Idea"), ["project"] = ("مشروع", "Project"), ["reference"] = ("مرجع", "Reference"),
        };

        public string Lang { get; private set; } = "ar";

        /// <summary>Ambient language for static contexts (same process, all WebViews).</summary>
        public static string CurrentLang { get; private set; } = "ar";

        public event Action? OnLanguageChanged;

        public LocalizationService()
        {
            try
            {
                var saved = Preferences.Get(PrefKey, "ar");
                Lang = saved == "en" ? "en" : "ar";
            }
            catch { Lang = "ar"; }
            CurrentLang = Lang;
            ApplyCulture();
        }

        public bool IsRtl => Lang == "ar";
        public string Dir => IsRtl ? "rtl" : "ltr";
        public CultureInfo Culture => Lang == "ar" ? new CultureInfo("ar-EG") : new CultureInfo("en-US");

        public string this[string key] => Get(key);

        public string Get(string key)
        {
            if (Strings.TryGetValue(key, out var v))
                return Lang == "ar" ? v.Ar : v.En;
            return key;
        }

        public string Get(string key, params object[] args)
        {
            var s = Get(key);
            try { return string.Format(s, args); }
            catch { return s; }
        }

        public void SetLanguage(string lang)
        {
            lang = lang == "en" ? "en" : "ar";
            if (lang == Lang) return;
            Lang = lang;
            CurrentLang = lang;
            try { Preferences.Set(PrefKey, lang); } catch { }
            ApplyCulture();
            OnLanguageChanged?.Invoke();
        }

        private void ApplyCulture()
        {
            try
            {
                var c = Culture;
                CultureInfo.DefaultThreadCurrentCulture = c;
                CultureInfo.DefaultThreadCurrentUICulture = c;
            }
            catch { }
        }

        // ─── Helpers used by components / static code ───

        public string PrevArrow => IsRtl ? "→" : "←";
        public string NextArrow => IsRtl ? "←" : "→";

        public string PrayerName(string key) => key switch
        {
            "fajr" => Get("prayer.fajr"),
            "sunrise" => Get("prayer.sunrise"),
            "dhuhr" => Get("prayer.dhuhr"),
            "asr" => Get("prayer.asr"),
            "maghrib" => Get("prayer.maghrib"),
            "isha" => Get("prayer.isha"),
            _ => key,
        };

        public static string PrayerName(string key, string lang) => lang == "en" ? key switch
        {
            "fajr" => "Fajr", "sunrise" => "Sunrise", "dhuhr" => "Dhuhr",
            "asr" => "Asr", "maghrib" => "Maghrib", "isha" => "Isha",
            _ => key,
        } : key switch
        {
            "fajr" => "الفجر", "sunrise" => "الشروق", "dhuhr" => "الظهر",
            "asr" => "العصر", "maghrib" => "المغرب", "isha" => "العشاء",
            _ => key,
        };

        public string TypeName(string id)
        {
            if (TypeNames.TryGetValue(id, out var v))
                return Lang == "ar" ? v.Ar : v.En;
            return id;
        }

        public static string TypeName(string id, string lang)
        {
            if (TypeNames.TryGetValue(id, out var v))
                return lang == "en" ? v.En : v.Ar;
            return id;
        }

        public string SortName(string id) => id switch
        {
            "added" => Get("bmk.sortAdded"),
            "updated" => Get("bmk.sortUpdated"),
            "opened" => Get("bmk.sortOpened"),
            "title" => Get("bmk.sortTitle"),
            "rating" => Get("bmk.sortRating"),
            "progress" => Get("bmk.sortProgress"),
            _ => id,
        };

        public string RouteTitle(string ctx) => RouteTitle(ctx, Lang);

        public static string RouteTitle(string ctx, string lang)
        {
            string T(string key) => Strings.TryGetValue(key, out var v) ? (lang == "en" ? v.En : v.Ar) : key;
            return ctx switch
            {
                "home" => T("bmk.titleHome"),
                "all" => T("bmk.titleAll"),
                "quran" => T("nav.quran"),
                "clipboard" => T("bmk.clipboard"),
                "favorites" => T("nav.favorites"),
                "pinned" => T("nav.pinned"),
                "recent" => T("bmk.titleRecent"),
                "archive" => T("nav.archive"),
                "trash" => T("nav.trash"),
                "tags" => T("nav.tags"),
                "templates" => T("nav.templates"),
                "settings" => T("nav.settings"),
                _ => T("nav.library"),
            };
        }

        private static readonly Dictionary<string, string> StatusAr = new()
        {
            ["Reading"] = "يقرأ", ["Finished"] = "انتهى", ["Watching"] = "يشاهد",
            ["Playing"] = "يلعب", ["In progress"] = "جارٍ", ["Active"] = "نشط",
            ["Airing"] = "يُعرض", ["Completed"] = "مكتمل", ["Not started"] = "لم يبدأ",
            ["Backlog"] = "مؤجل", ["Planned"] = "مخطط", ["Unread"] = "غير مقروء",
            ["Abandoned"] = "مهجور", ["Archived"] = "مؤرشف", ["Ended"] = "انتهى",
            ["Upcoming"] = "قادم", ["Paused"] = "متوقف", ["Done"] = "تم",
        };

        public static string StatusLabel(string s, string lang) =>
            lang == "en" || string.IsNullOrEmpty(s) ? s :
            StatusAr.TryGetValue(s, out var v) ? v : s;

        private static readonly Dictionary<string, string> MetaAr = new()
        {
            ["url"] = "الرابط", ["site"] = "الموقع", ["author"] = "المؤلف",
            ["platform"] = "المنصة", ["date"] = "التاريخ", ["source"] = "المصدر",
            ["maintainer"] = "المشرف", ["channel"] = "القناة", ["duration"] = "المدة (دقيقة)",
            ["year"] = "السنة", ["genres"] = "الأنواع", ["director"] = "المخرج",
            ["creator"] = "صاحب العمل", ["status"] = "الحالة", ["rating"] = "التقييم",
            ["seasons"] = "المواسم", ["host"] = "المقدم", ["artist"] = "الفنان",
            ["publisher"] = "الناشر", ["isbn"] = "الترقيم", ["pages"] = "الصفحات",
            ["progress"] = "التقدم", ["cover"] = "الغلاف", ["authors"] = "المؤلفون",
            ["venue"] = "الجهة", ["owner"] = "المالك", ["language"] = "اللغة",
            ["stars"] = "النجوم", ["content"] = "المحتوى", ["code"] = "الكود",
            ["pricing"] = "الأسعار", ["instructor"] = "المحاضر", ["game"] = "اللعبة",
            ["genre"] = "النوع", ["poster"] = "الملصق", ["file"] = "الملف",
            ["image"] = "الصورة", ["audio"] = "الصوتي", ["note"] = "ملاحظة",
            ["idea"] = "فكرة", ["project"] = "المشروع", ["reference"] = "المرجع",
            ["published"] = "تاريخ النشر", ["posted"] = "تاريخ النشر", ["runtime"] = "المدة (دقيقة)",
        };

        public static string MetaLabel(string key, string lang, string fallback)
        {
            if (lang != "en" && MetaAr.TryGetValue(key, out var v)) return v;
            if (lang != "en" && MetaAr.TryGetValue(fallback.ToLowerInvariant(), out var v2)) return v2;
            return fallback;
        }

        private static readonly Dictionary<string, string> CatAr = new()
        {
            ["Web"] = "ويب", ["Media"] = "ميديا", ["Reading"] = "قراءة",
            ["Development"] = "برمجة", ["Files"] = "ملفات", ["Personal"] = "شخصي",
            ["Entertainment"] = "ترفيه", ["Custom"] = "مخصص", ["Quick"] = "سريع",
        };

        public static string CatName(string cat, string lang) =>
            lang == "en" ? cat : CatAr.TryGetValue(cat, out var v) ? v : cat;

        public static string ViewName(string id, string lang)
        {
            if (lang != "en") return id switch
            {
                "grid" => "شبكة", "list" => "قائمة", "compact" => "مضغوط",
                "table" => "جدول", "masonry" => "متدرج", "timeline" => "خط زمني",
                _ => id,
            };
            return id switch
            {
                "grid" => "Grid", "list" => "List", "compact" => "Compact list",
                "table" => "Table", "masonry" => "Masonry", "timeline" => "Timeline",
                _ => id,
            };
        }

        public static string FmtAgo(DateTime t, string lang)
        {
            if (t == DateTime.MinValue) return string.Empty;
            var d = DateTime.UtcNow - t.ToUniversalTime();
            if (lang == "ar")
            {
                var ar = new CultureInfo("ar-EG");
                if (d.TotalHours < 1) return "منذ " + Math.Max(1, (int)Math.Round(d.TotalMinutes)) + " د";
                if (d.TotalDays < 1) return "منذ " + ((int)Math.Round(d.TotalHours)) + " س";
                if (d.TotalDays < 30) return "منذ " + ((int)Math.Round(d.TotalDays)) + " يوم";
                return t.ToString("d MMM yyyy", ar);
            }
            if (d.TotalHours < 1) return Math.Max(1, (int)Math.Round(d.TotalMinutes)) + "m ago";
            if (d.TotalDays < 1) return ((int)Math.Round(d.TotalHours)) + "h ago";
            if (d.TotalDays < 30) return ((int)Math.Round(d.TotalDays)) + "d ago";
            return t.ToString("MMM d, yyyy", new CultureInfo("en-US"));
        }

        public static string FmtCardDate(DateTime t, string lang)
        {
            if (t == DateTime.MinValue) return string.Empty;
            return lang == "ar"
                ? t.ToString("d MMM yyyy", new CultureInfo("ar-EG"))
                : t.ToString("MMM d, yyyy", new CultureInfo("en-US"));
        }

        public string FmtSessDur(int secs)
        {
            var m = (int)Math.Round(secs / 60.0);
            if (Lang == "ar")
            {
                if (m >= 60) { var h = m / 60; var rm = m % 60; return rm != 0 ? $"{h}س {rm}د" : $"{h}س"; }
                return $"{m}د";
            }
            if (m >= 60) { var h = m / 60; var rm = m % 60; return rm != 0 ? $"{h}h {rm}m" : $"{h}h"; }
            return $"{m}m";
        }

        public string SessionCount(int n)
        {
            if (Lang == "ar")
            {
                if (n == 0) return Get("pomo.noSessions");
                if (n == 1) return Get("pomo.oneSession");
                if (n == 2) return Get("pomo.twoSessions");
                if (n <= 10) return Get("pomo.nSessionsFew", n);
                return Get("pomo.nSessionsMany", n);
            }
            return n == 1 ? "1 session" : $"{n} sessions";
        }

        public string FmtClock(int totalMinutes)
        {
            totalMinutes = ((totalMinutes % 1440) + 1440) % 1440;
            var h = totalMinutes / 60;
            var mm = totalMinutes % 60;
            if (Lang == "ar")
            {
                var suffix = h >= 12 ? "م" : "ص";
                var h12 = h % 12; if (h12 == 0) h12 = 12;
                return $"{h12}:{mm:D2} {suffix}";
            }
            var en = h >= 12 ? "PM" : "AM";
            var h12en = h % 12; if (h12en == 0) h12en = 12;
            return $"{h12en}:{mm:D2} {en}";
        }

        public string FmtAgo(DateTime t) => FmtAgo(t, Lang);

        public string FmtCardDate(DateTime t) => FmtCardDate(t, Lang);

        public string SoundLabel(string file) => SoundLabel(file, Lang);

        public static string SoundLabel(string file, string lang)
        {
            string T(string key) => Strings.TryGetValue(key, out var v) ? (lang == "en" ? v.En : v.Ar) : key;
            return file switch
            {
                "none" => T("snd.noSound"),
                "pomo-start.mp3" => T("snd.begin1"),
                "start-pomo.wav" => T("snd.begin2"),
                "pomo-end.mp3" => T("snd.end1"),
                "pomo-end.wav" => T("snd.end2"),
                "checkbox-check.mp3" => T("snd.confirm"),
                "checkbox-uncheck.mp3" => T("snd.unconfirm"),
                "tab-swipping.mp3" => T("snd.swipe"),
                "before-pomo-end.wav" => T("snd.alhamd"),
                _ => System.IO.Path.GetFileNameWithoutExtension(file),
            };
        }

        public string DayName(DayOfWeek d) => Lang == "ar" ? d switch
        {
            DayOfWeek.Saturday => "السبت",
            DayOfWeek.Sunday => "الأحد",
            DayOfWeek.Monday => "الإثنين",
            DayOfWeek.Tuesday => "الثلاثاء",
            DayOfWeek.Wednesday => "الأربعاء",
            DayOfWeek.Thursday => "الخميس",
            _ => "الجمعة",
        } : d.ToString();

        public string MiniDayLetter(DayOfWeek d) => Lang == "ar" ? d switch
        {
            DayOfWeek.Saturday => "ح",
            DayOfWeek.Sunday => "ن",
            DayOfWeek.Monday => "ث",
            DayOfWeek.Tuesday => "ر",
            DayOfWeek.Wednesday => "خ",
            DayOfWeek.Thursday => "ج",
            _ => "س",
        } : d switch
        {
            DayOfWeek.Sunday => "S",
            DayOfWeek.Monday => "M",
            DayOfWeek.Tuesday => "T",
            DayOfWeek.Wednesday => "W",
            DayOfWeek.Thursday => "T",
            DayOfWeek.Friday => "F",
            _ => "S",
        };
    }
}
