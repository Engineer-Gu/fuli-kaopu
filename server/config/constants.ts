export const API_PREFIX = '/api/v1'
export const SESSION_COOKIE = 'fuli_session'
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 天

// 前后端共享分类，确保提交校验、筛选和搜索导入保持一致。
export { ACTIVITY_CATEGORIES, ACTIVITY_CATEGORY_TO_TYPE } from '../../src/constants/activity-categories'

// 词典关键词分类：精简为 5 个常用福利大类
export const DICT_CATEGORIES = ['现金红包', '话费流量', '外卖餐饮', '会员权益', '技术资源'] as const
