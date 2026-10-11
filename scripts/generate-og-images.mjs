/**
 * 生成 Open Graph 分享图（1200×630）。
 * 用本机 Chrome 无头渲染内联 HTML，产出 public/og-*.png。
 * 改文案后重跑：node scripts/generate-og-images.mjs
 */
import { execFile } from 'node:child_process'
import { writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const run = promisify(execFile)
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public')
// 中间 HTML 放在 node_modules 下（已 gitignore），不往系统临时目录写
const workDir = join(root, 'node_modules/.cache/og-images')

const CHROME =
  process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

/** 与 app/assets/css/main.css 的 @theme 保持一致 */
const CARD_VARIANTS = [
  {
    file: 'og-default.png',
    eyebrow: '小学语文 · 作文资料',
    title: '予初作文',
    subtitle: '单元指导、习作范文与素材积累，结构清晰、随时可查。',
    seal: '作文',
  },
  {
    file: 'og-articles.png',
    eyebrow: '文章库',
    title: '按教材单元找资料',
    subtitle: '统编版年级、册次、单元三级筛选，单元指导与写作方法一处查完。',
    seal: '文章',
  },
  {
    file: 'og-essays.png',
    eyebrow: '优秀作文',
    title: '同单元范文对照',
    subtitle: '读结构、读语言、读立意。公开阅读，全文可直接在网页读完。',
    seal: '范文',
  },
  {
    file: 'og-category.png',
    eyebrow: '教材分类',
    title: '年级 → 册次 → 单元',
    subtitle: '三步定位到对应单元的文章列表，和小程序里的筛选口径一致。',
    seal: '分类',
  },
  {
    file: 'og-download-guide.png',
    eyebrow: '下载说明',
    title: '资料下载在小程序',
    subtitle: '网页可公开阅读与检索；收藏、登录与资料下载请移步微信小程序。',
    seal: '下载',
  },
  {
    file: 'og-open-miniprogram.png',
    eyebrow: '微信小程序',
    title: '打开予初作文',
    subtitle: '收藏、登录与资料下载只在微信小程序完成，网页可公开阅读全文。',
    seal: '微信',
  },
]

function renderHtml(variant) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<style>
  :root {
    --ink-900: #121a1d;
    --ink-secondary: #4d595d;
    --ink-muted: #7a8488;
    --jade-700: #1f4d3a;
    --jade-500: #2d6a4f;
    --jade-400: #52b788;
    --jade-soft: #e7f2ec;
    --parchment-100: #f5f1e8;
    --parchment-card: #fdfbf6;
    --accent: #c4693b;
    --border: #c8d3cb;
  }
  html, body { margin: 0; padding: 0; width: 1200px; height: 630px; overflow: hidden; }
  body {
    font-family: "Hiragino Sans GB", "PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif;
    color: var(--ink-900);
    background-color: var(--parchment-100);
    background-image: linear-gradient(
      90deg,
      rgba(45, 106, 79, 0.14) 0%,
      rgba(231, 242, 236, 0.45) 10%,
      rgba(245, 241, 232, 0) 24%,
      rgba(245, 241, 232, 0) 76%,
      rgba(231, 242, 236, 0.45) 90%,
      rgba(45, 106, 79, 0.14) 100%
    );
    -webkit-font-smoothing: antialiased;
  }
  .frame {
    box-sizing: border-box;
    position: relative;
    width: 1200px;
    height: 630px;
    padding: 64px 72px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 40px;
  }
  .frame::before {
    content: "";
    position: absolute;
    inset: 40px;
    border: 1px solid rgba(168, 188, 175, 0.55);
    border-radius: 36px;
    background: rgba(253, 251, 246, 0.72);
    box-shadow: 0 18px 48px rgba(18, 26, 29, 0.06);
  }
  .copy { position: relative; width: 720px; }
  .eyebrow {
    display: inline-block;
    margin: 0 0 26px;
    padding: 8px 18px;
    border-radius: 999px;
    background: var(--jade-soft);
    color: var(--jade-700);
    font-size: 22px;
    letter-spacing: 2px;
  }
  h1 {
    margin: 0;
    font-family: "Songti SC", "STSong", "Noto Serif SC", serif;
    font-size: ${variant.title.length > 8 ? '64px' : '82px'};
    font-weight: 600;
    line-height: 1.22;
    letter-spacing: 1px;
    color: var(--ink-900);
  }
  .rule {
    margin: 28px 0 26px;
    width: 96px;
    height: 6px;
    border-radius: 3px;
    background: var(--jade-500);
  }
  .subtitle {
    margin: 0;
    width: 640px;
    font-size: 27px;
    line-height: 1.7;
    color: var(--ink-secondary);
  }
  .brand {
    margin-top: 44px;
    display: flex;
    align-items: center;
    gap: 14px;
    font-size: 24px;
    color: var(--ink-muted);
  }
  .brand strong { font-weight: 600; color: var(--jade-700); }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); }
  .seal {
    position: relative;
    flex: 0 0 232px;
    height: 232px;
    border-radius: 32px;
    border: 2px solid rgba(45, 106, 79, 0.35);
    background: linear-gradient(160deg, rgba(231, 242, 236, 0.9), rgba(253, 251, 246, 0.6));
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: "Songti SC", "STSong", "Noto Serif SC", serif;
    font-size: 74px;
    font-weight: 600;
    line-height: 1.12;
    letter-spacing: 6px;
    color: var(--jade-500);
    writing-mode: vertical-rl;
    text-orientation: upright;
  }
</style>
</head>
<body>
  <div class="frame">
    <div class="copy">
      <p class="eyebrow">${variant.eyebrow}</p>
      <h1>${variant.title}</h1>
      <div class="rule"></div>
      <p class="subtitle">${variant.subtitle}</p>
      <p class="brand"><strong>予初作文</strong><span class="dot"></span>小学语文作文资料</p>
    </div>
    <div class="seal">${variant.seal}</div>
  </div>
</body>
</html>`
}

/**
 * Chrome 出的 PNG 是 24 位真彩，纯色卡片也要 150KB+。
 * 用 PIL 降到 128 色调色板（约 1/4 大小，肉眼看不出差别）。
 * 没有 PIL 就原样保留，不阻断生成。
 */
async function quantize(pngPath) {
  const script = `
import sys
from PIL import Image
from os.path import getsize
p = sys.argv[1]
im = Image.open(p).convert('RGB')
im.quantize(colors=128, method=Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG).save(p, optimize=True)
print(getsize(p))
`
  try {
    const { stdout } = await run('python3', ['-c', script, pngPath])
    return Number(stdout.trim())
  } catch (error) {
    console.warn(`  ! PIL 不可用，保留原始 PNG：${error.message.split('\n')[0]}`)
    const { stat } = await import('node:fs/promises')
    return (await stat(pngPath)).size
  }
}

async function main() {
  await mkdir(outDir, { recursive: true })
  await mkdir(workDir, { recursive: true })
  console.log(`HTML 中间产物：${workDir}`)
  for (const variant of CARD_VARIANTS) {
    const htmlPath = join(workDir, `${variant.file.replace('.png', '.html')}`)
    const outPath = join(outDir, variant.file)
    await writeFile(htmlPath, renderHtml(variant), 'utf8')
    await run(CHROME, [
      '--headless',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--window-size=1200,630',
      `--screenshot=${outPath}`,
      `file://${htmlPath}`,
    ])
    const bytes = await quantize(outPath)
    console.log(`✓ ${variant.file} (${Math.round(bytes / 1024)}KB)`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
