import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Markdown } from './Markdown'

const html = (text: string) => renderToStaticMarkup(<Markdown text={text} />)

describe('assistant markdown', () => {
  it('bold, italic and code', () => {
    expect(html('Un **net** de *1 000* Ar, `IRSA`.')).toBe('<div class="md"><p>Un <strong>net</strong> de <em>1 000</em> Ar, <code>IRSA</code>.</p></div>')
  })

  it('bullet and numbered lists, paragraphs apart', () => {
    const out = html('Voici :\n\n- un\n- deux\n\n1. a\n2. b')
    expect(out).toContain('<ul><li>un</li><li>deux</li></ul>')
    expect(out).toContain('<ol><li>a</li><li>b</li></ol>')
    expect(out).toContain('<p>Voici :</p>')
  })

  it('a table becomes a table', () => {
    const out = html('| Type | Calcul |\n|---|---|\n| **CNaPS** | 1 % |')
    expect(out).toContain('<th>Type</th>')
    expect(out).toContain('<td><strong>CNaPS</strong></td>')
  })

  it('headings become a strong line, rules a rule', () => {
    expect(html('## Titre')).toContain('md-heading')
    expect(html('---')).toContain('<hr/>')
  })

  it('text is never turned into markup', () => {
    const out = html('<script>alert(1)</script> et <img src=x onerror=alert(1)>')
    expect(out).not.toContain('<script')
    expect(out).not.toContain('<img')
    expect(out).toContain('&lt;script&gt;')
  })

  it('links stay plain text', () => {
    expect(html('[clic](javascript:alert(1))')).not.toContain('<a')
  })
})
