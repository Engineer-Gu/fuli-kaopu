// 视图名称
export const VIEWS = ['home', 'guide', 'dispatch', 'dict', 'selfcheck', 'about', 'admin'] as const
export type ViewName = (typeof VIEWS)[number]

import { ACTIVITY_CATEGORIES, ACTIVITY_CATEGORY_TO_TYPE } from './activity-categories'
export { ACTIVITY_CATEGORIES } from './activity-categories'

// 词典关键词分类：精简为 5 个常用福利大类，便于下拉快速选择
export const DICT_CATEGORIES = ['现金红包', '话费流量', '外卖餐饮', '会员权益', '技术资源'] as const

// 榜单按场景分类筛选，不再将现金类型等同于话费充值。
export const FILTERS = [
  { value: 'all', label: '全部' },
  ...ACTIVITY_CATEGORIES.map(category => ({ value: category, label: category })),
]

export const CAT_TAG: Record<string, { c: string; l: string }> = Object.fromEntries(
  ACTIVITY_CATEGORIES.map(category => [category, {
    c: category === '学生优惠' ? 'purple' : ACTIVITY_CATEGORY_TO_TYPE[category] === 'platform' ? 'cash' : ACTIVITY_CATEGORY_TO_TYPE[category],
    l: category,
  }]),
)

// 类型标签（兜底）
export const TYPE_TAG: Record<string, { c: string; l: string }> = {
  cash: { c: 'cash', l: '现金' },
  right: { c: 'right', l: '实物/权益' },
  quota: { c: 'quota', l: '限时额度' },
  platform: { c: 'cash', l: '平台福利' },
  student: { c: 'right', l: '学生优惠' },
}

export const VERIFY_TAG: Record<string, { c: string; l: string }> = {
  verified: { c: 'verify', l: '已核验' },
  doubt: { c: 'doubt', l: '存疑' },
}

// 主题
export const THEMES = [
  { id: 'ink', name: '水墨书香', colors: ['#414748', '#8c9090', '#f4f5f2'] },
  { id: 'retro', name: '像素复古', colors: ['#6474dc', '#edbc54', '#f1f0e9'] },
  { id: 'violet', name: '魅力紫色', colors: ['#6f79b9', '#f0a797', '#eef2fa'] },
  { id: 'sakura', name: '粉色少女', colors: ['#c27c95', '#a68bc1', '#fbf7f4'] },
  { id: 'forest', name: '清新护眼', colors: ['#77a98c', '#c49b68', '#f3f2ed'] },
  { id: 'ocean', name: '蓝色海洋', colors: ['#4f94ab', '#c79c6b', '#eaf2f8'] },
  { id: 'sunset', name: '落日余晖', colors: ['#ba7959', '#9d7a9e', '#f8f0e9'] },
  { id: 'sky', name: '蓝色天空', colors: ['#70a7c8', '#e6c36a', '#eef6fb'] },
] as const

// 首页随机标语
export const BANNERS = [
  { t: '今天，这些福利可以安心领', d: '每天按关键词库自动检索全网活动，过滤已过期、来源不明的内容，只留近期真实有效、能直接参与的那批。' },
  { t: '羊毛很多，靠谱的才推给你', d: '为每条福利做真实性打标，标清领取条件与有效期，让你少踩坑、安心薅。' },
  { t: '今日份白嫖清单已就位', d: '技术资源、话费、外卖、学生优惠……官方可核验的福利，一条条替你把好关。' },
  { t: '这福利很靠谱', d: '专做福利的网站：领券、比价、查证一站搞定，帮你把每一份福利都查清楚再下手。' },
  { t: '把福利查清楚再动手', d: '来源不明、规则模糊的活动一律标存疑，你能一眼看出哪些可直接参加。' },
  { t: '每天 06:00，福利自动更新', d: '持续扫描、按时过滤，榜单跟着时间滚动，不让你翻过期的旧活动。' },
]

// 排序提示
export const SORT_HINT: Record<string, string> = {
  recommend: '官方可跳转优先，再按靠谱度排序',
  newest: '按抓取时间从新到旧排序',
  hot: '热门优先，再按靠谱度排序',
}
