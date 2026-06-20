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
    const [toastMessage, setToastMessage] = useState("");

    function showToast(message: string) {
        setToastMessage(message);

        setTimeout(() => {
            setToastMessage("");
        }, 3000);
    }

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

        if (exif?.latitude && exif?.longitude) {
            setCurrentLatitude(exif.latitude);
            setCurrentLongitude(exif.longitude);
            setLocationSource("Photo GPS");
        }
    }

    function useCurrentLocation() {
        if (!navigator.geolocation) {
            showToast("Your browser does not support location.");
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
                showToast("Could not get your current location.");
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

        if (!user) {
            showToast("Sign in to save observations.");
            setSaving(false);
            return;
        }

        let photoUrl: string | null = null;

        if (photoFile) {
            const fileExt = photoFile.name.split(".").pop();
            const filePath = `${user?.id ?? "anonymous"}/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from("observations-photos")
                .upload(filePath, photoFile);

            if (uploadError) {
                console.error("Upload error:", uploadError);
                showToast(`Could not upload photo: ${uploadError.message}`);
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
            created_by: user.id,
        });

        setSaving(false);

        if (error) {
            console.error("Supabase save error:", error);
            showToast("Could not save observation.");
            return;
        }

        showToast("✓ Observation saved");

        setTimeout(() => {
            onSaved();
            onClose();
        }, 1000);
    }

    return (
        <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/30 p-3">
            <div className="mb-2 max-h-[78vh] w-[min(560px,100%)] overflow-y-auto rounded-3xl bg-[rgba(247,244,237,0.72)] p-4 shadow-2xl backdrop-blur-md">
                <div
                    className="sticky top-[-16px] z-20 -mx-4 -mt-4 mb-4 rounded-t-3xl border-b border-black/10 bg-[rgba(247,244,237,0.88)] p-4 backdrop-blur-md"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h2 className="text-xl font-bold text-[var(--forest)]">
                                Add observation
                            </h2>

                            <p className="mt-1 text-xs text-gray-600">
                                Source: {locationSource}
                                <br />
                                {currentLatitude.toFixed(5)}, {currentLongitude.toFixed(5)}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="grid h-9 w-9 place-items-center rounded-full bg-white/70 text-xl leading-none text-[var(--bark)] shadow-sm"
                        >
                            ×
                        </button>
                    </div>
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
                        <label className="mb-2 block font-semibold">
                            Photo (optional)
                        </label>

                        <label
                            htmlFor="photo-upload"
                            className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--sage)] bg-white/40 p-6 text-center transition hover:bg-white/60"
                        >
                            <div className="text-3xl">📸</div>

                            <div className="mt-2 font-semibold text-[var(--forest)]">
                                {photoName ? "Change photo" : "Add photo"}
                            </div>

                            <div className="mt-1 text-sm text-gray-600">
                                GPS and date will be read automatically if available
                            </div>
                        </label>

                        <input
                            id="photo-upload"
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            className="hidden"
                        />

                        {photoPreview && (
                            <img
                                src={photoPreview}
                                alt={photoName}
                                className="mt-3 w-full rounded-2xl border object-cover"
                            />
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
            {toastMessage && (
                <div
                    style={{
                        position: "fixed",
                        left: "50%",
                        bottom: "24px",
                        transform: "translateX(-50%)",
                        background: "var(--forest)",
                        color: "white",
                        padding: "12px 16px",
                        borderRadius: "999px",
                        fontWeight: 600,
                        zIndex: 3000,
                        boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                    }}
                >
                    {toastMessage}
                </div>
            )}
        </div>
    );
}