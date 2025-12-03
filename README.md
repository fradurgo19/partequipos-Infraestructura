# Maintenance Management System

A comprehensive web-based maintenance management system built with React, TypeScript, and Supabase. This application digitizes maintenance requests, tasks, service orders, and site control with centralized information management, traceability, and automatic notifications.

## Features

### Core Modules

1. **Sites and Projects Module**
   - Manage physical locations and projects
   - Store site measurements, photos, and blueprints
   - Track intervention history
   - Location mapping integration ready

2. **Tasks Module**
   - Create and assign maintenance tasks
   - Track task status with visual indicators (🔴 Pending, 🟠 In Progress, 🟢 Completed)
   - Budget-based approval workflows
   - Digital timeline tracking
   - Photo documentation support

3. **Role-Based Access Control**
   - 👷‍♂️ Infrastructure (Edison): Full CRUD access
   - 🧑‍💼 Supervision (Felipe, Eloísa): Approval permissions
   - 👨‍🔧 Contractors: Task execution
   - 👨‍💻 Administrator: System management
   - 🧑‍🏫 Internal Clients: Request submission

### Design System

- **Color Palette**
  - Corporate Red: #cf1b22
  - Medium Gray: #50504f
  - White: #FFFFFF

- **Atomic Design Structure**
  - Atoms: Basic UI components (buttons, inputs, badges)
  - Molecules: Composite components (modals, status indicators)
  - Organisms: Complex components (navbar, sidebar)
  - Pages: Complete views

## Tech Stack

- **Frontend**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **Icons**: Lucide React
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth

## Database Schema

The system includes comprehensive tables:
- `profiles` - User profiles with role management
- `sites` - Physical locations and projects
- `contractors` - Service provider information
- `tasks` - Main task management
- `task_timeline` - Audit trail for tasks
- `service_orders` - Formal service orders
- `measurements` - Measurement documentation
- `internal_requests` - Department requests
- `quotations` - Three-quotation comparison
- `notifications` - System notifications

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Add your Supabase credentials:
     ```
     VITE_SUPABASE_URL=your_supabase_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

## Database Setup

The database schema is automatically applied via migrations. The initial migration creates:

- All necessary tables with proper relationships
- Row Level Security (RLS) policies
- Indexes for optimized queries
- Automatic timestamp management
- User profile creation triggers

### User Roles

Users are assigned roles that determine their access:

- `admin` - Full system access
- `infrastructure` - Full maintenance operations
- `supervision` - Approval and oversight
- `contractor` - Task execution
- `internal_client` - Request submission only

## Project Structure

```
src/
├── atoms/           # Basic UI components
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Select.tsx
│   ├── Textarea.tsx
│   ├── Badge.tsx
│   └── Card.tsx
├── molecules/       # Composite components
│   ├── Modal.tsx
│   └── StatusIndicator.tsx
├── organisms/       # Complex components
│   ├── Navbar.tsx
│   └── Sidebar.tsx
├── pages/           # Route components
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── Sites.tsx
│   └── Tasks.tsx
├── context/         # Global state
│   └── AuthContext.tsx
├── lib/             # Utilities
│   └── supabase.ts
├── types/           # TypeScript definitions
│   └── index.ts
└── App.tsx          # Main application
```

## Key Features Implemented

### Authentication
- Email/password authentication
- Role-based access control
- Automatic profile creation
- Secure session management

### Dashboard
- Role-based module visibility
- Real-time statistics
- Quick access cards
- Responsive design

### Sites Management
- CRUD operations for sites
- Location and measurement tracking
- Photo and blueprint storage
- Access control based on user role

### Tasks Management
- Task creation and assignment
- Status tracking with visual indicators
- Budget amount tracking
- Timeline and audit trail
- Filter and search functionality
- Automatic notifications for high-budget tasks

### Security
- Row Level Security on all tables
- Role-based policies
- Authentication required for all operations
- Data privacy enforcement

## Future Enhancements

The following modules are ready for implementation:

1. **Service Orders Module** - Contractor management and PDF generation
2. **Measurements Module** - Photo evidence with watermarking
3. **Internal Requests Module** - Department-based requests
4. **Quotation Comparison Module** - Three-quotation analysis
5. **Photo Watermarking** - Automatic logo and date stamps
6. **PDF Generation** - Service orders and reports
7. **Notification System** - Email/Teams/WhatsApp integration
8. **File Upload** - Document and photo management

## Development

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

### Code Quality

- TypeScript for type safety
- ESLint for code quality
- Consistent component patterns
- Comprehensive error handling

## Contributing

When contributing:
1. Follow the atomic design structure
2. Maintain TypeScript type safety
3. Use the design system colors
4. Ensure responsive design
5. Add proper RLS policies for new tables

## License

This project is proprietary and confidential.

## Support

For support and questions, contact the development team.
