import { Button, Space, Select, Typography } from 'antd';
import {
  ExportOutlined,
  DeleteOutlined,
  ClearOutlined,
  FileExcelOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

interface ToolbarProps {
  fileName: string;
  sheetNames: string[];
  activeSheet: string;
  onSwitchSheet: (name: string) => void;
  onExport: () => void;
  onReset: () => void;
  onClearFilters: () => void;
  hasFilters: boolean;
  rowCount: number;
  filteredRowCount: number;
  columnCount: number;
  selectedColumnCount: number;
}

export default function Toolbar({
  fileName,
  sheetNames,
  activeSheet,
  onSwitchSheet,
  onExport,
  onReset,
  onClearFilters,
  hasFilters,
  rowCount,
  filteredRowCount,
  columnCount,
  selectedColumnCount,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <Space align="center">
          <FileExcelOutlined style={{ color: '#52c41a', fontSize: 18 }} />
          <Text strong ellipsis style={{ maxWidth: 200 }}>
            {fileName}
          </Text>
          {sheetNames.length > 1 && (
            <Select
              value={activeSheet}
              onChange={onSwitchSheet}
              size="small"
              style={{ minWidth: 120 }}
              options={sheetNames.map(name => ({ label: name, value: name }))}
            />
          )}
          <Text type="secondary" style={{ fontSize: 12 }}>
            {rowCount} 行 x {columnCount} 列
            {selectedColumnCount < columnCount && (
              <> (已选 {selectedColumnCount} 列)</>
            )}
            {filteredRowCount < rowCount && (
              <> | 筛选后 {filteredRowCount} 行</>
            )}
          </Text>
        </Space>
      </div>
      <div className="toolbar-right">
        <Space>
          {hasFilters && (
            <Button
              size="small"
              icon={<ClearOutlined />}
              onClick={onClearFilters}
            >
              清除筛选
            </Button>
          )}
          <Button
            type="primary"
            icon={<ExportOutlined />}
            onClick={onExport}
            disabled={filteredRowCount === 0 || selectedColumnCount === 0}
          >
            导出
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={onReset}
          >
            关闭文件
          </Button>
        </Space>
      </div>
    </div>
  );
}
