import { Button } from 'antd';
import { FileExcelOutlined } from '@ant-design/icons';

interface FileUploadProps {
  onOpenFile: () => void;
  loading: boolean;
}

export default function FileUpload({ onOpenFile, loading }: FileUploadProps) {
  return (
    <div className="file-upload" style={{ textAlign: 'center' }}>
      <div style={{ marginBottom: 24 }}>
        <FileExcelOutlined style={{ fontSize: 64, color: '#52c41a' }} />
      </div>
      <Button
        type="primary"
        size="large"
        onClick={onOpenFile}
        loading={loading}
        icon={<FileExcelOutlined />}
      >
        选择 Excel 文件
      </Button>
      <p style={{ marginTop: 12, color: '#999' }}>
        支持 .xlsx、.xls、.csv 格式
      </p>
    </div>
  );
}
