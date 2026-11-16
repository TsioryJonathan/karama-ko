import { Fragment, type ReactNode } from 'react'

/**
 * The little markdown that assistants write: paragraphs, bold, italic, code, lists, headings,
 * tables. Everything is built as React elements, never as HTML, so nothing in the text can run.
 */

const INLINE = /(\*\*[^*\n]+\*\*|__[^_\n]+__|`[^`\n]+`|\*[^*\s][^*\n]*\*|_[^_\s][^_\n]*_)/g

function inline(text: string, key = 0): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    const id = `${key}-${i}`
    if (/^\*\*.+\*\*$/.test(part) || /^__.+__$/.test(part)) return <strong key={id}>{inline(part.slice(2, -2), i)}</strong>
    if (/^`.+`$/.test(part)) return <code key={id}>{part.slice(1, -1)}</code>
    if (/^\*[^*].*\*$/.test(part) || /^_[^_].*_$/.test(part)) return <em key={id}>{part.slice(1, -1)}</em>
    return <Fragment key={id}>{part}</Fragment>
  })
}

type Block =
  | { type: 'p'; lines: string[] }
  | { type: 'h'; text: string }
  | { type: 'ul' | 'ol'; items: string[] }
  | { type: 'hr' }
  | { type: 'table'; head: string[]; rows: string[][] }

const bullet = /^\s*(?:[-*•])\s+(.*)$/
const numbered = /^\s*\d+[.)]\s+(.*)$/
const cells = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((cell) => cell.trim())
const isSeparator = (line: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line) && line.includes('-')

export function parse(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const blocks: Block[] = []
  for (let i = 0; i < lines.length; ) {
    const line = lines[i]
    if (!line.trim()) {
      i++
    } else if (/^\s*#{1,6}\s+/.test(line)) {
      blocks.push({ type: 'h', text: line.replace(/^\s*#{1,6}\s+/, '') })
      i++
    } else if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      blocks.push({ type: 'hr' })
      i++
    } else if (line.includes('|') && i + 1 < lines.length && isSeparator(lines[i + 1])) {
      const head = cells(line)
      const rows: string[][] = []
      i += 2
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) rows.push(cells(lines[i++]))
      blocks.push({ type: 'table', head, rows })
    } else if (bullet.test(line) || numbered.test(line)) {
      const type = bullet.test(line) ? 'ul' : 'ol'
      const pattern = type === 'ul' ? bullet : numbered
      const items: string[] = []
      while (i < lines.length && pattern.test(lines[i])) items.push(lines[i++].replace(pattern, '$1'))
      blocks.push({ type, items })
    } else {
      const paragraph: string[] = []
      while (i < lines.length && lines[i].trim() && !/^\s*#{1,6}\s+/.test(lines[i]) && !bullet.test(lines[i]) && !numbered.test(lines[i]) && !(lines[i].includes('|') && i + 1 < lines.length && isSeparator(lines[i + 1])))
        paragraph.push(lines[i++])
      blocks.push({ type: 'p', lines: paragraph })
    }
  }
  return blocks
}

export function Markdown({ text }: { text: string }) {
  return (
    <div className="md">
      {parse(text).map((block, i) => {
        switch (block.type) {
          case 'h':
            return (
              <p key={i} className="md-heading">
                {inline(block.text)}
              </p>
            )
          case 'hr':
            return <hr key={i} />
          case 'ul':
          case 'ol': {
            const List = block.type
            return (
              <List key={i}>
                {block.items.map((item, j) => (
                  <li key={j}>{inline(item)}</li>
                ))}
              </List>
            )
          }
          case 'table':
            return (
              <div className="md-table" key={i}>
                <table>
                  <thead>
                    <tr>
                      {block.head.map((cell, j) => (
                        <th key={j}>{inline(cell)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, j) => (
                      <tr key={j}>
                        {row.map((cell, k) => (
                          <td key={k}>{inline(cell)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          default:
            return (
              <p key={i}>
                {block.lines.map((line, j) => (
                  <Fragment key={j}>
                    {j > 0 && <br />}
                    {inline(line.trim())}
                  </Fragment>
                ))}
              </p>
            )
        }
      })}
    </div>
  )
}
