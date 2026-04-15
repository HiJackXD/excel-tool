import { Upload } from 'antd';
import { FileExcelOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';

const { Dragger } = Upload;

interface FileUploadProps {
  onFileLoad: (file: File) => void;
  loading: boolean;
}

export default function FileUpload({ onFileLoad, loading }: FileUploadProps) {
  const uploadProps: UploadProps = {
    accept: '.xlsx,.xls,.csv',
    showUploadList: false,
    beforeUpload: (file) => {
      onFileLoad(file);
      return false; // Prevent auto upload
    },
  };

  return (
    <div className="file-upload">
      <Dragger {...uploadProps} disabled={loading}>
        <p className="ant-upload-drag-icon">
          <FileExcelOutlined style={{ fontSize: 48, color: '#52c41a' }} />
        </p>
        <p className="ant-upload-text">
          点击或拖拽 Excel 文件到此区域
        </p>
        <p className="ant-upload-hint">
          支持 .xlsx、.xls、.csv 格式
        </p>
      </Dragger>
    </div>
  );
}
