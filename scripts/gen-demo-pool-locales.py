"""Generate es/tr pool sample sessions from the staging question pool, mirroring the en fixture structure."""
import json, subprocess, sys, copy, re, pathlib
SDB = open(sys.argv[1]).read().strip()
WEB = pathlib.Path('/Users/user/dev/quizball-worktrees/staging-web')
src = (WEB / 'src/features/demos/data/demoPoolSessions.ts').read_text()
i = src.index('const SESSIONS = ') + len('const SESSIONS = ')
depth = 0
for k in range(i, len(src)):
    if src[k] == '{': depth += 1
    elif src[k] == '}':
        depth -= 1
        if depth == 0: j = k + 1; break
SESSIONS = json.loads(src[i:j]); EN = SESSIONS['en']
TYPE_DB = {'trueFalse': 'true_false', 'clues': 'clue_chain', 'countdown': 'countdown_list', 'putInOrder': 'put_in_order', 'imposter': 'imposter_multi_select', 'careerPath': 'career_path', 'highLow': 'high_low'}
def q(sql):
    out = subprocess.run(['psql', SDB, '-Atc', sql], capture_output=True, text=True)
    if out.returncode != 0 or out.stderr.strip():
        raise GenError('SQL failed: ' + out.stderr.strip()[:200])
    return out.stdout.strip()
def esc(v): return v.replace("'", "''")
class GenError(Exception):
    pass
class NoMatch(GenError):
    pass
REQUIRED_FIELDS = {"trueFalse": ["options"], "imposter": ["options"], "countdown": ["answer_groups"], "putInOrder": ["items"], "highLow": ["matchups"], "clues": ["clues"], "careerPath": ["clubs", "display_answer"]}
def fetch(dbtype, where, keep=None):
    """Exactly one published source row (after the optional python-side filter), or a hard failure — never a guess."""
    rows = q(f"select json_build_object('id', q.id, 'prompt', q.prompt, 'payload', p.payload, 'category', c.name)::text from questions q join question_payloads p on p.question_id=q.id left join categories c on c.id=q.category_id where q.type='{dbtype}' and {where}")
    found = [json.loads(l) for l in rows.split('\n') if l.strip()]
    if keep: found = [r for r in found if keep(r)]
    # The pool holds a few exact duplicates (same text in every locale): identical content is one source.
    content = {json.dumps({k: v for k, v in r.items() if k != 'id'}, sort_keys=True) for r in found}
    if len(found) == 0:
        raise NoMatch(f"{dbtype}: no row for {where[:90]}")
    if len(content) != 1:
        raise GenError(f"{dbtype}: {len(found)} distinct rows for {where[:90]}")
    return found[0]
def compatible(t, question, row):
    """The fixture's nested ids (uuids from the original export) and English content must all exist in the row."""
    pay = row['payload']
    for ours, theirs in [('options', 'options'), ('answerGroups', 'answer_groups'), ('items', 'items')]:
        if ours in question and theirs in pay:
            ids = {x['id'] for x in pay[theirs]}
            if any(x['id'] not in ids for x in question[ours]): return False
    if 'matchups' in question and 'matchups' in pay:
        theirs = {(m['id'], m.get('left_name', {}).get('en'), m.get('left_value'), m.get('right_name', {}).get('en'), m.get('right_value')) for m in pay['matchups']}
        if any((m['id'], m['leftName'], m['leftValue'], m['rightName'], m['rightValue']) not in theirs for m in question['matchups']): return False
    if 'clues' in question and 'clues' in pay:
        if len(pay['clues']) < len(question['clues']): return False
        if any(pc.get('content', {}).get('en') != c['content'] for c, pc in zip(question['clues'], pay['clues'])): return False
    if 'clubs' in question and 'clubs' in pay:
        if [c.get('en') for c in pay['clubs']] != question['clubs']: return False
    if 'displayAnswer' in question and 'display_answer' in pay:
        if pay['display_answer'].get('en') != question['displayAnswer']: return False
    if question.get('category') and row.get('category') and row['category'].get('en') != question['category']: return False
    return True
def lookup(t, question):
    dbtype = TYPE_DB[t]
    keep = lambda r: compatible(t, question, r)
    if t == 'careerPath':
        return fetch(dbtype, f"p.payload->'display_answer'->>'en' = '{esc(question['displayAnswer'])}'", keep)
    if t == 'clues':
        return fetch(dbtype, f"p.payload->'clues'->0->'content'->>'en' = '{esc(question['clues'][0]['content'])}'", keep)
    if t == 'countdown':
        try:
            return fetch(dbtype, f"p.payload->'prompt'->>'en' = '{esc(question['prompt'])}'", keep)
        except NoMatch:
            return fetch(dbtype, f"q.prompt->>'en' = '{esc(question['prompt'])}'", keep)
    return fetch(dbtype, f"q.prompt->>'en' = '{esc(question['prompt'])}'", keep)
MISSING = []
def L(obj, loc, fallback):
    """Localized text; a missing translation is recorded, not silently replaced with English."""
    if isinstance(obj, dict) and obj.get(loc): return obj[loc]
    MISSING.append((loc, fallback[:60]))
    return fallback
def same_ids(ours, theirs, label):
    """Every fixture id must exist in the source row (the original export may have truncated long lists)."""
    a = [x['id'] for x in ours]; b = {x['id'] for x in theirs}
    missing = [x for x in a if x not in b]
    if missing: raise GenError(f"{label}: ids not in source row: {missing}")
def localize(t, question, row, loc):
    out = copy.deepcopy(question); pay = row['payload']; prompt = row['prompt']
    for field in REQUIRED_FIELDS.get(t, []):
        if field not in pay: raise GenError(f"{t}: source row {row.get('id')} lacks payload.{field}")
    if 'prompt' in out: out['prompt'] = L(pay.get('prompt'), loc, L(prompt, loc, out['prompt'])) if isinstance(pay.get('prompt'), dict) else L(prompt, loc, out['prompt'])
    if 'category' in out and row.get('category'): out['category'] = L(row['category'], loc, out['category'])
    if 'displayAnswer' in out and 'display_answer' in pay: out['displayAnswer'] = L(pay['display_answer'], loc, out['displayAnswer'])
    if 'acceptedAnswers' in out:
        extra = [L(pay.get('display_answer'), loc, '')] if 'display_answer' in pay else []
        extra += [a for a in pay.get('accepted_answers', []) if isinstance(a, str)]
        out['acceptedAnswers'] = list(dict.fromkeys([a for a in out['acceptedAnswers'] + extra if a]))
    if 'clues' in out and 'clues' in pay:
        if len(out['clues']) != len(pay['clues']): raise GenError('clues count differs')
        for c, pc in zip(out['clues'], pay['clues']): c['content'] = L(pc.get('content'), loc, c['content'])
    if 'clubs' in out and 'clubs' in pay:
        if len(out['clubs']) != len(pay['clubs']): raise GenError('clubs count differs')
        out['clubs'] = [L(pc, loc, c) for c, pc in zip(out['clubs'], pay['clubs'])]
    if 'options' in out and 'options' in pay:
        same_ids(out['options'], pay['options'], 'options')
        by_id = {o['id']: o for o in pay['options']}
        for o in out['options']:
            po = by_id.get(o['id'])
            if po: o['text'] = L(po.get('text'), loc, o['text'])
    if 'trueLabel' in out and 'options' in pay:
        by_id = {o['id']: o for o in pay['options']}
        if 'true' not in by_id or 'false' not in by_id: raise GenError(f"{t}: source row lacks true/false options")
        if 'true' in by_id: out['trueLabel'] = L(by_id['true'].get('text'), loc, out['trueLabel'])
        if 'false' in by_id: out['falseLabel'] = L(by_id['false'].get('text'), loc, out['falseLabel'])
    if 'answerGroups' in out and 'answer_groups' in pay:
        same_ids(out['answerGroups'], pay['answer_groups'], 'answerGroups')
        by_id = {g['id']: g for g in pay['answer_groups']}
        for g in out['answerGroups']:
            pg = by_id.get(g['id'])
            if pg:
                g['display'] = L(pg.get('display'), loc, g['display'])
                g['acceptedAnswers'] = list(dict.fromkeys(g['acceptedAnswers'] + [g['display']] + [a for a in pg.get('accepted_answers', []) if isinstance(a, str)]))
    if 'items' in out and 'items' in pay:
        same_ids(out['items'], pay['items'], 'items')
        by_id = {it['id']: it for it in pay['items']}
        for it in out['items']:
            pi = by_id.get(it['id'])
            if pi: it['label'] = L(pi.get('label'), loc, it['label'])
    if 'statLabel' in out:
        if 'stat_label' not in pay: raise GenError(f"{t}: source row lacks stat_label")
        out['statLabel'] = L(pay['stat_label'], loc, out['statLabel'])
    if 'matchups' in out and 'matchups' in pay:
        same_ids(out['matchups'], pay['matchups'], 'matchups')
        by_id = {m['id']: m for m in pay['matchups']}
        for m in out['matchups']:
            pm = by_id.get(m['id'])
            if pm:
                m['leftName'] = L(pm.get('left_name'), loc, m['leftName']); m['rightName'] = L(pm.get('right_name'), loc, m['rightName'])
    return out
TITLES = {
 'trueFalse': {'es': ('Verdadero o falso', 'Di si cada afirmación de fútbol es verdadera o falsa'), 'tr': ('Doğru mu Yanlış mı', 'Her futbol ifadesi için doğru ya da yanlış de')},
 'clues': {'es': ('¿Quién soy?', 'Adivina al jugador por las pistas: menos pistas, más puntos'), 'tr': ('Ben Kimim?', 'İpuçlarından oyuncuyu bil — daha az ipucu, daha çok puan')},
 'countdown': {'es': ('Cuenta atrás', 'Nombra tantas respuestas correctas como puedas antes de que acabe el tiempo'), 'tr': ('Geri Sayım', 'Süre bitmeden olabildiğince çok doğru cevap say')},
 'putInOrder': {'es': ('Ordénalos', 'Arrastra los elementos al orden correcto'), 'tr': ('Sıraya Koy', 'Öğeleri doğru sıraya sürükle')},
 'imposter': {'es': ('Impostor', 'Marca todas las respuestas correctas y evita a los impostores'), 'tr': ('Sahtekâr', 'Tüm doğru cevapları seç — sahtekârlardan kaçın')},
 'careerPath': {'es': ('Trayectoria', 'Adivina al jugador por su historial de traspasos'), 'tr': ('Kariyer Yolu', 'Transfer geçmişinden oyuncuyu bil')},
 'highLow': {'es': ('Más o menos', 'Elige el valor más alto para mantener tu racha'), 'tr': ('Yüksek mi Düşük mü', 'Serini sürdürmek için daha yüksek değeri seç')},
}
result = {}; stats = []
for loc in ['es', 'tr']:
    result[loc] = {}
    for t, session in EN.items():
        out = copy.deepcopy(session)
        out['title'], out['description'] = TITLES[t][loc]
        key = 'rounds' if 'rounds' in out else 'questions'
        hit = 0
        new_items = []
        for question in out[key]:
            row = lookup(t, question)
            hit += 1; new_items.append(localize(t, question, row, loc))
        out[key] = new_items
        result[loc][t] = out
        stats.append((loc, t, hit, len(out[key])))
for s_ in stats: print(*s_)
if MISSING:
    print('MISSING TRANSLATIONS (kept English):'); [print(' ', m) for m in MISSING]
    sys.exit(2)
json.dump(result, open('/tmp/demo-pool-locales.json', 'w'), ensure_ascii=False, indent=2)
print('written /tmp/demo-pool-locales.json')
