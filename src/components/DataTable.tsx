import { useMemo, useCallback, useState, useEffect } from 'react';
import { Table, Typography, Empty } from 'antd';
import type { ColumnsType, ColumnType } from 'antd/es/table';
import type { ColumnInfo, RowData } from '../types';

const { Text } = Typography;

interface DataTableProps {
  columns: ColumnInfo[];
  rows: RowData[];
  totalRows: number;
  filteredTotal: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
  filters: Record<string, string[]>;
  onFilterChange: (column: string, values: string[]) => void;
  getColumnUniqueValues: (columnKey: string) => Promise<string[]>;
}

export default function DataTable({
  columns,
  rows,
  totalRows,
  filteredTotal,
  currentPage,
  pageSize,
  onPageChange,
  filters,
  onFilterChange,
  getColumnUniqueValues,
}: DataTableProps) {
  // Cache for column unique values (loaded lazily)
  const [uniqueValuesCache, setUniqueValuesCache] = useState<Record<string, string[]>>({});

  // Clear cache when filters change so we get updated values
  useEffect(() => {
    setUniqueValuesCache({});
  }, [filters]);

  // Load unique values for a column on demand (when filter dropdown opens)
  const loadUniqueValues = useCallback(
    async (columnKey: string) => {
      if (uniqueValuesCache[columnKey]) return;
      const values = await getColumnUniqueValues(columnKey);
      setUniqueValuesCache((prev) => ({ ...prev, [columnKey]: values }));
    },
    [uniqueValuesCache, getColumnUniqueValues]
  );

  const buildTableColumns = useMemo((): ColumnsType<RowData> => {
    return columns.map((col) => {
      const cached = uniqueValuesCache[col.key];
      const tableCol: ColumnType<RowData> = {
        title: col.title,
        dataIndex: col.key,
        key: col.key,
        ellipsis: true,
        width: 150,
        sorter: (a: RowData, b: RowData) => {
          const va = String(a[col.key] ?? '');
          const vb = String(b[col.key] ?? '');
          return va.localeCompare(vb, undefined, { numeric: true });
        },
        filters: cached
          ? cached.map((v) => ({ text: v === '' ? '(空)' : v, value: v }))
          : [],
        filteredValue: filters[col.key] || null,
        filterDropdownProps: {
          onOpenChange: (open: boolean) => {
            if (open) loadUniqueValues(col.key);
          },
        },
      };
      return tableCol;
    });
  }, [columns, filters, uniqueValuesCache, loadUniqueValues]);

  const handleTableChange = useCallback(
    (
      pagination: { current?: number; pageSize?: number },
      tableFilters: Record<string, (React.Key | boolean)[] | null>
    ) => {
      // Handle filter changes
      let filtersChanged = false;
      columns.forEach((col) => {
        const newValues = tableFilters[col.key];
        const oldValues = filters[col.key];
        if (newValues) {
          const newArr = newValues.map(String);
          if (!oldValues || JSON.stringify(oldValues) !== JSON.stringify(newArr)) {
            onFilterChange(col.key, newArr);
            filtersChanged = true;
          }
        } else if (oldValues) {
          onFilterChange(col.key, []);
          filtersChanged = true;
        }
      });

      // Handle page change (only if filters didn't change — filter change resets to page 0)
      if (!filtersChanged && pagination.current !== undefined) {
        const newPage = (pagination.current || 1) - 1; // Ant uses 1-based
        const newSize = pagination.pageSize || pageSize;
        onPageChange(newPage, newSize);
      }
    },
    [columns, filters, pageSize, onFilterChange, onPageChange]
  );

  const dataWithKeys = useMemo(() => {
    return rows.map((row, index) => ({
      ...row,
      __rowKey: currentPage * pageSize + index,
    }));
  }, [rows, currentPage, pageSize]);

  if (columns.length === 0) {
    return <Empty description="请先选择要显示的列" />;
  }

  return (
    <div className="data-table">
      <div className="data-table-info">
        <Text type="secondary">
          共 {totalRows} 行
          {filteredTotal < totalRows && ` | 筛选后 ${filteredTotal} 行`}
          ，{columns.length} 列
        </Text>
      </div>
      <Table
        columns={buildTableColumns}
        dataSource={dataWithKeys}
        rowKey="__rowKey"
        size="small"
        virtual
        scroll={{ x: columns.length * 150, y: 'calc(100vh - 180px)' }}
        pagination={{
          current: currentPage + 1, // Ant is 1-based
          pageSize,
          total: filteredTotal,
          showSizeChanger: true,
          pageSizeOptions: ['50', '100', '200', '500'],
          showTotal: (total) => `共 ${total} 条`,
          size: 'small',
        }}
        onChange={handleTableChange}
        bordered
      />
    </div>
  );
}
