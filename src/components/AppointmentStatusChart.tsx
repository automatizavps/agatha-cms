import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAppointmentChartData } from '@/integrations/supabase/useAppointmentChartData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const AppointmentStatusChart = () => {
  const { chartData, isLoading, isError } = useAppointmentChartData();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || chartData.length === 0) {
    return (
      <div className="text-center p-4 text-muted-foreground h-96 flex items-center justify-center">
        {isError ? "Erro ao carregar dados do gráfico." : "Nenhum dado de agendamento para exibir."}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição de Status de Agendamentos</CardTitle>
      </CardHeader>
      <CardContent className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" stroke="hsl(var(--foreground))" />
            <YAxis allowDecimals={false} stroke="hsl(var(--foreground))" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))', 
                borderRadius: '0.5rem' 
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Bar dataKey="count" name="Contagem" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))">
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