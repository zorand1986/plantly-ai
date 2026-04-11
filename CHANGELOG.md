# Changelog

## [1.5.1] - 2026-04-11

### Fixed
- Widget now populates on device boot without requiring the app to be opened first — a new headless task syncs plant data to the widget's shared storage at startup

---

## [1.5.0] - 2026-04-10

### Added
- **Auto backup** — optionally backs up data once per day on first app open; keeps last 7 backups, configurable via Settings > Backup
- **Backup section** — renamed from "Data Migration"; export now uses the native share sheet instead of writing directly to Downloads (works on all Android versions without permissions)

---

## [1.4.0] - 2026-04-10

### Added
- **Force update gate** — app checks minimum required version on launch; prompts users to update if their version is outdated, with a direct link to the store
- **No internet detection** — shows a "No Internet Connection" screen on launch if the version check can't be reached, with a retry button

---

## [1.3.0] - 2026-04-10

### Added
- **Android home screen widget** — shows plants due for watering today; tap 💧 to mark as watered directly from the widget, tap a plant name to open its detail screen in the app
- **File picker for data import** — replaced hardcoded Downloads path with a system file browser so backups can be imported from any location

### Fixed
- Widget "can't load" crash caused by `android.view.View` divider not being allowed in RemoteViews on Android 12+
- Widget RemoteViews service not accessible to the launcher due to `exported=false`

---

## [1.2.1] - 2026-03-xx

### Added
- Boot receiver to reschedule notifications after device restart
- Per-day-of-week notification time scheduling

### Fixed
- Android Doze mode compatibility for scheduled notifications
- Replaced alert dialogs with toast notifications

---

## [1.2.0]

- App renamed to Thryveo
- Data migration support
- Dev mode toggle
