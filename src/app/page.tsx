export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="text-center space-y-3">
        <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">
          MediTrack
        </h1>
        <p className="text-base text-zinc-600 dark:text-zinc-400">
          Next.js, TypeScript, and Tailwind CSS setup complete.
        </p>
      </div>
    </main>
  );
}
