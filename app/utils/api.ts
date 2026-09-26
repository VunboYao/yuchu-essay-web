import { cleanQuery, isAbortError, unwrapApiBody, ApiError } from '~/utils/http'
import type { ApiResponse } from '~/types/content'

/**
 * 服务端直连 course_server，浏览器走同源 /api，由 Nitro 反代。
 * 相对路径在 SSR 里没有主机名，不能直接 $fetch('/api/v1')。
 */
export async function apiGet<T>(
  path: string,
  options?: {
    query?: Record<string, string | number | undefined | null>
    signal?: AbortSignal
  },
): Promise<T> {
  const config = useRuntimeConfig()
  const baseURL = import.meta.server ? `${config.apiOrigin}/api/v1` : config.public.apiBase
  const timeout = AbortSignal.timeout(15000)
  const signal = options?.signal ? AbortSignal.any([options.signal, timeout]) : timeout

  try {
    const body = await $fetch<ApiResponse<T>>(path, {
      baseURL,
      query: options?.query ? cleanQuery(options.query) : undefined,
      signal,
    })
    return unwrapApiBody(body)
  } catch (error) {
    if (error instanceof ApiError || isAbortError(error)) throw error
    const fetchError = error as { data?: ApiResponse<T> }
    if (fetchError?.data && typeof fetchError.data.code === 'number') {
      return unwrapApiBody(fetchError.data)
    }
    throw new ApiError('网络异常，请稍后重试')
  }
}
