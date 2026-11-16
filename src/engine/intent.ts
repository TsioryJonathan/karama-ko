/**
 * What a visitor asks the assistant to change in the calculator, read by plain rules and not by a
 * model: « et si j'ai 20 h de suppl », « avec une prime de 200 000 », « 2 enfants », « brut de 2 000 000 ».
 * A model would explain the change; code makes it, so the figures can never be invented.
 */
export interface Intent {
  /** Overtime hours a month. */
  hours?: number
  bonus?: number
  dependants?: number
  gross?: number
}

const SPACE = '[\\s\\u00a0\\u202f]'
const AMOUNT = `(\\d[\\d\\s\\u00a0\\u202f.,]*\\d|\\d)`
const toNumber = (text: string) => Number(text.replace(/[\s  .,]/g, ''))
const MAX_HOURS = 300
const MAX_AMOUNT = 1_000_000_000

export function parseIntent(question: string): Intent | null {
  const text = question.toLowerCase()
  const intent: Intent = {}

  const hours = text.match(new RegExp(`(\\d+(?:[.,]\\d+)?)${SPACE}*(?:h|heures?)\\b(?:${SPACE}+de)?${SPACE}*(?:supp|sup\\b|suppl)`))
  if (hours) {
    const value = Number(hours[1].replace(',', '.'))
    if (value > 0 && value <= MAX_HOURS) intent.hours = value
  }

  const bonus = text.match(new RegExp(`(?:prime|gratification)s?${SPACE}*(?:de|d'|d’|:)?${SPACE}*${AMOUNT}`))
  if (bonus) {
    const value = toNumber(bonus[1])
    if (value > 0 && value <= MAX_AMOUNT) intent.bonus = value
  }

  const dependants = text.match(new RegExp(`(\\d)${SPACE}*(?:personnes?${SPACE}+à${SPACE}+charge|enfants?|pac\\b)`))
  if (dependants) {
    const value = Number(dependants[1])
    if (value >= 0 && value <= 6) intent.dependants = value
  }

  const gross = text.match(new RegExp(`(?:brut|salaire)${SPACE}*(?:de|à|a|=|:)?${SPACE}*${AMOUNT}`))
  if (gross) {
    const value = toNumber(gross[1])
    // A salary, not a count of hours or dependants: at least four digits.
    if (value >= 1000 && value <= MAX_AMOUNT) intent.gross = value
  }

  return Object.keys(intent).length ? intent : null
}
