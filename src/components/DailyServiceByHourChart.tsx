"use client";

import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDailyServiceCountByHour, DailyServiceCount } from "@/hooks/useDailyServiceCountByHour";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

// Função auxiliar para formatar o rótulo do eixo X (hora)
const formatHour = (tick: number) => {
  return `${tick}h`;
};

// Função auxiliar para formatar o tooltip
const CustomTooltip = ({ active, payload, label, t }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-card border rounded-md shadow-md text-sm">
        <p className="font-bold">{formatHour(label)}</p>
        <p className="text-sm text-primary">{`${t('services_completed')}: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

export default function DailyServiceByHourChart() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useDailyServiceCountByHour();

  if (isLoading) {
    return (
      <Card className="h-64">
        <CardHeader>
          <CardTitle className="text-lg">{t('chart_title_daily_services')}</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !data || data.length === 0 || data.every(d => d.count === 0)) {
    return (
      <Card className="h-64">
        <CardHeader>
          <CardTitle className="text-lg">{t('chart_title_daily_services')}</CardTitle>
        </CardHeader>
        <CardContent className="h-full flex items-center justify-center text-center text-sm text-muted-foreground">
          <span className="text-xs text-center">{isError ? t("chart_error") : t("chart_no_data_today")}</span>
        </CardContent>
      </Card>
    );
  }

  const formattedData: DailyServiceCount[] = data;

  return (
    <Card className="h-64">
      <CardHeader>
        <CardTitle className="text-lg">{t('chart_title_daily_services')}</CardTitle>
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
              dataKey="hour"
              stroke="hsl(var(--foreground))"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatHour}
            />
            <YAxis
              stroke="hsl(var(--foreground))"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}`}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip t={t} />} />
            <Line
              type="monotone"
              dataKey="count"
              name={t('services_completed')}
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