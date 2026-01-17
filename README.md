# 🎓 Modern Learning Management System (LMS)

A beautiful, full-featured Learning Management System built with the latest web technologies. Features a modern UI with dark mode, comprehensive course management, progress tracking, quizzes, certificates, discussions, and more.

## ✨ Features

### 🎯 For Students
- **Course Learning**
  - Browse and enroll in courses with categories
  - Multiple content types: Video, PDF, iFrame, 3D Models
  - Interactive lesson player with completion tracking
  - Take quizzes with instant feedback
  - View detailed progress dashboard with charts
  - Earn and download certificates
  - Leave reviews and ratings on courses
  - Participate in lesson discussions

- **User Profile Management**
  - Customizable profile with avatar upload
  - Bio and personal information
  - View learning statistics and achievements

- **Progress Tracking**
  - Visual progress bars for each course
  - Quiz attempt history with scores
  - Completed lessons timeline
  - Average performance metrics
  - Achievement badges

- **Certificates**
  - Automatic certificate generation on completion
  - Download as PDF
  - Share on social media
  - Professional certificate design

### 👨‍🏫 For Admins/Instructors
- **Course Management**
  - Create and edit courses with rich descriptions
  - Organize courses by categories
  - Add lessons with multiple content types
  - Upload thumbnails and cover images
  - Publish/unpublish courses
  - Search and filter courses

- **Category Management**
  - Create course categories
  - Organize courses for better navigation
  - Category descriptions and metadata

- **Lesson Builder**
  - Support for Video, PDF, iFrame, and 3D content
  - Drag-and-drop lesson ordering
  - Rich text descriptions
  - Embed external content

- **Quiz Builder**
  - Multiple choice questions
  - Fill-in-the-blank questions
  - Automatic grading system
  - Question ordering and management
  - Detailed quiz analytics

- **Analytics Dashboard**
  - Total student and course statistics
  - Enrollment trends with charts
  - Quiz performance metrics
  - Recent activity feed
  - Visual data representation with Recharts
  - Export analytics data

- **Student Management**
  - View all enrolled students
  - Track individual progress
  - Monitor quiz attempts
  - Issue certificates

### 🎨 Modern UI/UX Features
- **Beautiful Design**
  - Clean, professional interface
  - Gradient backgrounds and glass morphism
  - Smooth animations and transitions
  - Custom scrollbars
  - Responsive design for all devices

- **Dark Mode**
  - System preference detection
  - Manual toggle with smooth transitions
  - Optimized color schemes
  - Persistent preference

- **Interactive Components**
  - Toast notifications (Sonner)
  - Loading skeletons
  - Progress indicators
  - Modal dialogs
  - Tabbed interfaces

- **Form Validation**
  - Zod schema validation
  - Real-time error feedback
  - Password strength indicator
  - Field-level validation

- **Enhanced Navigation**
  - Active route highlighting
  - User avatars in navbar
  - Theme toggle in header
  - Breadcrumb navigation

## 🛠️ Tech Stack

- **Framework**: Next.js 16.1.2 (App Router)
- **Language**: TypeScript 5.9.3
- **UI Library**: React 19.2.3
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with RLS
- **Styling**: Tailwind CSS 4.1.18
- **Component Library**: Shadcn UI (custom components)
- **Icons**: Lucide React
- **Form Validation**: Zod
- **Charts**: Recharts
- **Notifications**: Sonner
- **Theme**: next-themes
- **3D Models**: Google Model Viewer

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- A Supabase account ([sign up here](https://supabase.com))

### 2. Clone the Repository

```bash
git clone <repository-url>
cd Lms
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Setup Supabase

1. Create a new project in Supabase
2. Go to Project Settings > API
3. Copy your project URL and anon key
4. Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Setup Database

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `schema.sql` from this repository
4. Run the SQL script to create all necessary tables and policies

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### First Time Setup

1. Navigate to `/login`
2. Sign up with an email and password
3. Choose your role (Admin or Student)
4. Check your email for verification (if required by Supabase settings)

### As an Admin

1. Create courses from the Admin dashboard
2. Add lessons to courses (video, PDF, iFrame, or 3D content)
3. Create quizzes for each lesson
4. View analytics on student progress

### As a Student

1. Browse available courses from your dashboard
2. Enroll in courses
3. Complete lessons and mark them as done
4. Take quizzes to test your knowledge
5. Track your progress and quiz scores

## 📊 Database Schema

### Core Tables
- **users** - User profiles with roles, avatars, and bios
- **categories** - Course categories for organization
- **courses** - Course information with thumbnails and status
- **lessons** - Lesson content with multiple media types
- **quizzes** - Quiz metadata linked to lessons
- **questions** - Quiz questions (MCQ and fill-blank)

### Activity Tables
- **course_enrollments** - Student course enrollments with timestamps
- **progress** - Lesson completion tracking with dates
- **quiz_attempts** - Quiz results and scoring history
- **course_reviews** - Course ratings (1-5 stars) and reviews
- **lesson_comments** - Discussion system with nested replies
- **certificates** - Generated certificates with URLs

### Security
- Row Level Security (RLS) enabled on all tables
- Role-based policies for admin and student access
- Secure authentication with Supabase Auth
- Protected routes with Next.js middleware

## 🎨 UI Components

### Shadcn UI Components
- **Forms**: Button, Input, Label, Textarea, Select, Switch
- **Layout**: Card, Dialog, Tabs, Alert
- **Feedback**: Toast, Skeleton, Progress, Badge
- **Media**: Avatar with fallback
- **Navigation**: Custom NavBar with theme toggle

### Custom Components
- **NavBar** - Responsive navigation with active states
- **ThemeToggle** - Dark mode switcher
- **ThemeProvider** - Theme context wrapper

## Building for Production

```bash
npm run build
npm start
```

## Deployment

This application can be deployed to platforms like:
- Vercel (recommended for Next.js)
- Netlify
- Railway
- Any platform that supports Node.js

Make sure to set your environment variables in your deployment platform.

## License

ISC