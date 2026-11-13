---
title: Include src/ in the published package so source maps resolve
semver_level: patch
---

Source maps in the published package pointed to `../src/*.ts` files that were not included in the package. `src/` is now published, and a test checks that every shipped source map points at a file in the package.