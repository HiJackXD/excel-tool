import { useMemo, useCallback } from 'react';
import { Table, Typography, Empty } from 'antd';
import type { ColumnsType, ColumnType } from 'antd/es/table';
import type { ColumnInfo, RowData } from '../types';

const { Text } = Typography;

interface DataTableProps {
  columns: ColumnInfo[];
  rows: RowData[];
  totalRows: number;
  filters: Record<string, string[]>;
  onFilterChange: (column: string, values: string[]) => void;
  getColumnUniqueValues: (columnKey: string) => string[];
}

export default function DataTable({
  columns,
  rows,
  totalRows,
  filters,
  onFilterChange,
  getColumnUniqueValues,
}: DataTableProps) {
  const buildTableColumns = useMemo((): ColumnsType<RowData> => {
    return columns.map((col) => {
      const uniqueValues = getColumnUniqueValues(col.key);
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
        filters: uniqueValues.map(v => ({ text: v === '' ? '(空)' : String(v), value: v })),
        filteredValue: filters[col.key] || null,
        onFilter: (value, record) => {
          return String(record[col.key] ?? '') === String(value);
        },
      };
      return tableCol;
    });
  }, [columns, filters, getColumnUniqueValues]);

  const handleTableChange = useCallback(
    (_pagination: unknown, tableFilters: Record<string, (React.Key | boolean)[] | null>) => {
      // Sync table filters back to our state
      columns.forEach(col => {
        const newFilterValues = tableFilters[col.key];
        if (newFilterValues) {
          onFilterChange(col.key, newFilterValues.map(String));
        } else {
          onFilterChange(col.key, []);
        }
      });
    },
    [columns, onFilterChange]
  );

  // Add a row key using index
  const dataWithKeys = useMemo(() => {
    return rows.map((row, index) => ({
      ...row,
      __rowKey: index,
    }));
  }, [rows]);

  if (columns.length === 0) {
    return <Empty description="请先选择要显示的列" />;
  }

  return (
    <div className="data-table">
      <div className="data-table-info">
        <Text type="secondary">
          显示 {rows.length} / {totalRows} 行，{columns.length} 列
        </Text>
      </div>
      <Table
        columns={buildTableColumns}
        dataSource={dataWithKeys}
        rowKey="__rowKey"
        size="small"
        scroll={{ x: columns.length * 150, y: 500 }}
        pagination={{
          pageSize: 50,
          showSizeChanger: true,
          pageSizeOptions: ['20', '50', '100', '200'],
          showTotal: (total) => `共 ${total} 条`,
          size: 'small',
        }}
        onChange={handleTableChange}
        bordered
      />
    </div>
  );
}
