import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { useCompanies } from "@/integrations/supabase/companies";

interface DashboardFilterContextType {
  selectedCompanyId: string | 'all';
  setSelectedCompanyId: (id: string | 'all') => void;
  filteredCompanyId: string | undefined; // The actual ID used for fetching data (or undefined if 'all' for SA)
  isSuperAdmin: boolean;
  isLoadingFilter: boolean;
}

const DashboardFilterContext = createContext<DashboardFilterContextType | undefined>(undefined);

export const DashboardFilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: profile, isLoading: isLoadingProfile } = useCurrentUserProfile();
  const { isLoading: isLoadingCompanies } = useCompanies();
  
  const isSuperAdmin = profile?.perfil_id === 1;
  const userCompanyId = profile?.empresa_id;
  
  // State for the selected filter value
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | 'all'>('all');
  
  // Effect to initialize selectedCompanyId based on user role
  useEffect(() => {
    if (!isLoadingProfile) {
      if (!isSuperAdmin && userCompanyId) {
        // Non-Super Admins are locked to their company
        setSelectedCompanyId(userCompanyId);
      } else if (!isSuperAdmin && !userCompanyId) {
        // Should not happen if RLS is set up correctly, but default to 'all'
        setSelectedCompanyId('all');
      } else if (isSuperAdmin) {
        // Super Admins default to 'all'
        setSelectedCompanyId('all');
      }
    }
  }, [isLoadingProfile, isSuperAdmin, userCompanyId]);
  
  // Recalculate filteredCompanyId (the ID actually used for API calls)
  const filteredCompanyId = useMemo(() => {
    if (isLoadingProfile) return undefined;
    
    if (isSuperAdmin) {
      // Super Admin: returns the selected ID or undefined if 'all'
      return selectedCompanyId === 'all' ? undefined : selectedCompanyId;
    }
    
    // Admin/Employee: returns their fixed company ID
    return userCompanyId;
  }, [isSuperAdmin, selectedCompanyId, userCompanyId, isLoadingProfile]);
  
  const isLoadingFilter = isLoadingProfile || (isSuperAdmin && isLoadingCompanies);

  const value = {
    selectedCompanyId,
    setSelectedCompanyId,
    filteredCompanyId,
    isSuperAdmin,
    isLoadingFilter,
  };

  return (
    <DashboardFilterContext.Provider value={value}>
      {children}
    </DashboardFilterContext.Provider>
  );
};

export const useDashboardFilter = () => {
  const context = useContext(DashboardFilterContext);
  if (context === undefined) {
    throw new Error('useDashboardFilter must be used within a DashboardFilterProvider');
  }
  return context;
};