## What and why

<!-- What does this change, and why is it needed? Link the issue: Closes #123 -->

## How it was tested

<!-- Tests added or updated, manual checks (desktop and phone width for UI changes). -->

## Checklist

- [ ] The PR title follows Conventional Commits (`feat(issues): …`, `fix: …`)
- [ ] `npm run check` passes locally
- [ ] New behavior is covered by tests; a fixed bug comes with the test that reproduces it
- [ ] Every new route declares its access rule and validates input and output with Zod
- [ ] User-facing text goes through i18n (English and French)
- [ ] UI changes checked at 375 px and on desktop, keyboard only, no console error
- [ ] Database schema or `plugin-sdk` changes are called out below for careful review
- [ ] `ARCHITECTURE.md` is updated if a decision changed
