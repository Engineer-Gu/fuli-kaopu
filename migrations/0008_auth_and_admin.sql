PRAGMA foreign_keys = ON;

-- 用户：role 为 admin（管理员）或 user（普通用户）
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  nickname TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 会话：token 存 D1，代替独立 KV 依赖
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- 默认管理员账号：admin / Admin@123456
-- 密码哈希为 bcrypt(Admin@123456)，登录后请在后台修改。
INSERT INTO users (id, username, password_hash, nickname, role, status, created_at, updated_at)
VALUES ('user-admin', 'admin', '$2b$10$IK71i0RWKTe9bEagy88tMeuKSjXeH61NR2kHYqzNnNiKhe1M97ab2', '平台管理员', 'admin', 'active', '2026-10-24T00:00:00.000Z', '2026-10-24T00:00:00.000Z')
ON CONFLICT(username) DO NOTHING;
