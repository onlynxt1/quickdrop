# QuickDrop

Instant file transfer service — upload a file, get a shareable link, download on any device.

## Architecture

```
/
├── backend/                  Express API server (port 3001)
│   ├── src/
│   │   ├── server.js         Main Express server + download route + cron cleanup
│   │   ├── db.js             SQLite setup (users + files tables)
│   │   ├── routes/
│   │   │   ├── auth.js       Signup / login / me endpoints
│   │   │   └── files.js      Upload / info / QR / list / delete endpoints
│   │   └── middleware/
│   │       └── auth.js       JWT auth middleware (required + optional)
│   ├── uploads/              Uploaded files stored here (auto-cleaned)
│   ├── data/                 SQLite database file
│   └── package.json
│
├── frontend/                 React + Vite app (port 5000, proxies to 3001)
│   ├── src/
│   │   ├── App.jsx           Root with routing + AuthProvider
│   │   ├── index.css         Global dark theme CSS variables
│   │   ├── hooks/
│   │   │   └── useAuth.jsx   Auth context (login/signup/logout state)
│   │   ├── components/
│   │   │   ├── Layout.jsx          Top nav + footer shell
│   │   │   ├── UploadZone.jsx      Drag-and-drop upload with progress bar
│   │   │   ├── SuccessCard.jsx     Post-upload card with link, copy, QR
│   │   │   └── RecentUploads.jsx   Session upload history list
│   │   └── pages/
│   │       ├── HomePage.jsx        Upload area + recent uploads
│   │       ├── DownloadPage.jsx    Shared download link destination
│   │       ├── AuthPage.jsx        Login / signup form
│   │       └── HistoryPage.jsx     Per-user upload history (requires login)
│   └── package.json
│
└── package.json              Root — uses concurrently to run both servers
```

## Running

The `Start application` workflow runs both servers with:
```
concurrently "node backend/src/server.js" "cd frontend && vite --port 5000 --host"
```

## Key Features

- **Upload**: Drag-and-drop or click-to-browse, any file type, up to 50 MB
- **Progress**: Real-time upload progress bar with percentage
- **Shareable link**: Unique UUID-based URL generated for every file
- **Copy link**: One-click clipboard copy
- **QR code**: Dark-mode QR code for mobile scanning
- **Auto-delete**: Files expire after 1 hour; cron runs every 5 min to clean up
- **User accounts**: Optional login/signup using bcrypt + JWT
- **File history**: Logged-in users see their upload history with download counts
- **Download page**: File info card with metadata, download button, QR

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/signup | Create account |
| POST | /api/auth/login | Login |
| GET  | /api/auth/me | Current user info |
| POST | /api/files/upload | Upload a file |
| GET  | /api/files/:id/info | File metadata |
| GET  | /api/files/:id/qr | QR code (data URL) |
| GET  | /api/files/my | User's file history |
| DELETE | /api/files/:id | Delete a file |
| GET  | /download/:id | Download the file (with original filename) |

## Database Schema

**users**: id, username, email, password_hash, created_at  
**files**: id (UUID), original_name, stored_name, mime_type, size, user_id, download_count, expires_at, created_at

## Configuration

- **File expiry**: `FILE_EXPIRY_MS` in `backend/src/routes/files.js` (default: 1 hour)
- **Max file size**: `MAX_FILE_SIZE` in `backend/src/routes/files.js` (default: 50 MB)
- **JWT secret**: `JWT_SECRET` env var (default fallback for dev)
- **Backend port**: `PORT` env var (default: 3001)
