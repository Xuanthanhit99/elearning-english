# BeaconVie Android Internal Test Checklist

Use this checklist after installing the Google Play Internal Testing build on a real Android phone.

## Build Info

- App version:
- Version code:
- Tester:
- Date:
- Device model:
- Android version:
- Network: Wi-Fi / cellular / both

## Critical

- Install app from Google Play Internal Testing.
- Open app from launcher. Verify splash, app boot, fonts, icons, status bar, and no crash.
- Log in with a disposable/internal test account.
- Confirm Dashboard opens and shows real name, XP, streak, goal, skill progress, continue learning, and leaderboard preview.
- Force-close the app, reopen, and confirm session restore with no unnecessary login flash.
- Log out. Confirm login appears. Restart app and confirm it remains logged out.
- If a safe token-expiry test mechanism is available, trigger token refresh and confirm the user remains logged in.
- Open Listening, play real audio, pause, replay, seek -10s, seek +10s, switch 0.75x / 1x / 1.25x, and confirm position/duration update.
- Leave Listening and confirm audio stops. Open another Listening lesson and confirm old audio does not continue.
- Background the app during Listening and confirm audio pauses or recovers according to product behavior.
- Verify transcript is hidden before backend unlock and visible only after the allowed answer/skip/completion state.
- Open Writing, type a real paragraph, leave, return, and confirm the draft is restored. If submit fails, confirm text remains.
- Open Notifications, verify unread count/list, mark one read, mark all read, and confirm navigation targets where available.

## Learning

- Vocabulary: open today's session, mark one LEARNING and one KNOWN, and check duplicate taps do not double-submit.
- Grammar: open overview, start a lesson, answer one question, and verify correctness/explanation.
- Reading: open list, open article, start/resume session, answer one question, and submit/result if short.
- Placement: open placement, verify intro/session/result states and fill-blank keyboard behavior if encountered.
- Learning Path: open path and tap at least one real step into its module.

## Social

- Community: open feed, switch tabs if available, pull refresh, paginate, open post detail, like/unlike, and comment.
- Community realtime: with another client, create one post/comment/reaction and confirm the Android app updates once with no duplicate count drift.

## Other

- Companion: send one message. Confirm optimistic message reconciles, real assistant response appears if backend provider is configured, and history remains after navigation.
- Leaderboard: verify weekly, monthly, current user, pagination, and valid friends empty state if applicable.
- Arena: only if visible for the test build, open lobby, verify rank/ELO, join queue, cancel queue, and run a full match/reconnect test if a second client is available.

## Android UX

- Test Android system Back on Login, Dashboard, Learn nested screens, Listening, Writing, Community post, Notifications, Companion, Leaderboard, and Arena if visible.
- Test Android keyboard on Login, Register, Writing, Community comment, Companion, and Placement inputs. Primary actions must remain reachable.
- Test network interruption: turn network off during an authenticated screen, restore it, and confirm the app recovers without losing user text.

## Bug Report Template

Device model:

Android version:

App version:

Screen:

Steps:

Expected:

Actual:

Screenshot/video:

Network:
