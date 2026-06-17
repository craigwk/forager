"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

type Props = {
    latitude: number;
    longitude: number;
    species: string;
    onClose: () => void;
    onSaved: () => void;
};

export default function ObservationModal({
    latitude,
    longitude,
    species,
    onClose,
    onSaved,
}: Props) {
    const [observedDate, setObservedDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [stage, setStage] = useState("Budding");
    const [estimatedYield, setEstimatedYield] = useState("<20 heads / very small");
    const [access, setAccess] = useState("Public");
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);

    async function handleSave() {
        setSaving(true);

        const { error } = await supabase.from("observations").insert({
            species,
            observed_date: observedDate || null,
            latitude,
            longitude,
            stage,
            estimated_yield: estimatedYield,
            access,
            notes,
            photo_name: "",
        });

        setSaving(false);

        if (error) {
            console.error("Supabase save error:", error);
            alert("Could not save observation.");
            return;
        }

        onSaved();
        onClose();
    }

    return (
        <div className="fixed inset-0 z-[2000] flex items-end bg-black/40">
            <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 shadow-lg">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold">Add observation</h2>
                        <p className="text-sm text-gray-600">{species}</p>
                    </div>

                    <button type="button" onClick={onClose} className="text-xl">
                        ×
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block mb-1 font-semibold">Observed Date</label>
                        <input
                            type="date"
                            value={observedDate}
                            onChange={(e) => setObservedDate(e.target.value)}
                            className="w-full rounded border p-2"
                        />
                    </div>

                    <div>
                        <label className="block mb-1 font-semibold">Stage at Observation</label>
                        <select
                            value={stage}
                            onChange={(e) => setStage(e.target.value)}
                            className="w-full rounded border p-2"
                        >
                            <option>Budding</option>
                            <option>Peak flower</option>
                            <option>Past flower</option>
                            <option>Green berries / fruit</option>
                            <option>Ripe berries / fruit</option>
                            <option>Dormant / not in season</option>
                        </select>
                    </div>

                    <div>
                        <label className="block mb-1 font-semibold">Estimated yield</label>
                        <select
                            value={estimatedYield}
                            onChange={(e) => setEstimatedYield(e.target.value)}
                            className="w-full rounded border p-2"
                        >
                            <option>&lt;20 heads / very small</option>
                            <option>20-50 heads / small</option>
                            <option>50-100 heads / medium</option>
                            <option>100+ heads / large</option>
                            <option>Huge / exceptional</option>
                        </select>
                    </div>

                    <div>
                        <label className="block mb-1 font-semibold">Access</label>
                        <select
                            value={access}
                            onChange={(e) => setAccess(e.target.value)}
                            className="w-full rounded border p-2"
                        >
                            <option>Public</option>
                            <option>Public but awkward</option>
                            <option>Visible but private</option>
                            <option>Unknown</option>
                        </select>
                    </div>

                    <div>
                        <label className="block mb-1 font-semibold">Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full rounded border p-2"
                            rows={4}
                            placeholder="e.g. checked today, now past flower"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full rounded bg-black px-4 py-3 text-white disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "Save observation"}
                    </button>
                </div>
            </div>
        </div>
    );
}