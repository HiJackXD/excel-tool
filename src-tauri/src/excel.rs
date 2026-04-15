use calamine::{open_workbook_auto, Data, Range, Reader};
use rust_xlsxwriter::Workbook;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use std::sync::Mutex;

/// Column metadata sent to the frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnInfo {
    pub key: String,
    pub title: String,
    pub index: usize,
}

/// A page of rows returned to the frontend
#[derive(Debug, Serialize)]
pub struct PageResult {
    pub rows: Vec<HashMap<String, String>>,
    pub total: usize,
    pub page: usize,
    pub page_size: usize,
}

/// Result of opening a file
#[derive(Debug, Serialize)]
pub struct OpenResult {
    pub file_name: String,
    pub sheet_names: Vec<String>,
    pub columns: Vec<ColumnInfo>,
    pub total_rows: usize,
}

/// Holds all parsed data for the currently opened workbook.
/// Each sheet is stored as: headers + rows of string values.
pub struct ExcelState {
    pub file_name: String,
    pub sheet_names: Vec<String>,
    /// sheet_name -> (headers, rows)
    pub sheets: HashMap<String, SheetData>,
    pub active_sheet: String,
}

pub struct SheetData {
    pub headers: Vec<String>,
    pub rows: Vec<Vec<String>>,
}

impl Default for ExcelState {
    fn default() -> Self {
        Self {
            file_name: String::new(),
            sheet_names: Vec::new(),
            sheets: HashMap::new(),
            active_sheet: String::new(),
        }
    }
}

pub type ExcelStateMutex = Mutex<ExcelState>;

/// Convert a calamine Data cell to a display string
fn cell_to_string(cell: &Data) -> String {
    match cell {
        Data::Empty => String::new(),
        Data::String(s) => s.clone(),
        Data::Float(f) => {
            if *f == (*f as i64) as f64 {
                format!("{}", *f as i64)
            } else {
                format!("{}", f)
            }
        }
        Data::Int(i) => format!("{}", i),
        Data::Bool(b) => format!("{}", b),
        Data::DateTime(dt) => format!("{}", dt),
        Data::DateTimeIso(s) => s.clone(),
        Data::DurationIso(s) => s.clone(),
        Data::Error(e) => format!("{:?}", e),
    }
}

/// Parse a single sheet range into SheetData
fn parse_range(range: &Range<Data>) -> SheetData {
    let height = range.height();
    if height == 0 {
        return SheetData {
            headers: Vec::new(),
            rows: Vec::new(),
        };
    }

    // First row = headers
    let headers: Vec<String> = range
        .rows()
        .next()
        .map(|row| row.iter().map(cell_to_string).collect())
        .unwrap_or_default();

    // Remaining rows = data
    let rows: Vec<Vec<String>> = range
        .rows()
        .skip(1)
        .map(|row| {
            let mut cells: Vec<String> = row.iter().map(cell_to_string).collect();
            // Pad if row is shorter than headers
            while cells.len() < headers.len() {
                cells.push(String::new());
            }
            cells
        })
        .collect();

    SheetData { headers, rows }
}

/// Open a workbook file and parse all sheets
pub fn open_file(path: &str) -> Result<ExcelState, String> {
    let path_buf = PathBuf::from(path);
    let file_name = path_buf
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();

    let mut workbook = open_workbook_auto(&path_buf).map_err(|e| format!("无法打开文件: {}", e))?;

    let sheet_names = workbook.sheet_names().to_vec();
    let mut sheets = HashMap::new();

    for name in &sheet_names {
        if let Ok(range) = workbook.worksheet_range(name) {
            sheets.insert(name.clone(), parse_range(&range));
        }
    }

    let active_sheet = sheet_names.first().cloned().unwrap_or_default();

    Ok(ExcelState {
        file_name,
        sheet_names,
        sheets,
        active_sheet,
    })
}

/// Get a page of (optionally filtered) rows from the active sheet
pub fn get_page(
    state: &ExcelState,
    sheet_name: &str,
    page: usize,
    page_size: usize,
    selected_columns: &[String],
    filters: &HashMap<String, Vec<String>>,
) -> PageResult {
    let empty = SheetData {
        headers: Vec::new(),
        rows: Vec::new(),
    };
    let sheet = state.sheets.get(sheet_name).unwrap_or(&empty);

    // Build header index map
    let header_idx: HashMap<&str, usize> = sheet
        .headers
        .iter()
        .enumerate()
        .map(|(i, h)| (h.as_str(), i))
        .collect();

    // Determine which column indices to include
    let col_indices: Vec<usize> = if selected_columns.is_empty() {
        (0..sheet.headers.len()).collect()
    } else {
        selected_columns
            .iter()
            .filter_map(|key| header_idx.get(key.as_str()).copied())
            .collect()
    };

    // Filter rows
    let filtered: Vec<&Vec<String>> = sheet
        .rows
        .iter()
        .filter(|row| {
            filters.iter().all(|(col, allowed)| {
                if let Some(&idx) = header_idx.get(col.as_str()) {
                    let val = row.get(idx).map(|s| s.as_str()).unwrap_or("");
                    allowed.iter().any(|a| a == val)
                } else {
                    true
                }
            })
        })
        .collect();

    let total = filtered.len();
    let start = page * page_size;
    let end = (start + page_size).min(total);

    let rows: Vec<HashMap<String, String>> = if start < total {
        filtered[start..end]
            .iter()
            .map(|row| {
                let mut map = HashMap::new();
                for &ci in &col_indices {
                    if ci < sheet.headers.len() {
                        let key = &sheet.headers[ci];
                        let val = row.get(ci).cloned().unwrap_or_default();
                        map.insert(key.clone(), val);
                    }
                }
                map
            })
            .collect()
    } else {
        Vec::new()
    };

    PageResult {
        rows,
        total,
        page,
        page_size,
    }
}

/// Get unique values for a specific column (for filter dropdowns)
pub fn get_unique_values(
    state: &ExcelState,
    sheet_name: &str,
    column_key: &str,
    filters: &HashMap<String, Vec<String>>,
) -> Vec<String> {
    let empty = SheetData {
        headers: Vec::new(),
        rows: Vec::new(),
    };
    let sheet = state.sheets.get(sheet_name).unwrap_or(&empty);

    let header_idx: HashMap<&str, usize> = sheet
        .headers
        .iter()
        .enumerate()
        .map(|(i, h)| (h.as_str(), i))
        .collect();

    let target_idx = match header_idx.get(column_key) {
        Some(&idx) => idx,
        None => return Vec::new(),
    };

    // Apply other filters (exclude the target column's own filter)
    let other_filters: HashMap<String, Vec<String>> = filters
        .iter()
        .filter(|(k, _)| k.as_str() != column_key)
        .map(|(k, v)| (k.clone(), v.clone()))
        .collect();

    let mut values = HashSet::new();
    for row in &sheet.rows {
        let passes = other_filters.iter().all(|(col, allowed)| {
            if let Some(&idx) = header_idx.get(col.as_str()) {
                let val = row.get(idx).map(|s| s.as_str()).unwrap_or("");
                allowed.iter().any(|a| a == val)
            } else {
                true
            }
        });
        if passes {
            let val = row.get(target_idx).cloned().unwrap_or_default();
            values.insert(val);
        }
    }

    let mut result: Vec<String> = values.into_iter().collect();
    result.sort();
    result
}

/// Export filtered data to a new xlsx file
pub fn export_data(
    state: &ExcelState,
    sheet_name: &str,
    selected_columns: &[String],
    filters: &HashMap<String, Vec<String>>,
    output_path: &str,
) -> Result<(), String> {
    let empty = SheetData {
        headers: Vec::new(),
        rows: Vec::new(),
    };
    let sheet = state.sheets.get(sheet_name).unwrap_or(&empty);

    let header_idx: HashMap<&str, usize> = sheet
        .headers
        .iter()
        .enumerate()
        .map(|(i, h)| (h.as_str(), i))
        .collect();

    let col_indices: Vec<usize> = if selected_columns.is_empty() {
        (0..sheet.headers.len()).collect()
    } else {
        selected_columns
            .iter()
            .filter_map(|key| header_idx.get(key.as_str()).copied())
            .collect()
    };

    // Filter rows
    let filtered: Vec<&Vec<String>> = sheet
        .rows
        .iter()
        .filter(|row| {
            filters.iter().all(|(col, allowed)| {
                if let Some(&idx) = header_idx.get(col.as_str()) {
                    let val = row.get(idx).map(|s| s.as_str()).unwrap_or("");
                    allowed.iter().any(|a| a == val)
                } else {
                    true
                }
            })
        })
        .collect();

    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();

    // Write headers
    for (ci, &col_idx) in col_indices.iter().enumerate() {
        if col_idx < sheet.headers.len() {
            worksheet
                .write_string(0, ci as u16, &sheet.headers[col_idx])
                .map_err(|e| format!("写入表头失败: {}", e))?;
        }
    }

    // Write data rows
    for (ri, row) in filtered.iter().enumerate() {
        for (ci, &col_idx) in col_indices.iter().enumerate() {
            let val = row.get(col_idx).map(|s| s.as_str()).unwrap_or("");
            worksheet
                .write_string((ri + 1) as u32, ci as u16, val)
                .map_err(|e| format!("写入数据失败: {}", e))?;
        }
    }

    workbook
        .save(output_path)
        .map_err(|e| format!("保存文件失败: {}", e))?;

    Ok(())
}
