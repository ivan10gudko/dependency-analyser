mod fs_scan;

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};

use fs_scan::{FileInfo, collect_source_files};
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

    *session.0.lock().map_err(|_| {
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

async fn map_concurrent<T, R, F>(items: Vec<T>, concurrency: usize, f: F) -> Result<Vec<R>, Error>
where
    T: Send + 'static,
    R: Send + 'static,
    F: Fn(T) -> Result<R, Error> + Send + Sync + 'static,
{
    let len = items.len();
    if len == 0 {
        return Ok(Vec::new());
    }

    let workers = concurrency.max(1).min(len);
    let f = Arc::new(f);
    let slots: Arc<Vec<Mutex<Option<T>>>> = Arc::new(
        items
            .into_iter()
            .map(|item| Mutex::new(Some(item)))
            .collect(),
    );
    let next = Arc::new(AtomicUsize::new(0));
    let mut handles = Vec::with_capacity(workers);

    for _ in 0..workers {
        let slots = Arc::clone(&slots);
        let next = Arc::clone(&next);
        let f = Arc::clone(&f);
        handles.push(tauri::async_runtime::spawn_blocking(move || {
            let mut local = Vec::new();
            loop {
                let index = next.fetch_add(1, Ordering::Relaxed);
                if index >= len {
                    break;
                }
                let item = slots[index]
                    .lock()
                    .map_err(|_| {
                        std::io::Error::new(std::io::ErrorKind::Other, "map lock poisoned")
                    })?
                    .take()
                    .expect("item taken once");
                local.push((index, f(item)?));
            }
            Ok(local)
        }));
    }

    let mut indexed = Vec::with_capacity(len);
    let mut first_error = None;
    for handle in handles {
        let finished = match handle.await {
            Ok(finished) => finished,
            Err(err) => Err(Error::Io(std::io::Error::other(err.to_string()))),
        };
        match finished {
            Ok(part) => indexed.extend(part),
            Err(err) if first_error.is_none() => first_error = Some(err),
            Err(_) => {}
        }
    }
    if let Some(err) = first_error {
        return Err(err);
    }

    indexed.sort_by_key(|(index, _)| *index);
    Ok(indexed.into_iter().map(|(_, value)| value).collect())
}

#[tauri::command]
async fn read_file_concurrently(
    session: State<'_, ProjectSession>,
    paths: Vec<String>,
) -> Result<Vec<String>, Error> {
    let file_paths = paths
        .iter()
        .map(|path| resolve_project_file(&session, path))
        .collect::<Result<Vec<_>, _>>()?;
    let contents = map_concurrent(file_paths, 40, |path| {
        fs::read_to_string(path).map_err(Error::from)
    })
    .await?;
    Ok(contents)
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
            read_file_concurrently,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn map_concurrent_preserves_order() {
        let values: Vec<u32> = (0..100).collect();
        let results =
            tauri::async_runtime::block_on(map_concurrent(values, 8, |n| Ok::<_, Error>(n * 2)))
                .unwrap();

        assert_eq!(results, (0..100).map(|n| n * 2).collect::<Vec<_>>());
    }
}
