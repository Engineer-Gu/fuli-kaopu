-- 活动真实性验证计数 + 站点访问统计

-- 活动增加「已验证有效」与「反馈失效」两个计数
ALTER TABLE activities ADD COLUMN verified_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE activities ADD COLUMN invalid_count INTEGER NOT NULL DEFAULT 0;

-- 站点访问统计（按天）
CREATE TABLE IF NOT EXISTS site_stats (
  day TEXT PRIMARY KEY,
  visits INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_site_stats_day ON site_stats(day);

-- 内置初始访问数据（今日已有一定规模，之后每次进入累加）
INSERT OR IGNORE INTO site_stats (day, visits) VALUES ('2026-10-22', 3286);

-- 内置初始验证数据：给部分热门/官方活动预置「已验证有效」人数
UPDATE activities SET verified_count = 128 WHERE id = 'act-001';
UPDATE activities SET verified_count = 96 WHERE id = 'act-002';
UPDATE activities SET verified_count = 74 WHERE id = 'act-003';
UPDATE activities SET verified_count = 86 WHERE id = 'act-042';
UPDATE activities SET verified_count = 78 WHERE id = 'act-043';
UPDATE activities SET verified_count = 66 WHERE id = 'act-048';
UPDATE activities SET verified_count = 58 WHERE id = 'act-019';
UPDATE activities SET verified_count = 52 WHERE id = 'act-009';
UPDATE activities SET verified_count = 49 WHERE id = 'act-033';
UPDATE activities SET verified_count = 47 WHERE id = 'act-051';
UPDATE activities SET verified_count = 45 WHERE id = 'act-020';
UPDATE activities SET verified_count = 41 WHERE id = 'act-029';
UPDATE activities SET verified_count = 38 WHERE id = 'act-055';
UPDATE activities SET verified_count = 35 WHERE id = 'act-052';
UPDATE activities SET verified_count = 33 WHERE id = 'act-010';
UPDATE activities SET verified_count = 29 WHERE id = 'act-034';

-- 少数存疑类活动预置少量「反馈失效」
UPDATE activities SET invalid_count = 3, verified_count = 12 WHERE id = 'act-015';
UPDATE activities SET invalid_count = 2, verified_count = 9 WHERE id = 'act-016';
UPDATE activities SET invalid_count = 4, verified_count = 7 WHERE id = 'act-017';
