import { MadeWithDyad } from "@/components/made-with-dyad";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck, Clock, Users, Loader2 } from "lucide-react";
import { useAppointmentMetrics } from "@/integrations/supabase/useAppointmentMetrics";
import { useTranslation } from "react-i18next"; // Importando useTranslation

const Index = () => {
  const { metrics, isLoading } = useAppointmentMetrics();
  const { t } = useTranslation(); // Hook de tradução

  const renderMetricValue = (value: number) => {
    if (isLoading) {
      return <Loader2 className="h-6 w-6 animate-spin text-primary" />;
    }
    return <div className="text-2xl font-bold">{value}</div>;
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t('dashboard_title')}</h1>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          
          {/* Card 1: Total de Agendamentos */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('total_appointments')}</CardTitle>
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {renderMetricValue(metrics.totalAppointments)}
              <p className="text-xs text-muted-foreground">{t('appointments_overview')}</p>
            </CardContent>
          </Card>
          
          {/* Card 2: Agendamentos Confirmados */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('confirmed_appointments')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {renderMetricValue(metrics.confirmedAppointments)}
              <p className="text-xs text-muted-foreground">{t('confirmed_status')}</p>
            </CardContent>
          </Card>
          
          {/* Card 3: Agendamentos Pendentes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('pending_appointments')}</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {renderMetricValue(metrics.pendingAppointments)}
              <p className="text-xs text-muted-foreground">{t('pending_status')}</p>
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-4">
          <MadeWithDyad />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;