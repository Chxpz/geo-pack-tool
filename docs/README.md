# Documentation

This directory is the authoritative documentation set for the current codebase. It intentionally excludes roadmap notes, pivot plans, historical manifests, and speculative implementation docs.

## Files

- [architecture.md](architecture.md): current application structure, core domains, and data flow
- [development.md](development.md): local setup, commands, verification, and current testing reality
- [deployment.md](deployment.md): production configuration, migrations, cron schedules, and release process
- [api.md](api.md): live API route inventory grouped by responsibility

## Rules

- Code is the source of truth.
- If a route, environment variable, migration, or workflow changes, update these files in the same change.
- Do not reintroduce roadmap, product-plan, or speculative implementation Markdown into the root of the repository.
