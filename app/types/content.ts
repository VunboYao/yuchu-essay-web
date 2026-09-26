/** 与 course_server 统一响应对齐 */
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

export interface PageData<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

/** 首页文章卡片（列表省略 bodyImages） */
export interface ArticleSummary {
  id: number
  title: string
  grade: number
  semester: string
  unit: number
  summary: string
  coverImg: string
  isRecommended: boolean
  isHot: boolean
  contentType?: string
  essayTopic?: string
}

export interface ArticleDetail extends ArticleSummary {
  bodyImages?: string[]
  slug?: string
  viewCount?: number
  essays?: EssaySummary[]
}

export interface ContentTag {
  id: number
  name: string
  sortOrder?: number
  status?: number
}

export interface EssaySummary {
  id: number
  title: string
  grade: number
  wordCount: number
  articleId?: number | null
  tags?: ContentTag[]
}

export interface EssayDetail extends EssaySummary {
  body?: string
  comment?: string
  viewCount?: number
  status?: number
}

export interface EssayLinkedArticle {
  id: number
  title: string
  grade: number
  semester: string
  unit: number
  essayTopic?: string
}

export interface EssayDetailPayload {
  essay: EssayDetail
  article: EssayLinkedArticle | null
}

export interface EssayListPageData extends PageData<EssaySummary> {
  filterTags?: ContentTag[]
}

export interface SearchResultItem {
  targetType: 'article' | 'essay' | string
  id: number
  title: string
  coverImg?: string
  grade: number
  semester?: string
  unit?: number
  summary?: string
  isRecommended?: boolean
  isHot?: boolean
  wordCount?: number
}

export interface HomeBlock {
  id: number
  title: string
  icon: string
  navType: string
  path: string
  sortOrder: number
  status: number
}

export interface HomeData {
  recommendedArticles: ArticleSummary[]
  hotArticles: ArticleSummary[]
  essayExamples: EssaySummary[]
  homeBlocks: HomeBlock[]
}

export interface TaxonomyUnit {
  id: number
  textbookVersion: string
  grade: number
  semester: string
  unit: number
  unitTitle: string
  sortOrder: number
  status: number
}

export interface CategoryUnitNode {
  unit: number
  unitTitle: string
  semester: string
  textbookVersion: string
}

export interface CategorySemesterNode {
  semester: string
  units: CategoryUnitNode[]
}

export interface CategoryGradeNode {
  grade: number
  semesters: CategorySemesterNode[]
}

export interface FreeDownloadItem {
  id: number
  fileName: string
  fileType: string
  fileSize: number
  accessType: string
}

export interface ArticleDetailPayload {
  article: ArticleDetail
  relatedArticles: ArticleSummary[]
  freeDownloads: FreeDownloadItem[]
  downloadGate?: { required: boolean }
}
