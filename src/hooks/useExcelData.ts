import { useState, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import type { ColumnInfo, RowData } from '../types';

export function useExcelData() {
  const [fileName, setFileName] = useState<string>('');
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [rows, setRows] = useState<RowData[]>([]);
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[]>([]);
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);

  const parseSheet = useCallback((wb: XLSX.WorkBook, sheetName: string) => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;

    const jsonData = XLSX.utils.sheet_to_json<RowData>(ws, { defval: '' });
    if (jsonData.length === 0) {
      setColumns([]);
      setRows([]);
      setSelectedColumnKeys([]);
      setFilters({});
      return;
    }

    // Extract columns from headers
    const headers = Object.keys(jsonData[0]);
    const cols: ColumnInfo[] = headers.map((header, index) => ({
      key: header,
      title: header,
      index,
    }));

    setColumns(cols);
    setRows(jsonData);
    setSelectedColumnKeys(headers);
    setFilters({});
    setActiveSheet(sheetName);
  }, []);

  const loadFile = useCallback((file: File) => {
    setLoading(true);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });

        setWorkbook(wb);
        setSheetNames(wb.SheetNames);

        // Parse first sheet by default
        if (wb.SheetNames.length > 0) {
          parseSheet(wb, wb.SheetNames[0]);
        }
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [parseSheet]);

  const switchSheet = useCallback((sheetName: string) => {
    if (workbook) {
      parseSheet(workbook, sheetName);
    }
  }, [workbook, parseSheet]);

  const updateFilter = useCallback((column: string, values: string[]) => {
    setFilters(prev => {
      const next = { ...prev };
      if (values.length === 0) {
        delete next[column];
      } else {
        next[column] = values;
      }
      return next;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({});
  }, []);

  // Compute visible columns based on selection
  const visibleColumns = useMemo(() => {
    return columns.filter(col => selectedColumnKeys.includes(col.key));
  }, [columns, selectedColumnKeys]);

  // Compute filtered rows
  const filteredRows = useMemo(() => {
    if (Object.keys(filters).length === 0) return rows;

    return rows.filter(row => {
      return Object.entries(filters).every(([column, allowedValues]) => {
        const cellValue = String(row[column] ?? '');
        return allowedValues.includes(cellValue);
      });
    });
  }, [rows, filters]);

  // Get unique values for a column (for filter dropdowns)
  const getColumnUniqueValues = useCallback((columnKey: string): string[] => {
    const valueSet = new Set<string>();
    rows.forEach(row => {
      valueSet.add(String(row[columnKey] ?? ''));
    });
    return Array.from(valueSet).sort();
  }, [rows]);

  // Export filtered & selected data
  const exportData = useCallback(() => {
    if (filteredRows.length === 0 || visibleColumns.length === 0) return;

    const exportRows = filteredRows.map(row => {
      const newRow: RowData = {};
      visibleColumns.forEach(col => {
        newRow[col.key] = row[col.key];
      });
      return newRow;
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    const baseName = fileName.replace(/\.[^/.]+$/, '');
    XLSX.writeFile(wb, `${baseName}_exported.xlsx`);
  }, [filteredRows, visibleColumns, fileName]);

  const reset = useCallback(() => {
    setFileName('');
    setColumns([]);
    setRows([]);
    setSelectedColumnKeys([]);
    setFilters({});
    setSheetNames([]);
    setActiveSheet('');
    setWorkbook(null);
  }, []);

  return {
    fileName,
    columns,
    rows,
    selectedColumnKeys,
    setSelectedColumnKeys,
    filters,
    updateFilter,
    clearAllFilters,
    visibleColumns,
    filteredRows,
    getColumnUniqueValues,
    loading,
    sheetNames,
    activeSheet,
    switchSheet,
    loadFile,
    exportData,
    reset,
  };
}
