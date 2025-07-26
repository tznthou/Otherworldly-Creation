import React, { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { removeNotification } from '../../store/slices/uiSlice';

const NotificationContainer: React.FC = () => {
  const { notifications } = useAppSelector(state => state.ui);
  const dispatch = useAppDispatch();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={() => dispatch(removeNotification(notification.id))}
        />
      ))}
    </div>
  );
};

interface NotificationItemProps {
  notification: {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    timestamp: Date;
    autoClose?: boolean;
    duration?: number;
  };
  onClose: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onClose }) => {
  useEffect(() => {
    if (notification.autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, notification.duration || 5000);

      return () => clearTimeout(timer);
    }
  }, [notification.autoClose, notification.duration, onClose]);

  const getNotificationStyles = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-900/90 border-green-500 text-green-100';
      case 'error':
        return 'bg-red-900/90 border-red-500 text-red-100';
      case 'warning':
        return 'bg-yellow-900/90 border-yellow-500 text-yellow-100';
      case 'info':
        return 'bg-blue-900/90 border-blue-500 text-blue-100';
      default:
        return 'bg-cosmic-900/90 border-cosmic-500 text-white';
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📢';
    }
  };

  return (
    <div className={`
      max-w-sm w-full backdrop-blur-sm border rounded-lg p-4 shadow-lg
      transform transition-all duration-300 ease-in-out
      hover:scale-105 animate-slide-in-right
      ${getNotificationStyles()}
    `}>
      <div className="flex items-start space-x-3">
        <span className="text-lg flex-shrink-0">{getIcon()}</span>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">{notification.title}</h4>
          <p className="text-sm opacity-90 mt-1">{notification.message}</p>
          <p className="text-xs opacity-70 mt-2">
            {notification.timestamp.toLocaleTimeString('zh-TW')}
          </p>
        </div>
        
        <button
          onClick={onClose}
          className="flex-shrink-0 text-lg opacity-70 hover:opacity-100 transition-opacity"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default NotificationContainer;