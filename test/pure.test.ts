import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildCategoryTree } from '../app/utils/categoryTree.ts'
import { cleanQuery, unwrapApiBody, ApiError } from '../app/utils/http.ts'
import { mapMiniPathToWeb } from '../app/utils/nav.ts'
import { plainText } from '../app/utils/text.ts'
import type { TaxonomyUnit } from '../app/types/content.ts'

test('素材入口映射到文章列表并保留筛选条件', () => {
  assert.equal(
    mapMiniPathToWeb('/pages/material/index?contentType=material', '3'),
    '/articles?contentType=material&grade=3',
  )
})

test('文章入口保留小程序配置的列表参数', () => {
  assert.equal(
    mapMiniPathToWeb(
      '/pages/article-list/index?semester=%E4%B8%8A%E5%86%8C&unit=2&contentType=unit_writing',
      '4',
    ),
    '/articles?semester=%E4%B8%8A%E5%86%8C&unit=2&contentType=unit_writing&grade=4',
  )
})

test('无法对等的入口导向小程序说明页', () => {
  assert.equal(mapMiniPathToWeb('/pages/profile/index'), '/open-miniprogram')
})

test('分类树按年级、册次、单元排序', () => {
  const rows = [
    { grade: 2, semester: '下册', unit: 2, unitTitle: '后', textbookVersion: '统编版' },
    { grade: 1, semester: '上册', unit: 1, unitTitle: '前', textbookVersion: '' },
    { grade: 1, semester: '上册', unit: 3, unitTitle: '', textbookVersion: '统编版' },
  ] as TaxonomyUnit[]
  const tree = buildCategoryTree(rows)
  assert.deepEqual(
    tree.map((node) => node.grade),
    [1, 2],
  )
  assert.deepEqual(
    tree[0].semesters[0].units.map((unit) => unit.unit),
    [1, 3],
  )
  assert.equal(tree[0].semesters[0].units[0].textbookVersion, '统编版')
})

test('解包成功响应并丢掉空查询', () => {
  assert.equal(unwrapApiBody({ code: 0, message: 'success', data: 7 }), 7)
  assert.throws(() => unwrapApiBody({ code: 1, message: '没有权限', data: null }), ApiError)
  assert.deepEqual(cleanQuery({ grade: '', page: 1, keyword: undefined, unit: '2' }), {
    page: 1,
    unit: '2',
  })
})

test('富文本压成有限长度的纯文本', () => {
  assert.equal(plainText('<p>春风&nbsp;又绿</p><p>江南岸</p>'), '春风 又绿 江南岸')
  assert.equal(plainText('一二三四五', 3), '一二…')
})
