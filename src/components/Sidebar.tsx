import { cn } from "@/lib/utils";
import { Home, Settings, BarChart3, Users, Calendar, Briefcase, Package, Building, Clock, ShoppingCart } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"; // Importando Tooltip

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isCollapsed: boolean; // Nova prop
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, isCollapsed, onClick }) => {
  const content = (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground"
            : "text-sidebar-foreground",
          isCollapsed && "justify-center", // Centraliza o ícone quando colapsado
        )
      }
    >
      {icon}
      {!isCollapsed && label}
    </NavLink>
  );

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return content;
};

interface SidebarProps {
  onNavigate?: () => void;
  isCollapsed: boolean; // Nova prop
}

const Sidebar: React.FC<SidebarProps> = ({ onNavigate, isCollapsed }) => {
  const { data: profile, isLoading } = useCurrentUserProfile();
  
  // Permissão para gerenciar pedidos, produtos, serviços e usuários (Admin/Super Admin)
  const canManageInventory = !isLoading && profile && (profile.perfil_id === 1 || profile.perfil_id === 2);
  // Permissão para gerenciar clientes (Admin/Super Admin/Funcionário)
  const canManageClients = !isLoading && profile && (profile.perfil_id === 1 || profile.perfil_id === 2 || profile.perfil_id === 3);
  const isSuperAdmin = !isLoading && profile && profile.perfil_id === 1;

  const navItemProps = { isCollapsed, onClick: onNavigate };

  return (
    <div 
      className={cn(
        "flex h-full flex-col border-r bg-sidebar p-4 shadow-lg transition-all duration-300",
        isCollapsed ? "w-[70px]" : "w-full"
      )}
    >
      <div className={cn("flex items-center p-4 border-b mb-4", isCollapsed ? "justify-center" : "justify-start")}>
        <h1 className={cn("text-xl font-bold text-sidebar-primary overflow-hidden transition-opacity duration-300", isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto")}>
          AGATHA IA
        </h1>
        {isCollapsed && <Home className="h-6 w-6 text-sidebar-primary" />}
      </div>
      <nav className="grid gap-2 text-sm font-medium">
        
        {/* Categoria: Geral */}
        {!isCollapsed && (
          <div className="text-xs font-semibold text-muted-foreground uppercase mt-2 mb-1 px-3">Geral</div>
        )}
        <NavItem to="/" icon={<Home className="h-5 w-5" />} label="Home" {...navItemProps} />
        <NavItem
          to="/analytics"
          icon={<BarChart3 className="h-5 w-5" />}
          label="Analytics"
          {...navItemProps}
        />
        
        <Separator className={cn("my-2 bg-sidebar-border", isCollapsed && "mx-auto w-1/2")} />

        {/* Categoria: Operacional */}
        {!isCollapsed && (
          <div className="text-xs font-semibold text-muted-foreground uppercase mb-1 px-3">Operacional</div>
        )}
        
        {canManageInventory && (
          <NavItem
            to="/orders"
            icon={<ShoppingCart className="h-5 w-5" />}
            label="Pedidos"
            {...navItemProps}
          />
        )}
        
        <NavItem
          to="/appointments"
          icon={<Calendar className="h-5 w-5" />}
          label="Agendamentos"
          {...navItemProps}
        />

        {canManageClients && (
          <NavItem
            to="/clients"
            icon={<Briefcase className="h-5 w-5" />}
            label="Clientes"
            {...navItemProps}
          />
        )}

        {canManageInventory && (
          <>
            <NavItem
              to="/products"
              icon={<Package className="h-5 w-5" />}
              label="Produtos"
              {...navItemProps}
            />
            <NavItem
              to="/services"
              icon={<Clock className="h-5 w-5" />}
              label="Serviços"
              {...navItemProps}
            />
            <NavItem
              to="/users"
              icon={<Users className="h-5 w-5" />}
              label="Usuários"
              {...navItemProps}
            />
          </>
        )}
        
        {isSuperAdmin && (
          <NavItem
            to="/companies"
            icon={<Building className="h-5 w-5" />}
            label="Empresas"
            {...navItemProps}
          />
        )}
        
        <Separator className={cn("my-2 bg-sidebar-border", isCollapsed && "mx-auto w-1/2")} />

        {/* Categoria: Configurações */}
        {!isCollapsed && (
          <div className="text-xs font-semibold text-muted-foreground uppercase mb-1 px-3">Configurações</div>
        )}
        <NavItem
          to="/settings"
          icon={<Settings className="h-5 w-5" />}
          label="Configurações"
          {...navItemProps}
        />
      </nav>
    </div>
  );
};

export default Sidebar;