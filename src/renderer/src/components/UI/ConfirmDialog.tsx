import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = '確認',
  cancelText = '取消',
  confirmButtonClass = 'bg-red-500 hover:bg-red-600',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-cosmic-900 border border-cosmic-700 rounded-xl shadow-xl w-full max-w-md">
        {/* 標題 */}
        <div className="p-6 border-b border-cosmic-700">
          <h2 className="text-xl font-cosmic text-gold-500">{title}</h2>
        </div>

        {/* 內容 */}
        <div className="p-6">
          <p className="text-gray-300">{message}</p>
        </div>

        {/* 底部按鈕 */}
        <div className="p-6 border-t border-cosmic-700 flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="btn-secondary"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-white ${confirmButtonClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;