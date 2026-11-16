// Asks the same real question to several models and shows what each answers, how long it took and
// whether the guardrails would let the answer through. Pick the order of providers from evidence.
//
//   pnpm compare:ai
//   COMPARE_MODELS="gemini:gemini-4-hydrogen,gemini:gemini-3.8-flash,groq:openai/gpt-oss-120b" pnpm compare:ai
//
// Without COMPARE_MODELS, each provider's configured model is tried. The first key of each is used.
import { createAssistant, loadProviders } from '../server/ai.mjs'
import { checkAnswer } from '../server/guard.mjs'
import { assistantContext } from '../dist-server/assistant.js'

const providers = loadProviders(process.env)
if (providers.length === 0) {
  console.log('Aucune clé trouvée : remplissez .env (voir .env.example), puis relancez.')
  process.exit(1)
}

const wanted = (process.env.COMPARE_MODELS ?? '')
  .split(',')
  .map((pair) => pair.trim())
  .filter(Boolean)
  .map((pair) => [pair.slice(0, pair.indexOf(':')), pair.slice(pair.indexOf(':') + 1)])
const targets = wanted.length
  ? wanted.flatMap(([name, model]) => providers.filter((p) => p.name === name).map((p) => ({ ...p, model })))
  : providers

// A negotiation: the case the assistant is most often asked about, with a question that needs reasoning.
const question = process.env.COMPARE_QUESTION || 'Pourquoi dois-je demander ce brut pour obtenir ce net en plus ?'
const context = assistantContext({
  question,
  tool: 'negocier',
  scenarios: [
    { name: 'Poste actuel', gross: 1_000_000, dependants: 0 },
    { name: 'Objectif de négociation', gross: 1_191_306, dependants: 0 },
  ],
})

console.log(`Question : ${question}\n`)
for (const target of targets) {
  const assistant = createAssistant({ providers: [{ ...target, keys: [target.keys[0]] }], log: () => {}, timeoutMs: 60_000 })
  const started = performance.now()
  const result = await assistant.ask(context)
  const seconds = ((performance.now() - started) / 1000).toFixed(1)
  console.log(`━━ ${target.name} · ${target.model} · ${seconds} s`)
  if (!result.answer) {
    console.log(`   échec : ${result.error}\n`)
    continue
  }
  const verdict = checkAnswer(result.answer, context)
  console.log(`   garde-fous : ${verdict.ok ? 'acceptée' : `REFUSÉE (${verdict.reason})`}`)
  console.log(result.answer.trim().replace(/^/gm, '   '), '\n')
}
