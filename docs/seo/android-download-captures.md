# Android download-page capture sources

The download hero uses real Android Ranked gameplay, not generated screens.
These are unchanged copies of the existing mobile screenshot sources:

| Web asset | Source in the mobile repository |
| --- | --- |
| `public/assets/download/ranked-en.png` | `screenshots/android/play-store/raw/en-US/phone/ranked.png` |
| `public/assets/download/ranked-es.png` | `screenshots/android/play-store/raw/es-ES/phone/ranked.png` |
| `public/assets/download/ranked-tr.png` | `screenshots/android/play-store/raw/tr-TR/phone/ranked.png` |

The sidecar files identify Android phone captures from September 16, 2026,
at 1080 × 2424 pixels. The page preserves that aspect ratio without cropping
the pitch, question, answer buttons or Android system bars. The device border
is rendered in CSS; Next Image supplies optimized derivatives.

English, Spanish and Turkish use matching screenshots. Until a genuine
Georgian Android Ranked capture is available, the Georgian page explicitly
labels the English screenshot as an English preview. Do not relabel or fake
the screenshot language.

These images show the existing Ranked mode only and do not imply that pending
new modes have shipped. Refresh the sources when the released Ranked UI changes.
