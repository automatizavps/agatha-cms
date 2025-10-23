import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAppointmentChartData } from '@/integrations/supabase/useAppointmentChartData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const AppointmentStatusChart = () => {
  const { chartData, isLoading, isError } = useAppointmentChartData();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card className="h-64">
        <CardHeader>
          <CardTitle>{t('chart_title_appointment_status')}</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (isError || chartData.length === 0) {
    return (
      <Card className="h-64">
        <CardHeader>
          <CardTitle>{t('chart_title_appointment_status')}</CardTitle>
        </CardHeader>
        <CardContent className="text-center p-4 text-muted-foreground h-full flex items-center justify-center">
          {isError ? t("chart_error") : t("chart_no_data")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-64">
      <CardHeader>
        <CardTitle>{t('chart_title_appointment_status')}</CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-4rem)]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 5,
              right: 10, // Reduzido de 30
              left: -20, // Movido para a esquerda para economizar espaço
              bottom: 0, // Reduzido de 5
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
                fontSize: '0.8rem' // Fonte menor no tooltip
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