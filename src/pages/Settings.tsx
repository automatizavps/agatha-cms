import DashboardLayout from "@/components/DashboardLayout";
import CompanyProfileSettings from "@/components/CompanyProfileSettings";

const Settings = () => {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as configurações da sua conta e da sua empresa.</p>
        
        {/* Seção de Configurações da Empresa (Visível para Admin/Super Admin) */}
        <CompanyProfileSettings />
        
        {/* Placeholder para configurações de conta do usuário */}
        <div className="p-6 rounded-lg border bg-card">
          <h2 className="text-xl font-semibold mb-4">Configurações da Conta</h2>
          <p className="text-sm text-muted-foreground">Opções de perfil e senha virão aqui.</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;