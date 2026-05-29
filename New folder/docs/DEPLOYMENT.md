# Deployment Guide

LearnSphere has a Node/Express backend, so GitHub Pages alone is not enough.

## Option 1: Render

1. Push the project to GitHub.
2. Create a new Render Web Service.
3. Use:
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Add environment variables from `.env.example`.

This repo includes `render.yaml`.

## Option 2: Railway

1. Push to GitHub.
2. Import the repository into Railway.
3. Set environment variables.
4. Deploy.

This repo includes `railway.json`.

## Option 3: Docker

```bash
cp .env.example .env
docker compose up --build
```

Open:

```text
http://localhost:3000
```

## Option 4: Vercel

This repo includes `vercel.json`, but Express apps can need small production adjustments on Vercel. Render or Railway is recommended first.
