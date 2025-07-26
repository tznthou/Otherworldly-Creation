import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Notification } from '../../components/UI/NotificationSystem';

interface NotificationState {
  notifications: Notification[];
}

const initialState: NotificationState = {
  notifications: []
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications.push(action.payload);
      
      // 限制通知數量，避免記憶體洩漏
      if (state.notifications.length > 10) {
        state.notifications = state.notifications.slice(-10);
      }
    },
    
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        notification => notification.id !== action.payload
      );
    },
    
    clearNotifications: (state) => {
      state.notifications = [];
    },
    
    updateNotification: (state, action: PayloadAction<{ id: string; updates: Partial<Notification> }>) => {
      const { id, updates } = action.payload;
      const index = state.notifications.findIndex(notification => notification.id === id);
      
      if (index !== -1) {
        state.notifications[index] = { ...state.notifications[index], ...updates };
      }
    }
  }
});

export const {
  addNotification,
  removeNotification,
  clearNotifications,
  updateNotification
} = notificationSlice.actions;

export default notificationSlice.reducer;