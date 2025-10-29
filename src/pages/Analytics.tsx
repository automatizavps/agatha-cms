import DashboardLayout from "@/components/DashboardLayout";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OrderReportTab from "@/components/OrderReportTab";
import ServiceReportTab from "@/components/ServiceReportTab";
import ClientReportTab from "@/components/ClientReportTab";
import TeamReportTab from "@/components/TeamReportTab";
import CompanyReportTab from "@/components/CompanyReportTab";
import CommissionReportTab from "@/components/CommissionReportTab"; // NOVO IMPORT
import { useCanRead } from "@/hooks/use-module-permission"; // Importando useCanRead

const Analytics = () => {
  const { t } = useTranslation();
  
  // Permissões para as abas
  const canReadOrders = useCanRead('orders');
  const canReadAppointments = useCanRead('appointments');
  const canReadClients = useCanRead('clients');
  const canReadTeams = useCanRead('teams');
  const canReadCompanies = useCanRead('companies');
  const canReadCommissions = useCanRead('commissions'); // NOVO
  
  // Determina a primeira aba visível como padrão
  const defaultTab = canReadOrders ? 'orders' : 
                     canReadAppointments ? 'services' : 
                     canReadClients ? 'clients' : 
                     canReadTeams ? 'teams' : 
                     canReadCommissions ? 'commissions' : 
                     'companies';
  
  // Se nenhuma aba for visível, o layout será vazio, mas o DashboardLayout lida com o acesso negado.

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl lg:text-2xl font-bold tracking-tight">{t('page_title_analytics')}</h1>
        <p className="text-muted-foreground">{t('page_subtitle_analytics')}</p>
        
        <Tabs defaultValue={defaultTab} className="w-full">
          {/* Removidas classes de layout forçado (flex flex-nowrap overflow-x-auto justify-start) */}
          <TabsList className="w-full">
            {canReadOrders && <TabsTrigger value="orders" className="flex-1">{t('nav_orders')}</TabsTrigger>}
            {canReadAppointments && <TabsTrigger value="services" className="flex-1">{t('nav_appointments')}</TabsTrigger>}
            {canReadClients && <TabsTrigger value="clients" className="flex-1">{t('nav_clients')}</TabsTrigger>}
            {canReadTeams && <TabsTrigger value="teams" className="flex-1">{t('nav_teams')}</TabsTrigger>}
            {canReadCommissions && <TabsTrigger value="commissions" className="flex-1">{t('page_title_commissions')}</TabsTrigger>}
            {canReadCompanies && <TabsTrigger value="companies" className="flex-1">{t('nav_companies')}</TabsTrigger>}
          </TabsList>
          
          {canReadOrders && (
            <TabsContent value="orders">
              <OrderReportTab />
            </TabsContent>
          )}
          
          {canReadAppointments && (
            <TabsContent value="services">
              <ServiceReportTab />
            </TabsContent>
          )}
          
          {canReadClients && (
            <TabsContent value="clients">
              <ClientReportTab />
            </TabsContent>
          )}
          
          {canReadTeams && (
            <TabsContent value="teams">
              <TeamReportTab />
            </TabsContent>
          )}
          
          {canReadCommissions && (
            <TabsContent value="commissions">
              <CommissionReportTab />
            </TabsContent>
          )}
          
          {canReadCompanies && (
            <TabsContent value="companies">
              <CompanyReportTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;