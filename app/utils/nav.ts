/** 小程序 path → Web 路由，并保留 Web 支持的筛选参数 */
export function mapMiniPathToWeb(path: string, grade?: string): string {
  const [pathname = '', rawQuery = ''] = (path || '').split('?')
  const source = new URLSearchParams(rawQuery)
  const query = new URLSearchParams()
  for (const key of ['grade', 'semester', 'unit', 'contentType', 'keyword']) {
    const value = source.get(key)
    if (value) query.set(key, value)
  }
  if (grade) query.set('grade', grade)

  const withQuery = (target: string) => {
    const suffix = query.toString()
    return suffix ? `${target}?${suffix}` : target
  }

  if (pathname.includes('essay-detail') && source.get('id')) {
    return `/essays/${source.get('id')}`
  }
  if (pathname.includes('essay')) {
    return withQuery('/essays')
  }
  if (pathname.includes('download')) {
    return '/download-guide'
  }
  if (pathname.includes('category')) {
    return '/category'
  }
  if (pathname.includes('search')) {
    return withQuery('/search')
  }
  if (pathname.includes('article-detail') && source.get('id')) {
    return `/articles/${source.get('id')}`
  }
  if (pathname.includes('material') && !query.has('contentType')) {
    query.set('contentType', 'material')
  }
  if (
    pathname.includes('article') ||
    pathname.includes('material') ||
    (pathname.includes('blocks-placeholder') && query.has('contentType'))
  ) {
    return withQuery('/articles')
  }
  return '/open-miniprogram'
}

export function articleMeta(grade: number, semester: string, unit: number): string {
  const parts = [`${grade}年级`]
  if (semester) parts.push(semester)
  if (unit) parts.push(`第${unit}单元`)
  return parts.join(' · ')
}
