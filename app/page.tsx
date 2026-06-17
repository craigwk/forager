"use client";

import dynamic from "next/dynamic";

const Map = dynamic(() => import("../components/Map"), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="p-4">
      <h1 className="text-3xl font-bold mb-4">Forager</h1>
      <Map />
    </main>
  );
}