import next from "eslint-config-next";

const config = [
  {
    ignores: [
      ".next/**/*",
      "node_modules/**/*",
      "dist/**/*",
      "out/**/*",
      "coverage/**/*",
      "types/supabase.ts",
    ],
  },

  // ✅ apps/web boundaries + import guardrails
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            // ✅ Prevent direct Supabase JS usage anywhere in app code
            {
              name: "@supabase/supabase-js",
              message:
                'Do not import "@supabase/supabase-js" directly. Use "@/shared/data/supabase/*" (or types from "@/shared/data/supabase/types").',
            },

            // ✅ Kill the old shim forever
            {
              name: "@/lib/activeRoster",
              message: 'Do not import "@/lib/activeRoster". Use "@/shared/lib/activeRoster".',
            },
          ],
          patterns: [
            // Block reaching into sibling apps (via relative paths)
            {
              group: ["../apps/*", "../../apps/*", "../../../apps/*", "../../../../apps/*"],
              message: "apps/web must not import from other apps. Move shared code into packages/*.",
            },

            // Block reaching into repo root supabase folder (if present)
            {
              group: ["../supabase/*", "../../supabase/*", "../../../supabase/*", "../../../../supabase/*"],
              message:
                "apps/web must not import from supabase/* directly. Wrap it in packages/* or server routes.",
            },

            // Also block the shim path (covers "@/lib/activeRoster" and any attempted subpaths)
            {
              group: ["@/lib/activeRoster*"],
              message: 'Do not import from "@/lib/activeRoster*". Use "@/shared/lib/activeRoster".',
            },

            // Belt + suspenders for supabase-js
            {
              group: ["@supabase/supabase-js"],
              message:
                'Do not import "@supabase/supabase-js" directly. Use "@/shared/data/supabase/*" (or types from "@/shared/data/supabase/types").',
            },
          ],
        },
      ],
    },
  },

  /**
   * ✅ Exception: allow @supabase/supabase-js ONLY inside the canonical supabase layer
   * (so your shared/data/supabase/admin.ts/server.ts/user.ts/types.ts can compile)
   */
  {
    files: ["src/shared/data/supabase/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": "off",
    },
  },

  ...next,
];

export default config;