# Contributing to Jamrah جَــمْــرَه

Thanks for your interest in contributing! This guide will help you get started.

## How to Contribute

### For External Contributors

1. **Fork the repository** - Click the Fork button on GitHub
2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/My-Productivity-App.git
   cd My-Productivity-App
   ```
3. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Make your changes**
5. **Commit with clear messages**:
   ```bash
   git commit -m "Add: new feature description"
   ```
6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Open a Pull Request** on the original repository

### For Team Members

1. **Clone the main repository**:
   ```bash
   git clone https://github.com/AhmMed29/My-Productivity-App.git
   cd My-Productivity-App
   ```
2. **Create feature branches** for each task
3. **Never commit directly to `main`**
4. **Create Pull Requests** for review before merging

## Development Setup

### Prerequisites
- Node.js (v16 or higher)
- .NET 9 SDK
- npm

### Installation
```bash
# Install frontend dependencies
npm install

# Run the app in development mode
npm run dev
```

The app uses:
- **Electron** for desktop shell
- **Vanilla JavaScript** for frontend
- **.NET 9** backend with SQLite database
- **GLSL shaders** for visual effects

## Branching Strategy

We use a simple branching model:

- `main` - Stable, production-ready code
- `feature/name` - New features (e.g., `feature/dark-mode`)
- `bugfix/name` - Bug fixes (e.g., `bugfix/timer-pause`)

### Branch Naming Examples
```
feature/add-keyboard-shortcuts
bugfix/fix-pomodoro-reset
docs/update-readme
```

## Code Style

### JavaScript
- Use vanilla JavaScript (no frameworks)
- Follow existing code patterns in the project
- Use meaningful variable and function names
- Add comments for complex logic

### Commit Messages
Use clear, descriptive commit messages:
```
Add: dark mode toggle in settings
Fix: timer not pausing correctly
Update: task completion animation
Remove: deprecated API calls
```

## Pull Request Guidelines

### Before Submitting
1. Test your changes thoroughly
2. Ensure the app runs without errors
3. Check for console errors
4. Verify UI/UX consistency

### PR Description Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Other (please describe)

## Testing
- [ ] Tested on Windows
- [ ] No console errors
- [ ] UI/UX is consistent

## Screenshots (if applicable)
Add screenshots showing the changes
```

## Team Coordination

### For Our 2-Person Team

1. **Assign Issues**: Use GitHub Issues to assign tasks
2. **Daily Sync**: Quick check-in about progress
3. **Code Review**: Review each other's Pull Requests
4. **Communication**: Use GitHub Issues or direct messages

### GitHub Projects Board
We use a Projects board to track progress:
- **To Do**: Tasks waiting to be assigned
- **In Progress**: Currently being worked on
- **Review**: Ready for code review
- **Done**: Completed and merged

## Finding Things to Work On

### Labels to Look For
- `good first issue` - Perfect for beginners
- `help wanted` - Need community help
- `feature` - New feature requests
- `bug` - Bug reports

### Creating New Issues
Use our issue templates:
- **Feature Request**: For suggesting new features
- **Bug Report**: For reporting bugs

## Getting Help

- **Questions?** Open a GitHub Issue with the `question` label
- **Stuck?** Comment on the relevant issue
- **Ideas?** Create a Feature Request issue

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Celebrate contributions of all sizes

Thank you for contributing to Jamrah! 🎉