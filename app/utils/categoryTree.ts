import type { CategoryGradeNode, CategorySemesterNode, TaxonomyUnit } from '~/types/content'

/** 扁平 taxonomy → 年级 / 册次 / 单元树（对齐小程序 buildTree） */
export function buildCategoryTree(list: TaxonomyUnit[] = []): CategoryGradeNode[] {
  const gradeMap: Record<number, Record<string, CategorySemesterNode['units']>> = {}

  for (const row of list) {
    const grade = Number(row.grade)
    if (!gradeMap[grade]) gradeMap[grade] = {}
    const semester = row.semester || '未知册次'
    if (!gradeMap[grade][semester]) gradeMap[grade][semester] = []
    gradeMap[grade][semester].push({
      unit: row.unit,
      unitTitle: row.unitTitle || '',
      semester,
      textbookVersion: row.textbookVersion || '统编版',
    })
  }

  return Object.keys(gradeMap)
    .map((gradeKey) => {
      const grade = Number(gradeKey)
      const bySemester = gradeMap[grade] || {}
      const semesters: CategorySemesterNode[] = Object.keys(bySemester).map((semester) => ({
        semester,
        units: [...(bySemester[semester] || [])].sort((a, b) => a.unit - b.unit),
      }))
      return { grade, semesters }
    })
    .sort((a, b) => a.grade - b.grade)
}

export function semesterShortLabel(semester: string): string {
  if (semester.includes('上')) return '上册'
  if (semester.includes('下')) return '下册'
  return semester || '册次'
}

export function gradeLabel(grade: number | string): string {
  const g = String(grade)
  const map: Record<string, string> = {
    '1': '一年级',
    '2': '二年级',
    '3': '三年级',
    '4': '四年级',
    '5': '五年级',
    '6': '六年级',
  }
  return map[g] || (g ? `${g}年级` : '全部年级')
}
