"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const Map = dynamic(() => import("../components/Map"), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="flex h-dvh w-screen flex-col overflow-hidden bg-white text-black">
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-white px-4">
        <div>
          <h1 className="text-xl font-bold leading-none">Forager</h1>
          <p className="text-xs text-gray-600">Harvest map</p>
        </div>

        <Link href="/add" className="rounded bg-black px-3 py-2 text-sm text-white">
          + Add
        </Link>
      </header>

      <section className="min-h-0 flex-1">
        <Map />
      </section>

      <nav className="flex h-14 shrink-0 items-center justify-around border-t bg-white text-sm">
        <Link href="/" className="font-semibold">
          Map
        </Link>
        <Link href="/add" className="font-semibold">
          Add manually
        </Link>
        <button type="button">Filters</button>
      </nav>
    </main>
  );
}