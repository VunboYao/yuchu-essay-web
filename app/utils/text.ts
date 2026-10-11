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

/**
 * OG / canonical 只认绝对地址。
 * 接口封面是 OSS 绝对地址，站内分享图是 `/og-*.png` 这种以 / 开头的路径；
 * 其余形态（相对路径、协议相对 //host、data:）一律丢掉，避免脏值进 meta。
 */
export function absoluteSiteUrl(siteUrl: string, src: string | undefined): string | undefined {
  if (!src) return undefined
  if (/^https?:\/\//.test(src)) return src
  if (src.startsWith('/') && !src.startsWith('//')) {
    return `${siteUrl.replace(/\/$/, '')}${src}`
  }
  return undefined
}
