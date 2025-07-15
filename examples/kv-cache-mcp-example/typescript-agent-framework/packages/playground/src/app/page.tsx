import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-8">
        <h1 className="text-4xl font-bold">Playground</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/chat"
            className="bg-card text-card-foreground p-6 rounded-lg border border-border hover:border-primary transition-colors"
          >
            <h2 className="text-2xl font-semibold mb-2">Chat Interface</h2>
            <p className="text-muted-foreground">
              A chat interface built with shadcn/ui and Tailwind CSS v4
            </p>
          </Link>
          
          {/* Add more links to other examples here */}
        </div>
      </div>
    </main>
  );
}
