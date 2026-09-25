## What

<!-- One paragraph: what changes and why. Link the issue. -->

## How to verify

<!-- Steps a reviewer can follow in the running console. -->

## Checklist

- [ ] `npm run typecheck && npm test` pass
- [ ] Migrations (if any) are additive — an existing `smartit.db` still opens
- [ ] No native dependencies added
- [ ] UI stays truthful: nothing claims a state that didn't happen
- [ ] README / docs updated if behaviour or config changed
