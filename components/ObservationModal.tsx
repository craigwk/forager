"use client";

import { useState } from "react";
import exifr from "exifr";
import { supabase } from "../lib/supabase";
import { SPECIES } from "../data/species";

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
    species: initialSpecies,
    onClose,
    onSaved,
}: Props) {
    const [species, setSpecies] = useState(initialSpecies);
    const [observedDate, setObservedDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [stage, setStage] = useState("Budding");
    const [estimatedYield, setEstimatedYield] = useState("<20 heads / very small");
    const [access, setAccess] = useState("Public");
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);
    const [photoName, setPhotoName] = useState("");
    const [photoPreview, setPhotoPreview] = useState("");
    const [photoFile, setPhotoFile] = useState<File | null>(null);

    const [currentLatitude, setCurrentLatitude] = useState(latitude);
    const [currentLongitude, setCurrentLongitude] = useState(longitude);
    const [locationSource, setLocationSource] = useState("Map pin");
    const [gettingLocation, setGettingLocation] = useState(false);



    async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;

        setPhotoFile(file);
        setPhotoName(file.name);
        setPhotoPreview(URL.createObjectURL(file));

        const exif = await exifr.parse(file);

        if (exif?.DateTimeOriginal) {
            const date = new Date(exif.DateTimeOriginal);
            setObservedDate(date.toISOString().split("T")[0]);
        }
    }

    function useCurrentLocation() {
        if (!navigator.geolocation) {
            alert("Your browser does not support location.");
            return;
        }

        setGettingLocation(true);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setCurrentLatitude(position.coords.latitude);
                setCurrentLongitude(position.coords.longitude);
                setLocationSource("Current GPS location");
                setGettingLocation(false);
            },
            (error) => {
                console.error("Location error:", error);
                alert("Could not get your current location. Check location permissions.");
                setGettingLocation(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    }

    async function handleSave() {
        setSaving(true);

        const {
            data: { user },
        } = await supabase.auth.getUser();

        let photoUrl: string | null = null;

        if (photoFile) {
            const fileExt = photoFile.name.split(".").pop();
            const filePath = `${user?.id ?? "anonymous"}/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from("observations-photos")
                .upload(filePath, photoFile);

            if (uploadError) {
                console.error("Upload error:", uploadError);
                alert(`Could not upload photo: ${uploadError.message}`);
                setSaving(false);
                return;
            }

            const { data } = supabase.storage
                .from("observations-photos")
                .getPublicUrl(filePath);

            photoUrl = data.publicUrl;
        }

        const { error } = await supabase.from("observations").insert({
            species,
            observed_date: observedDate || null,
            latitude: currentLatitude,
            longitude: currentLongitude,
            stage,
            estimated_yield: estimatedYield,
            access,
            notes,
            photo_name: photoName,
            photo_url: photoUrl,
            created_by: user?.id ?? null,
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
            <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-[var(--cream)] p-4 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-[var(--forest)]">
                            Add observation
                        </h2>
                        <p className="text-sm text-gray-600">
                            {currentLatitude.toFixed(5)}, {currentLongitude.toFixed(5)}
                            <br />
                            <span className="text-xs">Source: {locationSource}</span>
                        </p>
                    </div>

                    <button type="button" onClick={onClose} className="text-xl">
                        ×
                    </button>
                </div>

                <div className="space-y-4">

                    <button
                        type="button"
                        onClick={useCurrentLocation}
                        disabled={gettingLocation}
                        className="w-full rounded-full border border-[var(--forest)] px-4 py-2 font-semibold text-[var(--forest)] disabled:opacity-50"
                    >
                        {gettingLocation ? "Getting location..." : "Use my current location"}
                    </button>

                    <div>
                        <label className="block mb-1 font-semibold">Photo optional</label>
                        <input type="file" accept="image/*" onChange={handlePhotoChange} />

                        {photoPreview && (
                            <img
                                src={photoPreview}
                                alt={photoName}
                                className="mt-2 w-full rounded-xl border object-cover"
                            />
                        )}

                        {photoName && (
                            <p className="mt-1 text-sm text-gray-600">Photo: {photoName}</p>
                        )}
                    </div>

                    <div>
                        <label className="block mb-1 font-semibold">Species</label>
                        <select
                            value={species}
                            onChange={(e) => setSpecies(e.target.value)}
                            className="w-full rounded border p-2"
                        >
                            {SPECIES.map((item) => (
                                <option key={item.name}>{item.name}</option>
                            ))}
                        </select>
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
                        className="w-full rounded-full bg-[var(--forest)] px-4 py-3 font-semibold text-white shadow disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "Save observation"}
                    </button>
                </div>
            </div>
        </div>
    );
}