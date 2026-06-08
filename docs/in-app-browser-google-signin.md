# In-app browser sign-in policy

How Quizball behaves when the public landing page is opened inside a social
app's built-in browser, such as Messenger, Facebook, or Instagram.

Relevant files:
- [`src/features/welcome/WelcomeScreen.tsx`](../src/features/welcome/WelcomeScreen.tsx)
- [`src/features/welcome/useWelcomeAuthController.ts`](../src/features/welcome/useWelcomeAuthController.ts)
- [`src/features/welcome/WelcomeOpenInBrowserModal.tsx`](../src/features/welcome/WelcomeOpenInBrowserModal.tsx)
- [`src/features/welcome/InAppBrowserInstructions.tsx`](../src/features/welcome/InAppBrowserInstructions.tsx)

## Policy

The landing page is still allowed to render inside embedded browsers. This lets
users inspect the page, switch language, and understand what Quizball is.

Protected actions do not open the normal auth modal there. Instead, any landing
CTA that would start sign-in or gameplay opens the "Open in your browser" modal.
The modal tells the user how to use the app menu (`...` / share menu) to reopen
the page in Safari or Chrome.

This applies consistently to:
- Messenger
- Facebook
- Instagram
- any other detected in-app browser

## Why

OAuth inside embedded webviews is inconsistent:
- Google redirect auth can be blocked by `disallowed_useragent`.
- Facebook redirect auth can flash transient Meta-side errors or fail in some
  embedded contexts.
- App-specific browser escape tricks are unreliable on modern iOS.

So the supported UX is: show the landing page, then ask the user to continue in
the real browser before authentication or gameplay starts.

## CTA behavior

In normal Safari/Chrome:
- hero kickoff opens the auth modal
- category/ranked/leaderboard CTAs open the auth modal or relevant landing UI
- Google/Facebook/email/phone auth flows behave normally

In detected in-app browsers:
- hero kickoff opens the external-browser instructions modal
- category/ranked/leaderboard CTAs open the same modal
- the normal auth modal is not opened
- Google/Facebook-specific auth paths are not started

The copy is localized through `inAppBrowser.*` message keys.
