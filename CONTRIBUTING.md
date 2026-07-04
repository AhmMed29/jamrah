# Contributing to Jamrah جَــمْــرَه

Thanks for your interest!

## How to contribute

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/your-idea`)
3. Make your changes
4. Commit with clear messages
5. Push and open a Pull Request

## Dev setup

Requires Node.js 22+ and the [.NET 9 SDK](https://dotnet.microsoft.com/en-us/download/dotnet/9.0) (the Electron main process spawns the backend with `dotnet run` in dev).

```bash
npm install
npm start
```

The app uses Electron + vanilla JS for the UI and a .NET 9 + EF Core (SQLite) backend served over localhost:5200.

## Code style

- Well be add soon !

## Building

```bash
npm run dist
```

This publishes the backend as a self-contained exe (`backend/publish`) and bundles it into the installer via electron-builder's `extraResources`.

## Notes

- soon ! 
