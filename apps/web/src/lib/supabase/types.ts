// apps/web/src/types/supabase.ts

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
    public: {
        Tables: {
            person: {
                Row: {
                    id: string;
                    name: string | null;
                    email: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    name?: string | null;
                    email?: string | null;
                    created_at?: string;
                };
                Update: {
                    name?: string | null;
                    email?: string | null;
                };
            };
            // Add more tables as needed...
        };
        Views: Record<string, never>;
        Functions: Record<string, never>;
    };
}
