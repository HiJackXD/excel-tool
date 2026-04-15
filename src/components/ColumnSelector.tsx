import { useMemo, useState, useCallback } from 'react';
import { Tree, Input, Button, Space, Badge, Typography } from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ColumnInfo } from '../types';

const { Text } = Typography;

interface ColumnSelectorProps {
  columns: ColumnInfo[];
  selectedKeys: string[];
  onSelectionChange: (keys: string[]) => void;
}

export default function ColumnSelector({
  columns,
  selectedKeys,
  onSelectionChange,
}: ColumnSelectorProps) {
  const [searchText, setSearchText] = useState('');

  const filteredColumns = useMemo(() => {
    if (!searchText.trim()) return columns;
    const lower = searchText.toLowerCase();
    return columns.filter(col =>
      col.title.toLowerCase().includes(lower)
    );
  }, [columns, searchText]);

  const treeData = useMemo(() => {
    return filteredColumns.map(col => ({
      key: col.key,
      title: (
        <span title={col.title}>
          <Text type="secondary" style={{ fontSize: 11, marginRight: 6 }}>
            {col.index + 1}
          </Text>
          {col.title}
        </span>
      ),
    }));
  }, [filteredColumns]);

  const checkedKeys = useMemo(() => {
    const filteredKeySet = new Set(filteredColumns.map(c => c.key));
    return selectedKeys.filter(k => filteredKeySet.has(k));
  }, [selectedKeys, filteredColumns]);

  const onCheck = useCallback(
    (checked: unknown) => {
      const checkedArr = Array.isArray(checked)
        ? (checked as string[])
        : ((checked as { checked: string[] }).checked as string[]);

      // Merge: keep selections for columns NOT in current filtered view,
      // then add/remove based on the new checked state
      const filteredKeySet = new Set(filteredColumns.map(c => c.key));
      const outsideSelection = selectedKeys.filter(k => !filteredKeySet.has(k));
      onSelectionChange([...outsideSelection, ...checkedArr]);
    },
    [filteredColumns, selectedKeys, onSelectionChange]
  );

  const selectAll = useCallback(() => {
    const allKeys = columns.map(c => c.key);
    onSelectionChange(allKeys);
  }, [columns, onSelectionChange]);

  const deselectAll = useCallback(() => {
    onSelectionChange([]);
  }, [onSelectionChange]);

  const invertSelection = useCallback(() => {
    const currentSet = new Set(selectedKeys);
    const inverted = columns
      .filter(c => !currentSet.has(c.key))
      .map(c => c.key);
    onSelectionChange(inverted);
  }, [columns, selectedKeys, onSelectionChange]);

  return (
    <div className="column-selector">
      <div className="column-selector-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Badge
            count={`${selectedKeys.length}/${columns.length}`}
            style={{ backgroundColor: selectedKeys.length > 0 ? '#52c41a' : '#d9d9d9' }}
          />
        </div>
        <Space size={4} style={{ marginBottom: 8 }}>
          <Button size="small" onClick={selectAll} icon={<CheckOutlined />}>
            全选
          </Button>
          <Button size="small" onClick={deselectAll} icon={<CloseOutlined />}>
            清空
          </Button>
          <Button size="small" onClick={invertSelection}>
            反选
          </Button>
        </Space>
        <Input
          placeholder="搜索列名..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          allowClear
          size="small"
        />
      </div>
      <div className="column-selector-tree">
        <Tree
          checkable
          selectable={false}
          checkedKeys={checkedKeys}
          onCheck={onCheck}
          treeData={treeData}
          height={500}
          blockNode
        />
      </div>
    </div>
  );
}
