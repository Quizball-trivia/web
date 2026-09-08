"""Split a user-owned QuizUp-labelled montage for reference auditions.
Usage: python3 scripts/import-quizup-reference.py '/path/to/Quizup - Sound Effects.mp3'
Requires FFmpeg. Leaves the input unchanged; cue names are intentionally not guessed.
"""
import sys, subprocess, re, json, wave, struct, hashlib, shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1]).resolve()
out=ROOT/'public/sounds/quizup-reference'
out.mkdir(parents=True,exist_ok=True)
duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(source)]))
scan=subprocess.run(['ffmpeg','-hide_banner','-i',str(source),'-af','silencedetect=noise=-35dB:d=0.35','-f','null','-'],capture_output=True,text=True,check=True).stderr
silences=[];start=0.0
for line in scan.splitlines():
 if match:=re.search(r'silence_start: ([\d.]+)',line):start=float(match[1])
 if match:=re.search(r'silence_end: ([\d.]+)',line):silences.append((start,float(match[1])))
# Keep closely spaced ticks and paired effects together; split long inter-cue pauses.
parts=[];start=0.0
for a,b in silences:
 if a<.05: start=max(0,b-.04)
 elif b-a>=0.7 or b>=duration-.02:
  end=min(duration,a+.12)
  if end-start>.12: parts.append((start,end))
  start=max(0,b-.04)
if start<duration-.12: parts.append((start,duration))
assets=[]
def stamp(t):return f'{int(t)//60:02d}:{t%60:05.2f}'
def analyze(path):
 raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-ar','8000','-ac','1','-f','s16le','-'])
 data=struct.unpack('<'+'h'*(len(raw)//2),raw);peak=max(abs(v) for v in data) or 1;width=len(data)//48
 return [round(max(abs(v) for v in data[i*width:(i+1)*width])/peak,3) for i in range(48)]
for i,(start,end) in enumerate(parts,1):
 # Cue 05 includes a quiet 375ms lead-in in the source montage.
 # Remove it for immediate answer feedback; keep 5ms before the audible attack.
 if i == 5: start += .375
 key=f'quizup-cue-{i:02d}';path=out/(key+('-tight' if i == 5 else '')+'.wav');length=end-start
 subprocess.run(['ffmpeg','-v','error','-y','-ss',str(start),'-i',str(source),'-t',str(length),'-ar','44100','-ac','1','-af',f'afade=t=in:d=0.003,afade=t=out:st={max(0,length-.015)}:d=0.015','-c:a','pcm_s16le',str(path)],check=True)
 assets.append(dict(id=key,label=f'QuizUp · Cue {i:02d}',description=f'Recording {stamp(start)}–{stamp(end)}. Original cue name and in-game action unverified.',source='quizup',path='/sounds/quizup-reference/'+path.name,duration=round(length,3),bars=analyze(path),previewSeconds=round(length+1,3),sourceStart=round(start,3),sourceEnd=round(end,3)))
shutil.copyfile(source,out/'quizup-sound-effects.mp3')
assets.append(dict(id='quizup-full-recording',label='QuizUp · Full recording',description='The complete 98-second local montage, including pauses. Stop at any time. Its upstream provenance has not been independently authenticated.',source='quizup',path='/sounds/quizup-reference/quizup-sound-effects.mp3',duration=round(duration,3),bars=analyze(source),previewSeconds=round(duration+1,3)))
(ROOT/'src/lib/sounds/lab/quizup-assets.json').write_text(json.dumps(assets,indent=2)+'\n')
manifest=dict(inputFilename=source.name,sha256=hashlib.sha256(source.read_bytes()).hexdigest(),duration=duration,processing='Split on >=0.7s silence at -35dB; 40ms pre-roll, 120ms tail; 3ms/15ms fades; PCM WAV. Cue 05 lead-in trimmed by 375ms for immediate feedback. No pitch or tempo change.',referenceOnly=True,sourceCandidate='https://www.youtube.com/watch?v=hIRYE-FJucg',archive='https://www.youtube.com/watch?v=mrBTA9_ysBQ',sourceCaveat='A matching title and near-identical duration were found; a byte/audio match has not been established. No reuse license verified.',clips=[dict(id=a['id'],start=a.get('sourceStart'),end=a.get('sourceEnd')) for a in assets])
(out/'provenance.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(f'{len(parts)} clips + full montage added')
