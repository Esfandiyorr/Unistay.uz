# Unistay source and publication

The live booking site is published on ChatGPT Sites. Keep its source and `Esfandiyorr/Unistay.uz` on the same commit when publishing code changes.

1. Open the existing Sites source checkout with the normal Sites workflow. Review both `main` branches before editing. Merge any divergent changes without rewriting history.
2. Run `npm run git:sync` in the Sites checkout before the source push. This configures `git push origin` to publish to the Sites source repository and GitHub.
3. Before saving the Sites version, verify that both remotes have the commit used to build the site. If one push failed, retry that destination with the same commit. Use the normal Sites save and deployment steps.

Store credentials, runtime data, and booking records in their existing protected locations. Commit source files and migration definitions.

## Vercel deployment

The same source also deploys to Vercel. `vercel/` runs `worker/index.js` unchanged: Turso/libSQL backs the `DB` (D1) and `BUCKET` (R2) bindings, and Google sign-in replaces the Sites `oai-authenticated-*` headers, which the adapter strips from every incoming request. Keep Worker SQL compatible with libSQL, keep new migrations in `drizzle/`, and check that `npm run build:vercel` still succeeds after changing `worker/`.
