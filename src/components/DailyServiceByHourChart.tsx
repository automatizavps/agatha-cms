"use client";

import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDailyServiceCountByHour, DailyServiceCount } from "@/hooks/useDailyServiceCountByHour";
import { Skeleton } from "@/components/ui/skeleton";

// Função auxiliar para formatar o rótulo do eixo X (hora)
const formatHour = (tick: number) => {
  return `${tick}h`;
};

// Função auxiliar para formatar o tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-white border rounded-md shadow-md text-sm">
        <p className="font-bold">{formatHour(label)}</p>
        <p className="text-sm text-primary">{`Agendamentos: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

export function DailyServiceByHourChart() {
  const { data, isLoading, isError } = useDailyServiceCountByHour();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agendamentos por Hora (Hoje)</CardTitle>
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center">
          <Skeleton className="w-full h-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agendamentos por Hora (Hoje)</CardTitle>
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center text-center text-sm text-muted-foreground">
          Não foi possível carregar os dados de agendamentos diários.
        </CardContent>
      </Card>
    );
  }

  // Os dados já vêm formatados do hook: [{ hour: 0, count: 5 }, ...]
  const formattedData: DailyServiceCount[] = data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agendamentos por Hora (Hoje)</CardTitle>
      </CardHeader>
      <CardContent className="h-[350px] pb-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={formattedData}
            margin={{
              top: 10,
              right: 10,
              left: -10,
              bottom: 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="hour"
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatHour}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#3b82f6" // blue-500
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}