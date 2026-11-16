import { describe, expect, it } from 'vitest'
import { parseIntent } from './intent'

describe('what the visitor asks to change', () => {
  it('overtime, in the ways people write it', () => {
    for (const question of ['si j’ai 20h de suppl combien sera mon salaire ?', 'avec 20 heures supplémentaires', '20 h sup', 'et si je fais 20h supp ?'])
      expect(parseIntent(question), question).toEqual({ hours: 20 })
    expect(parseIntent('12,5 heures supplémentaires')).toEqual({ hours: 12.5 })
  })

  it('a bonus, with or without spaces and units', () => {
    expect(parseIntent('et avec une prime de 200 000 Ar ?')).toEqual({ bonus: 200_000 })
    expect(parseIntent('prime de 150000')).toEqual({ bonus: 150_000 })
    expect(parseIntent('une gratification de 1.000.000')).toEqual({ bonus: 1_000_000 })
  })

  it('dependants and a new gross salary', () => {
    expect(parseIntent('et avec 2 enfants ?')).toEqual({ dependants: 2 })
    expect(parseIntent('3 personnes à charge')).toEqual({ dependants: 3 })
    expect(parseIntent('si mon brut de 2 000 000')).toEqual({ gross: 2_000_000 })
  })

  it('several changes at once', () => {
    expect(parseIntent('avec 10h supp, une prime de 100 000 et 1 enfant')).toEqual({ hours: 10, bonus: 100_000, dependants: 1 })
  })

  it('plain questions are left to the assistant', () => {
    for (const question of ['Pourquoi mon net est-il inférieur à mon brut ?', 'Comment l’IRSA est-il calculé ?', 'Que coûte ce salaire à l’employeur ?', 'hello'])
      expect(parseIntent(question), question).toBeNull()
  })

  it('absurd values are not taken for requests', () => {
    expect(parseIntent('999 heures supp')).toBeNull()
    expect(parseIntent('7 enfants')).toBeNull()
    expect(parseIntent('brut de 12')).toBeNull()
  })
})
