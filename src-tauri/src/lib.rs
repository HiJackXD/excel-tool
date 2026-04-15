mod commands;
mod excel;

use excel::ExcelState;
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Mutex::new(ExcelState::default()))
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::open_file,
            commands::switch_sheet,
            commands::get_page,
            commands::get_unique_values,
            commands::export_data,
            commands::close_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
