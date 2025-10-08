use anyhow::{Context, Result};
use keyring::Entry;

const SERVICE_NAME: &str = "genesis-chronicle";

pub struct KeyringService;

impl KeyringService {
    pub fn set_secure_key(key: &str, value: &str) -> Result<()> {
        let entry = Entry::new(SERVICE_NAME, key)
            .with_context(|| format!("無法建立 keyring entry: {}", key))?;

        entry
            .set_password(value)
            .with_context(|| format!("無法寫入 keyring: {}", key))?;

        log::info!("🔐 [KeyringService] 成功寫入加密設定: {}", key);
        Ok(())
    }

    pub fn get_secure_key(key: &str) -> Result<Option<String>> {
        let entry = Entry::new(SERVICE_NAME, key)
            .with_context(|| format!("無法建立 keyring entry: {}", key))?;

        match entry.get_password() {
            Ok(value) => {
                log::info!("🔐 [KeyringService] 成功讀取加密設定: {}", key);
                Ok(Some(value))
            }
            Err(keyring::Error::NoEntry) => {
                log::debug!("🔐 [KeyringService] 設定不存在: {}", key);
                Ok(None)
            }
            Err(e) => {
                log::warn!("🔐 [KeyringService] 讀取失敗: {} - {}", key, e);
                Err(e.into())
            }
        }
    }

    pub fn delete_secure_key(key: &str) -> Result<()> {
        let entry = Entry::new(SERVICE_NAME, key)
            .with_context(|| format!("無法建立 keyring entry: {}", key))?;

        entry
            .delete_credential()
            .with_context(|| format!("無法刪除 keyring: {}", key))?;

        log::info!("🔐 [KeyringService] 成功刪除加密設定: {}", key);
        Ok(())
    }
}
