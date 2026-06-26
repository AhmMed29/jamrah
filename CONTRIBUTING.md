# Contributing to Jamrah جَــمْــرَه

Thanks for your interest!

## How to contribute

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/your-idea`)
3. Make your changes
4. Commit with clear messages
5. Push and open a Pull Request

## Dev setup

```bash
npm install
npm run dev
```

The app uses Electron + vanilla JS + SQLite (better-sqlite3).

## Code style

- No semicolons, single quotes, 2-space indentation
- Use `var` not `let/const`
- Match the existing code style

## Building

```bash
npx electron-builder --win
```

## Notes

- The database schema lives in `database.js` with migrations
- Update `update.json` when bumping versions
- Fonts are loaded from Google Fonts CDN, not committed
