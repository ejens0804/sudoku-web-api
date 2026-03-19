# Sudoku — Firebase Edition

A full-featured Sudoku game with user accounts, persistent stats, and all the gameplay features from NYT Games.

## Features

- **Authentication**: Email/password signup & login, Google sign-in
- **Cloud Stats**: Best times, averages, and game history saved per-user in Firestore
- **Gameplay**: Candidate/notes mode, auto-fill candidates, undo, erase, hints (+30s penalty)
- **Daily Puzzle**: Same puzzle for everyone each day, seeded by date
- **Share Card**: Copy your results to clipboard after winning
- **Light/Dark Theme**: Toggle between themes, persists in-session
- **Confetti**: Celebration animation on puzzle completion
- **Pause**: Hide the board and freeze the timer
- **Streak Tracking**: Consecutive days played counter

## Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Firebase (Auth + Firestore) — no server needed
- **Hosting**: Firebase Hosting (free tier)

---

## Setup Guide

### 1. Prerequisites

- [Node.js](https://nodejs.org/) v18+ installed
- A Google account for Firebase

### 2. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Create a project"** (or "Add project")
3. Name it something like `sudoku-app`
4. Disable Google Analytics (not needed) → **Create Project**

### 3. Enable Authentication

1. In the Firebase Console sidebar, go to **Build → Authentication**
2. Click **"Get Started"**
3. Under **Sign-in method**, enable:
   - **Email/Password** — toggle on, save
   - **Google** (optional) — toggle on, select your support email, save

### 4. Create Firestore Database

1. In the sidebar, go to **Build → Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in production mode"**
4. Pick a region close to you (e.g., `us-central1` for Idaho)
5. Click **Enable**

### 5. Set Firestore Security Rules

1. In Firestore, go to the **"Rules"** tab
2. Replace the rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }
  }
}
```

3. Click **Publish**

### 6. Register Your Web App

1. Go to **Project Settings** (gear icon in sidebar)
2. Scroll down to **"Your apps"**
3. Click the **web icon** (`</>`)
4. Register with a nickname like `sudoku-web`
5. Check **"Also set up Firebase Hosting"** if you want to deploy later
6. Click **Register app**
7. Copy the `firebaseConfig` object — you'll need it next

### 7. Configure the Project

1. Clone/download this project
2. Open `src/firebase.js`
3. Replace the placeholder values with your actual Firebase config:

```js
const firebaseConfig = {
  apiKey:            "AIzaSy...",           // from Firebase console
  authDomain:        "sudoku-app.firebaseapp.com",
  projectId:         "sudoku-app",
  storageBucket:     "sudoku-app.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123",
};
```

### 8. Install & Run Locally

```bash
cd sudoku-firebase
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. Create an account and start playing!

### 9. Deploy to Firebase Hosting (Optional, Free)

```bash
# Install Firebase CLI (one-time)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize hosting in your project folder
firebase init hosting
# → Select your project
# → Set public directory to: dist
# → Configure as single-page app: Yes
# → Don't overwrite index.html

# Build the production bundle
npm run build

# Deploy
firebase deploy --only hosting
```

Your app will be live at `https://your-project.web.app`!

---

## Project Structure

```
sudoku-firebase/
├── index.html              # Entry HTML
├── package.json            # Dependencies
├── vite.config.js          # Vite config
└── src/
    ├── main.jsx            # React mount point
    ├── App.jsx             # Root component — screen routing
    ├── firebase.js         # Firebase init (PUT YOUR CONFIG HERE)
    ├── AuthContext.jsx      # Auth state + Firestore stats provider
    ├── ThemeContext.jsx     # Light/dark theme provider
    ├── LoginScreen.jsx     # Login/signup UI
    ├── MenuScreen.jsx      # Main menu with difficulty select
    ├── GameScreen.jsx      # Full game board + controls
    ├── StatsScreen.jsx     # Personal stats dashboard
    ├── Confetti.jsx        # Confetti animation component
    └── sudoku.js           # Puzzle generator/solver engine
```

## Firestore Data Model

Each user gets one document at `users/{uid}`:

```json
{
  "displayName": "Ethan",
  "createdAt": "2026-03-18T...",
  "stats": {
    "easy": [{ "time": 245, "hints": 0, "date": "2026-03-18T..." }],
    "medium": [],
    "hard": [],
    "daily": [],
    "streak": 3,
    "lastPlayDate": "Wed Mar 18 2026"
  }
}
```

## Free Tier Limits (Spark Plan)

These limits are extremely generous for a personal Sudoku app:

| Resource            | Free Limit          |
|---------------------|---------------------|
| Auth users          | Unlimited           |
| Firestore storage   | 1 GB                |
| Firestore reads     | 50,000/day          |
| Firestore writes    | 20,000/day          |
| Hosting storage     | 10 GB               |
| Hosting transfer    | 360 MB/day          |

You'd need thousands of active daily users to come close to these limits.
