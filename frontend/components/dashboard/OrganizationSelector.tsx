import React from 'react';
import { Building2 } from 'lucide-react';
import { Organization } from '../../types';

interface OrganizationSelectorProps {
  organizations: Organization[];
  selectedOrgId: string | null;
  onChange: (organizationId: string | null) => void;
}

export const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({
  organizations,
  selectedOrgId,
  onChange,
}) => {
  if (organizations.length <= 1) return null;

  return (
    <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1">
      <Building2 size={12} className="text-[#0ea5e9]" />
      <select
        value={selectedOrgId || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="bg-transparent text-[11px] font-bold text-white uppercase tracking-wider outline-none cursor-pointer"
      >
        <option value="" className="bg-slate-900">Todas as lojas</option>
        {organizations.map((org) => (
          <option key={org.id} value={org.id} className="bg-slate-900">{org.name}</option>
        ))}
      </select>
    </div>
  );
};
