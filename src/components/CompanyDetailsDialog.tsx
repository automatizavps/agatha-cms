import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Company } from '@/integrations/supabase/companies';
import { Loader2, Building, Users, ShoppingCart, CalendarCheck, Package, Clock, Tag, DollarSign, Target, ShieldCheck, HandCoins } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import CompanyUsersTab from './CompanyUsersTab';
import CompanyClientsTab from './CompanyClientsTab';
import CompanyProductsTab from './CompanyProductsTab';
import CompanyServicesTab from './CompanyServicesTab';
import CompanyOrdersTab from './CompanyOrdersTab';
import CompanyAppointmentsTab from './CompanyAppointmentsTab';
import CompanyTeamsTab from './CompanyTeamsTab';
import CompanyCategoriesTab from './CompanyCategoriesTab';
import CompanyPromotionsTab from './CompanyPromotionsTab';
import CompanyCommissionsTab from './CompanyCommissionsTab';

interface CompanyDetailsDialogProps {
  company: Company;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const CompanyDetailsDialog: React.FC<CompanyDetailsDialogProps> = ({ company, isOpen, onOpenChange }) => {
  const { t } = useTranslation();
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-6 w-6 text-primary" />
            {t('company_details', { defaultValue: 'Detalhes da Empresa' })}: {company.nome}
          </DialogTitle>
        </DialogHeader>
        
        {/* Informações Básicas */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground border-b pb-3">
          <div className="flex items-center gap-1">
            <ShieldCheck className="h-4 w-4" />
            <span className="font-medium">{t('plan_name')}:</span> {company.planos?.nome || 'N/A'}
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            <span className="font-medium">{t('plan_price')}:</span> {company.planos?.preco ? formatCurrency(company.planos.preco) : 'N/A'}
          </div>
          <div className="flex items-center gap-1">
            <CalendarCheck className="h-4 w-4" />
            <span className="font-medium">{t('plan_duration')}:</span> {company.planos?.data_fim ? format(new Date(company.planos.data_fim), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
          </div>
        </div>

        <Tabs defaultValue="users" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full flex flex-nowrap overflow-x-auto justify-start">
            <TabsTrigger value="users" className="flex-shrink-0"><Users className="h-4 w-4 mr-2" /> {t('nav_users')}</TabsTrigger>
            <TabsTrigger value="clients" className="flex-shrink-0"><HandCoins className="h-4 w-4 mr-2" /> {t('nav_clients')}</TabsTrigger>
            <TabsTrigger value="products" className="flex-shrink-0"><Package className="h-4 w-4 mr-2" /> {t('nav_products')}</TabsTrigger>
            <TabsTrigger value="services" className="flex-shrink-0"><Clock className="h-4 w-4 mr-2" /> {t('nav_services')}</TabsTrigger>
            <TabsTrigger value="categories" className="flex-shrink-0"><Tag className="h-4 w-4 mr-2" /> {t('page_title_categories')}</TabsTrigger>
            <TabsTrigger value="teams" className="flex-shrink-0"><Target className="h-4 w-4 mr-2" /> {t('nav_teams')}</TabsTrigger>
            <TabsTrigger value="orders" className="flex-shrink-0"><ShoppingCart className="h-4 w-4 mr-2" /> {t('nav_orders')}</TabsTrigger>
            <TabsTrigger value="appointments" className="flex-shrink-0"><CalendarCheck className="h-4 w-4 mr-2" /> {t('nav_appointments')}</TabsTrigger>
            <TabsTrigger value="promotions" className="flex-shrink-0"><DollarSign className="h-4 w-4 mr-2" /> {t('page_title_promotions')}</TabsTrigger>
            <TabsTrigger value="commissions" className="flex-shrink-0"><HandCoins className="h-4 w-4 mr-2" /> {t('page_title_commissions')}</TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-y-auto pt-4">
            <TabsContent value="users" className="mt-0">
              <CompanyUsersTab companyId={company.id} />
            </TabsContent>
            <TabsContent value="clients" className="mt-0">
              <CompanyClientsTab companyId={company.id} />
            </TabsContent>
            <TabsContent value="products" className="mt-0">
              <CompanyProductsTab companyId={company.id} />
            </TabsContent>
            <TabsContent value="services" className="mt-0">
              <CompanyServicesTab companyId={company.id} />
            </TabsContent>
            <TabsContent value="categories" className="mt-0">
              <CompanyCategoriesTab companyId={company.id} />
            </TabsContent>
            <TabsContent value="teams" className="mt-0">
              <CompanyTeamsTab companyId={company.id} />
            </TabsContent>
            <TabsContent value="orders" className="mt-0">
              <CompanyOrdersTab companyId={company.id} />
            </TabsContent>
            <TabsContent value="appointments" className="mt-0">
              <CompanyAppointmentsTab companyId={company.id} />
            </TabsContent>
            <TabsContent value="promotions" className="mt-0">
              <CompanyPromotionsTab companyId={company.id} />
            </TabsContent>
            <TabsContent value="commissions" className="mt-0">
              <CompanyCommissionsTab companyId={company.id} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default CompanyDetailsDialog;