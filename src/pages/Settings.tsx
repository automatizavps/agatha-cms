import DashboardLayout from "@/components/DashboardLayout";
import CompanyProfileSettings from "@/components/CompanyProfileSettings";
import UserProfileSettings from "@/components/UserProfileSettings"; // Importando o novo componente

const Settings = () => {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as configurações da sua conta e da sua empresa.</p>
        
        {/* Seção de Configurações da Conta do Usuário */}
        <UserProfileSettings />
        
        {/* Seção de Configurações da Empresa (Visível para Admin/Super Admin) */}
        <CompanyProfileSettings />
      </div>
    </DashboardLayout>
  );
};

export default Settings;