# Phase 16.5 Dependency Security Audit

Generated during Phase 16.5. Scope: high and critical advisories from `npm audit --audit-level=high` for `backend` and `apps/mobile`.

## Summary

| Project | High/Critical Result | Classification |
| --- | --- | --- |
| Backend | 0 high, 0 critical after `npm audit fix` | FIXED |
| Mobile | 14 high, 0 critical | WAITING FOR COMPATIBLE UPSTREAM FIX |

No `npm audit fix --force` was run.

## Backend

After the non-force backend audit fix, `npm audit --audit-level=high` passes. The lockfile now resolves:

| Package | Installed version after fix | Advisory | Direct/transitive | Runtime relevance | Classification | Recommended action |
| --- | --- | --- | --- | --- | --- | --- |
| brace-expansion | 1.1.18 / 2.1.4 / 5.0.9 | DoS via unbounded expansion/intermediate arrays | Transitive through Jest/TypeScript/Nest tooling and glob/minimatch | Mostly development/tooling; fixed safely anyway | FIXED | Keep lockfile update. |
| fast-uri | 3.1.5 | Host confusion via backslash authority introducer | Transitive through `ajv`/Nest tooling | Backend tooling/runtime schema utilities; fixed safely | FIXED | Keep lockfile update. |
| js-yaml | 3.15.1 / 4.3.1 | Quadratic CPU consumption in `!!omap` parsing | Transitive through ESLint/Jest config tooling | Development/config parsing; fixed safely | FIXED | Keep lockfile update. |
| socket.io-parser | 4.2.7 | Zero-attachment memory exhaustion | Transitive through `socket.io` and `socket.io-client` | Production-relevant because BeaconVie uses Socket.IO | FIXED | Keep lockfile update and ensure runtime validation remains green. |

Remaining backend audit output is moderate only:

| Package | Installed version | Advisory | Direct/transitive | Parent | Classification | Recommended action |
| --- | --- | --- | --- | --- | --- | --- |
| uuid | 8.3.2 | Missing buffer bounds check in v3/v5/v6 when `buf` is provided | Transitive | `exceljs@4.4.0` | NOT HIGH/CRITICAL; NOT EXPLOITABLE IN CURRENT USAGE | Do not force the suggested breaking downgrade to `exceljs@3.4.0`; revisit when `exceljs` provides a supported update path. |

## Mobile

Mobile high advisories are tied to Expo SDK 57 / React Native 0.86 toolchain packages. The audit tool suggests versions such as `expo@53.0.27` and `react-native@0.72.17`, which are not compatible upgrades for this app because they would downgrade across major SDK/runtime lines.

| Package | Installed version | Advisory | Direct/transitive | Production or dev-only | Parent | Fixed version / audit suggestion | Exploit relevance | Classification | Recommended action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| image-size | 1.2.1 | ICNS/JXL/HEIF parser infinite-loop DoS | Transitive | Dev bundler | `metro@0.84.4` via `@expo/metro@56.0.0` | Audit suggests `expo@53.0.27` | Relevant mainly if Metro processes attacker-controlled image files during bundling; not exposed in shipped app runtime | WAITING FOR COMPATIBLE UPSTREAM FIX | Accept until Expo SDK 57-compatible Metro/image-size patch is available. |
| metro | 0.84.4 | Aggregates `image-size`, `metro-config`, `metro-transform-worker` | Transitive | Dev bundler | Expo/RN toolchain | Audit suggests `expo@53.0.27` | Build-time only; not app runtime server | WAITING FOR COMPATIBLE UPSTREAM FIX | Do not override outside Expo support matrix. |
| metro-config | 0.84.4 | Via Metro chain | Transitive | Dev bundler | Expo/RN toolchain | Audit suggests Expo/RN downgrade | Build-time only | WAITING FOR COMPATIBLE UPSTREAM FIX | Wait for Expo/RN compatible patch. |
| metro-transform-worker | 0.84.4 | Via Metro chain | Transitive | Dev bundler | `metro@0.84.4` | Audit suggests Expo downgrade | Build-time only | WAITING FOR COMPATIBLE UPSTREAM FIX | Wait for Expo/RN compatible patch. |
| @expo/metro | 56.0.0 | Via Metro chain | Transitive | Dev bundler | `expo@57.0.12` | Audit suggests `expo@53.0.27` | Build-time only | WAITING FOR COMPATIBLE UPSTREAM FIX | Do not force. |
| @expo/metro-config | 57.0.8 | Via Expo/Metro chain | Transitive | Dev bundler | `expo@57.0.12` | Audit reports fix available but under incompatible tree | Build-time only | WAITING FOR COMPATIBLE UPSTREAM FIX | Use Expo-supported patch when released. |
| @expo/cli | 57.0.14 | Via Expo config/Metro chain | Transitive | Dev CLI | `expo@57.0.12` | Audit suggests `expo@53.0.27` | Local developer CLI, not shipped runtime | WAITING FOR COMPATIBLE UPSTREAM FIX | Do not force. |
| expo | 57.0.12 | Aggregates Expo CLI/config/Metro advisories | Direct | Mobile framework/build tool | Direct dependency | Audit suggests `expo@53.0.27` | No direct app-runtime exploit shown; advisory is inherited from tooling packages | WAITING FOR COMPATIBLE UPSTREAM FIX | Stay on SDK 57-compatible versions; monitor Expo patch release. |
| react-native | 0.86.2 | Aggregates RN CLI/virtualized-lists chain | Direct | Mobile framework | Direct dependency | Audit suggests `react-native@0.72.17` | Suggested fix is an incompatible downgrade; no direct runtime exploit path confirmed | WAITING FOR COMPATIBLE UPSTREAM FIX | Stay in Expo SDK 57 supported RN range. |
| @react-native/community-cli-plugin | 0.86.2 | Via Metro config chain | Transitive | Dev CLI | `react-native@0.86.2` | Audit suggests RN downgrade | CLI/build-time | WAITING FOR COMPATIBLE UPSTREAM FIX | Wait for RN/Expo compatible fix. |
| @react-native/metro-config | 0.86.2 | Via Metro config chain | Transitive | Dev bundler | RN/worklets | Audit suggests RN downgrade | Build-time | WAITING FOR COMPATIBLE UPSTREAM FIX | Wait for RN/Expo compatible fix. |
| @react-native/virtualized-lists | 0.86.2 | Via RN chain | Transitive | App runtime package | `react-native@0.86.2` | Audit suggests RN downgrade | No concrete exploit path identified from BeaconVie input; inherited audit grouping | WAITING FOR COMPATIBLE UPSTREAM FIX | Monitor RN patch. |
| react-native-reanimated | 4.5.1 | Via RN/worklets chain | Direct | Runtime/native animation package | Direct dependency | Audit suggests `4.2.2`, marked semver-major by npm | Version is managed by Expo SDK compatibility; forced change risks native/runtime breakage | WAITING FOR COMPATIBLE UPSTREAM FIX | Do not downgrade outside Expo Doctor guidance. |
| react-native-worklets | 0.10.1 | Via RN/Metro chain | Direct | Runtime/native worklets package | Direct dependency | Audit suggests `0.7.4`, marked semver-major by npm | Version is managed by Expo SDK compatibility; forced change risks native/runtime breakage | WAITING FOR COMPATIBLE UPSTREAM FIX | Do not downgrade outside Expo Doctor guidance. |

Mobile critical advisories: none.

Mobile release blocker decision: not a dependency release blocker by itself because all high mobile advisories are Expo/RN-managed transitive/toolchain findings without a safe SDK-compatible fix in the current audit output. The remaining release blocker is actual Android runtime verification, not a forced dependency override.

## Node Engine

Current Node: `v22.13.0`

Observed project/tool engine declarations:

| Package | Version | Engine |
| --- | --- | --- |
| `react-native` | 0.86.2 | `^20.19.4 || ^22.13.0 || ^24.3.0 || >= 25.0.0` |
| `@nestjs/cli` | 11.0.24 | `>= 20.11` |
| `typescript` | backend 5.9.3 | `>=14.17` |

Recommended development Node: `22.13.0` or newer patch within Node 22 LTS. Current Node is compatible with the installed React Native and backend tooling declarations.
