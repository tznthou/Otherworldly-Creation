import React from 'react';
import DatabaseMaintenance from '../../DatabaseMaintenance/DatabaseMaintenance';

const DatabaseMaintenanceSettings: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-serif-tc text-warm-gold">資料庫維護</h2>
      <div className="bg-bg-light/50 backdrop-blur-sm border border-warm-gold/10 rounded-lg p-6">
        <DatabaseMaintenance />
      </div>
    </div>
  );
};

export default DatabaseMaintenanceSettings;