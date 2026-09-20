import React from 'react';
import { Building2, MapPin } from 'lucide-react';
import { KPR_COLLEGE_CONFIG } from '../../../config/constants';

export interface CampusLocationPickerProps {
  department: string;
  onDepartmentChange: (val: string) => void;
  block: string;
  onBlockChange: (val: string) => void;
  pickupLocation: string;
  onPickupLocationChange: (val: string) => void;
}

export const CampusLocationPicker: React.FC<CampusLocationPickerProps> = ({
  department,
  onDepartmentChange,
  block,
  onBlockChange,
  pickupLocation,
  onPickupLocationChange,
}) => {
  return (
    <div className="space-y-4 p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
      <div className="flex items-center gap-2 text-sm font-semibold text-cyan-500">
        <Building2 className="w-4 h-4" />
        <span>KPR Campus Delivery Details</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
            Department
          </label>
          <select
            value={department}
            onChange={(e) => onDepartmentChange(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-slate-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          >
            <option value="">Select Department</option>
            {KPR_COLLEGE_CONFIG.departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
            Building / Block
          </label>
          <select
            value={block}
            onChange={(e) => onBlockChange(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-slate-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          >
            <option value="">Select Building / Block</option>
            {KPR_COLLEGE_CONFIG.blocks.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-cyan-500" />
            Pickup Location
          </span>
        </label>
        <select
          value={pickupLocation}
          onChange={(e) => onPickupLocationChange(e.target.value)}
          className="w-full rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-slate-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
        >
          <option value="">Select Pickup Location</option>
          {KPR_COLLEGE_CONFIG.pickupLocations.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
