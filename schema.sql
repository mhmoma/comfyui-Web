DROP TABLE IF EXISTS characters;
DROP TABLE IF EXISTS series;

CREATE TABLE series (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  count INTEGER DEFAULT 0
);

CREATE TABLE characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  series_id TEXT NOT NULL,
  trigger_text TEXT NOT NULL,
  name TEXT NOT NULL,
  thumb_url TEXT DEFAULT '',
  count INTEGER DEFAULT 0,
  lora_url TEXT DEFAULT '',
  tags TEXT DEFAULT '',
  FOREIGN KEY (series_id) REFERENCES series(id)
);

CREATE INDEX idx_chars_series ON characters(series_id);
CREATE INDEX idx_chars_count ON characters(count DESC);
CREATE INDEX idx_chars_name ON characters(name COLLATE NOCASE);
CREATE INDEX idx_chars_trigger ON characters(trigger_text COLLATE NOCASE);

-- 资讯/动态文章表（阶段 B：微博式发帖）
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT DEFAULT '',
  cover_url TEXT DEFAULT '',
  content TEXT NOT NULL,
  category TEXT DEFAULT 'tool',
  tags TEXT DEFAULT '[]',
  status TEXT DEFAULT 'published',
  published_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);

-- 绘画大师全服留言板
CREATE TABLE IF NOT EXISTS board_messages (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '访客',
  user_id TEXT DEFAULT '',
  ip TEXT DEFAULT '',
  badge TEXT DEFAULT '',
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_board_at ON board_messages(at DESC);
CREATE INDEX IF NOT EXISTS idx_board_ip_at ON board_messages(ip, at DESC);
