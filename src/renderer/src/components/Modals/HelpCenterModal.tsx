import React, { useState } from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { closeModal } from '../../store/slices/uiSlice';
import HelpCenter from '../Help/HelpCenter';

const HelpCenterModal: React.FC = () => {
  const dispatch = useAppDispatch();

  const handleClose = () => {
    dispatch(closeModal('helpCenter'));
  };

  return (
    <HelpCenter
      isOpen={true}
      onClose={handleClose}
    />
  );
};

export default HelpCenterModal;