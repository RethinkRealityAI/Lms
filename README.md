# Modern LMS - Learning Management System

A modern, visually pleasing Learning Management System built with Next.js 14, TypeScript, Tailwind CSS, Shadcn UI, and Supabase.

## Features

### Admin Panel
- **Course Creator**: Create and manage courses with support for:
  - Video content
  - PDF documents
  - iFrame embeds
  - 3D models (using `<model-viewer>`)
- **Quiz Builder**: Create assessments with:
  - Multiple Choice Questions (MCQ)
  - Fill-in-the-blank questions
- **Analytics Dashboard**: View user progress, quiz scores, and enrollment statistics

### Student Portal
- **Dashboard**: Access assigned courses and browse available courses
- **Interactive Media Player**: View course content in various formats
- **Quiz Interface**: Take quizzes and see immediate results
- **Progress Tracking**: Track completion percentage and learning history

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI
- **Authentication & Database**: Supabase
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

## Database Schema

The application uses the following main tables:

- `users` - User accounts with roles (admin/student)
- `courses` - Course information
- `lessons` - Lesson content within courses
- `quizzes` - Quizzes associated with lessons
- `questions` - Quiz questions (MCQ or fill-in-the-blank)
- `course_enrollments` - Student course enrollments
- `progress` - Lesson completion tracking
- `quiz_attempts` - Quiz attempt history and scores

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