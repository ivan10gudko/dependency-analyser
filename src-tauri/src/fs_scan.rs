use std::collections::HashSet;
use std::fs;
use std::path::Path;

use serde::Serialize;

const SOURCE_EXTENSIONS: &[&str] = &[".ts", ".tsx", ".js", ".jsx"];

const SKIP_DIR_NAMES: &[&str] = &["node_modules", ".git", ".next", "dist", "build", "coverage"];

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
}

fn is_source_file(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| {
            let dotted = format!(".{}", ext.to_lowercase());
            SOURCE_EXTENSIONS.contains(&dotted.as_str())
        })
        .unwrap_or(false)
}

pub fn collect_source_files(root: &Path) -> Vec<FileInfo> {
    let skip_dirs: HashSet<&str> = SKIP_DIR_NAMES.iter().copied().collect();
    let mut stack = vec![root.to_path_buf()];
    let mut files = Vec::new();

    while let Some(dir) = stack.pop() {
        let entries = match fs::read_dir(&dir) {
            Ok(entries) => entries,
            Err(_) => continue,
        };

        for entry in entries.flatten() {
            let path = entry.path();
            let file_type = match entry.file_type() {
                Ok(file_type) => file_type,
                Err(_) => continue,
            };

            if file_type.is_symlink() {
                continue;
            }

            if file_type.is_dir() {
                let Some(name) = path.file_name().and_then(|n| n.to_str()) else {
                    continue;
                };
                if skip_dirs.contains(name) {
                    continue;
                }
                stack.push(path);
                continue;
            }

            if file_type.is_file() && is_source_file(&path) {
                let name = path
                    .file_name()
                    .map(|n| n.to_string_lossy().into_owned())
                    .unwrap_or_default();
                let path = path.to_string_lossy().into_owned();
                files.push(FileInfo { name, path });
            }
        }
    }

    files.sort_by(|a, b| a.path.cmp(&b.path));
    files
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn write_file(path: &Path, content: &str) {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).unwrap();
        }
        fs::write(path, content).unwrap();
    }

    #[test]
    fn collects_nested_source_files() {
        let root = std::env::temp_dir().join(format!("dep_analyser_scan_{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        write_file(&root.join("src/a.ts"), "export {}");
        write_file(&root.join("src/lib/b.tsx"), "export {}");
        write_file(&root.join("index.js"), "console.log(1)");
        write_file(&root.join("readme.md"), "# hi");

        let files = collect_source_files(&root);
        let paths: Vec<_> = files.iter().map(|f| f.path.as_str()).collect();

        assert_eq!(files.len(), 3);
        assert!(paths.iter().any(|p| p.ends_with("src/a.ts")));
        assert!(paths.iter().any(|p| p.ends_with("src/lib/b.tsx")));
        assert!(paths.iter().any(|p| p.ends_with("index.js")));

        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn skips_common_directories() {
        let root = std::env::temp_dir().join(format!("dep_analyser_skip_{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        write_file(&root.join("app.ts"), "export {}");
        write_file(&root.join("node_modules/pkg/index.ts"), "export {}");
        write_file(&root.join(".git/hooks/pre-commit.js"), "// hook");

        let files = collect_source_files(&root);

        assert_eq!(files.len(), 1);
        assert!(files[0].path.ends_with("app.ts"));

        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn empty_directory_returns_empty_list() {
        let root = std::env::temp_dir().join(format!("dep_analyser_empty_{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();

        assert!(collect_source_files(&root).is_empty());

        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn does_not_follow_symlinked_directories() {
        let root =
            std::env::temp_dir().join(format!("dep_analyser_symlink_{}", std::process::id()));
        let outside =
            std::env::temp_dir().join(format!("dep_analyser_outside_{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        let _ = fs::remove_dir_all(&outside);

        write_file(&outside.join("secret.ts"), "export {}");
        fs::create_dir_all(&root).unwrap();
        #[cfg(unix)]
        {
            use std::os::unix::fs::symlink;
            symlink(&outside, root.join("linked")).unwrap();
        }

        write_file(&root.join("local.ts"), "export {}");
        let files = collect_source_files(&root);
        let paths: Vec<_> = files.iter().map(|f| f.path.as_str()).collect();

        #[cfg(unix)]
        {
            assert_eq!(files.len(), 1);
            assert!(paths.iter().any(|p| p.ends_with("local.ts")));
            assert!(!paths.iter().any(|p| p.ends_with("secret.ts")));
        }
        #[cfg(not(unix))]
        {
            let _ = paths;
        }

        let _ = fs::remove_dir_all(&root);
        let _ = fs::remove_dir_all(&outside);
    }
}
