# GTD Task Management Application

## Overview

This is a Getting Things Done (GTD) task management system built with React, Express, and PostgreSQL. The application follows David Allen's GTD methodology, providing a comprehensive system for capturing, organizing, and tracking tasks through their complete lifecycle. The system includes email integration for automatic task creation and supports the full GTD workflow from inbox processing to project completion.

**November 2025 Update:** Implemented unified processing workflow for all inbox items (tasks and emails) following the complete GTD decision tree. The ProcessingDialog component guides users through systematic decision-making with zero-leak policy enforcement.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with React and TypeScript, using a modern component-based architecture:

- **Component Library**: Radix UI primitives with shadcn/ui styling system for consistent, accessible components
- **Styling**: Tailwind CSS with CSS custom properties for theming support
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Build Tool**: Vite for fast development and optimized production builds

The application follows a feature-based organization with reusable UI components, custom hooks, and utility functions. The GTD methodology is reflected in the navigation structure with dedicated views for Inbox, Next Actions, Projects, and Contexts.

**Key Components:**
- **ProcessingDialog**: Implements the complete GTD decision tree with discrete step-based navigation to prevent form auto-submission. Guides users through: Is it actionable? → Non-actionable (trash/reference/someday) OR Actionable (next action → 2-minute rule → delegate → project → organize).
- **Unified Inbox**: Displays combined task and email items sorted by received date (FIFO). Single "Process" button per item launches ProcessingDialog with context-aware processing.

### Backend Architecture

The backend uses Express.js with TypeScript in an ESM module configuration:

- **API Design**: RESTful endpoints organized by resource (tasks, projects, contexts, emails)
- **Request Handling**: Express middleware for JSON parsing, URL encoding, and request logging
- **Error Handling**: Centralized error middleware with structured error responses
- **Storage Abstraction**: Interface-based storage layer supporting both in-memory and database implementations
- **Email Integration**: IMAP/SMTP service for fetching incoming emails and processing them through the same GTD workflow as tasks
- **Async IMAP Fetch**: Email fetching happens in background to prevent API timeouts; GET /api/emails returns existing emails immediately while triggering background sync

The server architecture emphasizes separation of concerns with dedicated route handlers, storage interfaces, and service classes for external integrations.

### Database Schema

The application uses PostgreSQL with Drizzle ORM for type-safe database operations:

- **Tasks Table**: Core entity storing task details, status, relationships to projects/contexts, and optional email linkage
- **Projects Table**: Organizational containers for related tasks with active/inactive status
- **Contexts Table**: GTD contexts (locations, tools, or situations) for task organization
- **Emails Table**: Email messages with processing status and metadata for task generation

The schema supports GTD principles with task statuses (inbox, next_action, waiting, someday, reference, done) and proper relationships between entities. Extended GTD fields include referenceCategory, notes (for someday/maybe), waitingFor, waitingForFollowUp, timeEstimate, energyLevel, and deferCount for comprehensive task management. Database migrations are managed through Drizzle Kit.

### Development Workflow

The project uses a full-stack TypeScript setup with shared type definitions:

- **Shared Schema**: Common type definitions and validation schemas used by both frontend and backend
- **Build Process**: Vite for frontend bundling, esbuild for backend compilation
- **Development Server**: Hot module replacement for frontend, tsx for backend development
- **Type Safety**: Strict TypeScript configuration with path mapping for clean imports

## External Dependencies

### Database Services

- **Neon Database**: Serverless PostgreSQL provider for cloud database hosting
- **Drizzle ORM**: Type-safe database toolkit for PostgreSQL with migration support
- **connect-pg-simple**: PostgreSQL session store for Express sessions

### Email Integration

- **IMAP/SMTP Servers**: External email servers for fetching incoming messages and sending responses
- **Nodemailer**: Email sending capabilities for notifications and responses
- **Mailparser**: Email content parsing for extracting structured data from messages

### UI and Styling

- **Radix UI**: Headless component primitives for accessible UI components
- **Tailwind CSS**: Utility-first CSS framework for rapid styling
- **Lucide React**: Icon library for consistent iconography
- **shadcn/ui**: Pre-built component system combining Radix UI with Tailwind CSS

### Development Tools

- **TanStack Query**: Server state management with caching and synchronization
- **React Hook Form**: Form library with validation integration
- **Zod**: Schema validation for runtime type checking
- **Date-fns**: Date manipulation and formatting utilities

The application is designed to be deployed on platforms supporting Node.js with PostgreSQL databases, with email integration requiring IMAP/SMTP server credentials for full functionality.