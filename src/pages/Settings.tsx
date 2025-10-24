import DashboardLayout from "@/components/DashboardLayout";
import CompanyProfileSettings from "@/components/CompanyProfileSettings";
import UserProfileSettings from "@/components/UserProfileSettings";
import { useTranslation } from "react-i18next";

const Settings = () => {
  const { t } = useTranslation();
  
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{t('page_title_settings')}</h1>
        <p className="text-muted-foreground">{t('page_subtitle_settings')}</p>
        
        {/* Seção de Configurações da Conta do Usuário */}
        <UserProfileSettings />
        
        {/* Seção de Configurações da Empresa (Visível para Admin/Super Admin) */}
        <CompanyProfileSettings />
      </div>
    </DashboardLayout>
  );
};

export default Settings;