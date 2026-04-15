export interface ColumnInfo {
  key: string;
  title: string;
  index: number;
}

export interface FilterCondition {
  column: string;
  values: string[];
}

export type RowData = Record<string, unknown>;
