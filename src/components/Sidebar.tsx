import { cn } from "@/lib/utils";
import { Home, Settings, BarChart3, Users, Calendar, Briefcase, Package, Building, Clock, ShoppingCart, Target, Tag, Bot } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isCollapsed: boolean;
  onClick?: () => void;
  isSubItem?: boolean; // Novo prop para sub-itens
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, isCollapsed, onClick, isSubItem = false }) => {
  const content = (
    <NavLink
      to={to}
      onClick={onClick}
      // Usamos 'end' para garantir que apenas a rota exata seja ativada,
      // a menos que seja a rota raiz "/"
      end={to !== "/"} 
      className={({ isActive }) =>
        cn(
          "flex items-center rounded-lg py-2 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground"
            : "text-sidebar-foreground",
          // Estilos para estado colapsado: centraliza, usa px-3 para alinhamento visual
          isCollapsed ? "justify-center w-full px-3 gap-0" : "px-3 gap-3",
          // Estilos para sub-item
          isSubItem && !isCollapsed && "pl-8 text-sm py-1.5",
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
  isCollapsed: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ onNavigate, isCollapsed }) => {
  const { data: profile, isLoading } = useCurrentUserProfile();
  const { t } = useTranslation();
  const location = useLocation(); // Usando useLocation
  
  const canManageInventory = !isLoading && profile && (profile.perfil_id === 1 || profile.perfil_id === 2);
  const canManageClients = !isLoading && profile && (profile.perfil_id === 1 || profile.perfil_id === 2 || profile.perfil_id === 3);
  const isSuperAdmin = !isLoading && profile && profile.perfil_id === 1;

  const navItemProps = { isCollapsed, onClick: onNavigate };
  
  // Determina se o submenu de Produtos/Serviços deve estar aberto
  const isProductsServicesOpen = location.pathname.startsWith('/products') || location.pathname.startsWith('/services');

  return (
    <div 
      className={cn(
        "flex h-full flex-col border-r bg-sidebar py-0 shadow-lg transition-all duration-300 overflow-x-hidden",
        isCollapsed ? "w-[70px] px-0" : "w-full px-4"
      )}
    >
      {/* Cabeçalho: Ícone Bot */}
      <div className={cn("flex items-center border-b mb-4", isCollapsed ? "justify-center p-4" : "justify-start p-4")}>
        <Bot className={cn("h-8 w-8 text-sidebar-primary flex-shrink-0", !isCollapsed && "mr-2")} />
        
        {/* Título do App */}
        <h1 className={cn("text-xl font-bold text-sidebar-primary overflow-hidden transition-opacity duration-300", isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto")}>
          {t('app_name')}
        </h1>
      </div>
      <nav className={cn("grid gap-2 text-sm font-medium overflow-y-auto pb-4", isCollapsed ? "px-0" : "px-0")}>
        
        {/* Categoria: Geral */}
        {!isCollapsed && (
          <div className="text-xs font-semibold text-muted-foreground uppercase mt-2 mb-1 px-3">{t('nav_general')}</div>
        )}
        <NavItem to="/" icon={<Home className="h-5 w-5" />} label={t('nav_home')} {...navItemProps} />
        <NavItem
          to="/analytics"
          icon={<BarChart3 className="h-5 w-5" />}
          label={t('nav_analytics')}
          {...navItemProps}
        />
        
        <Separator className={cn("my-2 bg-sidebar-border", isCollapsed && "mx-auto w-1/2")} />

        {/* Categoria: Operacional */}
        {!isCollapsed && (
          <div className="text-xs font-semibold text-muted-foreground uppercase mb-1 px-3">{t('nav_operational')}</div>
        )}
        
        {canManageInventory && (
          <NavItem
            to="/orders"
            icon={<ShoppingCart className="h-5 w-5" />}
            label={t('nav_orders')}
            {...navItemProps}
          />
        )}
        
        <NavItem
          to="/appointments"
          icon={<Calendar className="h-5 w-5" />}
          label={t('nav_appointments')}
          {...navItemProps}
        />

        {canManageClients && (
          <NavItem
            to="/clients"
            icon={<Briefcase className="h-5 w-5" />}
            label={t('nav_clients')}
            {...navItemProps}
          />
        )}

        {canManageInventory && (
          <>
            {/* Submenu de Produtos/Serviços */}
            <Collapsible defaultOpen={isProductsServicesOpen} disabled={isCollapsed}>
              <CollapsibleTrigger 
                className={cn(
                  "flex items-center justify-between w-full rounded-lg py-2 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isCollapsed ? "justify-center px-3" : "px-3" // Alterado para px-3
                )}
              >
                <div className={cn("flex items-center", isCollapsed ? "justify-center w-full gap-0" : "gap-3")}>
                  <Package className="h-5 w-5" />
                  {!isCollapsed && t('nav_products_services')}
                </div>
                {!isCollapsed && <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1">
                <NavItem
                  to="/products"
                  icon={<Package className="h-5 w-5" />}
                  label={t('nav_products')}
                  isSubItem
                  {...navItemProps}
                />
                <NavItem
                  to="/services"
                  icon={<Clock className="h-5 w-5" />}
                  label={t('nav_services')}
                  isSubItem
                  {...navItemProps}
                />
                <NavItem
                  to="/products/categories"
                  icon={<Tag className="h-5 w-5" />}
                  label={t('nav_categories')}
                  isSubItem
                  {...navItemProps}
                />
              </CollapsibleContent>
            </Collapsible>
            
            <NavItem
              to="/users"
              icon={<Users className="h-5 w-5" />}
              label={t('nav_users')}
              {...navItemProps}
            />
            <NavItem
              to="/teams"
              icon={<Target className="h-5 w-5" />}
              label={t('nav_teams')}
              {...navItemProps}
            />
          </>
        )}
        
        {isSuperAdmin && (
          <NavItem
            to="/companies"
            icon={<Building className="h-5 w-5" />}
            label={t('nav_companies')}
            {...navItemProps}
          />
        )}
        
        <Separator className={cn("my-2 bg-sidebar-border", isCollapsed && "mx-auto w-1/2")} />

        {/* Categoria: Configurações */}
        {!isCollapsed && (
          <div className="text-xs font-semibold text-muted-foreground uppercase mb-1 px-3">{t('nav_config')}</div>
        )}
        <NavItem
          to="/settings"
          icon={<Settings className="h-5 w-5" />}
          label={t('nav_settings')}
          {...navItemProps}
        />
      </nav>
    </div>
  );
};

export default Sidebar;