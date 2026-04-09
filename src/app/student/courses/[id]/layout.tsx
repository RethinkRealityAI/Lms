/**
 * Course viewer layout — hides the parent student NavBar so the
 * course viewer's own LessonNavbar takes over the full viewport.
 *
 * The parent student layout wraps children in <main className="pt-16">.
 * This layout uses negative margin to reclaim that space, and a global
 * style tag to hide the fixed nav when inside a course.
 */
export default function CourseLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Hide the parent fixed NavBar when viewing a course */}
      <style>{`
        nav[aria-label="Main navigation"] { display: none !important; }
      `}</style>
      <div className="-mt-16">
        {children}
      </div>
    </>
  );
}
