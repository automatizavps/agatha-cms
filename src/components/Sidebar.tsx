import { cn } from "@/lib/utils";
import { Home, Settings, BarChart3, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label }) => (
  <NavLink
    to={to}
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

const Sidebar: React.FC = () => {
  const { data: profile, isLoading } = useCurrentUserProfile();
  
  // Perfis permitidos para Gerenciamento de Usuários: 1 (Super Admin) e 2 (Admin)
  const canManageUsers = !isLoading && profile && (profile.perfil_id === 1 || profile.perfil_id === 2);

  return (
    <div className="flex h-full flex-col border-r bg-sidebar p-4 shadow-lg">
      <div className="flex items-center justify-center p-4 border-b mb-4">
        <h1 className="text-xl font-bold text-sidebar-primary">App Dashboard</h1>
      </div>
      <nav className="grid gap-2 text-sm font-medium">
        <NavItem to="/" icon={<Home className="h-5 w-5" />} label="Home" />
        <NavItem
          to="/analytics"
          icon={<BarChart3 className="h-5 w-5" />}
          label="Analytics"
        />
        
        {canManageUsers && (
          <NavItem
            to="/users"
            icon={<Users className="h-5 w-5" />}
            label="Users"
          />
        )}
        
        <NavItem
          to="/settings"
          icon={<Settings className="h-5 w-5" />}
          label="Settings"
        />
      </nav>
    </div>
  );
};

export default Sidebar;