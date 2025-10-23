import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Recursos de tradução
const resources = {
  'pt-BR': {
    translation: {
      // Geral
      "app_name": "AGATHA IA",
      "loading": "Carregando...",
      "actions": "Ações",
      "save_changes": "Salvar Alterações",
      "try_again": "Tentar Novamente",
      "not_found": "Página não encontrada",
      
      // Navegação
      "nav_home": "Home",
      "nav_analytics": "Analytics",
      "nav_users": "Usuários",
      "nav_appointments": "Agendamentos",
      "nav_clients": "Clientes",
      "nav_products": "Produtos",
      "nav_services": "Serviços",
      "nav_orders": "Pedidos",
      "nav_companies": "Empresas",
      "nav_settings": "Configurações",
      "nav_profile": "Meu Perfil",
      "nav_general": "Geral",
      "nav_operational": "Operacional",
      "nav_config": "Configurações",

      // Dashboard
      "dashboard_title": "Visão Geral do Dashboard",
      "total_appointments": "Total de Agendamentos",
      "confirmed_appointments": "Confirmados",
      "pending_appointments": "Pendentes",
      "appointments_overview": "Visão geral de todos os agendamentos",
      "confirmed_status": "Agendamentos com status 'confirmado'",
      "pending_status": "Aguardando confirmação",
    },
  },
  en: {
    translation: {
      // Geral
      "app_name": "AGATHA AI",
      "loading": "Loading...",
      "actions": "Actions",
      "save_changes": "Save Changes",
      "try_again": "Try Again",
      "not_found": "Page not found",

      // Navegação
      "nav_home": "Home",
      "nav_analytics": "Analytics",
      "nav_users": "Users",
      "nav_appointments": "Appointments",
      "nav_clients": "Clients",
      "nav_products": "Products",
      "nav_services": "Services",
      "nav_orders": "Orders",
      "nav_companies": "Companies",
      "nav_settings": "Settings",
      "nav_profile": "My Profile",
      "nav_general": "General",
      "nav_operational": "Operational",
      "nav_config": "Settings",

      // Dashboard
      "dashboard_title": "Dashboard Overview",
      "total_appointments": "Total Appointments",
      "confirmed_appointments": "Confirmed",
      "pending_appointments": "Pending",
      "appointments_overview": "Overview of all appointments",
      "confirmed_status": "Appointments with 'confirmed' status",
      "pending_status": "Awaiting confirmation",
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'pt-BR', // Idioma padrão
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React já protege contra XSS
    },
  });

export default i18n;