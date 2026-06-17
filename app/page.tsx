"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const Map = dynamic(() => import("../components/Map"), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden">
      <header className="flex h-14 items-center justify-between border-b bg-white px-4">
        <div>
          <h1 className="text-xl font-bold leading-none">Forager</h1>
          <p className="text-xs text-gray-600">Harvest map</p>
        </div>

        <Link href="/add" className="rounded bg-black px-3 py-2 text-sm text-white">
          + Add
        </Link>
      </header>

      <section className="h-[calc(100vh-56px)]">
        <Map />
      </section>
    </main>
  );
}