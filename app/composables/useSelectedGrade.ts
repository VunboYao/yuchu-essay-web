/** 与小程序首页年级选项对齐；空字符串表示全部 */
export const GRADE_OPTIONS = [
  { value: '', label: '全部年级' },
  { value: '1', label: '一年级' },
  { value: '2', label: '二年级' },
  { value: '3', label: '三年级' },
  { value: '4', label: '四年级' },
  { value: '5', label: '五年级' },
  { value: '6', label: '六年级' },
] as const

const GRADE_STORAGE_KEY = 'website_selected_grade'

/**
 * 年级只存在浏览器。服务端渲染和可缓存 HTML 始终按「未选年级」输出，
 * 避免把个人偏好写进 SWR 缓存，让后一个访问者看到上一个人的年级。
 */
export function useSelectedGrade() {
  const grade = useState('selected-grade', () => '')
  const ready = useState('selected-grade-ready', () => false)

  onMounted(() => {
    if (ready.value) return
    try {
      grade.value = localStorage.getItem(GRADE_STORAGE_KEY) ?? ''
    } catch {
      grade.value = ''
    }
    ready.value = true
  })

  function setGrade(value: string) {
    grade.value = value
    ready.value = true
    if (!import.meta.client) return
    try {
      localStorage.setItem(GRADE_STORAGE_KEY, value)
    } catch {
      /* 隐私模式可忽略 */
    }
  }

  const label = computed(
    () => GRADE_OPTIONS.find((item) => item.value === grade.value)?.label ?? '全部年级',
  )

  return { grade, ready, setGrade, label }
}
