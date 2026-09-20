# Quizball Sound Lab — new sound pack

37 new, local WAV one-shots: 29 original synthesized effects + 8 Kenney CC0 alternatives.
The 17 pre-existing game effects are available for comparison in /dev/sounds and are excluded from this download.

## Original effects

Created for Quizball on 2026-09-05 with deterministic additive/subtractive synthesis, shaped envelopes and seeded filtered noise. No third-party samples, voices, copyrighted recordings or paid audio service were used. These outputs are available for use in Quizball; no external attribution is required for the synthesized material.

Regenerate: `python3 scripts/generate-sound-lab.py` from the web project, or use the included generator in the same project layout. Python standard library only. Mono 44.1 kHz, 16-bit PCM WAV. All original clips are shorter than 1.2 seconds; peaks are at or below 0.6 full scale. Audition volume starts at 35%. These are designed alternatives, and still need the product owner's listening pass on speakers and headphones.

## Kenney alternatives

Pack: Interface Sounds (1.0), created/distributed by Kenney.
Official page: https://kenney.nl/assets/interface-sounds
Official archive: https://kenney.nl/media/pages/assets/interface-sounds/fa43c1dd4d-1677589452/kenney_interface-sounds.zip
Retrieved: 2026-09-05.
License: Creative Commons Zero (CC0); original license is in `kenney/LICENSE.txt`.
Source license: https://creativecommons.org/publicdomain/zero/1.0/

| Included WAV | Original archive member |
| --- | --- |
| click_003.wav | Audio/click_003.ogg |
| confirmation_002.wav | Audio/confirmation_002.ogg |
| error_003.wav | Audio/error_003.ogg |
| drop_002.wav | Audio/drop_002.ogg |
| back_001.wav | Audio/back_001.ogg |
| open_001.wav | Audio/open_001.ogg |
| switch_002.wav | Audio/switch_002.ogg |
| glass_001.wav | Audio/glass_001.ogg |

Processing: FFmpeg, mono 44.1 kHz 16-bit PCM WAV, 3 ms entrance fade and limiter ceiling 0.6 with automatic level compensation disabled. No pitch changes. Attribution is not required by the supplied CC0 license; retaining this provenance is useful.

## Using the lab

Open `/dev/sounds`. Select a mode and press an action button. Change the dropdown to audition another file, compare the current cue, or choose intentional silence. A sample flow plays one clip at a time. Stop, mode changes, tab changes, leaving the page and hiding the document cancel playback. Long current clips are capped at 8 seconds. Playback errors are reported.

Choices are stored under `quizball-sound-lab-v1`. Export preset downloads all mappings, file paths and timing rules. The lab uses an isolated audio player and does not change gameplay audio or user sound preferences. No new cues have been wired into live matches by this change.

## Integration rules

- Reuse semantic cue IDs across modes. Use one agreed correct/wrong pair by default.
- Play on confirmed events and visible animation contact, not inside render or state updater functions.
- Deduplicate server events by match + command/question ID. Do not replay on reconnect snapshots.
- Play one timer tick per whole second at 3, 2 and 1, stopping on submission or pause.
- Timeout replaces wrong-answer audio for unanswered turns.
- Do not sound hover, typing, timer milliseconds or continuous slider/drag updates.
- Put answer, goal and end-result cues in order. Avoid simultaneous verdict + reward + victory.
- Respect existing SFX/mute preferences and user-gesture audio unlock. Cancel queued audio on background/exit.
- Native mobile can reuse these WAV assets and exported event maps, but needs its own playback adapter and device checks.
