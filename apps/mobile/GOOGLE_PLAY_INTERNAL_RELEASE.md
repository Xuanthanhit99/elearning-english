# BeaconVie Google Play Internal Release

This guide is for the first Android Internal Testing upload. Do not promote this build to public Production until the real-device checklist passes.

## App Identity

- Final package: `com.beaconvie.app`
- Version: `1.0.0`
- Version code: `2`
- Scheme: `beaconvie`
- Artifact: Android App Bundle (`.aab`)
- Target track: Google Play Internal Testing

## Build Profiles

- Preview APK: EAS `preview` profile, internal distribution, APK output, production API.
  - Build ID: `c45ccbe6-f6b4-41fd-8f81-a3b41ab76901`
  - Artifact: `https://expo.dev/artifacts/eas/HsiWNHWsRbV5ghTE0xZ5f1WFP-DzEd_k-gi5viWATKI.apk`
- Production AAB: EAS `production` profile, app-bundle output, production API.
  - Build ID: `94219774-31f4-46cd-b853-17a039111224`
  - Artifact: `https://expo.dev/artifacts/eas/b4AF2LJotFs9f5eE1mdbxLCC5L599AypFfyxHKBdmJg.aab`

## Environment

- Preview API: `https://api.beaconvie.com`
- Preview socket URL: `https://api.beaconvie.com`
- Production API: `https://api.beaconvie.com`
- Production socket URL: `https://api.beaconvie.com`

`EXPO_PUBLIC_*` values are public client configuration. Do not put secrets in mobile env or EAS public env values.

## Required Tester Checklist

Use `PLAY_INTERNAL_TEST_CHECKLIST.md`.

Critical device gates:

- install
- boot
- login
- session restore
- logout
- Dashboard
- Listening audible audio
- transcript gating
- Writing draft
- Notifications
- Android back
- keyboard

Features requiring extra validation:

- Community realtime
- Companion
- Arena if visible

## Release Sequence

1. Build preview APK for quick trusted tester installation.
2. Build production AAB for Google Play Internal Testing.
3. Upload the AAB to Google Play Console Internal Testing.
4. Run the real-device checklist.
5. Fix any blocker bugs.
6. Increment `versionCode` before uploading another AAB to Google Play.
7. Prepare missing store/legal assets before any public production rollout.

## Public Production Gate

Public Production is not approved yet. Required first:

- Internal Testing passes on real Android devices.
- Privacy policy URL is ready.
- Account deletion process/disclosure is ready.
- Store screenshots, feature graphic, descriptions, and support contact are ready.
- Any P0/P1 runtime issues discovered during Internal Testing are fixed.
