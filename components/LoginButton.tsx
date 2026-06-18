"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function LoginButton() {
    const [userEmail, setUserEmail] = useState<string | null>(null);

    useEffect(() => {
        async function loadUser() {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            setUserEmail(user?.email ?? null);
        }

        loadUser();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            setUserEmail(user?.email ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    async function signInWithGoogle() {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
        });

        if (error) {
            console.error(error);
            alert(error.message);
        }
    }

    async function signOut() {
        await supabase.auth.signOut();
    }

    if (userEmail) {
        return (
            <button
                onClick={signOut}
                style={{
                    background: "var(--sage)",
                    color: "var(--bark)",
                    borderRadius: "999px",
                    padding: "6px 12px",
                    fontWeight: 600,
                    fontSize: "14px",
                }}
            >
                Sign out
            </button>
        );
    }

    return (
        <button
            onClick={signInWithGoogle}
            style={{
                background: "var(--forest)",
                color: "white",
                borderRadius: "999px",
                padding: "6px 12px",
                fontWeight: 600,
                fontSize: "14px",
            }}
        >
            Sign in with Google
        </button>
    );
}