// Tries every configured key of every provider with one tiny question, and says what happened.
// Keys are never printed, only their rank (« clé 2/3 »). Run it after editing .env:
//   pnpm check:ai
import { createAssistant, loadProviders } from '../server/ai.mjs'

const providers = loadProviders(process.env)
if (providers.length === 0) {
  console.log('Aucune clé trouvée. Copiez .env.example en .env, ajoutez au moins une clé (GROQ_API_KEYS, GEMINI_API_KEYS…), puis relancez.')
  process.exit(1)
}

const context = {
  question: 'Réponds seulement par le mot « ok ».',
  scenarios: [],
}
console.log(`Ordre des fournisseurs : ${providers.map((p) => p.name).join(' → ')}\n`)

let failed = 0
for (const provider of providers) {
  for (let i = 0; i < provider.keys.length; i++) {
    const notes = []
    const assistant = createAssistant({
      providers: [{ ...provider, keys: [provider.keys[i]] }],
      log: (line) => notes.push(line.replace(/^\[ai\] /, '').replace(/ key 1\/1/, '')),
    })
    const started = performance.now()
    const result = await assistant.ask(context)
    const ms = Math.round(performance.now() - started)
    const label = `${provider.name.padEnd(10)} ${provider.model.padEnd(34)} clé ${i + 1}/${provider.keys.length}`
    if (result.answer) console.log(`✓ ${label}  ${ms} ms`)
    else {
      failed++
      const why = notes[0] ?? result.error
      const hint = /auth/.test(why)
        ? 'clé refusée : vérifiez-la'
        : /quota/.test(why)
          ? 'quota atteint : réessayez plus tard'
          : /model/.test(why)
            ? 'nom de modèle inconnu : vérifiez la variable *_MODEL'
            : /incomplete/.test(result.error ?? '')
              ? 'réponse coupée'
              : 'service indisponible ou réseau'
      console.log(`✗ ${label}  ${why} → ${hint}`)
    }
  }
}
console.log(failed ? `\n${failed} clé(s) à corriger.` : '\nTout répond.')
process.exit(failed ? 1 : 0)
