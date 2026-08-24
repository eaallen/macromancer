# Macromancer

Record a knight as a macro. Send the copies. Surround the giant.

Play at [macromancer.web.app](https://macromancer.web.app).

## How it was built

The game was directed in one sitting (about 3 hours, the night of August 15–16 2026) with Cursor agents writing the code. Charts, prompt counts, and the estimated token total are on [the making-of page](https://macromancer.web.app/how).

Source: this repository.

## Stack

- Vite 7 + TypeScript
- [Babylon.js](https://www.babylonjs.com/) 8
- [KayKit](https://kaylousberg.com/) characters and scenery (CC0)
- Firebase Hosting, Cloud Firestore, anonymous Auth, Google Analytics

## Local

```bash
npm install
npm run dev
```

Then open the printed localhost URL. `npm run build` writes `dist/`. `npm run deploy` builds and deploys hosting, Firestore, and Auth to the `fire-rat` Firebase project (site `macromancer`).
