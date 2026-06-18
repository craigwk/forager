"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import exifr from "exifr";
import Link from "next/link";
import { supabase } from "../../lib/supabase";


const AddLocationMap = dynamic(() => import("../../components/AddLocationMap"), {
    ssr: false,
});

type SavedLocation = {
    id: string;
    photoName: string;
    observedDate: string;
    latitude: number | null;
    longitude: number | null;
    species: string;
    stage: string;
    estimatedYield: string;
    access: string;
    notes: string;
    createdAt: string;
};

export default function AddLocationPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [photoName, setPhotoName] = useState("");
    const [photoPreview, setPhotoPreview] = useState("");
    const [observedDate, setObservedDate] = useState("");
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [message, setMessage] = useState("");

    const [species, setSpecies] = useState("Elder");
    const [stage, setStage] = useState("Budding");
    const [estimatedYield, setEstimatedYield] = useState("<20 heads / very small");
    const [access, setAccess] = useState("Public");
    const [notes, setNotes] = useState("");
    const [savedLocation, setSavedLocation] = useState<SavedLocation | null>(null);

    const isExistingLocation = Boolean(
        searchParams.get("lat") && searchParams.get("lng")
    );

    useEffect(() => {
        const lat = searchParams.get("lat");
        const lng = searchParams.get("lng");
        const speciesParam = searchParams.get("species");

        if (lat && lng) {
            setLatitude(Number(lat));
            setLongitude(Number(lng));
            setMessage("Adding observation to existing location.");
        }

        if (speciesParam) {
            setSpecies(speciesParam);
        }

        setObservedDate(new Date().toISOString().split("T")[0]);
    }, [searchParams]);

    async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;

        setPhotoName(file.name);
        setPhotoPreview(URL.createObjectURL(file));
        setMessage("Reading photo data...");

        const gps = await exifr.gps(file);
        const exif = await exifr.parse(file);

        if (gps?.latitude && gps?.longitude && !isExistingLocation) {
            setLatitude(gps.latitude);
            setLongitude(gps.longitude);
            setMessage("Location detected from photo. You can drag the marker to adjust it.");
        } else if (isExistingLocation) {
            setMessage("Photo added. Using existing location.");
        } else {
            setMessage("No GPS found. Click the map to add the location manually.");
        }

        if (exif?.DateTimeOriginal) {
            const date = new Date(exif.DateTimeOriginal);
            setObservedDate(date.toISOString().split("T")[0]);
        }
    }

    async function handleSaveLocation() {
        const locationRecord: SavedLocation = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            photoName,
            observedDate,
            latitude,
            longitude,
            species,
            stage,
            estimatedYield,
            access,
            notes,
            createdAt: new Date().toISOString(),
        };

        console.log("Saving to Supabase:", {
            species,
            observedDate,
            latitude,
            longitude,
            stage,
            estimatedYield,
            access,
            notes,
            photoName,
        });

        const {
            data: { user },
        } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from("observations")
            .insert({
                species,
                observed_date: observedDate || null,
                latitude,
                longitude,
                stage,
                estimated_yield: estimatedYield,
                access,
                notes,
                photo_name: photoName,
                created_by: user?.id,
            })
            .select();

        console.log("Supabase response:", { data, error });

        if (error) {
            console.error("Supabase save error:", error);
            alert("Could not save observation.");
            return;
        }

        setSavedLocation(locationRecord);
        router.push("/");
    }

    return (
        <main className="p-4 max-w-xl mx-auto">
            <h1 className="text-3xl font-bold mb-4">
                {isExistingLocation ? "Add Observation" : "Add Harvest Location"}
            </h1>

            <Link href="/" className="mb-4 inline-block underline">
                ← Back to map
            </Link>

            <form className="space-y-4">
                <div>
                    <label className="block mb-2 font-semibold">
                        Photo {isExistingLocation && <span className="font-normal">(optional)</span>}
                    </label>
                    <input type="file" accept="image/*" onChange={handlePhotoChange} />
                </div>

                {photoPreview && (
                    <img
                        src={photoPreview}
                        alt={photoName}
                        className="w-full rounded border object-cover"
                    />
                )}

                {message && <p>{message}</p>}

                <div>
                    <label className="block mb-1 font-semibold">Location</label>
                    <AddLocationMap
                        key={`${latitude ?? "manual"}-${longitude ?? "manual"}`}
                        latitude={latitude}
                        longitude={longitude}
                        setLatitude={setLatitude}
                        setLongitude={setLongitude}
                    />
                </div>

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
                    <label className="block mb-1 font-semibold">Species</label>
                    <select
                        value={species}
                        onChange={(e) => setSpecies(e.target.value)}
                        className="w-full rounded border p-2"
                    >
                        <option>Elder</option>
                        <option>Apple</option>
                        <option>Pear</option>
                        <option>Damson</option>
                        <option>Sloe</option>
                        <option>Wild Garlic</option>
                        <option>Other</option>
                    </select>
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
                    onClick={handleSaveLocation}
                    className="rounded bg-black px-4 py-2 text-white"
                >
                    Save observation
                </button>
            </form>

            {savedLocation && (
                <div className="mt-6 rounded border bg-gray-50 p-4">
                    <h2 className="mb-2 text-xl font-bold">Saved preview</h2>
                    <pre className="overflow-auto text-sm">
                        {JSON.stringify(savedLocation, null, 2)}
                    </pre>
                </div>
            )}
        </main>
    );
}