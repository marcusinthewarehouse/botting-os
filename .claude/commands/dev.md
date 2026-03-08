Start the BottingOS development environment.

1. Check if port 3000 is in use. If so, kill the process.
2. Run `npx tauri dev` which starts both Next.js dev server and Tauri desktop app.
3. If Tauri is not set up yet, fall back to `npm run dev` for web-only development.
