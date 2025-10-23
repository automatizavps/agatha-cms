import DashboardLayout from "@/components/DashboardLayout";

const Analytics = () => {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Detailed reports and data visualizations will go here.</p>
        
        {/* Placeholder for charts/tables */}
        <div className="h-96 w-full rounded-lg border border-dashed flex items-center justify-center text-muted-foreground">
          Analytics Content Area
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;