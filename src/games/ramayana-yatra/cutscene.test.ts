/**
 * v0.5b WP-E — the Āditya-hṛdayam cutscene (Yuddha 6.105.1–31). OWNER: WP-E. Spec: notes/v05b-e.md.
 *  - the text: all 31 verses, four pādas each, valid Devanagari; the metre of every pāda (checkAnustubh; vipulā and
 *    irregular pādas only where the verse's meterNote names them, with the vipulā the scan finds; verse 31 in
 *    puṣpitāgrā); the sandhi engine rebuilds every half-verse from its padaccheda (a pāda-break hiatus only where the
 *    verse records it, and only where it is needed); verse 4 is the game verse s-aditya-hrdayam
 *  - the sources: every witness's text of every verse differs from the chosen text only by its listed variants
 *    (no unexplained difference), every stotra spot checked is explained, every variant is real
 *  - IAST comes from the engine (a lossless round trip); the narration and interface strings verify with the oracle
 *  - logic: cutsceneDue only in Rāvaṇa's battle (book 6), at ≤ 60 % as shown, never twice; cutscene-done sets the flag;
 *    the Kathā bots dispatch it once and win; the practice bots never dispatch it
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkAnustubh, devaToIast, devaToSlp1, iastToDeva, joinSandhi, normalizeDeva, validateDeva, weights } from '@sanskrit';
import type { BattleSpec, CutsceneVerse, GameState, PartyMember, SaveData } from './types';
import { loadContent } from './content';
import { indexOf } from './logic-util';
import { KATHA_FLAG } from './logic-katha';
import { battleAction, startBattle } from './logic-battle';
import { newMember } from './logic-progress';
import { reduce } from './logic';
import { type AutoOptions, autoplay, botActions, runWalkthrough } from './logic-sim';
import { createRng } from '@sdk';
import { ADITYA_ID, CUTSCENE_PHASES, aksharaCount, cutsceneDue, cutsceneSeen, cutsceneSteps, stepAt, stepKey, stepsMs } from './logic-cutscene';
import { getOracle } from './sa-verify';
import { FRAME, FRAME_FOV, FRAME_POSE, agastyaShare, framePlane, posePath, shotFor, shotPose, sunDir } from './cutscene3d';

const C = loadContent();
const idx = indexOf(C);
const A = C.aditya!;
const FLAG = 'seen.aditya';
const compact = (d: string): string => devaToSlp1(d).replace(/[\s|]+/g, '');

// ───────────────────────── the text ─────────────────────────

test('text: Yuddha 6.105.1–31, four pādas each, valid normalised Devanagari, a speaker, an English line', () => {
  assert.ok(A, 'content/aditya-hridayam.json is loaded (content.aditya)');
  assert.equal(A.id, ADITYA_ID);
  assert.equal(A.flag, FLAG);
  assert.deepEqual(A.verses.map((v) => v.n), Array.from({ length: 31 }, (_, i) => i + 1));
  const f: string[] = [];
  for (const v of A.verses) {
    if (v.ref !== `6.105.${v.n}`) f.push(`${v.n}: ref ${v.ref}`);
    if (v.padas.length !== 4) f.push(`${v.n}: ${v.padas.length} pādas`);
    const sa = [...v.padas, ...(v.words ?? []).flat()];
    for (const p of sa) {
      // one known print form: an anusvāra on the avagraha (मार्तण्डकः + अंशुमान् → मार्तण्डकोऽंशुमान्, 11.4), as both Rāmāyaṇa
      // texts print it and as joinSandhiDeva writes it; validateDeva wants an anusvāra after a vowel (REVIEW.md, WP-E)
      const errors = validateDeva(p).errors.filter((e) => !(p.includes('ऽं') && /U\+0902/.test(e)));
      if (errors.length) f.push(`${v.n}: "${p}" ${errors.join('; ')}`);
      if (normalizeDeva(p) !== p || p !== p.normalize('NFC')) f.push(`${v.n}: "${p}" not normalised`);
      if (/[A-Za-z]/.test(p)) f.push(`${v.n}: Latin in "${p}"`);
    }
    if (!['narrator', 'agastya'].includes(v.speaker)) f.push(`${v.n}: speaker`);
    if (!v.en.trim() || v.en.length > 280 || /[ऀ-ॿ]/.test(v.en)) f.push(`${v.n}: English line (1–2 plain lines, no Devanagari)`);
  }
  assert.deepEqual(f, []);
  assert.deepEqual(A.verses.flatMap((v) => v.padas.filter((p) => p.includes('ऽं'))), ['त्वष्टा मार्तण्डकोऽंशुमान्'], 'the avagraha + anusvāra form is the one listed');
  // Agastya speaks 3–27 (27 ends with the narrator: “with these words Agastya went away”)
  assert.deepEqual(A.verses.filter((v) => v.speaker === 'agastya').map((v) => v.n), Array.from({ length: 25 }, (_, i) => i + 3));
});

/** The odd-pāda variant the scan shows (syllables 5–7), or null when it is none of the four recognised vipulās. */
function vipula(pattern: string): string | null {
  const k = pattern.slice(4, 7);
  if (pattern.length !== 8 || pattern.charAt(3) !== 'G') return null; // the vipulās want a heavy 4th syllable
  return ({ LLL: 'na-vipulā', GLL: 'bha-vipulā', GGG: 'ma-vipulā', GLG: 'ra-vipulā' } as Record<string, string>)[k] ?? null;
}

test('metre: every anuṣṭubh pāda scans (pathyā), or the verse’s meterNote names the pāda with the vipulā the scan finds (or its irregular length); verse 31 is puṣpitāgrā', () => {
  const f: string[] = [];
  const named: string[] = [];
  for (const v of A.verses) {
    if (v.meter === 'puspitagra') {
      // Vṛttaratnākara 4.10: अयुजि नयुगरेफतो यकारो युजि च नजौ जरगाश्च पुष्पिताग्रा — odd na na ra ya, even na ja ja ra ga
      const want = ['LLLLLLGLGLGG', 'LLLLGLLGLGLGG'];
      v.padas.forEach((p, i) => {
        const w = weights(p);
        const exp = want[i % 2] as string;
        if (w.length !== exp.length || w.slice(0, -1) !== exp.slice(0, -1)) f.push(`${v.n}.${i + 1}: ${w} is not puṣpitāgrā (${exp}, last syllable free)`);
      });
      continue;
    }
    v.padas.forEach((p, i) => {
      const r = checkAnustubh(p, i as 0 | 1 | 2 | 3);
      if (r.ok) return;
      const note = v.meterNote ?? '';
      const names = new RegExp(`pāda ${i + 1}\\b`).test(note);
      const kind = i % 2 === 0 ? vipula(r.pattern) : null;
      if (!names) f.push(`${v.n}.${i + 1} (${p}): ${r.pattern} ${r.issues.join('; ')} — and the meterNote does not name it`);
      else if (kind && !note.includes(kind)) f.push(`${v.n}.${i + 1}: the scan is a ${kind}; meterNote says otherwise`);
      else if (!kind && !note.includes(`${r.syllables} syllables`)) f.push(`${v.n}.${i + 1}: ${r.pattern} is neither a vipulā nor explained (${r.syllables} syllables)`);
      named.push(`${v.n}.${i + 1} ${kind ?? `${r.syllables} syllables`}`);
    });
    // a note must not name a pāda that scans
    for (const m of (v.meterNote ?? '').matchAll(/pāda (\d)/g)) {
      const i = Number(m[1]) - 1;
      if (checkAnustubh(v.padas[i] ?? '', i as 0 | 1 | 2 | 3).ok) f.push(`${v.n}: meterNote names pāda ${i + 1}, which scans`);
    }
  }
  assert.deepEqual(f, []);
  console.log(`# 31 verses: 120 anuṣṭubh pādas + 4 puṣpitāgrā; not pathyā: ${named.join(' · ')}`);
  assert.deepEqual(named, ['5.3 na-vipulā', '7.3 na-vipulā', '10.4 9 syllables', '12.1 bha-vipulā', '16.1 na-vipulā', '16.3 bha-vipulā', '30.3 na-vipulā']);
});

type Cand = { done: string; cur: string; orig: string };
/**
 * Every surface the sandhi engine allows for a word sequence (SLP1, no spaces), each junction decided on the original
 * words (as content.test.ts sandhiRebuild); `pausa`: junction indices left unjoined (a pāda-break hiatus).
 */
function engineJoin(words: string[], pausa: ReadonlySet<number> = new Set()): string[] {
  let cands: Cand[] = [{ done: '', cur: words[0] ?? '', orig: words[0] ?? '' }];
  words.slice(1).forEach((next, k) => {
    const out: Cand[] = [];
    for (const c of cands) {
      if (pausa.has(k)) {
        out.push({ done: c.done + c.cur, cur: next, orig: next });
        continue;
      }
      const r = joinSandhi(c.orig, next);
      for (const v of new Set([r.result, ...r.alternatives.map((a) => a.result)].map((x) => x.replace(/\s+/g, '')))) {
        let l = 0;
        while (l < c.orig.length && l < v.length && c.orig[l] === v[l]) l++;
        const tail = c.orig.slice(l);
        if (c.cur.endsWith(tail)) out.push({ done: c.done + c.cur.slice(0, c.cur.length - tail.length), cur: v.slice(l), orig: next });
        else out.push({ done: c.done + c.cur, cur: v.slice(c.orig.length), orig: next });
      }
    }
    cands = out.slice(0, 128);
  });
  return [...new Set(cands.map((c) => c.done + c.cur))];
}

function wordsOf(v: CutsceneVerse): string[][] {
  if (v.words) return v.words;
  const s = idx.shloka.get(v.wordsFrom ?? '');
  assert.ok(s, `${v.n}: wordsFrom ${v.wordsFrom}`);
  return [0, 1, 2, 3].map((p) => s.words.filter((w) => w.pada === p).map((w) => w.form));
}

test('sandhi: joinSandhi rebuilds every half-verse from its padaccheda; a pāda-break hiatus only where the verse records it and the engine would join', () => {
  const f: string[] = [];
  const hiatus: string[] = [];
  for (const v of A.verses) {
    const words = wordsOf(v);
    if (words.length !== 4 || words.some((w) => w.length === 0)) f.push(`${v.n}: words per pāda`);
    for (const [a, b] of [[0, 1], [2, 3]] as const) {
      const ws = [...(words[a] ?? []), ...(words[b] ?? [])].map(devaToSlp1);
      const target = compact(v.padas[a] ?? '') + compact(v.padas[b] ?? '');
      const pausa = v.pausa?.after === a ? new Set([(words[a] ?? []).length - 1]) : new Set<number>();
      if (!engineJoin(ws, pausa).includes(target)) f.push(`${v.n} pādas ${a + 1}–${b + 1}: the engine does not rebuild "${v.padas[a]} | ${v.padas[b]}"`);
      if (pausa.size) {
        hiatus.push(`${v.n}.${a + 1}|${b + 1}`);
        if (engineJoin(ws).includes(target)) f.push(`${v.n}: the recorded hiatus is not needed`);
        if (!v.pausa?.note.trim()) f.push(`${v.n}: hiatus without a note`);
      }
    }
    if (v.pausa && ![0, 2].includes(v.pausa.after)) f.push(`${v.n}: a hiatus is recorded only inside a half-verse (after pāda 1 or 3)`);
  }
  assert.deepEqual(f, []);
  assert.deepEqual(hiatus, ['7.3|4', '13.1|2', '17.3|4']);
});

test('verse 4 is the game’s verse s-aditya-hrdayam (same pādas, same English)', () => {
  const s = idx.shloka.get('s-aditya-hrdayam');
  const v = A.verses[3];
  assert.ok(s && v);
  assert.deepEqual(v.padas, s.padas);
  assert.equal(v.en, s.translation);
  assert.equal(`${s.kanda}.${s.sarga}.${s.verse}`, v.ref);
});

// ───────────────────────── the sources ─────────────────────────

test('sources: four witnesses with URLs; vr and gm give every verse, iitk 1–30; the stotra page is checked at its spots', () => {
  assert.deepEqual(A.sources.map((s) => s.id), ['vr', 'iitk', 'sd', 'gm']);
  for (const s of A.sources) assert.ok(/^https:\/\//.test(s.url) && s.name.trim() && s.accessed && s.coverage.trim(), s.id);
  for (const v of A.verses) {
    assert.ok(v.readings['vr'] && v.readings['gm'], `${v.n}: vr and gm`);
    assert.equal(!!v.readings['iitk'], v.n <= 30, `${v.n}: iitk (verse 31 only in English on that page)`);
  }
  assert.ok(A.verses.filter((v) => (v.sd ?? []).length > 0).length >= 15, 'the stotra page is checked wherever the others differ');
  assert.match(A.reference.criticalEdition, /NOT VERIFIED/, 'the critical-edition statement stays marked until a reviewer checks it');
});

test('sources: no unexplained difference — each witness, with its listed variants applied, is the chosen text (spaces aside); every stotra spot is explained; every variant is real', () => {
  const f: string[] = [];
  const counts: Record<string, number> = {};
  for (const v of A.verses) {
    const chosen = v.padas.map(compact).join('');
    for (const x of v.variants) {
      if (!chosen.includes(compact(x.chosen))) f.push(`${v.n}: variant "${x.chosen}" is not in the chosen text`);
      if (!x.note.trim() || !['reading', 'orthography', 'typo'].includes(x.kind) || Object.keys(x.in).length === 0) f.push(`${v.n}: variant "${x.chosen}" needs a kind, a note and a witness`);
      for (const [w, r] of Object.entries(x.in)) {
        counts[x.kind] = (counts[x.kind] ?? 0) + 1;
        if (w !== 'sd' && !compact(v.readings[w] ?? '').includes(compact(r))) f.push(`${v.n}: ${w} has no "${r}"`);
        if (w === 'sd' && !(v.sd ?? []).some((spot) => compact(spot).includes(compact(r)))) f.push(`${v.n}: no stotra spot holds "${r}"`);
        if (compact(r) === compact(x.chosen)) f.push(`${v.n}: variant "${r}" is the chosen text itself`);
      }
    }
    for (const [w, text] of Object.entries(v.readings)) {
      let t = compact(text);
      for (const x of v.variants) {
        const r = x.in[w];
        if (r !== undefined) t = t.replace(compact(r), compact(x.chosen));
      }
      if (t !== chosen) {
        let i = 0;
        while (t[i] === chosen[i]) i++;
        f.push(`${v.n} ${w}: unexplained difference near "${t.slice(Math.max(0, i - 6), i + 10)}" (chosen "${chosen.slice(Math.max(0, i - 6), i + 10)}")`);
      }
    }
    for (const spot of v.sd ?? []) {
      let t = compact(spot);
      for (const x of v.variants) if (x.in['sd'] !== undefined) t = t.replace(compact(x.in['sd']), compact(x.chosen));
      if (!chosen.includes(t)) f.push(`${v.n}: stotra spot "${spot}" is unexplained`);
    }
  }
  assert.deepEqual(f, []);
  console.log(`# variants by kind (witness readings): ${JSON.stringify(counts)}`);
});

test('sources: where the two Rāmāyaṇa texts agree their reading stands (no `reading` variant overrules vr and iitk together)', () => {
  const f: string[] = [];
  for (const v of A.verses) for (const x of v.variants) if (x.kind === 'reading' && x.in['vr'] !== undefined && x.in['iitk'] !== undefined) f.push(`${v.n}: "${x.chosen}" overrules both Rāmāyaṇa texts`);
  assert.deepEqual(f, []);
});

// ───────────────────────── script, narration, interface ─────────────────────────

test('IAST is derived by the engine (never typed): every pāda goes Devanagari → IAST → Devanagari unchanged', () => {
  const f: string[] = [];
  for (const v of A.verses) for (const p of v.padas) if (iastToDeva(devaToIast(p)) !== p) f.push(`${v.n}: ${p} → ${devaToIast(p)} → ${iastToDeva(devaToIast(p))}`);
  assert.deepEqual(f, []);
  assert.ok(!JSON.stringify(A.verses.map((v) => [v.padas, v.words])).match(/[āīūṛṝḷṃḥṅñṭḍṇśṣ]/), 'no hand-typed IAST in the text fields');
});

test('narration and interface strings: Sanskrit verifies word by word (oracle), short sentences, English beside each', () => {
  const o = getOracle();
  const f: string[] = [];
  A.narration.forEach((n, i) => {
    const r = o.verifyLine(n.sa, { en: n.en });
    if (!r.ok) f.push(`narration ${i}: ${n.sa} — ${r.errors.join('; ')}`);
    for (const sent of n.sa.split(/[।?!]/).filter((x) => x.trim())) if (sent.trim().split(/\s+/).length > 10) f.push(`narration ${i}: more than 10 words`);
    if (!n.en.trim() || /[ऀ-ॿ]/.test(n.en)) f.push(`narration ${i}: English`);
  });
  for (const [k, e] of Object.entries(A.ui)) {
    const r = o.verifyLine(e.sa, { en: e.en, ...(e.label ? { label: true } : {}), ui: true });
    if (!r.ok) f.push(`ui.${k}: ${e.sa} — ${r.errors.join('; ')}`);
    if (!e.en.trim()) f.push(`ui.${k}: English`);
  }
  assert.deepEqual(f, []);
  // the context the brief asks for: the long battle, Rāvaṇa back with new strength, Rāma weary and thinking, the gods watching, Agastya arriving
  const en = A.narration.map((n) => n.en).join(' ');
  for (const w of ['battle', 'Ravana', 'weary', 'gods', 'Agastya']) assert.ok(en.includes(w), w);
});

// ───────────────────────── the timeline ─────────────────────────

test('timeline: the narration, then all 124 pādas in order at ≈ 3 akṣaras / s (each ≥ 1.5 s); stepAt walks it', () => {
  const steps = cutsceneSteps(C);
  assert.equal(steps.length, A.narration.length + 31 * 4);
  assert.deepEqual(steps.slice(0, A.narration.length).map(stepKey), A.narration.map((_, i) => `narration:${i}`));
  const keys = steps.slice(A.narration.length).map(stepKey);
  assert.deepEqual(keys, A.verses.flatMap((v) => v.padas.map((_, p) => `verse:${v.n}:${p}`)));
  for (const s of steps) if (s.kind === 'pada') assert.ok(s.ms >= 1500 + 250 && s.ms <= (s.aksharas / 3) * 1000 + 1000 + 1, `${stepKey(s)} ${s.ms} ms`);
  assert.equal(aksharaCount('आदित्यहृदयं पुण्यं।'), 8); // आ दि त्य हृ द यं पु ण्यं
  const slow = stepsMs(cutsceneSteps(C, { rate: 2 }));
  const total = stepsMs(steps);
  assert.ok(slow > total, 'the pace is tunable');
  console.log(`# follow-along at 3 akṣaras/s: ${(total / 60000).toFixed(1)} min`);
  assert.deepEqual(stepAt(steps, 0), { index: 0, frac: 0 });
  assert.equal(stepAt(steps, total + 1).index, steps.length);
  const first = steps[0]!.ms;
  assert.equal(stepAt(steps, first).index, 1);
  assert.deepEqual([...CUTSCENE_PHASES], ['flat', 'rotate-out', 'scene', 'rotate-in', 'done']);
});

// ───────────────────────── logic: when it is due, and the flag ─────────────────────────

function member(id: string, level: number, moves: string[]): PartyMember {
  const m = newMember(idx.ally.get(id)!, level, C);
  const pp = { ...m.pp };
  for (const x of moves) pp[x] = idx.move.get(x)!.pp;
  return { ...m, moves, pp };
}
function state(o: { style: 'katha' | 'abhyasa'; chapter?: number; flags?: string[] }): GameState {
  const ch = C.chapters.find((c) => c.kanda === (o.chapter ?? 6)) ?? C.chapters[0]!;
  const flags: SaveData['flags'] = o.style === 'katha' ? { [KATHA_FLAG]: true } : {};
  for (const f of o.flags ?? []) flags[f] = true;
  // the party a Kathā playthrough brings to Book 6 (level floor 33), as in tactics.test.ts
  const party = [member('player', 33, ['pada_bana', 'lipi_raksha', 'shoka_shloka', 'shuddha_vak']), member('hanuman', 33, ['vayu_vega', 'gada', 'jaya_ghosha']), member('rama', 33, ['dharma_vigraha', 'aditya_hrdaya', 'brahmastra', 'vayavyastra']), member('lakshmana', 33, ['bana', 'khadga', 'agni_bana', 'viddhi'])];
  const save: SaveData = {
    v: 1, playerName: 'T', avatar: 'a', mapId: ch.startMap, x: ch.startX, y: ch.startY, facing: 'down', respawn: { mapId: ch.startMap, x: ch.startX, y: ch.startY },
    chapter: (o.chapter ?? 6) as SaveData['chapter'], objective: '', flags, party, items: {}, niska: 0, words: {}, shlokas: { 's-aditya-hrdayam': { heard: true, restored: true, best: 4 } },
    step: 0, npcPos: {}, playMs: 0, completedChapters: [], ...(o.style === 'katha' ? { style: 'katha' as const, smrti: {} } : {}),
  };
  return { v: 1, seed: 7, tick: 0, level: 3, save, mode: 'explore', script: null, pending: null, battle: null, recital: null, session: { correct: 0, total: 0, swift: 0, practised: [], shlokasHeard: [], shlokasRestored: [], battlesWon: 0, chaptersCompleted: [] }, fx: [] };
}
/** As the story stages it (story-ch6.json ch6.ravana): a boss fight that cannot be run from or lost, Rāma in front. */
const spec = (foe: string, level = 30): BattleSpec => ({ enemies: [{ id: foe, level }], kind: 'boss', canRun: false, canLose: false, bg: 'lanka', music: 'boss', lead: 'rama' });
function toCommand(s0: GameState): GameState {
  let s = s0;
  for (let i = 0; i < 80 && s.battle && s.battle.phase !== 'command' && !['won', 'lost'].includes(s.battle.phase); i++) s = battleAction(s, C, { type: 'advance' });
  return s;
}
const withFoeHp = (s: GameState, share: number): GameState => ({ ...s, battle: { ...s.battle!, foe: { ...s.battle!.foe, hp: Math.floor(s.battle!.foe.maxHp * share) } } });

test('cutsceneDue: Rāvaṇa in book 6 at ≤ 60 % (as shown: the command menu or the beat on screen), in both journeys; not before, not other foes, not twice', () => {
  for (const style of ['katha', 'abhyasa'] as const) {
    const s = toCommand(startBattle(state({ style }), C, spec('ravana')));
    assert.equal(s.battle!.phase, 'command');
    assert.equal(cutsceneDue(s, C), null, `${style}: full strength`);
    assert.equal(cutsceneDue(withFoeHp(s, 0.61), C), null, `${style}: 61 %`);
    const due = withFoeHp(s, 0.6);
    assert.equal(cutsceneDue(due, C), ADITYA_ID, `${style}: 60 %`);
    // the beat on screen decides while narration plays (a hit that crosses 60 % shows the scene before the next beat)
    const beat = { text: 'x', allyHp: 1, foeHp: Math.floor(s.battle!.foe.maxHp * 0.55) };
    const beats = { ...due, battle: { ...due.battle!, phase: 'beats' as const, beats: [beat, { ...beat, foeHp: 1 }] } };
    assert.equal(cutsceneDue(beats, C), ADITYA_ID);
    assert.equal(cutsceneDue({ ...beats, battle: { ...beats.battle, beats: [{ ...beat, foeHp: s.battle!.foe.maxHp }] } }, C), null, 'the beat on screen still shows him above 60 %');
    assert.equal(cutsceneDue({ ...due, battle: { ...due.battle!, phase: 'challenge' } }, C), null, 'never in the middle of a recitation');
    assert.equal(cutsceneDue(withFoeHp(s, 0), C), null, 'never for a fallen foe');
    // the action: the flag, once
    const done = reduce(due, C, { type: 'cutscene-done', id: ADITYA_ID });
    assert.notEqual(done, due);
    assert.equal(done.save.flags[FLAG], true);
    assert.ok(cutsceneSeen(C, done.save.flags));
    assert.equal(cutsceneDue(done, C), null, 'seen: never again');
    assert.equal(done.battle, due.battle, 'the battle is untouched');
    assert.equal(reduce(done, C, { type: 'cutscene-done', id: ADITYA_ID }), done, 'a second dispatch is refused');
    assert.equal(reduce(s, C, { type: 'cutscene-done', id: ADITYA_ID }), s, 'not due: refused');
    assert.equal(reduce(due, C, { type: 'cutscene-done', id: 'nope' }), due, 'unknown id: refused');
  }
  // other foes, other books, outside battle
  const k = toCommand(startBattle(state({ style: 'katha' }), C, spec('indrajit', 28)));
  assert.equal(cutsceneDue(withFoeHp(k, 0.3), C), null, 'Indrajit');
  const book5 = toCommand(startBattle(state({ style: 'katha', chapter: 5 }), C, spec('ravana')));
  assert.equal(cutsceneDue(withFoeHp(book5, 0.3), C), null, 'Rāvaṇa outside book 6');
  assert.equal(cutsceneDue(state({ style: 'katha' }), C), null, 'explore');
  assert.equal(reduce(state({ style: 'katha' }), C, { type: 'cutscene-done', id: ADITYA_ID }).save.flags[FLAG], undefined);
});

test('bots: the Kathā bot dispatches cutscene-done exactly once in Rāvaṇa’s battle and wins (perfect, strategic, spammer, 70 % and careless 70 % reciters, seeds 1–5); the practice bot never dispatches it', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const policies: AutoOptions[] = [{}, { policy: 'strategic' }, { policy: 'spam' }, { reciter: { accuracy: 0.7, rng: createRng(seed) } }, { reciter: { accuracy: 0.7, rng: createRng(seed) }, careless: { chance: 0.5, rng: createRng(seed + 99) } }]; // as katha.test / tactics.test
    for (const p of policies) {
      const s0 = { ...state({ style: 'katha' }), seed };
      let dispatched = 0;
      let dueAt = -1;
      let maxHp = 0;
      const end = autoplay(startBattle(s0, C, spec('ravana')), C, {
        ...p,
        onAction: (s, a) => {
          if (a.type === 'cutscene-done') {
            dispatched++;
            maxHp = s.battle!.foe.maxHp;
            dueAt = s.battle!.phase === 'beats' ? (s.battle!.beats[0]?.foeHp ?? -1) : s.battle!.foe.hp;
          }
        },
      });
      const label = `seed ${seed} ${JSON.stringify(Object.keys(p))} end ${end.mode} ${end.battle?.phase} won ${end.session.battlesWon} hp ${end.battle?.foe.hp}/${end.battle?.foe.maxHp}`;
      assert.equal(dispatched, 1, `${label}: once`);
      assert.ok(dueAt > 0 && dueAt <= maxHp * 0.6, `${label}: shown at ${dueAt} of ${maxHp}`);
      assert.equal(end.save.flags[FLAG], true);
      assert.equal(end.session.battlesWon, 1, `${label}: won`);
      assert.notEqual(end.battle?.phase, 'lost');
    }
    // practice: the same fight, the bot never dispatches it (the view plays it in both journeys)
    let practice = 0;
    const p0 = { ...state({ style: 'abhyasa' }), seed };
    autoplay(startBattle(p0, C, spec('ravana')), C, { onAction: (_s, a) => void (a.type === 'cutscene-done' && practice++) });
    assert.equal(practice, 0, `seed ${seed}: practice never dispatches`);
  }
  // botActions offers it first while due (Kathā), never in practice
  const due = withFoeHp(toCommand(startBattle(state({ style: 'katha' }), C, spec('ravana'))), 0.5);
  const offered = botActions(due, C, { recited: false, rested: false });
  assert.deepEqual(offered[0], { type: 'cutscene-done', id: ADITYA_ID });
  assert.ok(offered.length > 1 && !offered.slice(1).some((a) => a.type === 'cutscene-done'), 'then the battle’s own candidates (for callers that step with battleAction)');
  const pdue = withFoeHp(toCommand(startBattle(state({ style: 'abhyasa' }), C, spec('ravana'))), 0.5);
  assert.ok(!botActions(pdue, C, { recited: false, rested: false }).some((a) => a.type === 'cutscene-done'));
});

test('story: the Kathā walkthrough (seed 1, level 3) sees the scene once, in Rāvaṇa’s battle, and wins every fight; the practice walkthrough never sets the flag', () => {
  let n = 0;
  let foe = '';
  const r = runWalkthrough(C, 1, 3, { style: 'katha', onAction: (s, a) => {
    // (v0.6: a told cutscene ends with cutscene-done too — logic-told; this test counts the Āditya-hṛdayam)
    if (a.type === 'cutscene-done' && a.id === ADITYA_ID) {
      n++;
      foe = s.battle?.foe.id ?? '';
    }
  } });
  assert.equal(r.error, null, r.error ?? '');
  assert.equal(r.losses, 0, 'no lost fights');
  assert.equal(n, 1);
  assert.equal(foe, 'ravana');
  assert.equal(r.state.save.flags[FLAG], true);
  const pr = runWalkthrough(C, 1, 3, {});
  assert.equal(pr.error, null);
  assert.equal(pr.state.save.flags[FLAG], undefined, 'practice: the logic never sets it (the view does, when it plays the scene)');
});

// ───────────────────────── the 3D direction (pure helpers of cutscene3d.ts) ─────────────────────────

test('3D: the camera starts and ends exactly on the battle frame (it fills a 16:9 stage), the frame folds away for the scene and comes back upright; shots follow the text; Agastya comes with narration 5 and leaves with verse 27', () => {
  const close = (a: number[], b: number[]): boolean => a.every((x, i) => Math.abs(x - (b[i] as number)) < 1e-9);
  // the frame plane fills the view: tan(fov/2) × distance = half the frame's height
  assert.ok(Math.abs(Math.tan(FRAME_FOV / 2) * (FRAME_POSE.target[2] === FRAME.z ? FRAME_POSE.pos[2] - FRAME.z : NaN) - FRAME.h / 2) < 1e-9);
  assert.ok(close(posePath(0, true).pos, FRAME_POSE.pos) && posePath(0, true).roll === 0, 'rotate-out starts on the frame');
  assert.ok(close(posePath(1, true).pos, shotPose('wide', 0).pos), 'rotate-out ends on the wide shot');
  assert.ok(Math.abs(posePath(0.5, true).roll) > 0.1, 'it rolls out of the flat view on the way');
  assert.ok(close(posePath(1, false, shotPose('crane', 1)).pos, FRAME_POSE.pos) && close(posePath(1, false).target, FRAME_POSE.target), 'rotate-in ends on the frame');
  assert.deepEqual(framePlane('flat', 0), { tilt: 0, alpha: 1 });
  assert.equal(framePlane('scene', 0.5).alpha, 0);
  assert.ok(framePlane('rotate-out', 1).alpha < 1e-9 && framePlane('rotate-out', 1).tilt > 1.4, 'folded back and gone');
  assert.deepEqual(framePlane('rotate-in', 1), { tilt: 0, alpha: 1 });
  const steps = cutsceneSteps(C);
  const shot = (k: string): string => shotFor(steps.find((s) => stepKey(s) === k));
  assert.deepEqual(['narration:1', 'narration:2', 'narration:3', 'verse:4:0', 'verse:17:0', 'verse:30:0', 'verse:31:3'].map(shot), ['ravana', 'rama', 'gods', 'orbit', 'sun', 'resolve', 'crane']);
  const share = (k: string, f = 1): number => agastyaShare(steps.find((s) => stepKey(s) === k), f);
  assert.equal(share('narration:3'), 0);
  assert.ok(share('narration:4', 0.3) > 0 && share('narration:4', 0.3) < 1, 'he walks in');
  assert.equal(share('verse:26:3'), 1);
  assert.equal(share('verse:27:3', 1), 0, 'जगाम स यथागतम्');
  assert.equal(share('verse:28:0'), 0);
  // the sun rises during the hymn
  assert.ok(sunDir(1)[1] > sunDir(0)[1] && sunDir(0)[1] > 0);
});

test('REVIEW.md lists the cutscene for a human: every verse with its English, the narration, the interface strings, the reading decisions', async () => {
  const { readFileSync } = await import('node:fs');
  const md = readFileSync(new URL('./REVIEW.md', import.meta.url), 'utf8');
  const sec = md.split(/^## Āditya-hṛdayam cutscene \(v0\.5b WP-E\)/m)[1]?.split(/^## /m)[0] ?? '';
  assert.ok(sec, 'the WP-E section');
  const f: string[] = [];
  for (const v of A.verses) if (!sec.includes(v.en) || !sec.includes(v.padas.join(' · '))) f.push(`verse ${v.n}`);
  for (const n of A.narration) if (!sec.includes(n.sa)) f.push(`narration ${n.en}`);
  for (const [k, e] of Object.entries(A.ui)) if (!sec.includes(`— ${e.en} → ${e.sa}`)) f.push(`ui.${k}`);
  for (const v of A.verses) for (const x of v.variants) if (x.kind === 'reading' && !sec.includes(`chosen ${x.chosen}`)) f.push(`reading ${v.n} ${x.chosen}`);
  assert.deepEqual(f, []);
  assert.ok(!/- \[x\]/i.test(sec), 'no box ticked by an agent');
});
