// 共用的資料完整性檢查函數
export function validateProjectExists(db: any, projectId: string): boolean {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM projects WHERE id = ?');
  const result = stmt.get(projectId) as { count: number };
  return result.count > 0;
}

export function validateCharacterExists(db: any, characterId: string): boolean {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM characters WHERE id = ?');
  const result = stmt.get(characterId) as { count: number };
  return result.count > 0;
}