"use client";

import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDailyOrderByHour, DailyOrderCount } from "@/hooks/useDailyOrderByHour";
import { Loader2, CalendarIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDashboardFilter } from "@/hooks/useDashboardFilter";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
        <p className="text-sm text-primary">{`${t('orders_delivered')}: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

export default function DailyOrderByHourChart() {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  // Formata a data para YYYY-MM-DD para o hook
  const targetDateString = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined;
  
  const { data, isLoading, isError } = useDailyOrderByHour(targetDateString);
  const { filteredCompanyId, isSuperAdmin } = useDashboardFilter();

  const chartTitle = selectedDate 
    ? `${t('chart_title_daily_orders')} (${format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })})`
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
  
  const hasData = data && data.length > 0 && data.some(d => d.count > 0);

  if (isError || !hasData) {
    return (
      <Card className="h-64">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">{chartTitle}</CardTitle>
          <DateFilter selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
        </CardHeader>
        <CardContent className="h-full flex items-center justify-center text-center text-sm text-muted-foreground">
          {isError ? t("chart_error") : t("chart_no_data_today_orders")}
        </CardContent>
      </Card>
    );
  }

  const formattedData: DailyOrderCount[] = data;

  return (
    <Card className="h-64">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">{chartTitle}</CardTitle>
        <DateFilter selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
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

// Componente auxiliar para o filtro de data
interface DateFilterProps {
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
}

const DateFilter: React.FC<DateFilterProps> = ({ selectedDate, setSelectedDate }) => {
  const { t } = useTranslation();
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[150px] justify-start text-left font-normal h-8",
            !selectedDate && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? (
            format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })
          ) : (
            <span>{t('select_date')}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          initialFocus
          locale={ptBR}
        />
      </PopoverContent>
    </Popover>
  );
};