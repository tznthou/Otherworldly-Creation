#!/bin/bash

# 創建資料庫目錄
mkdir -p ~/.local/share/genesis-chronicle

# 創建基本的 SQLite 資料庫
sqlite3 ~/.local/share/genesis-chronicle/genesis-chronicle.db << 'EOF'
-- 創建設定表
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入一些基本設定
INSERT OR REPLACE INTO settings (key, value) VALUES 
    ('theme', '"dark"'),
    ('language', '"zh-TW"'),
    ('initialized', 'true');

-- 創建版本表
CREATE TABLE IF NOT EXISTS db_version (
    version INTEGER PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT OR REPLACE INTO db_version (version) VALUES (7);

.quit
EOF

echo "資料庫初始化完成！"
ls -la ~/.local/share/genesis-chronicle/