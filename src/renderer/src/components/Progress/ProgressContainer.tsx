import React from 'react';
import { useAppSelector } from '../../hooks/redux';
import { selectActiveProgress } from '../../store/slices/errorSlice';
import ProgressIndicator from './ProgressIndicator';

const ProgressContainer: React.FC = () => {
  const activeProgress = useAppSelector(selectActiveProgress);

  console.log('ProgressContainer - 活躍進度:', activeProgress);

  if (activeProgress.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-md">
      {activeProgress.map((progress) => (
        <ProgressIndicator
          key={progress.id}
          progress={progress}
          compact={activeProgress.length > 2}
          showCancel={true}
          className="shadow-lg"
        />
      ))}
    </div>
  );
};

export default ProgressContainer;