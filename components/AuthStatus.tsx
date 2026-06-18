"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function AuthStatus() {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUser(data.user);
        });

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => {
            listener.subscription.unsubscribe();
        };
    }, []);

    async function signOut() {
        await supabase.auth.signOut();
        setUser(null);
    }

    if (!user) {
        return null;
    }

    return (
        <div className="text-xs text-[var(--bark)]">
            <div className="font-semibold">Signed in</div>
            <div>{user.email}</div>
            <button onClick={signOut} className="underline">
                Sign out
            </button>
        </div>
    );
}