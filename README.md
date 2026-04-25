# Gettrendli

A personal GLP-1 weight loss tracking app. Log daily nutrition, activity, injections and weight — and see trends, insights, and charts over time.

Built with React + Vite. No backend, no accounts. All data is stored in the browser's localStorage.

## Run locally

```bash
npm install
npm run dev
```

Opens at http://localhost:5174

## Build for production

```bash
npm run build
```

Output goes to `dist/`. Preview the production build locally with:

```bash
npm run preview
```

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repository
3. Vercel auto-detects Vite — no configuration needed
4. Click **Deploy**

Each user's data is stored in their own browser (localStorage), so there is no shared database.
