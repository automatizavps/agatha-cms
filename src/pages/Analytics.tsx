import DashboardLayout from "@/components/DashboardLayout";
import { useTranslation } from "react-i18next";

const Analytics = () => {
  const { t } = useTranslation();
  
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold tracking-tight">{t('page_title_analytics')}</h1>
        <p className="text-muted-foreground">{t('page_subtitle_analytics')}</p>
        
        {/* Placeholder para relatórios */}
        <div className="h-96 w-full rounded-lg border border-dashed flex items-center justify-center text-muted-foreground bg-card p-4">
          {t('analytics_placeholder')}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;