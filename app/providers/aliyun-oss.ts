import {defineProvider} from "@nuxt/image/runtime";

// 只有这些自家 OSS/CDN 域名支持 x-oss-process；其余图片原样返回
const PROCESSABLE_HOSTS = [
  'essay-mvp.oss-cn-guangzhou.aliyuncs.com',
  // 以后若给 OSS 绑了 CDN 域名（如 cdn.vunbo.com），加到这里
]

function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return '' // 相对路径（/uploads/...）会落到这里
  }
}

export default defineProvider({
  getImage(src, {modifiers}) {
    // 本地 /uploads、外链、相对路径 —— 不加任何处理参数，原样返回
    if (!PROCESSABLE_HOSTS.includes(hostOf(src))) {
      return { url: src }
    }

    const operations: string[] = []
    const resize: string[] = []
    if (modifiers.width) resize.push(`w_${modifiers.width}`)
    if (modifiers.height) resize.push(`h_${modifiers.height}`)
    if (resize.length) operations.push(`resize,${resize.join(',')}`)

    if (modifiers.quality) operations.push(`quality,q_${modifiers.quality}`)
    if (modifiers.format) operations.push(`format,${modifiers.format}`)

    const query = operations.length
        ? `?x-oss-process=image/${operations.join('/')}`
        : ''

    return { url: src + query }
  }
})
