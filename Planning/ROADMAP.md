# My Productivity App - Development Roadmap

## STRICT WORKING RULES (THE "ONE-BY-ONE" PROTOCOL):
1. INITIALIZATION: First, copy the entire project into the `worktree` to isolate modifications.
2. ISOLATION: Work on EXACTLY ONE sub-task at a time from the roadmap.
3. NO COLLATERAL DAMAGE: Never modify a file or logic outside the scope of the current sub-task.
4. BACKWARD COMPATIBILITY: Database migrations must not delete or corrupt existing user data.
5. PAUSE AND REPORT: After completing a sub-task, TEST it, then STOP. Report to user.
6. DO NOT PROCEED to the next sub-task until user says "Yes, move to the next."

---

## TASK 0: Project Setup & Analysis 🔍

### Subtask 0.1: Create Git Worktree
- Create a new worktree branch: `git worktree add ../my-productivity-app-v2 feature/major-refactor`
- Copy all files to new worktree
- Initialize git in new location
- ✅ Checkpoint: Confirm both versions run independently

### Subtask 0.2: Full Code Audit
- Read and document every function in main.js
- Map all IPC channels (main ↔️ renderer)
- List all database queries in database.js
- Document all CSS classes in index.html
- Chart all event listeners in JS files
- ✅ Checkpoint: Create a markdown file with complete documentation

### Subtask 0.3: Database Schema Documentation
- Export current database schema to SQL
- Document migration history (v1 → v3)
- List all indexes and constraints
- Map relationships between tables
- ✅ Checkpoint: Schema diagram ready for review

---

## TASK 1: Sidebar Redesign 🎨

### Subtask 1.1: HTML Structure Update
- Create new sidebar container: `<div id="sidebar-container">`
- Add collapsed state (icons only) structure
- Add expanded state (icons + text) structure
- Keep existing navigation buttons functional
- ✅ Test: Clicking sidebar buttons still switches pages

### Subtask 1.2: CSS Styling
- Style collapsed sidebar (60px width)
- Style expanded sidebar (220px width)
- Add smooth transitions (0.3s ease)
- Style icons (SVG or Font Awesome)
- Add hover effects for expansion trigger
- ✅ Test: Sidebar expands on hover, collapses on mouse leave

### Subtask 1.3: JavaScript Interaction
- Add event listener for sidebar hover
- Toggle expanded class on hover
- Maintain active page indicator
- Ensure RTL compatibility for Arabic
- ✅ Test: Navigation works in both EN and AR modes

### Subtask 1.4: Label Text Implementation
- Add labels: "Pomodoro", "Habits", "Goals", "Statistics", "Settings"
- Position text beside icons
- Hide text in collapsed state
- Show text in expanded state
- Apply correct font (SF-Pro/SF-Arabic)
- ✅ Test: Text appears smoothly, correct font applied

---

## TASK 2: Goals Page - Foundation 🎯

### Subtask 2.1: Database Schema - Goals Table
- Create migration v4 with goals table and goal_progress table
- Test migration on a copy of database
- ✅ Test: Run migration, check tables created, rollback works

### Subtask 2.2: Auto-Create Tag for Goal
- Modify createGoal() to auto-create tag with goal's name and color
- Link tag to goal in goals.tagId
- ✅ Test: Create goal → tag appears in tags list automatically

### Subtask 2.3: Goals Page UI - HTML
- Create new page section: `<div id="goals-page" class="page">`
- Add "Add New Goal" button
- Create goals grid container
- Design single goal card template
- ✅ Test: Page shows when clicking "Goals" in sidebar

### Subtask 2.4: Goal Card Design
- Card: Goal name, Progress circle, Date range, Edit/Delete icons
- Apply rounded corners, subtle shadow, color-coded border
- ✅ Test: Card displays correctly in both languages

### Subtask 2.5: Add Goal Modal
- Create #add-goal-modal with form fields
- Calculate endDate automatically from startDate + duration
- Save button calls window.api.createGoal()
- ✅ Test: Modal opens, form validates, goal saves to DB

### Subtask 2.6: Goal Detail Popup + CRUD
- Click goal card → popup with colored top border (matches goal color)
- Shows: name, description (only in popup, not card), dates, duration, progress circle
- Edit button → opens add modal pre-filled with goal data
- Delete button → custom confirmation modal (styled, not browser confirm)
- ✅ Test: Click card → popup shows, edit saves changes, delete removes goal

---

## TASK 3: To-do Tasks 📋

### Subtask 3.1: DB Migration v3 — Tasks Table
- Create `tasks` table: id, name, goalId (FK→goals), completed (0/1), createdAt
- Add `CREATE TABLE IF NOT EXISTS tasks` in migration v3
- ✅ Test: Migration runs, tasks table created without data loss

### Subtask 3.2: IPC + Preload for Tasks CRUD
- database.js: getTasks, createTask, toggleTask, deleteTask functions
- main.js: IPC handlers for db:get-tasks, db:create-task, db:toggle-task, db:delete-task
- preload.js: expose window.db methods
- ✅ Test: IPC calls return correct data

### Subtask 3.3: Tasks Page UI — HTML + CSS + Sidebar
- Add `<div id="page-tasks">` section with tasks list container
- Add "Tasks" button in sidebar with icon
- Style tasks list with clean design
- ✅ Test: Click Tasks in sidebar → page shows

### Subtask 3.4: Redesign Task Add Popup (Bigger)
- Replace old cramped popup with wider, more spacious layout
- More padding, bigger input, better spacing
- "Related Goal" horizontal scroll section preserved
- ✅ Test: Popup is comfortable to use

### Subtask 3.5: Fix Goal Card Layout
- Remove full-width goal-group display
- Show parent goals in normal grid cell (no inline children)
- Remove goal-group CSS (col-span-full, connector, etc.)
- ✅ Test: All cards fit in normal grid, no layout breaks

### Subtask 3.6: Child Goals in Parent Detail Popup
- After goal stats/progress in detail popup, add "Child Goals" section
- Show child goals with colored connecting dots + names
- Each child clickable → opens its own detail popup (reuse same modal)
- ✅ Test: Click parent → see children in popup → click child → child's popup opens

### Subtask 3.7: Goal Progress = Tasks Completion
- Goal detail popup shows "Linked Tasks" count (completed / total)
- Formula: progress = (completedTasks / totalTasks) × 100
- Fallback to calendar progress if no tasks linked
- Children's progress weighted: childContribution × (childDuration / parentDuration)
- ✅ Test: Add tasks to goal, complete some → goal progress bar updates

### Subtask 3.8: Goals Hierarchy Popup in Tasks Page
- Add button in tasks page (same icon as goals) → opens popup
- Popup shows all goals as toggle list (rectangular header, rounded corners)
- Expand goal (click toggle) → shows its tasks as bullet points
- Click any bullet point task → creates it in tasks page (calls createTask)
- ✅ Test: Click goal icon button → see goals → expand → click task → appears in task list

---

## TASK 4: Pomodoro → Goals Sessions Integration 🔗

### Subtask 4.1: Modify Sessions to Track Goal Progress
- When session completed with a tag, check if tag is linked to a goal
- Calculate daily progress based on goal duration
- Update goal_progress table
- ✅ Test: Complete session with goal tag → goal progress updates

---

## TASK 5: Modern Pomodoro Design ⏱️

### Subtask 5.1: Analyze Reference Design
- Open all files in Pomo modern design/ folder
- Document circle animation, button interaction, color scheme, typography
- ✅ Checkpoint: Design analysis document ready

### Subtask 5.2: Update SVG Circle Design
- Replace current SVG circle with new design (thicker stroke, gradient, glow)
- Keep updateTimer() function working
- ✅ Test: Timer counts down correctly with new circle

### Subtask 5.3: Make Circle Interactive (Clickable)
- Add click event to SVG circle element
- Clicking circle = Start/Pause/Resume
- Keep existing buttons as fallback
- ✅ Test: Click circle to start timer, click again to pause

### Subtask 5.4: Center Time Display Styling
- Apply new font to timer display (64px, font-weight: 300)
- ✅ Test: Time displays clearly in both EN/AR

### Subtask 5.5: Color Transitions
- Idle: Gray, Active: Blue gradient, Break: Green gradient
- Smooth transitions (1s ease)
- ✅ Test: Colors change smoothly during timer states

---

## TASK 6: Apple Fonts Integration 🔤

### Subtask 6.1: Font Files Setup
- Check fonts in Fonts/ folder
- Add @font-face declarations in <style> of index.html
- ✅ Test: Fonts load without errors

### Subtask 6.2: Apply SF-Pro to English UI
- 6.2.1: Sidebar & Navigation
- 6.2.2: Pomodoro Page
- 6.2.3: Habits Page
- 6.2.4: Goals Page
- 6.2.5: Settings & Modals

### Subtask 6.3: Apply SF-Arabic to Arabic UI
- 6.3.1-6.3.5: Same structure for Arabic

### Subtask 6.4: RTL Adjustments
- Sidebar, Settings, Buttons, Modals: RTL for Arabic
- Keep LTR: Pomodoro circle, Habits table, Goals grid, Stats graphs
- ✅ Test: Switch language → correct direction applied

---

## TASK 7: Statistics Overhaul 📊

### Subtask 7.1: Design Stats Page Layout
- Create #statistics-page with time period selector and 3 graph cards
- ✅ Test: Page shows when clicking "Statistics"

### Subtask 7.2: Data Aggregation Functions
- Create DB queries for habits, pomodoro, tasks by period
- ✅ Test: Queries return correct data

### Subtask 7.3: Graph Rendering (Canvas or SVG)
- Draw axes, plot dots, connecting lines
- ✅ Test: Graph renders correctly

### Subtask 7.4: Interactive Graph Features
- Hover tooltips, click for details, zoom
- ✅ Test: Interactions work smoothly

### Subtask 7.5: Period Selector Logic
- Add Today/Week/Month/Year buttons
- Clicking re-fetches data and redraws graph
- ✅ Test: Switching periods updates graphs

---

## TASK 8: Data Integrity & Backward Compatibility 🛡️

### Subtask 8.1: Migration Testing Suite
- Create test databases with old schema versions
- Run all migrations (v1 → v4)
- ✅ Test: Old data survives all migrations

### Subtask 8.2: Add Migration for Goals (v4)
- Write migration script in database.js
- Test on copy of production DB
- ✅ Test: Migration runs once, doesn't repeat

### Subtask 8.3: Validate All DB Operations
- Test all CRUD operations
- ✅ Test: No data loss or corruption

---

## TASK 9: Code Testing & QA ✅

### Subtask 9.1: Manual Testing Checklist
- Pomodoro, Habits, Goals, Settings, Statistics
- ✅ Checkpoint: All features work as expected

### Subtask 9.2: Cross-Language Testing
- Test all features in English and Arabic
- Check RTL alignment and font rendering
- ✅ Test: App works perfectly in both languages

### Subtask 9.3: Edge Cases Testing
- Empty database, old data, missing fields, invalid inputs
- ✅ Test: App handles edge cases gracefully

---

## TASK 10: Build & Deployment 📦

### Subtask 9.1: Prepare for Build
- Update package.json, configure electron-builder, app icon

### Subtask 9.2: Test Build on Clean System
- Build .exe, install on fresh machine, test all features

### Subtask 9.3: Create Installer
- Use electron-builder to create installer

### Subtask 9.4: Final Release Checklist
- Version, changelog, tests, no console errors

---

## Design Principles:
- Maintain consistent design across all components
- Preserve existing data when adding features
- Test all interactions
- Use EN font: Spectral, Use AR font: Noto_Sans_Arabic (from Fonts/ folder)
- RTL only for: sidebar, settings, buttons, popups
- LTR for: pages, tables, Pomodoro (only font changes for AR)
