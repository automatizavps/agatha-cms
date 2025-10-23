import DashboardLayout from "@/components/DashboardLayout";
import AppointmentStatusChart from "@/components/AppointmentStatusChart";
import { useTranslation } from "react-i18next";

const Analytics = () => {
  const { t } = useTranslation();
  
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold tracking-tight">{t('page_title_analytics')}</h1>
        <p className="text-muted-foreground">{t('page_subtitle_analytics')}</p>
        
        {/* Gráfico de Status de Agendamentos */}
        <AppointmentStatusChart />
        
        {/* Placeholder para outros relatórios */}
        <div className="h-64 w-full rounded-lg border border-dashed flex items-center justify-center text-muted-foreground bg-card p-4">
          {t('analytics_placeholder')}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;