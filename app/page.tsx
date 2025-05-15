"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/age');
    }, 1000);
    
    return () => clearTimeout(timer); // Clean up timer on unmount
  }, [router]);

  return (
    <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10 h-screen">
      <div className="inline-block max-w-xl text-center justify-center">
        <p>Connecting to Uhdi-apa...</p>
        <p><strong>Your First Lookup for First Aid.</strong></p>
        <br/>
        <p>Connecting to Uhdi-apa...</p>
        <p>First Aid? Where does it hurt!</p>
        <p>Uhdi-apa will help you find what you need first!</p>
      </div>
    </section>
  );
}
