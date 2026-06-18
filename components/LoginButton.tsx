"use client";

import { supabase } from "../lib/supabase";

export default function LoginButton() {
    async function signInWithGoogle() {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
        });

        if (error) {
            console.error(error);
            alert(error.message);
        }
    }

    return (
        <button
            onClick={signInWithGoogle}
            style={{
                background: "var(--forest)",
                color: "white",
                borderRadius: "999px",
                padding: "10px 16px",
                fontWeight: 600,
            }}
        >
            Sign in with Google
        </button>
    );
}