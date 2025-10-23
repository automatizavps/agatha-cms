import DashboardLayout from "@/components/DashboardLayout";

const Settings = () => {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your application settings here.</p>
        
        {/* Placeholder for settings forms */}
        <div className="p-6 rounded-lg border bg-card">
          <h2 className="text-xl font-semibold mb-4">General Settings</h2>
          <p className="text-sm text-muted-foreground">Configuration options will be added soon.</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;