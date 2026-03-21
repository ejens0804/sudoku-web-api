# Sudoku — Firebase Edition

A full-featured Sudoku web app with user authentication, cloud-synced stats, leaderboards, and polished gameplay features including daily puzzles, challenge codes, and customizable settings.

## Instructions for Build and Use

Steps to build and/or run the software:

1. Install [Node.js](https://nodejs.org/) v18 or newer
2. Clone or download this repository, then open a terminal in the project folder and run `npm install`
3. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com), enable Email/Password and Google authentication, create a Firestore database, and paste your Firebase config into `src/firebase.js`
4. Run `npm run dev` and open `http://localhost:5173` in your browser

Instructions for using the software:

1. Create an account or sign in with Google from the login screen
2. Select a difficulty (Easy, Medium, Hard) or play the Daily Puzzle from the main menu
3. Fill in the grid using the number pad — use Notes mode to pencil in candidates, Hint for a revealed cell (+30s penalty), Check to highlight mistakes, or Undo to step back
4. Your stats and best times are saved automatically to the cloud after each completed game
5. Open Settings (gear icon) to customize accent color, grid highlighting intensity, sound, and gameplay options

## Development Environment

To recreate the development environment, you need the following software and/or libraries with the specified versions:

* [Node.js](https://nodejs.org/) v18+
* [React](https://react.dev/) 18 (via npm)
* [Vite](https://vitejs.dev/) 5 (via npm)
* [Firebase](https://firebase.google.com/) JS SDK v11 (via npm) — Auth + Firestore
* A Firebase project with Email/Password auth, Google auth, and Firestore enabled

## Useful Websites to Learn More

I found these websites useful in developing this software:

* [Firebase Documentation](https://firebase.google.com/docs)
* [React Documentation](https://react.dev/)
* [Vite Documentation](https://vitejs.dev/guide/)
* [Firestore Data Modeling Guide](https://firebase.google.com/docs/firestore/data-model)
* [Web Audio API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

## Future Work

The following items I plan to fix, improve, and/or add to this project in the future:

* [ ] Add a friends/social system so users can compare stats with specific people
* [ ] Support offline play with automatic sync when reconnected
* [ ] Add more puzzle difficulty tuning (e.g., beginner mode with more givens)
* [ ] Add a color-blind-friendly accent palette option
* [ ] Improve mobile layout and touch controls for smaller screens
