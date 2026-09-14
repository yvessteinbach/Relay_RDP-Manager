use rusqlite::{params, Connection as SqliteConnection};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeMap,
    fs,
    path::{Path, PathBuf},
    process::Command,
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::Manager;

const LATEST_SCHEMA_VERSION: i64 = 3;
const BACKUP_FORMAT_VERSION: u32 = 1;
const VAULT_SERVICE: &str = "app.relay.rdp";
fn now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}
fn default_port() -> i64 {
    3389
}
fn default_color() -> String {
    "blue".into()
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RelayError {
    pub code: String,
    pub message: String,
}
impl RelayError {
    fn database(error: rusqlite::Error) -> Self {
        Self {
            code: "database_error".into(),
            message: error.to_string(),
        }
    }
    fn validation(message: impl Into<String>) -> Self {
        Self {
            code: "validation_error".into(),
            message: message.into(),
        }
    }
    fn vault(message: impl Into<String>) -> Self {
        Self {
            code: "credential_store_unavailable".into(),
            message: message.into(),
        }
    }
}
fn required(value: &str, name: &str) -> Result<(), RelayError> {
    if value.trim().is_empty() {
        Err(RelayError::validation(format!("A {name} is required.")))
    } else {
        Ok(())
    }
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Client {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub notes: String,
    #[serde(default)]
    pub archived: bool,
}
#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Site {
    pub id: String,
    pub client_id: String,
    pub name: String,
    #[serde(default)]
    pub location: String,
    #[serde(default)]
    pub notes: String,
    #[serde(default)]
    pub archived: bool,
}
#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Folder {
    pub id: String,
    pub client_id: String,
    pub site_id: Option<String>,
    pub parent_id: Option<String>,
    pub name: String,
    #[serde(default)]
    pub sort_order: i64,
    #[serde(default)]
    pub archived: bool,
}
#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CredentialReference {
    pub id: String,
    pub client_id: String,
    pub label: String,
    pub username: Option<String>,
    pub domain: Option<String>,
    #[serde(default)]
    pub archived: bool,
}
/// Passwords are accepted only for this one write operation and are never
/// serialized back to the webview or stored in SQLite.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CredentialInput {
    pub id: String,
    pub client_id: String,
    pub label: String,
    pub username: Option<String>,
    pub domain: Option<String>,
    pub password: String,
    #[serde(default)]
    pub archived: bool,
}
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CredentialReassignment {
    pub credential_id: String,
    pub replacement_credential_id: Option<String>,
}
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct VaultStatus {
    pub available: bool,
    pub platform: String,
    pub message: String,
}
#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Gateway {
    pub id: String,
    pub client_id: String,
    pub name: String,
    pub host: String,
    #[serde(default = "default_port")]
    pub port: i64,
    pub username: Option<String>,
    pub credential_id: Option<String>,
    #[serde(default)]
    pub archived: bool,
}
#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Tag {
    pub id: String,
    pub name: String,
    #[serde(default = "default_color")]
    pub color_token: String,
}
#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Connection {
    pub id: String,
    pub client_id: String,
    pub site_id: Option<String>,
    pub folder_id: Option<String>,
    pub gateway_id: Option<String>,
    pub credential_id: Option<String>,
    pub name: String,
    pub host: String,
    #[serde(default = "default_port")]
    pub port: i64,
    pub username: Option<String>,
    pub domain: Option<String>,
    #[serde(default)]
    pub display: String,
    #[serde(default)]
    pub notes: String,
    #[serde(default)]
    pub favorite: bool,
    #[serde(default)]
    pub archived: bool,
    #[serde(default)]
    pub tag_ids: Vec<String>,
}
#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq, Default)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionQuery {
    #[serde(default)]
    pub text: String,
    pub client_id: Option<String>,
    pub site_id: Option<String>,
    pub tag_id: Option<String>,
    pub favorite: Option<bool>,
    #[serde(default)]
    pub include_archived: bool,
}
#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LaunchHistory {
    pub id: i64,
    pub connection_id: String,
    pub occurred_at: i64,
    pub adapter: String,
    pub success: bool,
    pub category: Option<String>,
}

/// A reviewable, deliberately small subset of the RDP file format. Relay never
/// accepts password, certificate, or publisher settings from imported files.
#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RdpReview {
    pub filename: String,
    pub connection: ImportedConnection,
    pub warnings: Vec<String>,
    pub unsupported_keys: Vec<String>,
    pub duplicate_connection_id: Option<String>,
}
#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ImportedConnection {
    pub name: String,
    pub host: String,
    pub port: i64,
    pub username: Option<String>,
    pub domain: Option<String>,
    pub display: String,
}
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AdapterSupport {
    pub id: String,
    pub label: String,
    pub available: bool,
    pub supports_display: bool,
    pub supports_username: bool,
    pub notes: String,
}
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LaunchResult {
    pub adapter: String,
    pub started: bool,
    pub message: String,
}
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RdpImportInput {
    pub filename: String,
    pub content: String,
    pub client_id: String,
}
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportCommit {
    pub connection: Connection,
    pub replace_connection_id: Option<String>,
}

/// A portable, secret-free archive. Credential metadata is retained so that
/// connections remain linked after restore, but passwords remain in the OS
/// vault and must be entered again if the vault is unavailable.
#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct BackupArchive {
    pub format_version: u32,
    pub created_at: i64,
    pub checksum: String,
    pub data: BackupData,
}
#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct BackupData {
    pub clients: Vec<Client>,
    pub sites: Vec<Site>,
    pub folders: Vec<Folder>,
    pub credentials: Vec<CredentialReference>,
    pub gateways: Vec<Gateway>,
    pub tags: Vec<Tag>,
    pub connections: Vec<Connection>,
    pub launch_history: Vec<LaunchHistory>,
}
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RestoreResult {
    pub safety_backup: BackupArchive,
    pub restored_connections: usize,
    pub credential_passwords_restored: bool,
}

pub struct Library {
    database: Mutex<SqliteConnection>,
    database_path: PathBuf,
}

fn vault_entry(id: &str) -> Result<keyring::Entry, RelayError> {
    required(id, "credential id")?;
    keyring::Entry::new(VAULT_SERVICE, id)
        .map_err(|_| RelayError::vault("The operating system credential store is unavailable."))
}
fn vault_status() -> VaultStatus {
    let platform = std::env::consts::OS.to_owned();
    match vault_entry("relay-vault-probe") {
        Ok(_) => VaultStatus { available: true, platform, message: "The operating system credential store is available.".into() },
        Err(_) if platform == "linux" => VaultStatus { available: false, platform, message: "No Linux Secret Service/keyring is available. Passwords cannot be saved on this computer.".into() },
        Err(_) => VaultStatus { available: false, platform, message: "The operating system credential store is unavailable.".into() },
    }
}
fn set_secret(id: &str, password: &str) -> Result<(), RelayError> {
    vault_entry(id)?.set_password(password).map_err(|_| {
        RelayError::vault(redact_diagnostic(
            "Relay could not save the password in the operating system credential store.",
            password,
        ))
    })
}
fn get_secret(id: &str) -> Result<String, RelayError> {
    vault_entry(id)?.get_password().map_err(|_| {
        RelayError::vault(
            "Relay could not read the password from the operating system credential store.",
        )
    })
}
fn delete_secret(id: &str) -> Result<(), RelayError> {
    match vault_entry(id)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(_) => Err(RelayError::vault(
            "Relay could not remove the password from the operating system credential store.",
        )),
    }
}
/// Keeps arbitrary native errors and diagnostics useful without allowing a
/// password-shaped value to escape through an error, log, or crash annotation.
fn redact_diagnostic(text: &str, secret: &str) -> String {
    if secret.is_empty() {
        text.to_owned()
    } else {
        text.replace(secret, "[REDACTED]")
    }
}
impl Library {
    pub fn open(path: impl AsRef<Path>) -> Result<Self, RelayError> {
        let database_path = path.as_ref().to_path_buf();
        let database = SqliteConnection::open(&database_path).map_err(RelayError::database)?;
        database
            .pragma_update(None, "foreign_keys", "ON")
            .map_err(RelayError::database)?;
        migrate(&database)?;
        Ok(Self {
            database: Mutex::new(database),
            database_path,
        })
    }
    fn db(&self) -> std::sync::MutexGuard<'_, SqliteConnection> {
        self.database
            .lock()
            .expect("library database lock poisoned")
    }
    pub fn list_clients(&self) -> Result<Vec<Client>, RelayError> {
        let db = self.db();
        let mut s=db.prepare("SELECT id,name,notes,archived FROM clients WHERE deleted_at IS NULL ORDER BY archived,name COLLATE NOCASE").map_err(RelayError::database)?;
        let result = s
            .query_map([], |r| {
                Ok(Client {
                    id: r.get(0)?,
                    name: r.get(1)?,
                    notes: r.get(2)?,
                    archived: r.get(3)?,
                })
            })
            .map_err(RelayError::database)?
            .collect::<Result<_, _>>()
            .map_err(RelayError::database);
        result
    }
    pub fn save_client(&self, item: Client) -> Result<Client, RelayError> {
        required(&item.id, "client id")?;
        required(&item.name, "client name")?;
        let db = self.db();
        db.execute("INSERT INTO clients(id,name,notes,archived,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?5) ON CONFLICT(id) DO UPDATE SET name=excluded.name,notes=excluded.notes,archived=excluded.archived,updated_at=excluded.updated_at,deleted_at=NULL",params![item.id,item.name,item.notes,item.archived,now()]).map_err(RelayError::database)?;
        Ok(item)
    }
    pub fn list_sites(&self, client_id: Option<String>) -> Result<Vec<Site>, RelayError> {
        let db = self.db();
        let mut s=db.prepare("SELECT id,client_id,name,location,notes,archived FROM sites WHERE deleted_at IS NULL AND (?1 IS NULL OR client_id=?1) ORDER BY name COLLATE NOCASE").map_err(RelayError::database)?;
        let result = s
            .query_map([client_id], |r| {
                Ok(Site {
                    id: r.get(0)?,
                    client_id: r.get(1)?,
                    name: r.get(2)?,
                    location: r.get(3)?,
                    notes: r.get(4)?,
                    archived: r.get(5)?,
                })
            })
            .map_err(RelayError::database)?
            .collect::<Result<_, _>>()
            .map_err(RelayError::database);
        result
    }
    pub fn save_site(&self, item: Site) -> Result<Site, RelayError> {
        required(&item.name, "site name")?;
        let db = self.db();
        db.execute("INSERT INTO sites(id,client_id,name,location,notes,archived,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?7) ON CONFLICT(id) DO UPDATE SET client_id=excluded.client_id,name=excluded.name,location=excluded.location,notes=excluded.notes,archived=excluded.archived,updated_at=excluded.updated_at,deleted_at=NULL",params![item.id,item.client_id,item.name,item.location,item.notes,item.archived,now()]).map_err(RelayError::database)?;
        Ok(item)
    }
    pub fn list_folders(&self, client_id: Option<String>) -> Result<Vec<Folder>, RelayError> {
        let db = self.db();
        let mut s=db.prepare("SELECT id,client_id,site_id,parent_id,name,sort_order,archived FROM folders WHERE deleted_at IS NULL AND (?1 IS NULL OR client_id=?1) ORDER BY sort_order,name COLLATE NOCASE").map_err(RelayError::database)?;
        let result = s
            .query_map([client_id], |r| {
                Ok(Folder {
                    id: r.get(0)?,
                    client_id: r.get(1)?,
                    site_id: r.get(2)?,
                    parent_id: r.get(3)?,
                    name: r.get(4)?,
                    sort_order: r.get(5)?,
                    archived: r.get(6)?,
                })
            })
            .map_err(RelayError::database)?
            .collect::<Result<_, _>>()
            .map_err(RelayError::database);
        result
    }
    pub fn save_folder(&self, item: Folder) -> Result<Folder, RelayError> {
        required(&item.name, "folder name")?;
        if item.parent_id.as_deref() == Some(&item.id) {
            return Err(RelayError::validation("A folder cannot be its own parent."));
        }
        let db = self.db();
        db.execute("INSERT INTO folders(id,client_id,site_id,parent_id,name,sort_order,archived,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?8) ON CONFLICT(id) DO UPDATE SET client_id=excluded.client_id,site_id=excluded.site_id,parent_id=excluded.parent_id,name=excluded.name,sort_order=excluded.sort_order,archived=excluded.archived,updated_at=excluded.updated_at,deleted_at=NULL",params![item.id,item.client_id,item.site_id,item.parent_id,item.name,item.sort_order,item.archived,now()]).map_err(RelayError::database)?;
        Ok(item)
    }
    pub fn list_credentials(
        &self,
        client_id: Option<String>,
    ) -> Result<Vec<CredentialReference>, RelayError> {
        let db = self.db();
        let mut s=db.prepare("SELECT id,client_id,label,username,domain,archived FROM credentials WHERE deleted_at IS NULL AND (?1 IS NULL OR client_id=?1) ORDER BY label COLLATE NOCASE").map_err(RelayError::database)?;
        let result = s
            .query_map([client_id], |r| {
                Ok(CredentialReference {
                    id: r.get(0)?,
                    client_id: r.get(1)?,
                    label: r.get(2)?,
                    username: r.get(3)?,
                    domain: r.get(4)?,
                    archived: r.get(5)?,
                })
            })
            .map_err(RelayError::database)?
            .collect::<Result<_, _>>()
            .map_err(RelayError::database);
        result
    }
    pub fn save_credential(
        &self,
        item: CredentialInput,
    ) -> Result<CredentialReference, RelayError> {
        required(&item.label, "credential label")?;
        required(&item.id, "credential id")?;
        if item.password.is_empty() {
            return Err(RelayError::validation(
                "A password is required when saving a credential.",
            ));
        }
        // Write the vault first: a database row is never created for a password
        // that failed to enter the native credential store.
        set_secret(&item.id, &item.password)?;
        let db = self.db();
        db.execute("INSERT INTO credentials(id,client_id,label,username,domain,secret_ref,archived,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?8) ON CONFLICT(id) DO UPDATE SET client_id=excluded.client_id,label=excluded.label,username=excluded.username,domain=excluded.domain,archived=excluded.archived,updated_at=excluded.updated_at,deleted_at=NULL",params![item.id,item.client_id,item.label,item.username,item.domain,format!("vault:{}",item.id),item.archived,now()]).map_err(RelayError::database)?;
        Ok(CredentialReference {
            id: item.id,
            client_id: item.client_id,
            label: item.label,
            username: item.username,
            domain: item.domain,
            archived: item.archived,
        })
    }
    pub fn reveal_credential(&self, credential_id: String) -> Result<String, RelayError> {
        self.credential_exists(&credential_id)?;
        get_secret(&credential_id)
    }
    pub fn reassign_credential(&self, request: CredentialReassignment) -> Result<(), RelayError> {
        self.credential_exists(&request.credential_id)?;
        if let Some(replacement) = request.replacement_credential_id.as_deref() {
            self.credential_exists(replacement)?;
        }
        let mut db = self.db();
        let tx = db.transaction().map_err(RelayError::database)?;
        tx.execute(
            "UPDATE gateways SET credential_id=?1,updated_at=?2 WHERE credential_id=?3",
            params![
                request.replacement_credential_id,
                now(),
                request.credential_id
            ],
        )
        .map_err(RelayError::database)?;
        tx.execute(
            "UPDATE connections SET credential_id=?1,updated_at=?2 WHERE credential_id=?3",
            params![
                request.replacement_credential_id,
                now(),
                request.credential_id
            ],
        )
        .map_err(RelayError::database)?;
        tx.execute(
            "UPDATE credentials SET deleted_at=?1 WHERE id=?2",
            params![now(), request.credential_id],
        )
        .map_err(RelayError::database)?;
        tx.commit().map_err(RelayError::database)?;
        delete_secret(&request.credential_id)
    }
    pub fn credential_store_status(&self) -> Result<VaultStatus, RelayError> {
        Ok(vault_status())
    }
    fn credential_exists(&self, id: &str) -> Result<(), RelayError> {
        let db = self.db();
        let exists: bool = db
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM credentials WHERE id=?1 AND deleted_at IS NULL)",
                [id],
                |row| row.get(0),
            )
            .map_err(RelayError::database)?;
        if exists {
            Ok(())
        } else {
            Err(RelayError::validation("Credential was not found."))
        }
    }
    pub fn list_gateways(&self, client_id: Option<String>) -> Result<Vec<Gateway>, RelayError> {
        let db = self.db();
        let mut s=db.prepare("SELECT id,client_id,name,host,port,username,credential_id,archived FROM gateways WHERE deleted_at IS NULL AND (?1 IS NULL OR client_id=?1) ORDER BY name COLLATE NOCASE").map_err(RelayError::database)?;
        let result = s
            .query_map([client_id], |r| {
                Ok(Gateway {
                    id: r.get(0)?,
                    client_id: r.get(1)?,
                    name: r.get(2)?,
                    host: r.get(3)?,
                    port: r.get(4)?,
                    username: r.get(5)?,
                    credential_id: r.get(6)?,
                    archived: r.get(7)?,
                })
            })
            .map_err(RelayError::database)?
            .collect::<Result<_, _>>()
            .map_err(RelayError::database);
        result
    }
    pub fn save_gateway(&self, item: Gateway) -> Result<Gateway, RelayError> {
        required(&item.name, "gateway name")?;
        required(&item.host, "gateway host")?;
        if !(1..=65535).contains(&item.port) {
            return Err(RelayError::validation(
                "Gateway port must be between 1 and 65535.",
            ));
        }
        let db = self.db();
        db.execute("INSERT INTO gateways(id,client_id,name,host,port,username,credential_id,archived,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?9) ON CONFLICT(id) DO UPDATE SET client_id=excluded.client_id,name=excluded.name,host=excluded.host,port=excluded.port,username=excluded.username,credential_id=excluded.credential_id,archived=excluded.archived,updated_at=excluded.updated_at,deleted_at=NULL",params![item.id,item.client_id,item.name,item.host,item.port,item.username,item.credential_id,item.archived,now()]).map_err(RelayError::database)?;
        Ok(item)
    }
    pub fn list_tags(&self) -> Result<Vec<Tag>, RelayError> {
        let db = self.db();
        let mut s = db
            .prepare("SELECT id,name,color_token FROM tags ORDER BY name COLLATE NOCASE")
            .map_err(RelayError::database)?;
        let result = s
            .query_map([], |r| {
                Ok(Tag {
                    id: r.get(0)?,
                    name: r.get(1)?,
                    color_token: r.get(2)?,
                })
            })
            .map_err(RelayError::database)?
            .collect::<Result<_, _>>()
            .map_err(RelayError::database);
        result
    }
    pub fn save_tag(&self, item: Tag) -> Result<Tag, RelayError> {
        required(&item.name, "tag name")?;
        let db = self.db();
        db.execute("INSERT INTO tags(id,name,color_token) VALUES(?1,?2,?3) ON CONFLICT(id) DO UPDATE SET name=excluded.name,color_token=excluded.color_token",params![item.id,item.name,item.color_token]).map_err(RelayError::database)?;
        Ok(item)
    }
    pub fn list_connections(&self, q: ConnectionQuery) -> Result<Vec<Connection>, RelayError> {
        let db = self.db();
        let pattern = format!("%{}%", q.text.trim().to_lowercase());
        let mut s=db.prepare("SELECT DISTINCT c.id,c.client_id,c.site_id,c.folder_id,c.gateway_id,c.credential_id,c.name,c.host,c.port,c.username,c.domain,c.display,c.notes,c.favorite,c.archived FROM connections c JOIN clients cl ON cl.id=c.client_id LEFT JOIN sites si ON si.id=c.site_id LEFT JOIN folders f ON f.id=c.folder_id LEFT JOIN connection_tags ct ON ct.connection_id=c.id LEFT JOIN tags t ON t.id=ct.tag_id WHERE c.deleted_at IS NULL AND (?1=1 OR c.archived=0) AND (?2 IS NULL OR c.client_id=?2) AND (?3 IS NULL OR c.site_id=?3) AND (?4 IS NULL OR c.favorite=?4) AND (?5 IS NULL OR ct.tag_id=?5) AND (?6='%%' OR lower(c.name) LIKE ?6 OR lower(c.host) LIKE ?6 OR lower(COALESCE(c.username,'')) LIKE ?6 OR lower(cl.name) LIKE ?6 OR lower(COALESCE(si.name,'')) LIKE ?6 OR lower(COALESCE(f.name,'')) LIKE ?6 OR lower(COALESCE(t.name,'')) LIKE ?6) ORDER BY c.favorite DESC,c.name COLLATE NOCASE").map_err(RelayError::database)?;
        let mut rows = s
            .query_map(
                params![
                    q.include_archived,
                    q.client_id,
                    q.site_id,
                    q.favorite,
                    q.tag_id,
                    pattern
                ],
                |r| {
                    Ok(Connection {
                        id: r.get(0)?,
                        client_id: r.get(1)?,
                        site_id: r.get(2)?,
                        folder_id: r.get(3)?,
                        gateway_id: r.get(4)?,
                        credential_id: r.get(5)?,
                        name: r.get(6)?,
                        host: r.get(7)?,
                        port: r.get(8)?,
                        username: r.get(9)?,
                        domain: r.get(10)?,
                        display: r.get(11)?,
                        notes: r.get(12)?,
                        favorite: r.get(13)?,
                        archived: r.get(14)?,
                        tag_ids: vec![],
                    })
                },
            )
            .map_err(RelayError::database)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(RelayError::database)?;
        for c in &mut rows {
            let mut ts = db
                .prepare("SELECT tag_id FROM connection_tags WHERE connection_id=?1")
                .map_err(RelayError::database)?;
            let tags = ts
                .query_map([&c.id], |r| r.get(0))
                .map_err(RelayError::database)?
                .collect::<Result<_, _>>()
                .map_err(RelayError::database)?;
            c.tag_ids = tags;
        }
        Ok(rows)
    }
    pub fn save_connection(&self, item: Connection) -> Result<Connection, RelayError> {
        required(&item.name, "connection name")?;
        required(&item.host, "connection host")?;
        if !(1..=65535).contains(&item.port) {
            return Err(RelayError::validation(
                "Connection port must be between 1 and 65535.",
            ));
        }
        let mut db = self.db();
        let tx = db.transaction().map_err(RelayError::database)?;
        tx.execute("INSERT INTO connections(id,client_id,site_id,folder_id,gateway_id,credential_id,name,host,port,username,domain,display,notes,favorite,archived,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?16) ON CONFLICT(id) DO UPDATE SET client_id=excluded.client_id,site_id=excluded.site_id,folder_id=excluded.folder_id,gateway_id=excluded.gateway_id,credential_id=excluded.credential_id,name=excluded.name,host=excluded.host,port=excluded.port,username=excluded.username,domain=excluded.domain,display=excluded.display,notes=excluded.notes,favorite=excluded.favorite,archived=excluded.archived,updated_at=excluded.updated_at,deleted_at=NULL",params![item.id,item.client_id,item.site_id,item.folder_id,item.gateway_id,item.credential_id,item.name,item.host,item.port,item.username,item.domain,item.display,item.notes,item.favorite,item.archived,now()]).map_err(RelayError::database)?;
        tx.execute(
            "DELETE FROM connection_tags WHERE connection_id=?1",
            [&item.id],
        )
        .map_err(RelayError::database)?;
        for tag in &item.tag_ids {
            tx.execute(
                "INSERT INTO connection_tags(connection_id,tag_id) VALUES(?1,?2)",
                params![item.id, tag],
            )
            .map_err(RelayError::database)?;
        }
        tx.commit().map_err(RelayError::database)?;
        Ok(item)
    }
    fn backup_data(&self) -> Result<BackupData, RelayError> {
        let db = self.db();
        let mut history = db.prepare("SELECT id,connection_id,occurred_at,adapter,success,category FROM launch_history ORDER BY id")
            .map_err(RelayError::database)?;
        let launch_history = history
            .query_map([], |r| {
                Ok(LaunchHistory {
                    id: r.get(0)?,
                    connection_id: r.get(1)?,
                    occurred_at: r.get(2)?,
                    adapter: r.get(3)?,
                    success: r.get(4)?,
                    category: r.get(5)?,
                })
            })
            .map_err(RelayError::database)?
            .collect::<Result<_, _>>()
            .map_err(RelayError::database)?;
        drop(history);
        drop(db);
        Ok(BackupData {
            clients: self.list_clients()?,
            sites: self.list_sites(None)?,
            folders: self.list_folders(None)?,
            credentials: self.list_credentials(None)?,
            gateways: self.list_gateways(None)?,
            tags: self.list_tags()?,
            connections: self.list_connections(ConnectionQuery {
                include_archived: true,
                ..Default::default()
            })?,
            launch_history,
        })
    }
    pub fn create_backup(&self) -> Result<BackupArchive, RelayError> {
        let data = self.backup_data()?;
        Ok(BackupArchive {
            format_version: BACKUP_FORMAT_VERSION,
            created_at: now(),
            checksum: backup_checksum(&data)?,
            data,
        })
    }
    pub fn restore_backup(&self, archive: BackupArchive) -> Result<RestoreResult, RelayError> {
        validate_backup(&archive)?;
        // Validate every relationship against a clean, current-schema library
        // before the live library is touched.
        let mut validation = SqliteConnection::open_in_memory().map_err(RelayError::database)?;
        validation
            .pragma_update(None, "foreign_keys", "ON")
            .map_err(RelayError::database)?;
        migrate(&validation)?;
        replace_backup_data(&mut validation, &archive.data)?;

        let safety_backup = self.create_backup()?;
        self.write_safety_backup(&safety_backup)?;
        let mut db = self.db();
        replace_backup_data(&mut db, &archive.data)?;
        Ok(RestoreResult {
            safety_backup,
            restored_connections: archive.data.connections.len(),
            credential_passwords_restored: false,
        })
    }
    fn write_safety_backup(&self, archive: &BackupArchive) -> Result<(), RelayError> {
        // In-memory libraries exist only in tests. Real installations retain a
        // durable copy before the first destructive database statement runs.
        if self.database_path == Path::new(":memory:") {
            return Ok(());
        }
        let parent = self.database_path.parent().ok_or_else(|| {
            RelayError::validation("Relay could not determine where to save the safety backup.")
        })?;
        let path = parent.join(format!(
            "relay-pre-restore-{}.relay-backup.json",
            archive.created_at
        ));
        let body = serde_json::to_vec_pretty(archive)
            .map_err(|_| RelayError::validation("Relay could not serialize the safety backup."))?;
        fs::write(path, body).map_err(|_| {
            RelayError::validation("Relay could not write the pre-restore safety backup.")
        })
    }
    pub fn archive_connections(&self, ids: Vec<String>, archived: bool) -> Result<(), RelayError> {
        let mut db = self.db();
        let tx = db.transaction().map_err(RelayError::database)?;
        for id in ids {
            tx.execute("UPDATE connections SET archived=?1,updated_at=?2 WHERE id=?3 AND deleted_at IS NULL",params![archived,now(),id]).map_err(RelayError::database)?;
        }
        tx.commit().map_err(RelayError::database)
    }
    pub fn set_connection_favorite(&self, id: String, favorite: bool) -> Result<(), RelayError> {
        let db = self.db();
        db.execute(
            "UPDATE connections SET favorite=?1,updated_at=?2 WHERE id=?3 AND deleted_at IS NULL",
            params![favorite, now(), id],
        )
        .map_err(RelayError::database)?;
        Ok(())
    }
    pub fn duplicate_connection(
        &self,
        source_id: String,
        new_id: String,
        name: String,
    ) -> Result<Connection, RelayError> {
        let mut source = self
            .list_connections(ConnectionQuery {
                include_archived: true,
                ..Default::default()
            })?
            .into_iter()
            .find(|x| x.id == source_id)
            .ok_or_else(|| RelayError::validation("Connection was not found."))?;
        source.id = new_id;
        source.name = name;
        source.archived = false;
        self.save_connection(source.clone())?;
        Ok(source)
    }
    pub fn record_launch(
        &self,
        connection_id: String,
        adapter: String,
        success: bool,
        category: Option<String>,
    ) -> Result<(), RelayError> {
        required(&adapter, "adapter")?;
        let db = self.db();
        db.execute("INSERT INTO launch_history(connection_id,occurred_at,adapter,success,category) VALUES(?1,?2,?3,?4,?5)",params![connection_id,now(),adapter,success,category]).map_err(RelayError::database)?;
        Ok(())
    }
    pub fn list_launch_history(
        &self,
        connection_id: Option<String>,
    ) -> Result<Vec<LaunchHistory>, RelayError> {
        let db = self.db();
        let mut s=db.prepare("SELECT id,connection_id,occurred_at,adapter,success,category FROM launch_history WHERE (?1 IS NULL OR connection_id=?1) ORDER BY occurred_at DESC,id DESC LIMIT 100").map_err(RelayError::database)?;
        let result = s
            .query_map([connection_id], |r| {
                Ok(LaunchHistory {
                    id: r.get(0)?,
                    connection_id: r.get(1)?,
                    occurred_at: r.get(2)?,
                    adapter: r.get(3)?,
                    success: r.get(4)?,
                    category: r.get(5)?,
                })
            })
            .map_err(RelayError::database)?
            .collect::<Result<_, _>>()
            .map_err(RelayError::database);
        result
    }
    pub fn review_rdp_import(&self, input: RdpImportInput) -> Result<RdpReview, RelayError> {
        required(&input.filename, "import filename")?;
        required(&input.client_id, "client")?;
        let (connection, warnings, unsupported_keys) = parse_rdp(&input.filename, &input.content)?;
        let duplicate_connection_id = self
            .list_connections(ConnectionQuery {
                client_id: Some(input.client_id),
                include_archived: true,
                ..Default::default()
            })?
            .into_iter()
            .find(|existing| {
                existing.host.eq_ignore_ascii_case(&connection.host)
                    && existing.port == connection.port
                    && existing
                        .username
                        .as_deref()
                        .unwrap_or("")
                        .eq_ignore_ascii_case(connection.username.as_deref().unwrap_or(""))
            })
            .map(|connection| connection.id);
        Ok(RdpReview {
            filename: input.filename,
            connection,
            warnings,
            unsupported_keys,
            duplicate_connection_id,
        })
    }
    pub fn commit_rdp_import(&self, commit: ImportCommit) -> Result<Connection, RelayError> {
        if let Some(id) = commit.replace_connection_id.as_deref() {
            required(id, "connection to replace")?;
            if id != commit.connection.id {
                let db = self.db();
                db.execute(
                    "UPDATE connections SET deleted_at=?1 WHERE id=?2",
                    params![now(), id],
                )
                .map_err(RelayError::database)?;
            }
        }
        self.save_connection(commit.connection)
    }
    pub fn export_rdp(&self, connection_id: String) -> Result<String, RelayError> {
        let connection = self.connection_by_id(&connection_id)?;
        Ok(serialize_rdp(&connection))
    }
    pub fn adapter_support(&self) -> Result<Vec<AdapterSupport>, RelayError> {
        Ok(adapter_support_matrix())
    }
    pub fn launch_connection(&self, connection_id: String) -> Result<LaunchResult, RelayError> {
        let connection = self.connection_by_id(&connection_id)?;
        let support = adapter_support_matrix()
            .into_iter()
            .find(|item| item.available)
            .ok_or_else(|| RelayError {
                code: "client_not_found".into(),
                message: "No supported RDP client is installed or configured.".into(),
            });
        let support = match support {
            Ok(value) => value,
            Err(error) => {
                self.record_launch(
                    connection_id,
                    "unavailable".into(),
                    false,
                    Some(error.code.clone()),
                )?;
                return Err(error);
            }
        };
        let result = launch_with_adapter(&support.id, &connection);
        match &result {
            Ok(_) => self.record_launch(connection_id, support.id.clone(), true, None)?,
            Err(error) => self.record_launch(
                connection_id,
                support.id.clone(),
                false,
                Some(error.code.clone()),
            )?,
        }
        result
    }
    fn connection_by_id(&self, id: &str) -> Result<Connection, RelayError> {
        self.list_connections(ConnectionQuery {
            include_archived: true,
            ..Default::default()
        })?
        .into_iter()
        .find(|item| item.id == id)
        .ok_or_else(|| RelayError::validation("Connection was not found."))
    }
}

fn parse_rdp(
    filename: &str,
    content: &str,
) -> Result<(ImportedConnection, Vec<String>, Vec<String>), RelayError> {
    if content.len() > 1024 * 1024 {
        return Err(RelayError::validation("The RDP file is larger than 1 MiB."));
    }
    let mut values = BTreeMap::new();
    let mut warnings = vec![];
    let mut unsupported = vec![];
    let allowed = [
        "full address",
        "username",
        "domain",
        "screen mode id",
        "use multimon",
        "desktopwidth",
        "desktopheight",
    ];
    let blocked = [
        "password 51",
        "password 51",
        "alternate shell",
        "shell working directory",
        "authentication level",
        "enablecredsspsupport",
        "gatewaypasswords",
        "credential blob",
        "signscope",
        "signature",
        "publishername",
    ];
    for raw in content.lines() {
        let line = raw.trim();
        if line.is_empty() || line.starts_with(';') {
            continue;
        }
        let mut pieces = line.splitn(3, ':');
        let key = pieces.next().unwrap_or("").trim().to_ascii_lowercase();
        let value_type = pieces.next().unwrap_or("");
        let value = pieces.next().unwrap_or("").trim();
        if key.is_empty() || !matches!(value_type, "s" | "i" | "b") {
            warnings.push("Ignored a malformed RDP setting.".into());
            continue;
        }
        if blocked.contains(&key.as_str()) || key.contains("password") || key.contains("credential")
        {
            warnings.push(format!("Ignored sensitive setting: {key}."));
            continue;
        }
        if allowed.contains(&key.as_str()) {
            values.insert(key, value.to_owned());
        } else {
            unsupported.push(key);
        }
    }
    let address = values
        .get("full address")
        .ok_or_else(|| RelayError::validation("The RDP file does not contain a full address."))?;
    let (host, port) = split_address(address)?;
    let username = values.get("username").filter(|s| !s.is_empty()).cloned();
    let domain = values.get("domain").filter(|s| !s.is_empty()).cloned();
    let display = if values.get("use multimon").is_some_and(|v| v == "1") {
        "Multi-monitor".into()
    } else if values.get("screen mode id").is_some_and(|v| v == "2") {
        "Full screen".into()
    } else {
        "Windowed".into()
    };
    Ok((
        ImportedConnection {
            name: filename
                .trim_end_matches(".rdp")
                .trim_end_matches(".RDP")
                .to_owned(),
            host,
            port,
            username,
            domain,
            display,
        },
        warnings,
        unsupported,
    ))
}
fn split_address(address: &str) -> Result<(String, i64), RelayError> {
    let value = address.trim();
    if value.is_empty() || value.chars().any(char::is_whitespace) {
        return Err(RelayError::validation("The RDP address is invalid."));
    }
    if let Some((host, port)) = value.rsplit_once(':') {
        if !host.contains(':') && port.chars().all(|c| c.is_ascii_digit()) {
            let port: i64 = port
                .parse()
                .map_err(|_| RelayError::validation("The RDP port is invalid."))?;
            if !(1..=65535).contains(&port) {
                return Err(RelayError::validation(
                    "The RDP port must be between 1 and 65535.",
                ));
            }
            return Ok((host.to_owned(), port));
        }
    }
    Ok((value.to_owned(), 3389))
}
fn serialize_rdp(connection: &Connection) -> String {
    let mut lines = vec![
        "; Generated by Relay. Secrets and Relay-only notes are excluded.".to_owned(),
        format!("full address:s:{}:{}", connection.host, connection.port),
    ];
    if let Some(username) = &connection.username {
        if !username.trim().is_empty() {
            lines.push(format!("username:s:{username}"));
        }
    }
    if let Some(domain) = &connection.domain {
        if !domain.trim().is_empty() {
            lines.push(format!("domain:s:{domain}"));
        }
    }
    match connection.display.as_str() {
        "Full screen" => lines.push("screen mode id:i:2".into()),
        "Multi-monitor" => {
            lines.push("screen mode id:i:2".into());
            lines.push("use multimon:i:1".into());
        }
        _ => lines.push("screen mode id:i:1".into()),
    }
    lines.push("prompt for credentials:i:1".into());
    lines.join("\r\n") + "\r\n"
}
fn executable_available(name: &str) -> bool {
    let candidates = if cfg!(windows) {
        vec![name.to_owned(), format!("{name}.exe")]
    } else {
        vec![name.to_owned()]
    };
    std::env::var_os("PATH").is_some_and(|paths| {
        std::env::split_paths(&paths).any(|dir| {
            candidates
                .iter()
                .any(|candidate| dir.join(candidate).is_file())
        })
    })
}
fn macos_windows_app_available() -> bool {
    #[cfg(target_os = "macos")]
    {
        let mut command = Command::new("open");
        command
            .args(["-Ra", "Windows App"])
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null());
        command.status().is_ok_and(|status| status.success())
    }
    #[cfg(not(target_os = "macos"))]
    {
        false
    }
}
fn rdp_url(connection: &Connection) -> String {
    let encoded_host = connection
        .host
        .bytes()
        .fold(String::new(), |mut value, byte| {
            if byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'-' | b'_') {
                value.push(byte as char);
            } else {
                use std::fmt::Write;
                let _ = write!(value, "%{byte:02X}");
            }
            value
        });
    format!(
        "rdp://full%20address=s%3A{encoded_host}%3A{}",
        connection.port
    )
}
fn adapter_support_matrix() -> Vec<AdapterSupport> {
    let platform = std::env::consts::OS;
    vec![
        AdapterSupport {
            id: "mstsc".into(),
            label: "Windows Remote Desktop Connection".into(),
            available: platform == "windows" && executable_available("mstsc"),
            supports_display: true,
            // mstsc has no command-line option for a username. Relay starts a
            // credential prompt instead of using a temporary RDP profile.
            supports_username: false,
            notes: "Uses mstsc with direct non-secret arguments.".into(),
        },
        AdapterSupport {
            id: "macos-open".into(),
            label: "Windows App or registered macOS RDP client".into(),
            available: platform == "macos" && executable_available("open"),
            supports_display: true,
            supports_username: !macos_windows_app_available(),
            notes: if macos_windows_app_available() {
                "Uses the installed Windows App with a direct RDP link.".into()
            } else {
                "Opens a sanitized RDP file with the macOS registered application.".into()
            },
        },
        AdapterSupport {
            id: "xfreerdp".into(),
            label: "FreeRDP".into(),
            available: platform == "linux" && executable_available("xfreerdp"),
            supports_display: true,
            supports_username: true,
            notes: "Uses FreeRDP with direct, non-secret arguments.".into(),
        },
    ]
}
fn adapter_command(
    adapter: &str,
    connection: &Connection,
    profile: Option<&Path>,
) -> Result<Command, RelayError> {
    match adapter {
        "mstsc" => {
            let mut command = Command::new("mstsc");
            command.arg(format!("/v:{}:{}", connection.host, connection.port));
            match connection.display.as_str() {
                "Full screen" => {
                    command.arg("/f");
                }
                "Multi-monitor" => {
                    command.arg("/f");
                    command.arg("/multimon");
                }
                _ => {}
            }
            // Relay deliberately does not hand a password to mstsc. Prompting
            // here preserves the generated-profile behavior without creating
            // a temporary file that Windows must load.
            command.arg("/prompt");
            Ok(command)
        }
        "xfreerdp" => {
            let mut c = Command::new("xfreerdp");
            c.arg(format!("/v:{}:{}", connection.host, connection.port));
            if let Some(username) = &connection.username {
                c.arg(format!("/u:{username}"));
            }
            if let Some(domain) = &connection.domain {
                c.arg(format!("/d:{domain}"));
            }
            if connection.display == "Full screen" || connection.display == "Multi-monitor" {
                c.arg("/f");
            }
            if connection.display == "Multi-monitor" {
                c.arg("/multimon");
            }
            Ok(c)
        }
        "macos-open" => {
            if macos_windows_app_available() {
                let mut command = Command::new("open");
                command.args(["-n", "-a", "Windows App", "--"]);
                command.arg(rdp_url(connection));
                return Ok(command);
            }
            let profile = profile.ok_or_else(|| RelayError {
                code: "temporary_file_error".into(),
                message: "Relay could not create a protected temporary RDP file.".into(),
            })?;
            let mut command = Command::new("open");
            // -W keeps the profile until the registered client exits, rather
            // than deleting it as soon as the macOS `open` utility returns.
            command.args(["-W", "--"]).arg(profile);
            Ok(command)
        }
        _ => Err(RelayError {
            code: "client_not_found".into(),
            message: "No supported RDP client is installed or configured.".into(),
        }),
    }
}

fn backup_checksum(data: &BackupData) -> Result<String, RelayError> {
    let payload = serde_json::to_vec(data)
        .map_err(|_| RelayError::validation("Relay could not serialize this backup."))?;
    Ok(format!("sha256:{:x}", Sha256::digest(payload)))
}

fn validate_backup(archive: &BackupArchive) -> Result<(), RelayError> {
    if archive.format_version != BACKUP_FORMAT_VERSION {
        return Err(RelayError::validation(format!(
            "This backup format (v{}) is not supported by this Relay version.",
            archive.format_version
        )));
    }
    if archive.checksum != backup_checksum(&archive.data)? {
        return Err(RelayError::validation(
            "The backup checksum does not match. It may be damaged or altered.",
        ));
    }
    Ok(())
}

fn replace_backup_data(db: &mut SqliteConnection, data: &BackupData) -> Result<(), RelayError> {
    let tx = db.transaction().map_err(RelayError::database)?;
    tx.execute_batch(
        "PRAGMA defer_foreign_keys=ON;
        DELETE FROM connection_tags; DELETE FROM launch_history; DELETE FROM connections;
        DELETE FROM gateways; DELETE FROM credentials; DELETE FROM folders; DELETE FROM sites;
        DELETE FROM tags; DELETE FROM clients;",
    )
    .map_err(RelayError::database)?;
    for item in &data.clients {
        tx.execute("INSERT INTO clients(id,name,notes,archived,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?5)", params![item.id,item.name,item.notes,item.archived,now()]).map_err(RelayError::database)?;
    }
    for item in &data.sites {
        tx.execute("INSERT INTO sites(id,client_id,name,location,notes,archived,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?7)", params![item.id,item.client_id,item.name,item.location,item.notes,item.archived,now()]).map_err(RelayError::database)?;
    }
    for item in &data.folders {
        tx.execute("INSERT INTO folders(id,client_id,site_id,parent_id,name,sort_order,archived,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?8)", params![item.id,item.client_id,item.site_id,item.parent_id,item.name,item.sort_order,item.archived,now()]).map_err(RelayError::database)?;
    }
    for item in &data.credentials {
        tx.execute("INSERT INTO credentials(id,client_id,label,username,domain,secret_ref,archived,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?8)", params![item.id,item.client_id,item.label,item.username,item.domain,format!("vault:{}", item.id),item.archived,now()]).map_err(RelayError::database)?;
    }
    for item in &data.gateways {
        tx.execute("INSERT INTO gateways(id,client_id,name,host,port,username,credential_id,archived,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?9)", params![item.id,item.client_id,item.name,item.host,item.port,item.username,item.credential_id,item.archived,now()]).map_err(RelayError::database)?;
    }
    for item in &data.tags {
        tx.execute(
            "INSERT INTO tags(id,name,color_token) VALUES(?1,?2,?3)",
            params![item.id, item.name, item.color_token],
        )
        .map_err(RelayError::database)?;
    }
    for item in &data.connections {
        tx.execute("INSERT INTO connections(id,client_id,site_id,folder_id,gateway_id,credential_id,name,host,port,username,domain,display,notes,favorite,archived,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?16)", params![item.id,item.client_id,item.site_id,item.folder_id,item.gateway_id,item.credential_id,item.name,item.host,item.port,item.username,item.domain,item.display,item.notes,item.favorite,item.archived,now()]).map_err(RelayError::database)?;
        for tag_id in &item.tag_ids {
            tx.execute(
                "INSERT INTO connection_tags(connection_id,tag_id) VALUES(?1,?2)",
                params![item.id, tag_id],
            )
            .map_err(RelayError::database)?;
        }
    }
    for item in &data.launch_history {
        tx.execute("INSERT INTO launch_history(id,connection_id,occurred_at,adapter,success,category) VALUES(?1,?2,?3,?4,?5,?6)", params![item.id,item.connection_id,item.occurred_at,item.adapter,item.success,item.category]).map_err(RelayError::database)?;
    }
    let violations: i64 = tx
        .query_row("SELECT count(*) FROM pragma_foreign_key_check", [], |row| {
            row.get(0)
        })
        .map_err(RelayError::database)?;
    if violations != 0 {
        return Err(RelayError::validation(
            "The backup contains relationships that cannot be restored.",
        ));
    }
    tx.commit().map_err(RelayError::database)
}

fn protected_rdp_profile(connection: &Connection) -> Result<tempfile::TempPath, RelayError> {
    let mut file = tempfile::Builder::new()
        .prefix("relay-")
        .suffix(".rdp")
        .tempfile()
        .map_err(|_| RelayError {
            code: "temporary_file_error".into(),
            message: "Relay could not create a protected temporary RDP file.".into(),
        })?;
    use std::io::Write;
    file.write_all(serialize_rdp(connection).as_bytes())
        .map_err(|_| RelayError {
            code: "temporary_file_error".into(),
            message: "Relay could not write the temporary RDP file.".into(),
        })?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(file.path(), fs::Permissions::from_mode(0o600)).map_err(|_| {
            RelayError {
                code: "temporary_file_error".into(),
                message: "Relay could not protect the temporary RDP file.".into(),
            }
        })?;
    }
    Ok(file.into_temp_path())
}

fn launch_with_adapter(adapter: &str, connection: &Connection) -> Result<LaunchResult, RelayError> {
    // Windows Remote Desktop accepts the target and display settings as native
    // arguments. Prefer that route so a local policy or a damaged RDP-file
    // handler cannot prevent Relay from starting a connection.
    let profile = (adapter == "macos-open" && !macos_windows_app_available())
        .then(|| protected_rdp_profile(connection))
        .transpose()?;
    let mut command = adapter_command(adapter, connection, profile.as_deref())?;
    let mut child = command.spawn().map_err(|_| RelayError {
        code: "launch_failed".into(),
        message: "Relay could not start the selected RDP client.".into(),
    })?;
    if let Some(profile) = profile {
        // TempPath removes the file on drop. Moving it to this waiter keeps it
        // available until the client has exited and also cleans it if waiting fails.
        std::thread::spawn(move || {
            let _ = child.wait();
            drop(profile);
        });
    }
    Ok(LaunchResult {
        adapter: adapter.into(),
        started: true,
        message: "The RDP client was started.".into(),
    })
}

fn migrate(db: &SqliteConnection) -> Result<(), RelayError> {
    let v: i64 = db
        .pragma_query_value(None, "user_version", |r| r.get(0))
        .map_err(RelayError::database)?;
    if v > LATEST_SCHEMA_VERSION {
        return Err(RelayError {
            code: "unsupported_schema".into(),
            message: "This library was created by a newer Relay version.".into(),
        });
    }
    if v == 0 {
        db.execute_batch("BEGIN;CREATE TABLE clients(id TEXT PRIMARY KEY NOT NULL,name TEXT NOT NULL,notes TEXT NOT NULL DEFAULT '',archived INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL DEFAULT 0,updated_at INTEGER NOT NULL DEFAULT 0,deleted_at INTEGER);CREATE TABLE sites(id TEXT PRIMARY KEY,client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,name TEXT NOT NULL,location TEXT NOT NULL DEFAULT '',notes TEXT NOT NULL DEFAULT '',archived INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,deleted_at INTEGER);CREATE TABLE folders(id TEXT PRIMARY KEY,client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,site_id TEXT REFERENCES sites(id) ON DELETE RESTRICT,parent_id TEXT REFERENCES folders(id) ON DELETE RESTRICT,name TEXT NOT NULL,sort_order INTEGER NOT NULL DEFAULT 0,archived INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,deleted_at INTEGER);CREATE TABLE credentials(id TEXT PRIMARY KEY,client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,label TEXT NOT NULL,username TEXT,domain TEXT,secret_ref TEXT NOT NULL,archived INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,deleted_at INTEGER);CREATE TABLE gateways(id TEXT PRIMARY KEY,client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,name TEXT NOT NULL,host TEXT NOT NULL,port INTEGER NOT NULL DEFAULT 3389,username TEXT,credential_id TEXT REFERENCES credentials(id) ON DELETE RESTRICT,archived INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,deleted_at INTEGER);CREATE TABLE connections(id TEXT PRIMARY KEY NOT NULL,client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,site_id TEXT REFERENCES sites(id) ON DELETE RESTRICT,folder_id TEXT REFERENCES folders(id) ON DELETE RESTRICT,gateway_id TEXT REFERENCES gateways(id) ON DELETE RESTRICT,name TEXT NOT NULL,host TEXT NOT NULL,port INTEGER NOT NULL DEFAULT 3389,username TEXT,domain TEXT,display TEXT NOT NULL DEFAULT '',notes TEXT NOT NULL DEFAULT '',favorite INTEGER NOT NULL DEFAULT 0 CHECK(favorite IN(0,1)),archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN(0,1)),created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,deleted_at INTEGER);CREATE TABLE tags(id TEXT PRIMARY KEY,name TEXT NOT NULL UNIQUE,color_token TEXT NOT NULL DEFAULT 'blue');CREATE TABLE connection_tags(connection_id TEXT NOT NULL REFERENCES connections(id) ON DELETE CASCADE,tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE RESTRICT,PRIMARY KEY(connection_id,tag_id));CREATE TABLE launch_history(id INTEGER PRIMARY KEY AUTOINCREMENT,connection_id TEXT NOT NULL REFERENCES connections(id) ON DELETE RESTRICT,occurred_at INTEGER NOT NULL,adapter TEXT NOT NULL,success INTEGER NOT NULL CHECK(success IN(0,1)),category TEXT);CREATE INDEX connections_search_idx ON connections(archived,client_id,site_id,favorite,name COLLATE NOCASE);CREATE INDEX connection_tags_tag_idx ON connection_tags(tag_id,connection_id);CREATE INDEX launch_history_connection_idx ON launch_history(connection_id,occurred_at DESC);PRAGMA user_version=2;COMMIT;").map_err(RelayError::database)?
    } else if v == 1 {
        // Keep this migration additive: an interrupted upgrade rolls back as a
        // single transaction and the original client/connection rows remain intact.
        db.execute_batch("BEGIN;
          ALTER TABLE clients ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;
          ALTER TABLE clients ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0;
          ALTER TABLE clients ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;
          ALTER TABLE clients ADD COLUMN deleted_at INTEGER;
          CREATE TABLE sites(id TEXT PRIMARY KEY,client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,name TEXT NOT NULL,location TEXT NOT NULL DEFAULT '',notes TEXT NOT NULL DEFAULT '',archived INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,deleted_at INTEGER);
          CREATE TABLE folders(id TEXT PRIMARY KEY,client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,site_id TEXT REFERENCES sites(id) ON DELETE RESTRICT,parent_id TEXT REFERENCES folders(id) ON DELETE RESTRICT,name TEXT NOT NULL,sort_order INTEGER NOT NULL DEFAULT 0,archived INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,deleted_at INTEGER);
          CREATE TABLE credentials(id TEXT PRIMARY KEY,client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,label TEXT NOT NULL,username TEXT,domain TEXT,secret_ref TEXT NOT NULL,archived INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,deleted_at INTEGER);
          CREATE TABLE gateways(id TEXT PRIMARY KEY,client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,name TEXT NOT NULL,host TEXT NOT NULL,port INTEGER NOT NULL DEFAULT 3389,username TEXT,credential_id TEXT REFERENCES credentials(id) ON DELETE RESTRICT,archived INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,deleted_at INTEGER);
          ALTER TABLE connections ADD COLUMN site_id TEXT REFERENCES sites(id) ON DELETE RESTRICT;
          ALTER TABLE connections ADD COLUMN folder_id TEXT REFERENCES folders(id) ON DELETE RESTRICT;
          ALTER TABLE connections ADD COLUMN gateway_id TEXT REFERENCES gateways(id) ON DELETE RESTRICT;
          ALTER TABLE connections ADD COLUMN port INTEGER NOT NULL DEFAULT 3389;
          ALTER TABLE connections ADD COLUMN domain TEXT;
          ALTER TABLE connections ADD COLUMN display TEXT NOT NULL DEFAULT '';
          ALTER TABLE connections ADD COLUMN notes TEXT NOT NULL DEFAULT '';
          ALTER TABLE connections ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0;
          ALTER TABLE connections ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;
          ALTER TABLE connections ADD COLUMN deleted_at INTEGER;
          CREATE TABLE tags(id TEXT PRIMARY KEY,name TEXT NOT NULL UNIQUE,color_token TEXT NOT NULL DEFAULT 'blue');
          CREATE TABLE connection_tags(connection_id TEXT NOT NULL REFERENCES connections(id) ON DELETE CASCADE,tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE RESTRICT,PRIMARY KEY(connection_id,tag_id));
          CREATE TABLE launch_history(id INTEGER PRIMARY KEY AUTOINCREMENT,connection_id TEXT NOT NULL REFERENCES connections(id) ON DELETE RESTRICT,occurred_at INTEGER NOT NULL,adapter TEXT NOT NULL,success INTEGER NOT NULL CHECK(success IN(0,1)),category TEXT);
          CREATE INDEX connections_search_idx ON connections(archived,client_id,site_id,favorite,name COLLATE NOCASE);
          CREATE INDEX connection_tags_tag_idx ON connection_tags(tag_id,connection_id);
          CREATE INDEX launch_history_connection_idx ON launch_history(connection_id,occurred_at DESC);
          PRAGMA user_version=2;
          COMMIT;").map_err(RelayError::database)?;
    } else if v == 2 {
        db.execute_batch("BEGIN;
          ALTER TABLE connections ADD COLUMN credential_id TEXT REFERENCES credentials(id) ON DELETE RESTRICT;
          PRAGMA user_version=3;
          COMMIT;").map_err(RelayError::database)?;
    }
    // A new library was initially created with the Stage 3 schema and is
    // immediately upgraded here so its creation remains one audited path.
    if v == 0 || v == 1 {
        db.execute_batch("BEGIN;
          ALTER TABLE connections ADD COLUMN credential_id TEXT REFERENCES credentials(id) ON DELETE RESTRICT;
          PRAGMA user_version=3;
          COMMIT;").map_err(RelayError::database)?;
    }
    Ok(())
}

macro_rules! command {($name:ident:$result:ty,$method:ident($($arg:ident:$type:ty),*))=>{#[tauri::command]fn $name(library:tauri::State<'_,Library>,$($arg:$type),*)->Result<$result,RelayError>{library.$method($($arg),*)}}}
command!(list_clients:Vec<Client>,list_clients());
command!(save_client:Client,save_client(client:Client));
command!(list_sites:Vec<Site>,list_sites(client_id:Option<String>));
command!(save_site:Site,save_site(item:Site));
command!(list_folders:Vec<Folder>,list_folders(client_id:Option<String>));
command!(save_folder:Folder,save_folder(item:Folder));
command!(list_credentials:Vec<CredentialReference>,list_credentials(client_id:Option<String>));
command!(save_credential:CredentialReference,save_credential(item:CredentialInput));
command!(reveal_credential:String,reveal_credential(credential_id:String));
command!(reassign_credential:(),reassign_credential(request:CredentialReassignment));
command!(credential_store_status:VaultStatus,credential_store_status());
command!(list_gateways:Vec<Gateway>,list_gateways(client_id:Option<String>));
command!(save_gateway:Gateway,save_gateway(item:Gateway));
command!(list_tags:Vec<Tag>,list_tags());
command!(save_tag:Tag,save_tag(item:Tag));
command!(list_connections:Vec<Connection>,list_connections(query:ConnectionQuery));
command!(save_connection:Connection,save_connection(item:Connection));
command!(create_backup:BackupArchive,create_backup());
command!(restore_backup:RestoreResult,restore_backup(archive:BackupArchive));
command!(archive_connections:(),archive_connections(ids:Vec<String>,archived:bool));
command!(set_connection_favorite:(),set_connection_favorite(id:String,favorite:bool));
command!(duplicate_connection:Connection,duplicate_connection(source_id:String,new_id:String,name:String));
command!(record_launch:(),record_launch(connection_id:String,adapter:String,success:bool,category:Option<String>));
command!(list_launch_history:Vec<LaunchHistory>,list_launch_history(connection_id:Option<String>));
command!(review_rdp_import:RdpReview,review_rdp_import(input:RdpImportInput));
command!(commit_rdp_import:Connection,commit_rdp_import(commit:ImportCommit));
command!(export_rdp:String,export_rdp(connection_id:String));
command!(adapter_support:Vec<AdapterSupport>,adapter_support());
command!(launch_connection:LaunchResult,launch_connection(connection_id:String));

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let data_dir = tauri::path::BaseDirectory::AppLocalData;
    tauri::Builder::default()
        .setup(move |app| {
            let path = app.path().resolve("library.sqlite3", data_dir)?;
            std::fs::create_dir_all(path.parent().expect("database path has parent"))?;
            app.manage(Library::open(path).map_err(|e| std::io::Error::other(e.message))?);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_clients,
            save_client,
            list_sites,
            save_site,
            list_folders,
            save_folder,
            list_credentials,
            save_credential,
            reveal_credential,
            reassign_credential,
            credential_store_status,
            list_gateways,
            save_gateway,
            list_tags,
            save_tag,
            list_connections,
            save_connection,
            create_backup,
            restore_backup,
            archive_connections,
            set_connection_favorite,
            duplicate_connection,
            record_launch,
            list_launch_history,
            review_rdp_import,
            commit_rdp_import,
            export_rdp,
            adapter_support,
            launch_connection
        ])
        .run(tauri::generate_context!())
        .expect("error while running Relay")
}

#[cfg(test)]
mod tests {
    use super::*;
    #[cfg(unix)]
    use std::os::unix::fs::PermissionsExt;
    use std::time::{Duration, Instant};
    fn client() -> Client {
        Client {
            id: "client".into(),
            name: "Northwind".into(),
            notes: "".into(),
            archived: false,
        }
    }
    fn connection() -> Connection {
        Connection {
            id: "connection".into(),
            client_id: "client".into(),
            site_id: None,
            folder_id: None,
            gateway_id: None,
            credential_id: None,
            name: "Gateway".into(),
            host: "gateway.example.test".into(),
            port: 3389,
            username: Some("admin".into()),
            domain: None,
            display: "".into(),
            notes: "".into(),
            favorite: true,
            archived: false,
            tag_ids: vec!["prod".into()],
        }
    }
    #[test]
    fn persists_search_tags_and_archive() {
        let l = Library::open(":memory:").unwrap();
        l.save_client(client()).unwrap();
        l.save_tag(Tag {
            id: "prod".into(),
            name: "Production".into(),
            color_token: "red".into(),
        })
        .unwrap();
        l.save_connection(connection()).unwrap();
        assert_eq!(
            l.list_connections(ConnectionQuery {
                text: "production".into(),
                ..Default::default()
            })
            .unwrap()[0]
                .tag_ids,
            vec!["prod"]
        );
        l.archive_connections(vec!["connection".into()], true)
            .unwrap();
        assert!(l
            .list_connections(ConnectionQuery::default())
            .unwrap()
            .is_empty())
    }
    #[test]
    fn foreign_keys_and_history_are_safe() {
        let l = Library::open(":memory:").unwrap();
        assert!(l.save_connection(connection()).is_err());
        l.save_client(client()).unwrap();
        l.save_connection(Connection {
            tag_ids: vec![],
            ..connection()
        })
        .unwrap();
        l.record_launch(
            "connection".into(),
            "test-adapter".into(),
            false,
            Some("client_not_found".into()),
        )
        .unwrap();
        assert_eq!(
            l.list_launch_history(None).unwrap()[0].category.as_deref(),
            Some("client_not_found")
        )
    }

    #[test]
    fn upgrades_a_stage_one_library_without_losing_connections() {
        let path = std::env::temp_dir().join(format!("relay-migration-{}.sqlite3", now()));
        let db = SqliteConnection::open(&path).unwrap();
        db.execute_batch("CREATE TABLE clients(id TEXT PRIMARY KEY NOT NULL,name TEXT NOT NULL,notes TEXT NOT NULL DEFAULT '');CREATE TABLE connections(id TEXT PRIMARY KEY NOT NULL,client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,name TEXT NOT NULL,host TEXT NOT NULL,username TEXT,favorite INTEGER NOT NULL DEFAULT 0,archived INTEGER NOT NULL DEFAULT 0);INSERT INTO clients VALUES('client','Northwind','');INSERT INTO connections VALUES('connection','client','Gateway','gateway.example.test',NULL,0,0);PRAGMA user_version=1;").unwrap();
        drop(db);
        let library = Library::open(&path).unwrap();
        assert_eq!(
            library
                .list_connections(ConnectionQuery::default())
                .unwrap()[0]
                .host,
            "gateway.example.test"
        );
        std::fs::remove_file(path).unwrap();
    }
    #[test]
    fn failed_schema_upgrade_leaves_the_previous_schema_intact() {
        // Simulate an interrupted v2-to-v3 upgrade. SQLite must roll back the
        // transaction rather than leave a half-upgraded library behind.
        let path = std::env::temp_dir().join(format!("relay-rollback-{}.sqlite3", now()));
        let db = SqliteConnection::open(&path).unwrap();
        db.execute_batch(
            "CREATE TABLE clients(id TEXT PRIMARY KEY NOT NULL,name TEXT NOT NULL,notes TEXT NOT NULL DEFAULT '');
             CREATE TABLE connections(id TEXT PRIMARY KEY NOT NULL,client_id TEXT NOT NULL REFERENCES clients(id),name TEXT NOT NULL,host TEXT NOT NULL,credential_id TEXT);
             INSERT INTO clients VALUES('client','Northwind','');
             INSERT INTO connections VALUES('connection','client','Gateway','gateway.example.test',NULL);
             PRAGMA user_version=2;",
        )
        .unwrap();
        drop(db);

        let error = match Library::open(&path) {
            Ok(_) => panic!("the deliberately malformed upgrade must fail"),
            Err(error) => error,
        };
        assert_eq!(error.code, "database_error");
        let db = SqliteConnection::open(&path).unwrap();
        assert_eq!(
            db.pragma_query_value(None, "user_version", |row| row.get::<_, i64>(0))
                .unwrap(),
            2
        );
        assert_eq!(
            db.query_row(
                "SELECT host FROM connections WHERE id='connection'",
                [],
                |row| row.get::<_, String>(0)
            )
            .unwrap(),
            "gateway.example.test"
        );
        drop(db);
        std::fs::remove_file(path).unwrap();
    }
    #[test]
    fn searches_a_ten_thousand_connection_library_within_the_budget() {
        let library = Library::open(":memory:").unwrap();
        library.save_client(client()).unwrap();
        let started = Instant::now();
        {
            let mut db = library.db();
            let transaction = db.transaction().unwrap();
            for index in 0..10_000 {
                transaction
                    .execute(
                        "INSERT INTO connections(id,client_id,name,host,port,display,notes,favorite,archived,created_at,updated_at) VALUES(?1,'client',?2,?3,3389,'','',0,0,0,0)",
                        params![format!("connection-{index}"), format!("Server {index}"), format!("server-{index}.example.test")],
                    )
                    .unwrap();
            }
            transaction.commit().unwrap();
        }
        let matches = library
            .list_connections(ConnectionQuery {
                text: "server-9876.example.test".into(),
                ..Default::default()
            })
            .unwrap();
        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0].id, "connection-9876");
        assert!(
            started.elapsed() < Duration::from_secs(5),
            "10,000-record search exceeded the local five-second budget"
        );
    }
    #[test]
    fn rdp_parser_drops_secrets_and_reports_unknown_settings() {
        let (parsed, warnings, unsupported) = parse_rdp("Production.rdp", "full address:s:server.example.test:3390\nusername:s:CONTOSO\\admin\npassword 51:b:not-a-password\nredirectclipboard:i:1\nscreen mode id:i:2\n").unwrap();
        assert_eq!(parsed.host, "server.example.test");
        assert_eq!(parsed.port, 3390);
        assert_eq!(parsed.display, "Full screen");
        assert!(warnings.iter().any(|item| item.contains("password")));
        assert_eq!(unsupported, vec!["redirectclipboard"]);
    }
    #[test]
    fn rdp_export_has_no_notes_or_secret_fields() {
        let text = serialize_rdp(&Connection {
            notes: "password: do not disclose".into(),
            domain: Some("CONTOSO".into()),
            ..connection()
        });
        assert!(text.contains("full address:s:gateway.example.test:3389"));
        assert!(!text.contains("do not disclose"));
        assert!(!text.to_lowercase().contains("password 51"));
    }
    #[test]
    fn windows_app_link_escapes_the_rdp_target() {
        let connection = Connection {
            host: "[2001:db8::1]".into(),
            port: 3390,
            ..connection()
        };
        assert_eq!(
            rdp_url(&connection),
            "rdp://full%20address=s%3A%5B2001%3Adb8%3A%3A1%5D%3A3390"
        );
    }
    #[test]
    fn temporary_rdp_profile_is_sanitized_protected_and_cleaned_up() {
        let connection = Connection {
            notes: "password: do not disclose".into(),
            ..connection()
        };
        let profile = protected_rdp_profile(&connection).unwrap();
        let path = profile.to_path_buf();
        let text = std::fs::read_to_string(&path).unwrap();
        assert!(text.contains("full address:s:gateway.example.test:3389"));
        assert!(!text.contains("do not disclose"));
        #[cfg(unix)]
        assert_eq!(
            std::fs::metadata(&path).unwrap().permissions().mode() & 0o777,
            0o600
        );
        drop(profile);
        assert!(!path.exists());
    }
    #[test]
    fn launch_commands_use_direct_arguments_and_wait_for_macos_client() {
        let mstsc = adapter_command("mstsc", &connection(), None).unwrap();
        assert_eq!(mstsc.get_program().to_string_lossy(), "mstsc");
        assert_eq!(
            mstsc
                .get_args()
                .map(|arg| arg.to_string_lossy().into_owned())
                .collect::<Vec<_>>(),
            ["/v:gateway.example.test:3389", "/prompt"]
        );
        let profile = protected_rdp_profile(&connection()).unwrap();
        let macos = adapter_command("macos-open", &connection(), Some(profile.as_ref())).unwrap();
        assert_eq!(macos.get_program().to_string_lossy(), "open");
        let macos_args = macos
            .get_args()
            .map(|arg| arg.to_string_lossy().into_owned())
            .collect::<Vec<_>>();
        if macos_windows_app_available() {
            assert_eq!(
                macos_args,
                [
                    "-n",
                    "-a",
                    "Windows App",
                    "--",
                    "rdp://full%20address=s%3Agateway.example.test%3A3389"
                ]
            );
        } else {
            assert_eq!(macos_args[..2], ["-W", "--"]);
        }
        let freerdp = adapter_command("xfreerdp", &connection(), None).unwrap();
        assert_eq!(freerdp.get_program().to_string_lossy(), "xfreerdp");
        assert_eq!(
            freerdp
                .get_args()
                .map(|arg| arg.to_string_lossy().into_owned())
                .collect::<Vec<_>>(),
            ["/v:gateway.example.test:3389", "/u:admin"]
        );
    }
    #[test]
    fn secret_canary_never_enters_library_or_export() {
        let canary = "relay-stage-four-canary-7af8";
        let library = Library::open(":memory:").unwrap();
        library.save_client(client()).unwrap();
        // The database stores a deterministic opaque locator, never password bytes.
        library.db().execute("INSERT INTO credentials(id,client_id,label,secret_ref,archived,created_at,updated_at) VALUES(?1,'client','Admin','vault:credential',0,0,0)", ["credential"]).unwrap();
        library
            .save_connection(Connection {
                tag_ids: vec![],
                ..connection()
            })
            .unwrap();
        let dump: String = library
            .db()
            .query_row(
                "SELECT group_concat(secret_ref) FROM credentials",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert!(!dump.contains(canary));
        assert!(!serialize_rdp(&connection()).contains(canary));
        assert_eq!(
            redact_diagnostic(&format!("launch failed: {canary}"), canary),
            "launch failed: [REDACTED]"
        );
    }
    #[test]
    fn backup_round_trip_is_checked_and_never_contains_a_password() {
        let library = Library::open(":memory:").unwrap();
        library.save_client(client()).unwrap();
        library
            .save_tag(Tag {
                id: "prod".into(),
                name: "Production".into(),
                color_token: "red".into(),
            })
            .unwrap();
        library.save_connection(connection()).unwrap();
        let archive = library.create_backup().unwrap();
        let text = serde_json::to_string(&archive).unwrap();
        assert!(text.contains("sha256:"));
        assert!(!text.contains("relay-stage-four-canary-7af8"));
        library
            .archive_connections(vec!["connection".into()], true)
            .unwrap();
        let result = library.restore_backup(archive).unwrap();
        assert_eq!(result.restored_connections, 1);
        assert!(!result.credential_passwords_restored);
        assert_eq!(
            library
                .list_connections(ConnectionQuery::default())
                .unwrap()
                .len(),
            1
        );
    }
    #[test]
    fn corrupt_backup_is_rejected_before_replacing_library() {
        let library = Library::open(":memory:").unwrap();
        library.save_client(client()).unwrap();
        let mut archive = library.create_backup().unwrap();
        archive.data.clients[0].name = "Altered".into();
        assert!(library.restore_backup(archive).is_err());
        assert_eq!(library.list_clients().unwrap()[0].name, "Northwind");
    }
    #[test]
    fn parser_accepts_adversarial_lines_without_panic_or_secret_retention() {
        let repeated = "full address:s:host\n".repeat(1000);
        for content in [
            "",
            "full address:s:host\npassword 51:b:canary",
            "full address:s:host\n:\n\0",
            &repeated,
        ] {
            let result = std::panic::catch_unwind(|| parse_rdp("safe.rdp", content));
            assert!(result.is_ok());
            if let Ok(Ok((parsed, _, _))) = result {
                assert!(!parsed.host.contains("canary"));
            }
        }
    }
}
