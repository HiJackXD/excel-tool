export interface ColumnInfo {
  key: string;
  title: string;
  index: number;
}

export type RowData = Record<string, string>;

export interface OpenResult {
  file_name: string;
  sheet_names: string[];
  columns: ColumnInfo[];
  total_rows: number;
}

export interface PageResult {
  rows: RowData[];
  total: number;
  page: number;
  page_size: number;
}
