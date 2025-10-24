import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AccessType, Module } from '@/integrations/supabase/customProfiles';
import { useTranslation } from 'react-i18next';

interface PermissionSelectorProps {
  module: Module;
  currentAccess: AccessType;
  onChange: (access: AccessType) => void;
  disabled: boolean;
}

const accessOptions: AccessType[] = ['leitura', 'escrita', 'sem_acesso'];

const PermissionSelector: React.FC<PermissionSelectorProps> = ({ module, currentAccess, onChange, disabled }) => {
  const { t } = useTranslation();
  
  const getAccessTranslation = (access: AccessType) => {
    switch (access) {
      case 'leitura': return t('access_read');
      case 'escrita': return t('access_write');
      case 'sem_acesso': return t('access_none');
      default: return access;
    }
  };

  return (
    <Select 
      onValueChange={(value) => onChange(value as AccessType)} 
      value={currentAccess} 
      disabled={disabled}
    >
      <SelectTrigger className="w-full capitalize">
        <SelectValue placeholder={getAccessTranslation(currentAccess)} />
      </SelectTrigger>
      <SelectContent>
        {accessOptions.map((access) => (
          <SelectItem key={access} value={access} className="capitalize">
            {getAccessTranslation(access)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default PermissionSelector;