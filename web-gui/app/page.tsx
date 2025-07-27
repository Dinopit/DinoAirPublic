'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the local GUI interface for free tier
    router.push('/dinoair-gui');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
      <div className="text-center space-y-4">
        <div className="text-6xl">🦕</div>
        <h1 className="text-2xl font-bold">DinoAir Free Tier</h1>
        <p className="text-muted-foreground">Redirecting to local interface...</p>
      </div>
    </div>
  );
}
