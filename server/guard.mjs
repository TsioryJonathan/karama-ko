// Guardrails around the assistant, in three layers. The model's own instructions are the first one
// and the weakest: a model can be argued with. These two are plain code that cannot be:
//   checkQuestion  before anything is sent, so refused questions cost no quota and no model call;
//   checkAnswer    after the model has spoken, so what it says is verified before a visitor reads it.

export const REFUSAL =
  'Je ne peux répondre qu’aux questions sur votre simulation : votre net, l’IRSA, les cotisations, le coût employeur, la comparaison de vos offres… Posez-moi une question sur vos chiffres, par exemple « Pourquoi mon net est-il inférieur à mon brut ? ».'

export const UNRELIABLE =
  'Je n’ai pas pu formuler une explication assez fiable pour cette question. Reformulez-la, ou ouvrez « Voir comment c’est calculé » : le détail ligne par ligne fait foi.'

/** Legal texts that contain the word « code » and must not look like a request for programming. */
const LEGAL_CODE = /code (?:du travail|général des imp[ôo]ts|des imp[ôo]ts|civil|p[ée]nal|de commerce)/gi

const PROGRAMMING = [
  /```/,
  /\b(?:python|javascript|typescript|node\.?js|java|golang|rust|c\+\+|c#|php|ruby|swift|kotlin|sql|bash|powershell|vba|html|css|regex)\b/i,
  /\b(?:écris|ecris|génère|genere|crée|cree|rédige|redige|programme|code)\b[^.?!\n]{0,40}\b(?:code|script|programme|fonction|algorithme|macro|requête|requete|formule excel|application|site web)\b/i,
  /\b(?:donne|fais|montre)\b[^.?!\n]{0,30}\b(?:un|une|le|ton)\s+(?:code|script|programme|algorithme|macro)\b|\b(?:fais|donne)\b[^.?!\n]{0,15}\bune fonction\b/i,
  /\b(?:code|script|programme|algorithme)\b[^.?!\n]{0,20}\b(?:pour|qui)\b[^.?!\n]{0,40}\b(?:calcul|automatis|génér|gener|extrai)/i,
]

const INJECTION = [
  /\b(?:ignore|ignorez|oublie|oubliez|désobéis|desobeis|contourne|contournez)\b[^.?!\n]{0,40}\b(?:instructions?|consignes?|règles?|regles?|prompt|restrictions?|limites?)\b/i,
  /\b(?:prompt|consignes?|instructions?)\s+(?:syst[èe]me|initial(?:es?)?|cach[ée]es?)\b/i,
  /\b(?:r[ée]v[èe]le|affiche|montre|donne|r[ée]p[èe]te|[ée]cris)\b[^.?!\n]{0,30}\b(?:tes|ton|vos|votre)\s+(?:instructions|prompt|consignes|r[èe]gles)\b/i,
  /\bsystem prompt\b|\bjailbreak\b|\bdeveloper mode\b|mode d[ée]veloppeur|\bignore (?:all|any|previous|the above)\b|\bDAN\b/i,
  /\btu es (?:maintenant|d[ée]sormais)\b|\b(?:pretend|act as|roleplay)\b|\bjoue le r[ôo]le\b|\bfais comme si\b/i,
]

/** @returns {{ ok: true } | { ok: false, reason: 'code' | 'injection' }} */
export function checkQuestion(question) {
  const text = String(question).replace(LEGAL_CODE, ' ')
  if (PROGRAMMING.some((pattern) => pattern.test(text))) return { ok: false, reason: 'code' }
  if (INJECTION.some((pattern) => pattern.test(text))) return { ok: false, reason: 'injection' }
  return { ok: true }
}

const CODE_IN_ANSWER = [
  /```/,
  /<\/?(?:script|html|body|iframe|img|svg|style|link|form|input)\b/i,
  /^\s*(?:def |class |import |from \w+ import |#include|using namespace|public (?:static )?(?:class|void)|function\s*\w*\(|const \w+ =|let \w+ =|var \w+ =)/m,
  /\b(?:SELECT\s.+\sFROM|INSERT INTO|DROP TABLE|console\.log|System\.out|print\(|printf\()/i,
]
/** The model naming itself or its instructions: it was pushed out of its role. */
const OUT_OF_ROLE = [
  /\b(?:mes|ces|les)\s+(?:instructions|consignes)\s+(?:syst[èe]me|initiales?|internes?)\b/i,
  /\b(?:system prompt|prompt syst[èe]me)\b/i,
  /\b(?:je suis|en tant que)\s+(?:un\s+)?(?:chatgpt|gpt|grok|gemini|deepseek|claude|llama|qwen|mod[èe]le de langage)\b/i,
]

const MAX_CHARS = 2200
const GROUPED = /\d{1,3}(?:[\s  ]\d{3})+|\d{4,}/g
const MIN_MONEY = 1000

/** Whole numbers of 1 000 or more that appear in a text, written with or without separators. */
export function bigNumbers(text) {
  return [...String(text).matchAll(GROUPED)].map((match) => Number(match[0].replace(/\D/g, '')))
}

/** Every figure the model was given, and the few it may combine: sums, differences, ×12, ÷12. */
export function allowedNumbers(context) {
  const given = [...new Set(bigNumbers(JSON.stringify(context)))].slice(0, 120)
  const allowed = new Set(given)
  for (const a of given) {
    allowed.add(a * 12)
    allowed.add(Math.round(a / 12))
    for (const b of given) {
      allowed.add(a + b)
      allowed.add(Math.abs(a - b))
    }
  }
  return allowed
}

const near = (allowed, value) => allowed.has(value) || allowed.has(value - 1) || allowed.has(value + 1)

/**
 * @returns {{ ok: true, answer: string } | { ok: false, retry: boolean, reason: string, correction: string }}
 * `retry` says whether asking the model again, with the correction, is worth a call.
 */
export function checkAnswer(answer, context) {
  let text = String(answer ?? '').trim()
  if (!text) return { ok: false, retry: true, reason: 'empty', correction: 'La réponse était vide.' }
  if (CODE_IN_ANSWER.some((pattern) => pattern.test(text)))
    return { ok: false, retry: true, reason: 'code', correction: 'Ta réponse contenait du code ou du balisage. N’en produis jamais : explique seulement les résultats, en français.' }
  if (OUT_OF_ROLE.some((pattern) => pattern.test(text)))
    return { ok: false, retry: false, reason: 'role', correction: '' }
  // The question was accepted, so a refusal inside the answer is the model confusing itself: ask again.
  if (/je ne peux répondre qu[’']aux questions/i.test(text))
    return { ok: false, retry: true, reason: 'refusal', correction: 'La question portait bien sur la simulation. Réponds-y directement, sans la refuser ni saluer.' }
  const allowed = allowedNumbers(context)
  const invented = [...new Set(bigNumbers(text))].filter((n) => n >= MIN_MONEY && !near(allowed, n))
  if (invented.length)
    return {
      ok: false,
      retry: true,
      reason: 'numbers',
      correction: `Ta réponse citait ${invented.slice(0, 3).join(', ')}, qui ne figure pas dans les données fournies. Refais-la en n’utilisant que les nombres des données, sans en inventer ni en arrondir.`,
    }
  if (text.length > MAX_CHARS) {
    const cut = text.slice(0, MAX_CHARS)
    text = cut.slice(0, Math.max(cut.lastIndexOf('\n\n'), cut.lastIndexOf('. ') + 1, 400)).trim()
  }
  return { ok: true, answer: text }
}
