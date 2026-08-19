# Onboarding mobile verification experiment

Status: implemented locally; production PostHog experiment is a draft and is not launched.

## Hypothesis

Asking an eligible new user to optionally verify a Georgian mobile number will not materially reduce onboarding completion or first-match activation.

This tests the friction caused by an **optional prompt**. It does not estimate the impact of making phone verification mandatory.

## PostHog configuration

- Project: `Quizball` (`307329`)
- Experiment: `Onboarding mobile verification friction` (`432777`)
- Flag key: `onboarding-mobile-verification`
- Variants: `control` 50%, `test` 50%
- Rollout: 100% of users who reach the application-side eligibility gate
- Exposure event: `$feature_flag_called`
- Status: draft; backing flag inactive until launch

The browser does not fetch flags during ordinary app startup. It temporarily enables one manual flag reload only when an eligible user saves the last profile step. `getFeatureFlag()` records the exposure; normal automatic reloads are paused again immediately afterward.

If PostHog is unavailable, times out, or returns an unknown value, the application uses `control` and completes onboarding normally.

## Eligibility and timing

Assignment happens after the profile is successfully saved but before `onboarding_completed`.

A user is eligible only when all of these are true:

- they are still in onboarding;
- the backend GeoIP check says Georgian phone auth is available;
- their account has no verified phone number.

Phone-signup users are already verified and are excluded. Returning users with completed onboarding never reach the gate.

## Experiences

- `control`: complete onboarding immediately.
- `test`: show the optional phone + six-digit OTP screen. Verification and “Maybe later” both continue onboarding.

The existing authenticated phone-link endpoints remain authoritative. No phone number or OTP is sent to PostHog.

## Measurement

Primary metric:

- Exposure → `onboarding_completed` conversion (increase is better)

Secondary metric:

- Exposure → `match_started` conversion (increase is better)

Diagnostic events:

- `mobile_verification_prompt_shown`
- `mobile_verification_started`
- `mobile_verification_completed`
- `mobile_verification_skipped`
- `mobile_verification_failed`

Diagnostic properties are limited to source, stage, outcome/reason, attempt counts, and elapsed milliseconds. They never include a phone number, OTP, or provider error message.

## Power and interpretation

Production baseline for the 14 days ending 2026-08-19, excluding configured test accounts:

- 254 accounts created
- 236 completed onboarding (92.91%)
- 196 started a match (77.17% of account creators)
- 184 account creators were Georgian Google/Facebook/email users
- estimated eligible exposure rate after the profile step: about 12.2 users/day

At that rate, 14 full days should produce roughly 157 exposures. That is powered only for a large effect: about a **12.5% relative change** in onboarding conversion (roughly 11.6 percentage points from the current baseline). Detecting a 10% relative change requires about 245 exposures, or roughly 21 days.

Therefore, the 14-day readout can support “no severe friction detected,” but it cannot prove that the prompt has zero or small friction.

## Launch and stopping rule

1. Deploy and verify on staging first: control fallback, test prompt, OTP success, skip, invalid code, number conflict, and non-Georgian exclusion.
2. Deploy production code.
3. Launch PostHog experiment `432777` only after the production build is confirmed live.
4. Verify within the first day that exposures are near 50/50 and that test users emit `mobile_verification_prompt_shown`.
5. Run for at least 14 full days and at least 157 total exposures. Do not call a winner earlier based on daily fluctuations.
6. Reject or redesign the prompt if onboarding completion drops by about 10 percentage points or more, or if delivery/verification failures explain material abandonment.
7. If the result is inconclusive and the observed difference is smaller, extend toward 245 exposures before claiming the prompt is low-friction.

Operational safety can override the statistical stopping rule: pause immediately for broken OTP delivery, unexpected enrollment, or an onboarding outage.
