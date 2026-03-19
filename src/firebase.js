// ─── Firebase Configuration ──────────────────────────────────────────────────
//
// SETUP INSTRUCTIONS:
// 1. Go to https://console.firebase.google.com
// 2. Create a new project (or use an existing one)
// 3. In Project Settings > General, scroll to "Your apps" and click the web icon (</>)
// 4. Register your app (no need to enable Firebase Hosting yet)
// 5. Copy the firebaseConfig object and paste it below
//
// 6. Enable Authentication:
//    - Go to Authentication > Sign-in method
//    - Enable "Email/Password"
//    - (Optional) Enable "Google" provider for Google sign-in
//
// 7. Enable Firestore:
//    - Go to Firestore Database > Create database
//    - Start in "production mode"
//    - Choose a region close to you (e.g., us-central1)
//
// 8. Set Firestore Security Rules (Firestore > Rules):
//
//    rules_version = '2';
//    service cloud.firestore {
//      match /databases/{database}/documents {
//        // Users can only read/write their own document.
//        // list (collection queries + count) is allowed for any authenticated
//        // user so the global stats page can count total players without
//        // exposing individual user data.
//        match /users/{userId} {
//          allow get, write: if request.auth != null
//                            && request.auth.uid == userId;
//          allow list: if request.auth != null;
//        }
//        // Global stats are readable and writable by any authenticated user
//        match /globalStats/{document} {
//          allow read, write: if request.auth != null;
//        }
//      }
//    }
//
// 9. Replace the placeholder values below with your actual Firebase config
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCcQveD2-msyCUhzuucL8OFf4Lfr5GPQMg",
  authDomain: "sudoku-web-api.firebaseapp.com",
  projectId: "sudoku-web-api",
  storageBucket: "sudoku-web-api.firebasestorage.app",
  messagingSenderId: "218687458362",
  appId: "1:218687458362:web:e9f81948902ec1767db903",
  measurementId: "G-1WH320MBCG"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
