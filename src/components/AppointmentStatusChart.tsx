import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAppointmentChartData } from '@/integrations/supabase/useAppointmentChartData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDashboardFilter } from '@/hooks/useDashboardFilter'; // Importando

const AppointmentStatusChart: React.FC = () => {
  // O hook useAppointmentChartData agora obtém o companyId do contexto
  const { chartData, isLoading, isError } = useAppointmentChartData();
  const { t } = useTranslation();
  const { filteredCompanyId, isSuperAdmin } = useDashboardFilter(); // Usando o filtro

  if (isLoading) {
    return (
      <Card className="h-64">
        <CardHeader>
          <CardTitle className="text-lg">{t('chart_title_appointment_status')}</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  // Se for Super Admin e estiver em 'Todas as Empresas', desabilitamos o gráfico
  if (isSuperAdmin && !filteredCompanyId) {
    return (
      <Card className="h-64">
        <CardHeader>
          <CardTitle className="text-lg">{t('chart_title_appointment_status')}</CardTitle>
        </CardHeader>
        <CardContent className="h-full flex items-center justify-center text-center text-sm text-muted-foreground">
          {t("select_company_for_metrics")}
        </CardContent>
      </Card>
    );
  }

  if (isError || chartData.length === 0) {
    return (
      <Card className="h-64">
        <CardHeader>
          <CardTitle className="text-lg">{t('chart_title_appointment_status')}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 text-muted-foreground h-full flex items-center justify-center">
          {isError ? t("chart_error") : t("chart_no_data")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-64">
      <CardHeader>
        <CardTitle className="text-lg">{t('chart_title_appointment_status')}</CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-4rem)]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 5,
              right: 0, 
              left: -30, // Ajustado de -40 para -30
              bottom: 0, 
            }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" stroke="hsl(var(--foreground))" fontSize={10} />
            <YAxis allowDecimals={false} stroke="hsl(var(--foreground))" fontSize={10} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))', 
                borderRadius: '0.5rem',
                fontSize: '0.8rem'
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Bar dataKey="count" name={t('count')} radius={[4, 4, 0, 0]} fill="hsl(var(--primary))">
              {chartData.map((entry, index) => (
                <Bar key={`bar-${index}`} dataKey="count" fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default AppointmentStatusChart;