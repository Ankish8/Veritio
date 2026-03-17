import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col justify-center text-center flex-1">
      <h1 className="text-2xl font-bold mb-4">Veritio Documentation</h1>
      <p className="text-fd-muted-foreground mb-6">
        Open-source UX research platform for Card Sorts, Tree Tests, Surveys, and more.
      </p>
      <p>
        <Link href="/docs" className="font-medium underline">
          Get Started →
        </Link>
      </p>
    </div>
  );
}
