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
    <label className="flex min-h-11 items-center gap-2 rounded-lg border border-borda-3 bg-papel px-3 md:min-h-9 focus-within:border-marca">
      <Building2 size={15} className="text-marca" aria-hidden="true" />
      <span className="sr-only">Organização</span>
      <select
        value={selectedOrgId || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="cursor-pointer bg-transparent text-base font-semibold text-tinta outline-none md:text-sm"
      >
        <option value="">Todas as lojas</option>
        {organizations.map((org) => (
          <option key={org.id} value={org.id}>{org.name}</option>
        ))}
      </select>
    </label>
  );
};
