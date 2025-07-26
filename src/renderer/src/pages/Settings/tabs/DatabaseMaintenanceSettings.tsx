import React from 'react';
import DatabaseMaintenance from '../../DatabaseMaintenance/DatabaseMaintenance';

const DatabaseMaintenanceSettings: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-cosmic text-gold-500">資料庫維護</h2>
      <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
        <DatabaseMaintenance />
      </div>
    </div>
  );
};

export default DatabaseMaintenanceSettings;