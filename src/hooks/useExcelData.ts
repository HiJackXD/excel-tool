import { useState, useCallback, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import type { ColumnInfo, RowData, OpenResult, PageResult } from '../types';

export function useExcelData() {
  const [fileName, setFileName] = useState('');
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[]>([]);
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState('');
  const [totalRows, setTotalRows] = useState(0);

  // Current page data
  const [pageRows, setPageRows] = useState<RowData[]>([]);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);

  // Fetch a page of data from Rust backend
  const fetchPage = useCallback(
    async (
      sheet: string,
      page: number,
      size: number,
      selCols: string[],
      currentFilters: Record<string, string[]>
    ) => {
      const result = await invoke<PageResult>('get_page', {
        sheetName: sheet,
        page,
        pageSize: size,
        selectedColumns: selCols,
        filters: currentFilters,
      });
      setPageRows(result.rows);
      setFilteredTotal(result.total);
      setCurrentPage(result.page);
    },
    []
  );

  // Open file via Tauri dialog
  const openFile = useCallback(async () => {
    const selected = await open({
      multiple: false,
      filters: [
        { name: 'Excel', extensions: ['xlsx', 'xls', 'csv'] },
      ],
    });
    if (!selected) return;

    setLoading(true);
    try {
      const result = await invoke<OpenResult>('open_file', {
        path: selected,
      });
      setFileName(result.file_name);
      setSheetNames(result.sheet_names);
      setColumns(result.columns);
      setTotalRows(result.total_rows);
      const allKeys = result.columns.map((c) => c.key);
      setSelectedColumnKeys(allKeys);
      setFilters({});
      setActiveSheet(result.sheet_names[0] || '');
      setCurrentPage(0);

      // Fetch first page
      await fetchPage(result.sheet_names[0] || '', 0, pageSize, allKeys, {});
    } finally {
      setLoading(false);
    }
  }, [fetchPage, pageSize]);

  // Switch sheet
  const switchSheet = useCallback(
    async (sheetName: string) => {
      setLoading(true);
      try {
        const [cols, total] = await invoke<[ColumnInfo[], number]>('switch_sheet', {
          sheetName,
        });
        setColumns(cols);
        setTotalRows(total);
        const allKeys = cols.map((c) => c.key);
        setSelectedColumnKeys(allKeys);
        setFilters({});
        setActiveSheet(sheetName);
        setCurrentPage(0);

        await fetchPage(sheetName, 0, pageSize, allKeys, {});
      } finally {
        setLoading(false);
      }
    },
    [fetchPage, pageSize]
  );

  // Page change
  const onPageChange = useCallback(
    async (page: number, size: number) => {
      setPageSize(size);
      await fetchPage(activeSheet, page, size, selectedColumnKeys, filters);
    },
    [activeSheet, selectedColumnKeys, filters, fetchPage]
  );

  // Update filters
  const updateFilter = useCallback(
    async (column: string, values: string[]) => {
      const next = { ...filters };
      if (values.length === 0) {
        delete next[column];
      } else {
        next[column] = values;
      }
      setFilters(next);
      setCurrentPage(0);
      await fetchPage(activeSheet, 0, pageSize, selectedColumnKeys, next);
    },
    [filters, activeSheet, pageSize, selectedColumnKeys, fetchPage]
  );

  const clearAllFilters = useCallback(async () => {
    setFilters({});
    setCurrentPage(0);
    await fetchPage(activeSheet, 0, pageSize, selectedColumnKeys, {});
  }, [activeSheet, pageSize, selectedColumnKeys, fetchPage]);

  // Update selected columns — refetch to show correct columns
  const updateSelectedColumns = useCallback(
    async (keys: string[]) => {
      setSelectedColumnKeys(keys);
      setCurrentPage(0);
      await fetchPage(activeSheet, 0, pageSize, keys, filters);
    },
    [activeSheet, pageSize, filters, fetchPage]
  );

  // Visible columns
  const visibleColumns = useMemo(() => {
    return columns.filter((col) => selectedColumnKeys.includes(col.key));
  }, [columns, selectedColumnKeys]);

  // Fetch unique values for a column (for filter dropdowns)
  const getColumnUniqueValues = useCallback(
    async (columnKey: string): Promise<string[]> => {
      return invoke<string[]>('get_unique_values', {
        sheetName: activeSheet,
        columnKey,
        filters,
      });
    },
    [activeSheet, filters]
  );

  // Export
  const exportData = useCallback(async () => {
    const outputPath = await save({
      filters: [{ name: 'Excel', extensions: ['xlsx'] }],
      defaultPath: fileName.replace(/\.[^/.]+$/, '') + '_exported.xlsx',
    });
    if (!outputPath) return;

    setLoading(true);
    try {
      await invoke('export_data', {
        sheetName: activeSheet,
        selectedColumns: selectedColumnKeys,
        filters,
        outputPath,
      });
    } finally {
      setLoading(false);
    }
  }, [activeSheet, selectedColumnKeys, filters, fileName]);

  // Reset / close
  const reset = useCallback(async () => {
    await invoke('close_file');
    setFileName('');
    setColumns([]);
    setPageRows([]);
    setSelectedColumnKeys([]);
    setFilters({});
    setSheetNames([]);
    setActiveSheet('');
    setTotalRows(0);
    setFilteredTotal(0);
  }, []);

  return {
    fileName,
    columns,
    selectedColumnKeys,
    setSelectedColumnKeys: updateSelectedColumns,
    filters,
    updateFilter,
    clearAllFilters,
    visibleColumns,
    loading,
    sheetNames,
    activeSheet,
    switchSheet,
    openFile,
    exportData,
    reset,
    // Pagination
    pageRows,
    totalRows,
    filteredTotal,
    currentPage,
    pageSize,
    onPageChange,
    getColumnUniqueValues,
  };
}
