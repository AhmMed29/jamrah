# Sync Strategy — Desktop ↔ Mobile بعد اكتمال الموبايل

## المبدأ الذهبي
**لا merge حتى تتأكد بنفسك أن الموبايل شغال 100%.** كل التعديلات الآن في `feat/mobile` worktree معزول `C:\Users\T.B\Desktop\Jamrah-Mobile`. الـ `main` لا يزال نظيف على `3f67fc4`.

## ما هو مشترك (لا يحتاج sync)
- `Data/` (`CalendarRepository.cs`, `TaskRepository.cs`, `PomodoroRepository.cs`) — SQLite مشتركة
- `Models/` (`AppTask`, `CalendarEvent`, `CalendarInfo`, `TaskFolder`, `PomodoroModels`) — نفس الجداول
- `Services/` (`TaskStateService.cs`, `CalendarStateService.cs`, `CalendarLayoutEngine.cs`, `PrayerTimesService.cs`, `PomodoroTimer.cs`) — نفس المنطق
- `wwwroot/css/jamrah-theme.css`, `tui-calendar.css`, `tasks.css` — ثيم واحد
- `Resources/` icons/fonts

## ما هو منفصل (يحتاج sync يدوي انتقائي)
- `MainPage.xaml` / `MainPage.xaml.cs` — الآن adaptive (DesktopLayout + MobileLayout). الـ merge سيجلب هذا الملف كما هو. الديسكتوب يستخدم `DesktopLayout` تلقائيا عند `Idiom != Phone`، لذا لا تأثير.
- `Components/Tasks/TaskPage.razor` — إضافة drawer + touch. هذه الإضافات لا تضر الديسكتوب (touch hidden، drawer hidden >769px).
- `Components/Calendar/CalendarPage.razor` — إضافة FAB فقط. مخفي >769px.
- `wwwroot/css/mobile*.css` — ملفات جديدة فقط، لا تمس القديم.
- `Jamrah.csproj` — سطر TFM واحد + version. هذا السطر يجب أن يذهب لـ `main` عند الـ merge.
- `.github/workflows/` — سيُستبدل بـ MAUI workflow. هذا مطلوب لـ `main` أيضاً.

## خطوات الـ Merge الآمن (عندما توافق)

```bash
# 1. تأكد worktree نظيف
cd "C:\Users\T.B\Desktop\Jamrah-Mobile"
git status # nothing to commit

# 2. ادفع feat/mobile للتجربة النهائية
git push origin feat/mobile

# 3. في main، اعمل merge
cd "C:\Users\T.B\Desktop\My-Productivity-App"
git checkout main
git pull origin main
git merge feat/mobile --no-ff -m "merge: mobile 4.3.0 — adaptive shell + responsive CSS"

# 4. تحقق أن Windows build لا يزال ينجح
dotnet build -f net9.0-windows10.0.19041.0

# 5. ادفع main
git push origin main
```

## ماذا لو أردت التعديل على الديسكتوب بعد الـ merge؟
- أي تعديل على `jamrah-theme.css` أو `tui-calendar.css` سيظهر على الموبايل تلقائيا (لأن `mobile.css` يـ override فقط).
- أي تعديل على منطق `TaskStateService` سيظهر فورا على الموبايل (shared).
- لو عدلت `TaskPage.razor` على main بعد الـ merge، يجب أن تحافظ على بلوك `mobile-drawer` و `HandleTouch*`.

## خيار مستقبلي: فصل كامل
لو أردت فصل تام، يمكنك لاحقا:
- نقل `mobile*.css` إلى `wwwroot/css/mobile/` folder
- إنشاء `MainPage.Mobile.xaml` منفصل واستخدام `App.xaml.cs:11 CreateWindow` لاختيار الصفحة حسب `Idiom`
- لكن حاليا الـ adaptive single-file هو الأبسط والأكثر أمانا.

## APK vs AAB
- الـ workflow الحالي يبني `apk`. للـ Play Store تحتاج `aab`:
  `dotnet publish -f net9.0-android -c Release -p:AndroidPackageFormat=aab`
- يمكن إضافة job ثان يبني الاثنين.

## Signing
لـ Release موقّع:
1. أنشئ keystore: `keytool -genkey -v -keystore jamrah.keystore -alias jamrah -keyalg RSA -keysize 2048 -validity 10000`
2. `base64 jamrah.keystore` → secret `ANDROID_KEYSTORE_BASE64`
3. في workflow:
```yaml
- name: Decode keystore
  run: echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 --decode > jamrah.keystore
- name: Publish signed
  run: dotnet publish -f net9.0-android -c Release -p:AndroidKeyStore=true -p:AndroidSigningKeyStore=jamrah.keystore -p:AndroidSigningKeyAlias=jamrah -p:AndroidSigningKeyPass=${{ secrets.ANDROID_KEYSTORE_PASSWORD }} -p:AndroidSigningStorePass=${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
```

