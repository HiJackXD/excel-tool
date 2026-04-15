use crate::excel::{self, ColumnInfo, ExcelStateMutex, OpenResult, PageResult};
use std::collections::HashMap;
use tauri::State;

#[tauri::command]
pub fn open_file(path: String, state: State<'_, ExcelStateMutex>) -> Result<OpenResult, String> {
    let excel_state = excel::open_file(&path)?;

    let active = excel_state.active_sheet.clone();
    let sheet = excel_state
        .sheets
        .get(&active)
        .ok_or("Sheet not found")?;

    let columns: Vec<ColumnInfo> = sheet
        .headers
        .iter()
        .enumerate()
        .map(|(i, h)| ColumnInfo {
            key: h.clone(),
            title: h.clone(),
            index: i,
        })
        .collect();
    let total_rows = sheet.rows.len();
    let file_name = excel_state.file_name.clone();
    let sheet_names = excel_state.sheet_names.clone();

    let mut locked = state.lock().map_err(|e| format!("锁定状态失败: {}", e))?;
    *locked = excel_state;

    Ok(OpenResult {
        file_name,
        sheet_names,
        columns,
        total_rows,
    })
}

#[tauri::command]
pub fn switch_sheet(
    sheet_name: String,
    state: State<'_, ExcelStateMutex>,
) -> Result<(Vec<ColumnInfo>, usize), String> {
    let locked = state.lock().map_err(|e| format!("锁定状态失败: {}", e))?;

    let sheet = locked
        .sheets
        .get(&sheet_name)
        .ok_or("Sheet not found")?;

    let columns: Vec<ColumnInfo> = sheet
        .headers
        .iter()
        .enumerate()
        .map(|(i, h)| ColumnInfo {
            key: h.clone(),
            title: h.clone(),
            index: i,
        })
        .collect();
    let total_rows = sheet.rows.len();

    Ok((columns, total_rows))
}

#[tauri::command]
pub fn get_page(
    sheet_name: String,
    page: usize,
    page_size: usize,
    selected_columns: Vec<String>,
    filters: HashMap<String, Vec<String>>,
    state: State<'_, ExcelStateMutex>,
) -> Result<PageResult, String> {
    let locked = state.lock().map_err(|e| format!("锁定状态失败: {}", e))?;
    Ok(excel::get_page(
        &locked,
        &sheet_name,
        page,
        page_size,
        &selected_columns,
        &filters,
    ))
}

#[tauri::command]
pub fn get_unique_values(
    sheet_name: String,
    column_key: String,
    filters: HashMap<String, Vec<String>>,
    state: State<'_, ExcelStateMutex>,
) -> Result<Vec<String>, String> {
    let locked = state.lock().map_err(|e| format!("锁定状态失败: {}", e))?;
    Ok(excel::get_unique_values(
        &locked,
        &sheet_name,
        &column_key,
        &filters,
    ))
}

#[tauri::command]
pub fn export_data(
    sheet_name: String,
    selected_columns: Vec<String>,
    filters: HashMap<String, Vec<String>>,
    output_path: String,
    state: State<'_, ExcelStateMutex>,
) -> Result<(), String> {
    let locked = state.lock().map_err(|e| format!("锁定状态失败: {}", e))?;
    excel::export_data(
        &locked,
        &sheet_name,
        &selected_columns,
        &filters,
        &output_path,
    )
}

#[tauri::command]
pub fn close_file(state: State<'_, ExcelStateMutex>) -> Result<(), String> {
    let mut locked = state.lock().map_err(|e| format!("锁定状态失败: {}", e))?;
    *locked = excel::ExcelState::default();
    Ok(())
}
