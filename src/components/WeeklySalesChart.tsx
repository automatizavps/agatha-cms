"use client";

import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useProductWeeklySalesCount, WeeklySalesData } from "@/integrations/supabase/productHistory";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WeeklySalesChartProps {
  productId: string;
  productName: string;
}

// Função auxiliar para formatar o rótulo do eixo X (dia da semana)
const formatDay = (dateString: string) => {
  return format(parseISO(dateString), 'EEE', { locale: ptBR }); // Ex: Seg, Ter
};

// Função auxiliar para formatar o tooltip
const CustomTooltip = ({ active, payload, label, t }: any) => {
  if (active && payload && payload.length) {
    const date = parseISO(label);
    return (
      <div className="p-2 bg-card border rounded-md shadow-md text-sm">
        <p className="font-bold">{format(date, 'dd/MM/yyyy', { locale: ptBR })}</p>
        <p className="text-sm text-primary">{`${t('total_sold')}: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

export default function WeeklySalesChart({ productId, productName }: WeeklySalesChartProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useProductWeeklySalesCount(productId);

  if (isLoading) {
    return (
      <Card className="h-64">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" /> {t('weekly_sales_history')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  if (isError || !data || data.length === 0) {
    return (
      <Card className="h-64">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" /> {t('weekly_sales_history')}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-full flex items-center justify-center text-center text-sm text-muted-foreground">
          {isError ? t("chart_error") : t("no_data_found")}
        </CardContent>
      </Card>
    );
  }

  const formattedData: WeeklySalesData[] = data;

  return (
    <Card className="h-64">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" /> {t('weekly_sales_history')}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-4rem)]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={formattedData}
            margin={{
              top: 5,
              right: 0,
              left: -40,
              bottom: 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date_day"
              stroke="hsl(var(--foreground))"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatDay}
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
              dataKey="total_count"
              name={t('total_sold')}
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