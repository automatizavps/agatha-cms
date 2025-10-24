"use client";

import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrderTimeSeries, TimeSeriesCount } from "@/hooks/useDailyOrderByHour";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDashboardFilter } from "@/hooks/useDashboardFilter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DailyOrderByHourChartProps {
  startDate?: Date;
  endDate?: Date;
}

// Função auxiliar para formatar o rótulo do eixo X (hora ou dia)
const formatTimeUnit = (tick: number | string, isPeriod: boolean) => {
  if (isPeriod) {
    // Se for período, formata a data (YYYY-MM-DD) para DD/MM
    try {
      return format(new Date(tick), 'dd/MM', { locale: ptBR });
    } catch {
      return String(tick);
    }
  }
  // Se for hoje, formata a hora
  return `${tick}h`;
};

// Função auxiliar para formatar o tooltip
const CustomTooltip = ({ active, payload, label, t, isPeriod }: any) => {
  if (active && payload && payload.length) {
    const title = isPeriod 
      ? format(new Date(label), 'dd/MM/yyyy', { locale: ptBR })
      : formatTimeUnit(label, false);
      
    return (
      <div className="p-2 bg-card border rounded-md shadow-md text-sm">
        <p className="font-bold">{title}</p>
        <p className="text-sm text-primary">{`${t('orders_delivered')}: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

export default function DailyOrderByHourChart({ startDate, endDate }: DailyOrderByHourChartProps) {
  const { t } = useTranslation();
  // Usando o novo hook
  const { data, isLoading, isError } = useOrderTimeSeries(startDate, endDate);
  const { filteredCompanyId, isSuperAdmin } = useDashboardFilter();
  
  const isPeriodFilterActive = !!startDate && !!endDate;
  
  const chartTitle = isPeriodFilterActive 
    ? t('orders_delivered') + ` (${t('total_orders_period')})`
    : t('chart_title_daily_orders');

  if (isLoading) {
    return (
      <Card className="h-64">
        <CardHeader>
          <CardTitle className="text-lg">{chartTitle}</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  // Se for Super Admin e estiver em 'Todas as Empresas', desabilitamos o gráfico (RPC exige ID)
  if (isSuperAdmin && !filteredCompanyId) {
    return (
      <Card className="h-64">
        <CardHeader>
          <CardTitle className="text-lg">{chartTitle}</CardTitle>
        </CardHeader>
        <CardContent className="h-full flex items-center justify-center text-center text-sm text-muted-foreground">
          {t("select_company_for_metrics")}
        </CardContent>
      </Card>
    );
  }

  if (isError || !data || data.length === 0 || data.every(d => d.count === 0)) {
    return (
      <Card className="h-64">
        <CardHeader>
          <CardTitle className="text-lg">{chartTitle}</CardTitle>
        </CardHeader>
        <CardContent className="h-full flex items-center justify-center text-center text-sm text-muted-foreground">
          {isError ? t("chart_error") : t("chart_no_data_today_orders")}
        </CardContent>
      </Card>
    );
  }

  const formattedData: TimeSeriesCount[] = data;

  return (
    <Card className="h-64">
      <CardHeader>
        <CardTitle className="text-lg">{chartTitle}</CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-4rem)]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={formattedData}
            margin={{
              top: 5,
              right: 0,
              left: -40, // Ajustado de -50 para -40
              bottom: 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="time_unit"
              stroke="hsl(var(--foreground))"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(tick) => formatTimeUnit(tick, isPeriodFilterActive)}
            />
            <YAxis
              stroke="hsl(var(--foreground))"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}`}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip t={t} isPeriod={isPeriodFilterActive} />} />
            <Line
              type="monotone"
              dataKey="count"
              name={t('orders_delivered')}
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}