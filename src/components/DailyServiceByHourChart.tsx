import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDailyServiceByHour } from '@/integrations/supabase/useDailyServiceByHour';
import React from 'react';

interface DailyServiceByHourChartProps {
  companyId: string | undefined;
}

const DailyServiceByHourChart: React.FC<DailyServiceByHourChartProps> = ({ companyId }) => {
  const { t } = useTranslation();
  const { data: chartData, isLoading, isError } = useDailyServiceByHour(companyId);

  // --- DEBUG LOG ---
  React.useEffect(() => {
    if (chartData) {
      console.log("Daily Service Chart Data (Raw):", chartData);
    }
  }, [chartData]);
  // -----------------

  const formattedData = React.useMemo(() => {
    if (!chartData) return [];
    
    // Formata os dados para exibição, garantindo que o eixo X seja formatado como HH:00
    return chartData.map(item => ({
      ...item,
      name: `${String(item.hour).padStart(2, '0')}:00`,
    }));
  }, [chartData]);

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Clock className="h-5 w-5" /> {t('chart_title_daily_services')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (isError || formattedData.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Clock className="h-5 w-5" /> {t('chart_title_daily_services')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center p-4 text-muted-foreground h-full flex items-center justify-center">
          {isError ? t("chart_error") : t("chart_no_data_today")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Clock className="h-5 w-5" /> {t('chart_title_daily_services')}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-4rem)] p-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={formattedData}
            margin={{
              top: 10,
              right: 10,
              left: -20,
              bottom: 20,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis 
              dataKey="name" 
              stroke="hsl(var(--foreground))" 
              interval={3}
              fontSize={10}
            />
            <YAxis 
              allowDecimals={false} 
              stroke="hsl(var(--foreground))" 
              label={{ value: t('count'), angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))' } }}
              fontSize={10}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))', 
                borderRadius: '0.5rem',
                fontSize: '0.8rem'
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value, name, props) => [value, t('services_completed')]}
            />
            <Line 
              type="monotone" 
              dataKey="count" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2} 
              dot={{ r: 3 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default DailyServiceByHourChart;