"""Write the generator's es/tr sessions into demoPoolSessions.ts (run after gen-demo-pool-locales.py)."""
import json, pathlib, sys
data = json.load(open(sys.argv[1] if len(sys.argv) > 1 else '/tmp/demo-pool-locales.json'))
p = pathlib.Path(__file__).resolve().parent.parent / 'src/features/demos/data/demoPoolSessions.ts'; s = p.read_text()
i = s.index('const SESSIONS = ') + len('const SESSIONS = ')
depth = 0
for k in range(i, len(s)):
    if s[k] == '{': depth += 1
    elif s[k] == '}':
        depth -= 1
        if depth == 0: j = k; break
obj = json.loads(s[i:j + 1]); obj['es'] = data['es']; obj['tr'] = data['tr']
p.write_text(s[:i] + json.dumps(obj, ensure_ascii=False, indent=2) + s[j + 1:])
print('injected locales:', list(obj))
