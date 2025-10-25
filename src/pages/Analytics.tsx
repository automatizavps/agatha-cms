import DashboardLayout from "@/components/DashboardLayout";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OrderReportTab from "@/components/OrderReportTab";
import ServiceReportTab from "@/components/ServiceReportTab";
import ClientReportTab from "@/components/ClientReportTab";
import TeamReportTab from "@/components/TeamReportTab";
import CompanyReportTab from "@/components/CompanyReportTab";

const Analytics = () => {
  const { t } = useTranslation();
  
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl lg:text-2xl font-bold tracking-tight">{t('page_title_analytics')}</h1>
        <p className="text-muted-foreground">{t('page_subtitle_analytics')}</p>
        
        <Tabs defaultValue="orders" className="w-full">
          {/* Usando flexbox para layout horizontal fluido em todos os tamanhos */}
          <TabsList className="w-full flex flex-nowrap overflow-x-auto">
            {/* Usando flex-1 para que cada item ocupe uma parte igual do espaço disponível */}
            <TabsTrigger value="orders" className="flex-1">{t('nav_orders')}</TabsTrigger>
            <TabsTrigger value="services" className="flex-1">{t('nav_services')}</TabsTrigger>
            <TabsTrigger value="clients" className="flex-1">{t('nav_clients')}</TabsTrigger>
            <TabsTrigger value="teams" className="flex-1">{t('nav_teams')}</TabsTrigger>
            <TabsTrigger value="companies" className="flex-1">{t('nav_companies')}</TabsTrigger>
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

export default Analytics;