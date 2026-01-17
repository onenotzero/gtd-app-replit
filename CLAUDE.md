# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Getting Things Done (GTD) task management application built with React, Express, and PostgreSQL. Implements David Allen's GTD methodology with email integration, Google Calendar sync, and a complete processing workflow.

User preference: Simple, everyday language.

## Development Commands

```bash
# Development
npm run dev              # Start development server with hot reload
npm run check            # Run TypeScript type checking

# Database
npm run db:push          # Push database schema changes to Neon PostgreSQL

# Production
npm run build            # Build both frontend (Vite) and backend (esbuild)
npm start                # Start production server
```

## Architecture

### Tech Stack

- **Frontend**: React 18 + TypeScript, Vite, TanStack Query (React Query), Wouter routing
- **Backend**: Express.js + TypeScript (ESM modules), Drizzle ORM
- **Database**: PostgreSQL via Neon serverless
- **UI**: Radix UI primitives, Tailwind CSS, shadcn/ui components
- **External**: Google Calendar API (via Replit connectors), IMAP/SMTP email integration

### Directory Structure

```
client/src/
  components/          # React components
    processing-dialog.tsx    # GTD decision tree workflow
    sidebar-nav.tsx          # Responsive navigation (mobile/desktop)
    ui/                      # shadcn/ui components
  pages/              # Route page components
  hooks/              # Custom React hooks
  lib/                # Utility functions

server/
  index.ts            # Express server setup
  routes.ts           # API endpoint definitions
  storage.ts          # Database layer (Drizzle ORM)
  services/
    email.ts          # IMAP/SMTP email integration
    google-calendar.ts # Google Calendar API integration

shared/
  schema.ts           # Shared TypeScript types and Zod schemas
```

### Data Flow

1. **Frontend State**: TanStack Query manages server state with automatic caching and refetching
2. **API Layer**: RESTful endpoints in `server/routes.ts` handle CRUD operations
3. **Storage Layer**: `server/storage.ts` provides database interface using Drizzle ORM
4. **Database**: PostgreSQL tables for tasks, projects, contexts, and emails
5. **External Services**:
   - Email service fetches in background (async) to prevent API timeouts
   - Calendar API fetches fresh tokens per request via Replit connectors

### Key Components

**ProcessingDialog** (`client/src/components/processing-dialog.tsx`)
- Implements complete GTD decision tree with discrete step-based navigation
- Features: Full back button navigation at every step (except first), form data preservation
- Workflow: Is it actionable? → Non-actionable (trash/reference/someday) OR Actionable (next action → 2-minute rule → delegate → project → organize)
- Verb-first naming encouraged via UI hints but not enforced

**Sidebar Navigation** (`client/src/components/sidebar-nav.tsx`)
- Mobile responsive: < 1024px shows hamburger menu with slide-out drawer
- Desktop: ≥ 1024px shows persistent sidebar
- Navigation order (bottom-to-top): Projects, Calendar, Waiting For, Next Actions, Inbox, Dashboard

**Email Integration** (`server/services/email.ts`)
- IMAP fetch runs in background to prevent timeout
- GET /api/emails returns existing emails immediately while triggering async sync
- Emails processed through same GTD workflow as tasks

**Calendar Integration** (`server/services/google-calendar.ts`)
- Google Calendar API via Replit connectors
- Fresh token fetching per request to avoid stale tokens
- Supports both timed and all-day events
- Shows upcoming events within next 7 days

### Database Schema

Core tables managed by Drizzle ORM:
- **tasks**: Task details, status, project/context relationships, email linkage
- **projects**: Organizational containers with active/inactive status
- **contexts**: GTD contexts (locations, tools, situations)
- **emails**: Email messages with processing status

Task statuses: inbox, next_action, waiting, someday, reference, done

Extended GTD fields: referenceCategory, notes (someday/maybe), waitingFor, waitingForFollowUp, timeEstimate, energyLevel, deferCount

## Code Patterns

### API Endpoints

All endpoints in `server/routes.ts` follow RESTful conventions:
```
GET    /api/tasks           # List all tasks
POST   /api/tasks           # Create task
PATCH  /api/tasks/:id       # Update task
DELETE /api/tasks/:id       # Delete task
```

### Validation

- Shared Zod schemas in `shared/schema.ts` for type-safe validation
- React Hook Form + Zod on frontend
- Express middleware validates requests on backend

### Styling

- Tailwind CSS with utility classes
- CSS custom properties for theming (`theme.json`)
- Responsive breakpoint: `lg:` (1024px) for mobile/desktop split

## External Dependencies

### Required Services

- **Neon Database**: PostgreSQL database connection string in environment variables
- **Email Server**: IMAP/SMTP credentials for email integration
- **Google Calendar**: OAuth credentials via Replit connectors (supports automatic token rotation)

### Database Migrations

Use Drizzle Kit for schema changes:
```bash
npm run db:push  # Push schema to database (development)
```

Schema definition in `shared/schema.ts` (shared between frontend/backend).

## Important Notes

- Application uses ESM modules (`"type": "module"` in package.json)
- Frontend and backend share types via `shared/` directory
- Email fetching is asynchronous - GET /api/emails triggers background sync
- Calendar tokens fetched fresh per request to prevent staleness
- Mobile navigation auto-closes drawer after page selection
- ProcessingDialog prevents form auto-submission with discrete step navigation
