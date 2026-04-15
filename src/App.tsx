import { ConfigProvider, Spin, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import FileUpload from './components/FileUpload';
import ColumnSelector from './components/ColumnSelector';
import DataTable from './components/DataTable';
import Toolbar from './components/Toolbar';
import { useExcelData } from './hooks/useExcelData';
import './App.css';

function App() {
  const {
    fileName,
    columns,
    selectedColumnKeys,
    setSelectedColumnKeys,
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
    pageRows,
    totalRows,
    filteredTotal,
    currentPage,
    pageSize,
    onPageChange,
    getColumnUniqueValues,
  } = useExcelData();

  const hasFile = fileName !== '';

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          borderRadius: 6,
        },
      }}
    >
      <div className="app">
        {!hasFile ? (
          <div className="app-upload">
            <div className="app-upload-inner">
              <h1 className="app-title">Excel 列选择工具</h1>
              <p className="app-subtitle">
                选择 Excel 文件，以树形结构快速选择列、筛选数据并导出
              </p>
              <FileUpload onOpenFile={openFile} loading={loading} />
            </div>
          </div>
        ) : (
          <Spin spinning={loading} tip="加载中...">
            <div className="app-workspace">
              <Toolbar
                fileName={fileName}
                sheetNames={sheetNames}
                activeSheet={activeSheet}
                onSwitchSheet={switchSheet}
                onExport={exportData}
                onReset={reset}
                onClearFilters={clearAllFilters}
                hasFilters={Object.keys(filters).length > 0}
                rowCount={totalRows}
                filteredRowCount={filteredTotal}
                columnCount={columns.length}
                selectedColumnCount={selectedColumnKeys.length}
              />
              <div className="app-content">
                <aside className="app-sidebar">
                  <ColumnSelector
                    columns={columns}
                    selectedKeys={selectedColumnKeys}
                    onSelectionChange={setSelectedColumnKeys}
                  />
                </aside>
                <main className="app-main">
                  <DataTable
                    columns={visibleColumns}
                    rows={pageRows}
                    totalRows={totalRows}
                    filteredTotal={filteredTotal}
                    currentPage={currentPage}
                    pageSize={pageSize}
                    onPageChange={onPageChange}
                    filters={filters}
                    onFilterChange={updateFilter}
                    getColumnUniqueValues={getColumnUniqueValues}
                  />
                </main>
              </div>
            </div>
          </Spin>
        )}
      </div>
    </ConfigProvider>
  );
}

export default App;
