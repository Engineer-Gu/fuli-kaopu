PRAGMA foreign_keys = ON;

-- 福利活动：榜单核心数据，含用户提交（status=pending 待审核）与已核验内容
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL,
  hot INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  source TEXT NOT NULL,
  deadline TEXT NOT NULL,
  verify TEXT NOT NULL,
  score INTEGER NOT NULL,
  conditions TEXT NOT NULL,
  doubts TEXT NOT NULL,
  link TEXT NOT NULL,
  value TEXT NOT NULL,
  entry TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved',
  created_at TEXT NOT NULL
);

-- 省钱攻略：用户分享的省钱经验，tone=warn 表示存在风险需甄别
CREATE TABLE IF NOT EXISTS guides (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  tone TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'approved',
  created_at TEXT NOT NULL
);

-- 词典关键词：检索探针，cat 为 现金 / 实物 / 额度
CREATE TABLE IF NOT EXISTS dict_words (
  id TEXT PRIMARY KEY,
  kw TEXT NOT NULL,
  cat TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activities_status_created ON activities(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_category ON activities(category);
CREATE INDEX IF NOT EXISTS idx_guides_category ON guides(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dict_words_cat ON dict_words(cat, created_at ASC);
