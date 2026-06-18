"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import LoginButton from "../components/LoginButton";
import AuthStatus from "../components/AuthStatus";

const Map = dynamic(() => import("../components/Map"), {
  ssr: false,
});

export default function Home() {

  const [addRequest, setAddRequest] = useState(0);

  return (
    <main className="flex h-dvh w-screen flex-col overflow-hidden bg-[var(--cream)] text-[var(--bark)]">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--sage)] bg-[var(--cream)] px-4">
        <div>
          <h1 className="text-xl font-bold leading-none text-[var(--forest)]">
            🌿 Forager
          </h1>
          <p className="text-xs text-[var(--bark)]/70">Harvest map</p>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <LoginButton />

          <button
            type="button"
            onClick={() => setAddRequest((value) => value + 1)}
            className="rounded-full bg-[var(--forest)] px-4 py-2 text-sm font-semibold text-white shadow"
          >
            + Add
          </button>
        </div>
      </header>
      <AuthStatus />

      <section className="min-h-0 flex-1">
        <Map addRequest={addRequest} />
      </section>

      <nav className="flex h-14 shrink-0 items-center justify-around border-t border-[var(--sage)] bg-[var(--cream)] text-sm text-[var(--bark)]">
        <Link href="/" className="font-semibold text-[var(--forest)]">
          Map
        </Link>

        <button
          type="button"
          onClick={() => setAddRequest((value) => value + 1)}
          className="font-semibold"
        >
          Add
        </button>

        <button type="button" className="font-semibold">
          Filters
        </button>
      </nav>
    </main>
  );
}