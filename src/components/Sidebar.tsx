import { cn } from "@/lib/utils";
import { Home, Settings, BarChart3, Users, Calendar, Briefcase, Package, Building, Clock, ShoppingCart, Target, Tag, Bot, Bell, UserCheck, ChevronDown } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import React, { useState, useEffect } from "react";
import { useCanRead } from "@/hooks/use-module-permission";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isCollapsed: boolean;
  onClick?: () => void;
  isSubItem?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, isCollapsed, onClick, isSubItem = false }) => {
  
  const renderIcon = (isActive: boolean) => {
    const iconColorClass = isActive 
      ? "text-sidebar-primary-foreground"
      : "text-sidebar-primary";
      
    const iconClasses = cn(
      "h-5 w-5 flex-shrink-0", 
      iconColorClass,
      isCollapsed ? "mr-0" : "mr-3"
    );
    
    if (React.isValidElement(icon)) {
      return React.cloneElement(icon as React.ReactElement, { 
        className: cn(icon.props.className, iconClasses) 
      });
    }
    return <span className={iconClasses}>{icon}</span>;
  };
  
  const content = (
    <NavLink
      to={to}
      onClick={onClick}
      end={to !== "/"} 
      className={({ isActive }) =>
        cn(
          "flex items-center rounded-lg py-2 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground"
            : "text-sidebar-foreground",
          isCollapsed ? "justify-start w-full pl-6 pr-2 gap-0" : "px-3 gap-3",
          isSubItem && !isCollapsed && "pl-8 text-sm py-1.5",
        )
      }
    >
      {({ isActive }) => (
        <>
          {renderIcon(isActive)}
          {!isCollapsed && label}
        </>
      )}
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

interface SidebarGroupProps {
  icon: React.ReactNode;
  label: string;
  isCollapsed: boolean;
  children: React.ReactNode;
  onNavigate?: () => void;
  basePath: string; 
}

const SidebarGroup: React.FC<SidebarGroupProps> = ({ icon, label, isCollapsed, children, onNavigate, basePath }) => {
  const location = useLocation();
  const { t } = useTranslation();
  
  // Verifica se a rota atual começa com o basePath (usado para determinar se o grupo deve estar aberto)
  const isRouteActive = location.pathname.startsWith(basePath);
  
  // HOOKS MOVIDOS PARA O TOPO (incondicionalmente)
  const [isOpen, setIsOpen] = useState(isRouteActive);
  
  // Sync internal state with active route when expanded
  useEffect(() => {
    if (!isCollapsed) {
      setIsOpen(isRouteActive);
    }
  }, [isRouteActive, isCollapsed]);
  
  // Helper para verificar se algum subitem está ativo (para o destaque do ícone no modo colapsado)
  const isAnySubItemActive = isRouteActive;

  // Helper to render the icon with correct styling
  const renderIcon = (isActive: boolean) => {
    // No modo expandido, o ícone do grupo não deve ter a cor primária, a menos que o grupo esteja aberto
    // No modo colapsado, o ícone deve ter a cor primária se qualquer subitem estiver ativo
    const iconColorClass = isCollapsed && isAnySubItemActive
      ? "text-sidebar-primary-foreground"
      : "text-sidebar-primary";
      
    const iconClasses = cn(
      "h-5 w-5 flex-shrink-0", 
      iconColorClass, 
      isCollapsed ? "mr-0" : "mr-3"
    );
    
    if (React.isValidElement(icon)) {
      return React.cloneElement(icon as React.ReactElement, { 
        className: cn(icon.props.className, iconClasses) 
      });
    }
    return <span className={iconClasses}>{icon}</span>;
  };
  
  // Helper to render the children as DropdownMenuItems
  const renderDropdownItems = () => {
    return React.Children.map(children, (child) => {
      if (React.isValidElement(child) && child.type === NavItem) {
        const navItemProps = child.props as NavItemProps;
        
        return (
          <DropdownMenuItem key={navItemProps.to} asChild>
            <NavLink 
              to={navItemProps.to} 
              onClick={onNavigate}
              className={({ isActive: isSubActive }) => cn(
                "flex items-center w-full px-2 py-1.5 text-sm transition-colors",
                isSubActive ? "text-primary font-semibold" : "text-foreground hover:text-primary"
              )}
            >
              {/* Renderiza o ícone do sub-item com cor baseada no estado ativo */}
              {React.cloneElement(navItemProps.icon as React.ReactElement, { 
                className: cn("h-4 w-4 mr-2", navItemProps.to === location.pathname ? "text-primary" : "text-muted-foreground") 
              })}
              {navItemProps.label}
            </NavLink>
          </DropdownMenuItem>
        );
      }
      return child;
    });
  };

  if (isCollapsed) {
    // Collapsed state: Dropdown Menu triggered by the icon
    return (
      <DropdownMenu>
        <Tooltip delayDuration={0}>
          <DropdownMenuTrigger asChild>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "flex items-center justify-center rounded-lg py-2 transition-all cursor-pointer",
                  // Apenas aplica o fundo primário se estiver colapsado E a rota for ativa
                  isAnySubItemActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-primary hover:bg-sidebar-accent"
                )}
              >
                {renderIcon(isAnySubItemActive)}
              </div>
            </TooltipTrigger>
          </DropdownMenuTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
        
        <DropdownMenuContent side="right" align="start" className="w-56 ml-2">
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {renderDropdownItems()}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Expanded state: Collapsible
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger 
        className={cn(
          "flex items-center justify-between w-full rounded-lg py-2 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          // Remove o destaque de fundo do CollapsibleTrigger, deixando apenas o NavItem fazer isso.
          // Mantemos o texto foreground padrão.
          "text-sidebar-foreground",
          "px-3"
        )}
      >
        <div className={cn("flex items-center gap-3")}>
          {/* O ícone agora usa a cor primária padrão no modo expandido */}
          {renderIcon(false)} 
          {label}
        </div>
        <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-1">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};


interface SidebarProps {
  onNavigate?: () => void;
  isCollapsed: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ onNavigate, isCollapsed }) => {
  const { data: profile, isLoading } = useCurrentUserProfile();
  const { t } = useTranslation();
  
  // Permissões baseadas no novo hook
  const canReadAnalytics = useCanRead('analytics');
  const canReadOrders = useCanRead('orders');
  const canReadAppointments = useCanRead('appointments');
  const canReadClients = useCanRead('clients');
  const canReadProducts = useCanRead('products');
  const canReadServices = useCanRead('services');
  const canReadCategories = useCanRead('categories');
  const canReadUsers = useCanRead('users');
  const canReadTeams = useCanRead('teams');
  const canReadCompanies = useCanRead('companies');
  const canReadNotifications = useCanRead('notifications');
  const canReadCustomProfiles = useCanRead('custom_profiles'); 

  const navItemProps = { isCollapsed, onClick: onNavigate };
  
  // Verifica se o grupo de Produtos/Serviços deve ser exibido
  const showProductsServicesGroup = canReadProducts || canReadServices || canReadCategories;
  
  // Verifica se o grupo de Empresas deve ser exibido
  const showCompaniesGroup = canReadCompanies || canReadCustomProfiles;


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
        
        {canReadAnalytics && (
          <NavItem
            to="/analytics"
            icon={<BarChart3 className="h-5 w-5" />}
            label={t('nav_analytics')}
            {...navItemProps}
          />
        )}
        
        <Separator className={cn("my-2 bg-sidebar-border", isCollapsed && "mx-auto w-1/2")} />

        {/* Categoria: Operacional */}
        {!isCollapsed && (
          <div className="text-xs font-semibold text-muted-foreground uppercase mb-1 px-3">{t('nav_operational')}</div>
        )}
        
        {canReadNotifications && (
          <NavItem
            to="/notifications"
            icon={<Bell className="h-5 w-5" />}
            label={t('page_title_notifications')}
            {...navItemProps}
          />
        )}
        
        {canReadOrders && (
          <NavItem
            to="/orders"
            icon={<ShoppingCart className="h-5 w-5" />}
            label={t('nav_orders')}
            {...navItemProps}
          />
        )}
        
        {canReadAppointments && (
          <NavItem
            to="/appointments"
            icon={<Calendar className="h-5 w-5" />}
            label={t('nav_appointments')}
            {...navItemProps}
          />
        )}

        {canReadClients && (
          <NavItem
            to="/clients"
            icon={<Briefcase className="h-5 w-5" />}
            label={t('nav_clients')}
            {...navItemProps}
          />
        )}

        {showProductsServicesGroup && (
          <SidebarGroup
            icon={<Package className="h-5 w-5" />}
            label={t('nav_products_services')}
            isCollapsed={isCollapsed}
            onNavigate={onNavigate}
            basePath="/products"
          >
            {canReadProducts && (
              <NavItem
                to="/products"
                icon={<Package className="h-5 w-5" />}
                label={t('nav_products')}
                isSubItem
                isCollapsed={false}
                onClick={onNavigate}
              />
            )}
            {canReadServices && (
              <NavItem
                to="/services"
                icon={<Clock className="h-5 w-5" />}
                label={t('nav_services')}
                isSubItem
                isCollapsed={false}
                onClick={onNavigate}
              />
            )}
            {canReadCategories && (
              <NavItem
                to="/products/categories"
                icon={<Tag className="h-5 w-5" />}
                label={t('page_title_categories')}
                isSubItem
                isCollapsed={false}
                onClick={onNavigate}
              />
            )}
          </SidebarGroup>
        )}
        
        {canReadUsers && (
          <NavItem
            to="/users"
            icon={<Users className="h-5 w-5" />}
            label={t('nav_users')}
            {...navItemProps}
          />
        )}
        
        {canReadTeams && (
          <NavItem
            to="/teams"
            icon={<Target className="h-5 w-5" />}
            label={t('nav_teams')}
            {...navItemProps}
          />
        )}
        
        {showCompaniesGroup && (
          <SidebarGroup
            icon={<Building className="h-5 w-5" />}
            label={t('nav_companies')}
            isCollapsed={isCollapsed}
            onNavigate={onNavigate}
            basePath="/companies"
          >
            {canReadCompanies && (
              <NavItem
                to="/companies"
                icon={<Building className="h-5 w-5" />}
                label={t('company_list_title')}
                isSubItem
                isCollapsed={false}
                onClick={onNavigate}
              />
            )}
            {canReadCustomProfiles && (
              <NavItem
                to="/companies/profiles"
                icon={<UserCheck className="h-5 w-5" />}
                label={t('page_title_custom_profiles')}
                isSubItem
                isCollapsed={false}
                onClick={onNavigate}
              />
            )}
          </SidebarGroup>
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