import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextVitals,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "dist/**",
      "docs/**",
      // Generated and content trees. `eslint .` walks all of them — 2482 files
      // under public/pagefind alone, including a 175 KB single-line minified
      // bundle. Parsing that is what OOM-killed the pre-push lint on
      // 2026-07-22 ("Killed: 9  pnpm lint"). None of it is ours to lint.
      "public/pagefind/**",
      ".generated/**",
      "NEWS/**",
      "logs/**",
      ".quarantine/**",
    ],
  },
];

export default config;
