import React, { useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, store } from '../../store/store';
import { removeNotification, addNotification, clearNotifications } from '../../store/slices/notificationSlice';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number; // 毫秒，0 表示不自動消失
  actions?: NotificationAction[];
  timestamp: number;
}

export interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

interface NotificationItemProps {
  notification: Notification;
  onClose: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const handleClose = useCallback(() => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose();
    }, 300);
  }, [onClose]);

  useEffect(() => {
    // 進入動畫
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // 自動消失
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, notification.duration);
      return () => clearTimeout(timer);
    }
  }, [notification.duration, handleClose]);

  const getTypeStyles = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-900/90',
          border: 'border-green-500',
          icon: '✅',
          iconBg: 'bg-green-500'
        };
      case 'error':
        return {
          bg: 'bg-red-900/90',
          border: 'border-red-500',
          icon: '❌',
          iconBg: 'bg-red-500'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-900/90',
          border: 'border-yellow-500',
          icon: '⚠️',
          iconBg: 'bg-yellow-500'
        };
      case 'info':
        return {
          bg: 'bg-blue-900/90',
          border: 'border-blue-500',
          icon: 'ℹ️',
          iconBg: 'bg-blue-500'
        };
      default:
        return {
          bg: 'bg-gray-900/90',
          border: 'border-gray-500',
          icon: '📝',
          iconBg: 'bg-gray-500'
        };
    }
  };

  const styles = getTypeStyles(notification.type);

  return (
    <div className={`
      ${styles.bg} ${styles.border} border-l-4 
      backdrop-blur-sm rounded-lg p-4 mb-3 
      shadow-lg transform transition-all duration-300 ease-out
      ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      ${isLeaving ? 'scale-95' : 'scale-100'}
      hover:scale-[1.02] hover:shadow-xl
      max-w-sm w-full
    `}>
      <div className="flex items-start space-x-3">
        {/* 圖標 */}
        <div className={`${styles.iconBg} rounded-full p-1 flex-shrink-0`}>
          <span className="text-white text-sm">{styles.icon}</span>
        </div>
        
        {/* 內容 */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white text-sm">
            {notification.title}
          </h4>
          
          {notification.message && (
            <p className="text-gray-300 text-xs mt-1 leading-relaxed">
              {notification.message}
            </p>
          )}
          
          {/* 操作按鈕 */}
          {notification.actions && notification.actions.length > 0 && (
            <div className="flex space-x-2 mt-3">
              {notification.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    action.action();
                    handleClose();
                  }}
                  className={`
                    px-3 py-1 rounded text-xs font-medium transition-colors
                    ${action.style === 'primary' ? 'bg-gold-600 hover:bg-gold-700 text-white' :
                      action.style === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white' :
                      'bg-gray-600 hover:bg-gray-700 text-white'}
                  `}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* 關閉按鈕 */}
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-white transition-colors p-1 flex-shrink-0"
          title="關閉"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* 進度條（用於顯示自動消失倒計時） */}
      {notification.duration && notification.duration > 0 && (
        <div className="mt-3 w-full bg-gray-700 rounded-full h-1">
          <div 
            className="bg-white/30 h-1 rounded-full transition-all ease-linear"
            style={{ 
              animation: `shrink ${notification.duration}ms linear`,
              width: '100%'
            }}
          ></div>
        </div>
      )}
    </div>
  );
};

// 通知容器組件
export const NotificationContainer: React.FC = () => {
  const dispatch = useDispatch();
  const notifications = useSelector((state: RootState) => state.notification?.notifications || []);

  const handleCloseNotification = (id: string) => {
    dispatch(removeNotification(id));
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <>
      {/* CSS 動畫定義 */}
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
      
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {[...notifications]
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 5) // 最多顯示5個通知
          .map((notification, index) => (
            <NotificationItem
              key={`${notification.id}-${index}`}
              notification={notification}
              onClose={() => handleCloseNotification(notification.id)}
            />
          ))}
      </div>
    </>
  );
};

// 通知工具函數
export class NotificationService {
  static success(title: string, message?: string, duration: number = 4000) {
    return this.show({
      type: 'success',
      title,
      message,
      duration
    });
  }

  static error(title: string, message?: string, duration: number = 6000) {
    return this.show({
      type: 'error',
      title,
      message,
      duration
    });
  }

  static warning(title: string, message?: string, duration: number = 5000) {
    return this.show({
      type: 'warning',
      title,
      message,
      duration
    });
  }

  static info(title: string, message?: string, duration: number = 4000) {
    return this.show({
      type: 'info',
      title,
      message,
      duration
    });
  }

  static show(notification: Omit<Notification, 'id' | 'timestamp'>) {
    const fullNotification: Notification = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    store.dispatch(addNotification(fullNotification));
    return fullNotification.id;
  }

  static remove(id: string) {
    store.dispatch(removeNotification(id));
  }

  static clear() {
    store.dispatch(clearNotifications());
  }
}

// 快速通知 Hook
export const useNotification = () => {
  return {
    success: NotificationService.success,
    error: NotificationService.error,
    warning: NotificationService.warning,
    info: NotificationService.info,
    show: NotificationService.show,
    remove: NotificationService.remove,
    clear: NotificationService.clear
  };
};

export default NotificationContainer;