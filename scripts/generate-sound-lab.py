"""Deterministic original Quizball one-shots. Python stdlib; no sampled content.
Run: python3 scripts/generate-sound-lab.py
Outputs mono 44.1 kHz / 16-bit WAV, with short fades and conservative peaks.
"""
from pathlib import Path
import math, random, struct, wave, json
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/sounds/lab/original'
OUT.mkdir(parents=True, exist_ok=True)
SR = 44100
rng = random.Random(260905)
assets = []
def make(key, title, desc, duration, notes=(), noise=0, sweep=None):
    values = [0.0] * int(SR * duration)
    for start, freq, length, amplitude in notes:
        for j in range(min(int(length * SR), len(values) - int(start * SR))):
            t = j / SR
            env = min(1, t / .006) * math.exp(-t * 5 / length) * min(1, (length-t)/.025)
            tone = math.sin(math.tau*freq*t) + .18*math.sin(math.tau*freq*2.003*t) + .055*math.sin(math.tau*freq*3*t)
            values[int(start*SR)+j] += amplitude * env * tone
    filtered = 0
    phase = 0
    for i in range(len(values)):
        t = i / SR
        fade = min(1,t/.008) * min(1,(duration-t)/.04)
        if noise:
            filtered = .8*filtered + .2*rng.uniform(-1,1)
            values[i] += noise * filtered * math.exp(-t*8/duration)*fade
        if sweep:
            lo, hi, amp = sweep
            f = lo * (hi/lo)**(t/duration)
            phase += math.tau*f/SR
            values[i] += amp*math.sin(phase)*math.exp(-t*4/duration)*fade
    peak = max(abs(v) for v in values) or 1
    # Peak normalization leaves at least 4.4 dB headroom. Quiet cues remain quiet.
    gain = min(1.0, .6/peak)
    values = [v*gain for v in values]
    with wave.open(str(OUT / (key+'.wav')), 'wb') as w:
        w.setparams((1,2,SR,0,'NONE','not compressed'))
        w.writeframes(b''.join(struct.pack('<h',round(v*32767)) for v in values))
    width = len(values)//48
    bars = [round(max(abs(v) for v in values[i*width:(i+1)*width]) / max(.01,peak*gain),3) for i in range(48)]
    assets.append(dict(id=key,label=title,description=desc,source='original',path=f'/sounds/lab/original/{key}.wav',duration=duration,bars=bars))
def phrase(key,title,desc,freqs,step=.11,tail=.32,amp=.36):
    make(key,title,desc,round((len(freqs)-1)*step+tail+.06,3),[(i*step,f,tail,amp) for i,f in enumerate(freqs)])
make('tap','Soft tap','A dry, unobtrusive touch for a committed selection.',.12,[(0,720,.07,.2)],noise=.18)
make('select','Selection pop','A rounded upward pop for answer and card selection.',.19,sweep=(360,780,.34))
phrase('lock','Lock it in','Two compact notes confirm a submitted action.',[523.25,783.99],.065,.18)
phrase('correct','Clean finish','A bright major lift with a soft bell tail.',[659.25,987.77,1318.51],.08,.4)
phrase('wrong','Try again','A warm descending pair; firm without a harsh buzzer.',[293.66,220],.12,.3)
make('tick','Last seconds','One quiet wooden tick. Trigger once per second at 3, 2, 1.',.1,[(0,1100,.07,.18)],noise=.08)
phrase('timeout','Time is up','A short downward cadence, distinct from a wrong answer.',[440,329.63,220],.09,.27)
make('transition','Next round','A light air sweep into the next question.',.36,noise=.38,sweep=(420,1000,.13))
phrase('reveal','Clue revealed','A curious rising pair for new information.',[587.33,880],.1,.32)
phrase('imposter','Caught out','A compact suspense sting for the imposter reveal.',[246.94,261.63,196],.11,.48)
phrase('coins','Pocket change','Four glassy coin pings for the reward count.',[1567.98,1975.53,2349.32,2637.02],.055,.23,.25)
make('drop','Money falls','A descending coin slide into a soft thud.',.52,[(.29,90,.2,.5)],noise=.22,sweep=(1400,160,.2))
phrase('win','Victory lap','A short celebratory major fanfare.',[523.25,659.25,783.99,1046.5],.15,.62)
phrase('lose','Next time','A gentle closing cadence after a loss.',[392,349.23,261.63],.17,.48)
phrase('draw','Honours even','A balanced, neutral result cadence.',[392,523.25,392],.12,.4)
make('goal','Top corner','A compact bright goal sting with an airy impact.',1.1,[(0,130.81,.3,.4),(.08,523.25,.55,.32),(.16,659.25,.55,.32),(.24,783.99,.7,.35)],noise=.6)
make('save','Safe hands','A cushioned glove impact followed by a low pluck.',.38,[(.035,196,.25,.32)],noise=1.1,sweep=(180,70,.2))
make('whistle','Kickoff whistle','A short synthetic referee whistle, softened at the edges.',.6,[(0,2489,.42,.2),(.02,2637,.4,.12)],noise=.05)
make('kick','Ball strike','A low leather thump with a short contact transient.',.25,[(0,85,.2,.4)],noise=.9,sweep=(160,45,.3))
make('pass','Quick pass','A lighter, shorter version of the ball contact.',.16,[(0,125,.11,.25)],noise=.6)
phrase('bid','Bid placed','A rising cash-register pair for an accepted bid.',[783.99,1174.66],.065,.22)
phrase('outbid','Outbid','A restrained falling nudge when another bidder takes the lead.',[698.46,523.25],.08,.24)
make('sold','Sold!','A wooden gavel double-hit for a completed auction.',.48,[(0,185,.12,.4),(.17,146.83,.23,.48)],noise=.3)
phrase('power','Power-up','A sparkling ascending run for an activated lifeline.',[523.25,783.99,1046.5,1567.98],.075,.28)
phrase('streak','On a roll','An extra small flourish for a confirmed streak milestone.',[987.77,1318.51,1567.98],.09,.36)
phrase('found','Opponent found','A friendly double chime when a match is ready.',[659.25,880],.16,.44)
phrase('reconnect','Connection restored','A gentle resolution when play resumes.',[440,659.25],.13,.34,.25)
make('back','Step back','A descending pop for dismissing or backing out.',.16,sweep=(620,310,.22))
phrase('ready','Ready, set','A clear start cue after a countdown.',[523.25,1046.5],.1,.3)
(ROOT/'src/lib/sounds/lab').mkdir(parents=True, exist_ok=True)
(ROOT/'src/lib/sounds/lab/original-assets.json').write_text(json.dumps(assets,indent=2)+'\n')
print(f'Generated {len(assets)} original sounds')
