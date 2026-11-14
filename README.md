<p align="center">
  <img src="assets/Jamrah-Icon.svg" alt="Jamrah" width="128"/>
</p>

<h1 align="center">Jamrah جَــمْــرَه</h1>

<p align="center"><i>Ember of productivity</i></p>

<p align="center">
  <a href="https://github.com/AhmMed29/jamrah/releases/latest"><img src="https://img.shields.io/github/v/release/AhmMed29/jamrah?label=latest%20release" alt="Latest release"></a>
  <a href="https://github.com/AhmMed29/jamrah/releases"><img src="https://img.shields.io/github/downloads/AhmMed29/jamrah/total?label=downloads" alt="Downloads"></a>
  <a href="https://github.com/AhmMed29/jamrah/actions/workflows/build.yml"><img src="https://github.com/AhmMed29/jamrah/actions/workflows/build.yml/badge.svg" alt="Build"></a>
  <a href="https://github.com/AhmMed29/jamrah/blob/main/LICENSE"><img src="https://img.shields.io/github/license/AhmMed29/jamrah" alt="License"></a>
  <br/>
  <img src="https://img.shields.io/badge/.NET%209.0-512BD4?logo=dotnet&logoColor=white" alt=".NET 9.0">
  <img src="https://img.shields.io/badge/MAUI%209.0.120-512BD4?logo=maui&logoColor=white" alt="MAUI 9.0.120">
  <img src="https://img.shields.io/badge/C%23-239120?logo=csharp&logoColor=white" alt="C#">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20Android-lightgrey" alt="Platforms">
  <br/>
  <a href="https://github.com/AhmMed29/jamrah/stargazers"><img src="https://img.shields.io/github/stars/AhmMed29/jamrah" alt="Stars"></a>
  <a href="https://github.com/AhmMed29/jamrah/forks"><img src="https://img.shields.io/github/forks/AhmMed29/jamrah" alt="Forks"></a>
  <img src="https://img.shields.io/github/last-commit/AhmMed29/jamrah" alt="Last commit">
  <img src="https://img.shields.io/github/release-date/AhmMed29/jamrah" alt="Release date">
</p>

<p align="center">
  <img src="assets/screenshots/jamrah-ad-1.png" alt="Jamrah ad 1" width="900"/>
</p>
<p align="center">
  <img src="assets/screenshots/jamrah-ad-2.png" alt="Jamrah ad 2" width="900"/>
</p>
<p align="center">
  <img src="assets/screenshots/jamrah-ad-3.png" alt="Jamrah ad 3" width="900"/>
</p>

---

Jamrah is a local-first productivity app built with .NET 9 + MAUI (Blazor Hybrid). Everything is stored locally on your machine using SQLite — no accounts, no cloud, no tracking. The UI is RTL Arabic-first with a minimal warm stone design.

## Download

**[Download](https://github.com/AhmMed29/jamrah/releases)** the latest version of Jamrah. Every release has its files attached to it, so always take them from the newest release.

### Windows

1. Download `jamrah.ahmmed29-win-Setup.exe` (about 160 MB).
2. Run it and follow the installer.
3. Open Jamrah from the Start menu.

Installing with this file is the recommended way, because it lets the app offer you new versions by itself (Settings → App updates).

Would rather not install anything? Download `jamrah.ahmmed29-win-Portable.zip`, extract it and run `Jamrah.exe`. A portable copy does not update itself, so you would have to download the new version again each time.

### Android

1. Download `Jamrah-<version>.apk` (about 55 MB).
2. Open it. Android will ask whether this app is allowed to install apps — allow it once, then confirm the install.
3. Open Jamrah from your list of apps.

The app offers updates by itself as well (Settings → App updates). Installing an update asks for the same permission again.

## Table of Contents

- [Download](#download)
  - [Windows](#windows)
  - [Android](#android)
- [Features](#features)
  - [Tasks](#tasks)
  - [Goals](#goals)
  - [Pomodoro / Timer](#pomodoro--timer)
  - [Bookmarks](#bookmarks)
  - [Password](#password)
  - [Settings](#settings)
- [Screenshots](#screenshots)
- [Cross Platform](#cross-platform)
- [Tech Stack](#tech-stack)
- [License](#license)

## Features

### Tasks

- Add morning, to-do, and evening tasks, separated according to your preferences.
- Drag tasks side by side.
- Add sub-tasks.
- Swap two tasks.
- Work with tasks in a way that matches what is in your mind, so you can choose what to do first.

### Goals

- Add recurring goals per day, week, or month, or a one-time goal.
- Track progress toward goals, such as reading 18 of 20 pages.
- Organize goals with tags for upcoming analysis.
- Move between days to see the tasks and goals for that day.
- Add a goal for today only.

### Pomodoro / Timer

- Simple, focused timer design.
- Link a task to a session; the session name stays until you change it.
- Set tags for specific sessions.
- View statistics with tag colors.
- Use full-screen mode for the timer and press Space to start or stop it.
- Customize sounds for Pomodoro actions such as start, stop, and end (experimental).
- Enter your region's latitude and longitude to fetch daily prayer times for the month.
- View sessions by day, week, month, or year, with the time spent in each period.

### Bookmarks

- Save anything at any time from anywhere.
- Save links, images, videos, notes, folders, files (with PDF covers for books), and apps (experimental).
- Use the split view for videos, images, and notes to find what you need faster.
- Open any item in a popup window (some fixes are still needed).
- Add folders and subfolders (experimental, but functional).
- View all items, folders, pinned items, and favorite notes, links, and videos on the Home page.
- ClipAgent runs in the background and saves what you select or copy (experimental).
- Filter by date, tag, type, and more.
- Use right-click and quick actions.
- Archive items before moving them to the trash, and empty the trash after a period before permanent deletion (experimental).
- Access all your tags in one place and manage them (view-only for now).
- The Templates button is intentionally hidden; it was an experimental feature and is no longer used.

### Password

Save passwords with local encryption using a salted password that only you know. Coming in a future update.

### Settings

The Settings page is still a work in progress and will improve in future releases.

## Screenshots

| Bookmarks | Pomodoro |
|---|---|
| ![Bookmarks home](assets/screenshots/bookmarks-home.png) | ![Pomodoro home](assets/screenshots/pomodoro-home.png) |

| Prayer times | Session popup |
|---|---|
| ![Prayer times](assets/screenshots/pomodoro-prayer-times.png) | ![Session popup](assets/screenshots/pomodoro-session.png) |

![Tasks](assets/screenshots/tasks.png)

## Cross Platform

Jamrah is built with .NET MAUI, which supports multiple platforms. Windows is the only platform released so far.

## Tech Stack

- .NET 9 + MAUI (Blazor Hybrid)
- C# and Razor components
- SQLite via `sqlite-net-pcl`
- Local-first storage with no account or cloud dependency

## License

Copyright (C) 2026 AhmMed29.

Jamrah is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, **version 3 only**. See [LICENSE](LICENSE) for the full license text.

Previously published releases remain subject to the terms under which they were published.

Third-party assets and dependencies are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
