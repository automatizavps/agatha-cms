import DashboardLayout from "@/components/DashboardLayout";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OrderReportTab from "@/components/OrderReportTab";
import ServiceReportTab from "@/components/ServiceReportTab";
import ClientReportTab from "@/components/ClientReportTab"; // NOVO
import TeamReportTab from "@/components/TeamReportTab";     // NOVO
import CompanyReportTab from "@/components/CompanyReportTab"; // NOVO
import { PermissionGuard } from "@/hooks/use-permission";

const AnalyticsContent = () => {
  const { t } = useTranslation();
  
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold tracking-tight">{t('page_title_analytics')}</h1>
        <p className="text-muted-foreground">{t('page_subtitle_analytics')}</p>
        
        <Tabs defaultValue="orders" className="w-full">
          {/* Ajustando para 5 colunas no desktop, com overflow horizontal no mobile */}
          <TabsList className="w-full grid grid-cols-2 md:grid-cols-5 overflow-x-auto">
            <TabsTrigger value="orders">{t('nav_orders')}</TabsTrigger>
            <TabsTrigger value="services">{t('nav_services')}</TabsTrigger>
            <TabsTrigger value="clients">{t('nav_clients')}</TabsTrigger>
            <TabsTrigger value="teams">{t('nav_teams')}</TabsTrigger>
            <TabsTrigger value="companies">{t('nav_companies')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="orders">
            <OrderReportTab />
          </TabsContent>
          
          <TabsContent value="services">
            <ServiceReportTab />
          </TabsContent>
          
          <TabsContent value="clients">
            <ClientReportTab />
          </TabsContent>
          
          <TabsContent value="teams">
            <TeamReportTab />
          </TabsContent>
          
          <TabsContent value="companies">
            <CompanyReportTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

const Analytics = () => (
  // Perfis 1 (Super Admin) e 2 (Admin) têm permissão para acessar relatórios
  <PermissionGuard allowedProfileIds={[1, 2]}>
    <AnalyticsContent />
  </PermissionGuard>
);

export default Analytics;