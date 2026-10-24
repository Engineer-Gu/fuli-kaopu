-- 清理预置的「伪真实」统计数字，避免查证工具自身展示无法追溯的假数据
-- 说明：参赛演示态下，站点访问与用户验证应为真实产生；种子阶段不应伪造计数

-- 将访问统计归零（真实访问会通过 /stats/visit 累加）
DELETE FROM site_stats;

-- 将预置的「已验证有效 / 反馈失效」计数归零，恢复为「暂无用户验证」的诚实状态
UPDATE activities SET verified_count = 0, invalid_count = 0;
