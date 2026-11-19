# VidyaSetu – Offline Adaptive Learning Platform for Rural Olympiad Preparation

Full-stack **Offline-First Progressive Web Application (PWA)** built with **React + Vite + TypeScript + Tailwind CSS + IndexedDB (`idb`) + Workbox** and **Node.js + Express + SQLite (`node:sqlite`)**.

## Quick Start

```bash
# 1. Install all dependencies (already done)
npm run install:all

# 2. Run both API server (port 4000) and Vite PWA client (port 5173)
npm run dev
```

Open **http://localhost:5173** in your browser.

## Demo Accounts (1-Click Login Available on Sign-In Page)

| Role | Email | Password |
|---|---|---|
| **Student** | `aarav@vidyasetu.edu` | `student123` |
| **Teacher** | `teacher@vidyasetu.edu` | `teacher123` |
| **Administrator** | `admin@vidyasetu.edu` | `admin123` |

## Deploy on Vercel (All-in-One Serverless)

This repository is pre-configured for **Vercel** via `vercel.json` and `api/index.mjs` (Node 22.x runtime):

1. Push this project to a GitHub repository.
2. Go to [vercel.com/new](https://vercel.com/new), import the repo, and keep the default settings (Vercel reads `vercel.json` automatically).
3. *(Optional)* Add an environment variable `JWT_SECRET` in Vercel Project Settings -> Environment Variables.
4. Click **Deploy**.

> **Note:** On Vercel, SQLite runs in ephemeral `/tmp/vidyasetu.db` and automatically re-seeds the demo dataset on cold starts. Student offline downloads and queued attempts persist in the browser's IndexedDB.

## Testing Offline Learning & Automatic Synchronization

1. Sign in as **Student** (`aarav@vidyasetu.edu`).
2. Go to **Subjects & Topics** and click **Download Subject** or **Download** on any chapter (notice the emerald **Downloaded • Offline Ready** badge vs **Online Only**).
3. Go to **Mock Exams** and click **Download Offline** on a test.
4. Click the **Online** pill in the top header (or **Simulate Offline Mode** in **Offline & Sync**) — the app switches to Offline Mode.
5. Practise questions in downloaded topics and attempt a downloaded Mock Exam offline. Notice Online-Only topics are clearly locked/marked while offline, and your answers accumulate in the **Pending Sync** counter in IndexedDB.
6. Click **Go Online** — automatic synchronization immediately uploads all queued practice attempts and exam submissions to SQLite and updates the Teacher & Admin dashboards!

## Implemented Scope (P0 + P1)

- **Student Portal**: Dashboard, Subjects & Topics with Offline Downloads, Practice Module (Topic-wise, Difficulty-wise, Retry Incorrect, Explanations), Timed Mock Examinations (Countdown Timer, Palette, Mark for Review, Auto-Submit, Solution Analysis), Performance Dashboard (Charts, Strengths/Weaknesses, Streaks & Achievements), Smart Adaptive Recommendations, Offline & Synchronization Center, Profile & Settings.
- **Teacher Portal**: Teacher Dashboard, Class/Group Management, Student Roster & Individual Drill-Down, Practice/Exam Assignments with Completion Tracking, Weak Topic & Performance Analytics, Printable & CSV-Exportable Reports, Student Last Sync Monitoring.
- **Administrator Portal**: Platform Analytics, User & Role Management, Subjects & Topics CRUD, Versioned Question Bank CRUD, Mock Exam Builder & Publisher, Content Versioning & Publishing (triggers Content Update notifications on student devices), Synchronization Telemetry Monitoring.
