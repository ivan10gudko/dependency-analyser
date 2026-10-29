mod fs_scan;

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use fs_scan::{collect_source_files, FileInfo};
use serde::Serialize;
use tauri::State;
use tauri_plugin_dialog::DialogExt;

#[derive(Default)]
struct ProjectSession(Mutex<Option<PathBuf>>);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectRoot {
    root_path: String,
}

#[derive(Debug, thiserror::Error)]
enum Error {
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error("failed to parse as string: {0}")]
    Utf8(#[from] std::str::Utf8Error),
    #[error("file selection was cancelled")]
    DialogCancelled,
    #[error(transparent)]
    Fs(#[from] tauri_plugin_fs::Error),
    #[error("no project folder has been selected")]
    ProjectRootNotSet,
    #[error("path is outside the selected project")]
    PathOutsideProject,
    #[error("path is not a file")]
    NotAFile,
}

/// JSON shape sent to the frontend when `invoke` fails.
#[derive(Serialize)]
#[serde(tag = "kind", content = "message")]
#[serde(rename_all = "camelCase")]
enum ErrorKind {
    Io(String),
    Utf8(String),
    DialogCancelled(String),
    Fs(String),
    ProjectRootNotSet(String),
    PathOutsideProject(String),
    NotAFile(String),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        let error_message = self.to_string();
        let error_kind = match self {
            Self::Io(_) => ErrorKind::Io(error_message),
            Self::Utf8(_) => ErrorKind::Utf8(error_message),
            Self::DialogCancelled => ErrorKind::DialogCancelled(error_message),
            Self::Fs(_) => ErrorKind::Fs(error_message),
            Self::ProjectRootNotSet => ErrorKind::ProjectRootNotSet(error_message),
            Self::PathOutsideProject => ErrorKind::PathOutsideProject(error_message),
            Self::NotAFile => ErrorKind::NotAFile(error_message),
        };
        error_kind.serialize(serializer)
    }
}

fn project_root(session: &ProjectSession) -> Result<PathBuf, Error> {
    session
        .0
        .lock()
        .map_err(|_| {
            std::io::Error::new(std::io::ErrorKind::Other, "project session lock poisoned")
        })?
        .clone()
        .ok_or(Error::ProjectRootNotSet)
}

fn path_is_under_root(file: &Path, root: &Path) -> bool {
    if file.starts_with(root) {
        return true;
    }

    let file_components: Vec<_> = file.components().collect();
    let root_components: Vec<_> = root.components().collect();
    if file_components.len() < root_components.len() {
        return false;
    }

    file_components
        .iter()
        .zip(root_components.iter())
        .all(|(file_part, root_part)| file_part == root_part)
}

fn resolve_project_file(session: &ProjectSession, path: &str) -> Result<PathBuf, Error> {
    let root = project_root(session)?;
    let canonical_root = fs::canonicalize(&root)?;
    let canonical_file = fs::canonicalize(path)?;

    if !path_is_under_root(&canonical_file, &canonical_root) {
        return Err(Error::PathOutsideProject);
    }

    if !canonical_file.is_file() {
        return Err(Error::NotAFile);
    }

    Ok(canonical_file)
}

#[tauri::command]
async fn pick_project_folder(
    app: tauri::AppHandle,
    session: State<'_, ProjectSession>,
) -> Result<ProjectRoot, Error> {
    let Some(selected) = app.dialog().file().blocking_pick_folder() else {
        return Err(Error::DialogCancelled);
    };

    let folder_path: PathBuf = selected.into_path()?;
    let canonical_root = fs::canonicalize(&folder_path)?;

    *session
        .0
        .lock()
        .map_err(|_| {
            std::io::Error::new(std::io::ErrorKind::Other, "project session lock poisoned")
        })? = Some(canonical_root.clone());

    Ok(ProjectRoot {
        root_path: canonical_root.to_string_lossy().into_owned(),
    })
}

#[tauri::command]
fn list_project_files(session: State<'_, ProjectSession>) -> Result<Vec<FileInfo>, Error> {
    let root = project_root(&session)?;
    Ok(collect_source_files(&root))
}

#[tauri::command]
fn read_file(session: State<'_, ProjectSession>, path: String) -> Result<String, Error> {
    let file_path = resolve_project_file(&session, &path)?;
    Ok(fs::read_to_string(&file_path)?)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(ProjectSession::default())
        .invoke_handler(tauri::generate_handler![
            pick_project_folder,
            list_project_files,
            read_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
