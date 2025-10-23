import DashboardLayout from "@/components/DashboardLayout";
import AppointmentStatusChart from "@/components/AppointmentStatusChart";

const Analytics = () => {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Relatórios detalhados e visualizações de dados.</p>
        
        {/* Gráfico de Status de Agendamentos */}
        <AppointmentStatusChart />
        
        {/* Placeholder para outros relatórios */}
        <div className="h-64 w-full rounded-lg border border-dashed flex items-center justify-center text-muted-foreground bg-card p-4">
          Outros relatórios e métricas virão aqui.
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;