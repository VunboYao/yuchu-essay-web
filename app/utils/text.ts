/** 后台富文本 → 纯文本，给 description / JSON-LD 用，不用于渲染 */
export function plainText(html: string | undefined, max = 160): string {
  if (!html) return ''
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

export function absoluteHttpUrl(src: string | undefined): string | undefined {
  if (!src) return undefined
  if (/^https?:\/\//.test(src)) return src
  return undefined
}
