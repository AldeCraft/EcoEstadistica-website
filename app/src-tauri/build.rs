fn main() {
    // Registra los comandos propios para poder darles permisos en capabilities/*.json.
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .app_manifest(tauri_build::AppManifest::new().commands(&["save_file", "show_menu"])),
    )
    .expect("error al ejecutar tauri-build");
}
