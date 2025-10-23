import { cn } from "@/lib/utils";
import { Home, Settings, BarChart3, Users, Calendar, Briefcase } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void; // Adiciona prop onClick
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick} // Chama onClick ao navegar
    className={({ isActive }) =>
      cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        isActive
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-sidebar-foreground",
      )
    }
  >
    {icon}
    {label}
  </NavLink>
);

interface SidebarProps {
  onNavigate?: () => void; // Nova prop para fechar o menu no mobile
}

const Sidebar: React.FC<SidebarProps> = ({ onNavigate }) => {
  const { data: profile, isLoading } = useCurrentUserProfile();
  
  // Perfis permitidos para Gerenciamento de Usuários e Clientes: 1 (Super Admin) e 2 (Admin)
  const canManage = !isLoading && profile && (profile.perfil_id === 1 || profile.perfil_id === 2);

  return (
    <div className="flex h-full flex-col border-r bg-sidebar p-4 shadow-lg">
      <div className="flex items-center justify-center p-4 border-b mb-4">
        <h1 className="text-xl font-bold text-sidebar-primary">App Dashboard</h1>
      </div>
      <nav className="grid gap-2 text-sm font-medium">
        <NavItem to="/" icon={<Home className="h-5 w-5" />} label="Home" onClick={onNavigate} />
        <NavItem
          to="/appointments"
          icon={<Calendar className="h-5 w-5" />}
          label="Agendamentos"
          onClick={onNavigate}
        />
        <NavItem
          to="/analytics"
          icon={<BarChart3 className="h-5 w-5" />}
          label="Analytics"
          onClick={onNavigate}
        />
        
        {canManage && (
          <>
            <NavItem
              to="/clients"
              icon={<Briefcase className="h-5 w-5" />}
              label="Clientes"
              onClick={onNavigate}
            />
            <NavItem
              to="/users"
              icon={<Users className="h-5 w-5" />}
              label="Users"
              onClick={onNavigate}
            />
          </>
        )}
        
        <NavItem
          to="/settings"
          icon={<Settings className="h-5 w-5" />}
          label="Settings"
          onClick={onNavigate}
        />
      </nav>
    </div>
  );
};

export default Sidebar;