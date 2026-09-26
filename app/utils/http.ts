import type { ApiResponse } from '~/types/content'

export class ApiError extends Error {
  readonly code?: number

  constructor(message: string, code?: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

/** code === 0 才视为成功，与小程序 / Admin 的 C 端约定一致 */
export function unwrapApiBody<T>(body: ApiResponse<T> | null | undefined): T {
  if (body && body.code === 0) return body.data
  throw new ApiError(body?.message || '请求失败', body?.code)
}

export function cleanQuery(
  query: Record<string, string | number | undefined | null>,
): Record<string, string | number> {
  const out: Record<string, string | number> = {}
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    out[key] = value
  }
  return out
}

export function isAbortError(error: unknown) {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')
}
