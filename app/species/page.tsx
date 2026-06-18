import Link from "next/link";
import { SPECIES } from "../../data/species";

export default function SpeciesGuidePage() {
    return (
        <main className="min-h-dvh bg-[var(--cream)] p-4 text-[var(--bark)]">
            <div className="mb-6">
                <Link
                    href="/"
                    className="text-sm font-semibold text-[var(--forest)] underline"
                >
                    ← Back to map
                </Link>

                <h1 className="mt-4 text-3xl font-bold text-[var(--forest)]">
                    📖 Species Guide
                </h1>

                <p className="mt-2 text-sm text-[var(--bark)]/70">
                    Identification notes, harvest seasons and safety information.
                </p>
            </div>

            <div className="space-y-4">
                {SPECIES.map((species) => (
                    <article
                        key={species.id}
                        className="rounded-2xl border border-[var(--sage)] bg-white p-4 shadow-sm"
                    >
                        <div className="flex items-start gap-4">
                            <div className="text-4xl">{species.emoji}</div>

                            <div className="flex-1">
                                <h2 className="text-xl font-bold text-[var(--forest)]">
                                    {species.name}
                                </h2>

                                {species.scientificName && (
                                    <p className="italic text-sm text-[var(--bark)]/70">
                                        {species.scientificName}
                                    </p>
                                )}

                                {species.season && (
                                    <p className="mt-2 text-sm">
                                        <strong>Season:</strong> {species.season}
                                    </p>
                                )}

                                {species.description && (
                                    <p className="mt-2 text-sm">
                                        {species.description}
                                    </p>
                                )}

                                {species.edibleParts.length > 0 && (
                                    <div className="mt-3">
                                        <strong className="text-sm">
                                            Edible parts
                                        </strong>

                                        <ul className="mt-1 list-disc pl-5 text-sm">
                                            {species.edibleParts.map((part) => (
                                                <li key={part}>{part}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {species.warnings.length > 0 && (
                                    <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
                                        <strong className="text-sm text-red-900">
                                            Warnings
                                        </strong>

                                        <ul className="mt-1 list-disc pl-5 text-sm text-red-900">
                                            {species.warnings.map((warning) => (
                                                <li key={warning}>{warning}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </article>
                ))}
            </div>
        </main>
    );
}