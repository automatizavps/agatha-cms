import { cn } from "@/lib/utils";
import { Home, Settings, BarChart3, Users, Calendar, Briefcase, Package, Building, Clock, ShoppingCart, Target, Tag, Bot, Bell, UserCheck } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import React, { useState, useEffect } from "react"; // Importando useState e useEffect
import { useCanRead } from "@/hooks/use-module-permission"; // REINTRODUZIDO

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isCollapsed: boolean;
  onClick?: () => void;
  isSubItem?: boolean; // Novo prop para sub-itens
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, isCollapsed, onClick, isSubItem = false }) => {
  
  const renderIcon = (isActive: boolean) => {
    // Cor do ícone: Branco quando ativo, Roxo quando inativo
    const iconColorClass = isActive 
      ? "text-sidebar-primary-foreground" // Branco
      : "text-sidebar-primary"; // Roxo
      
    const iconClasses = cn(
      "h-5 w-5 flex-shrink-0", 
      iconColorClass, // Aplica a cor
      isCollapsed ? "mr-0" : "mr-3" // Adiciona margem para separar do label quando não colapsado
    );
    
    // Clona o elemento para injetar as classes de cor e tamanho
    if (React.isValidElement(icon)) {
      // Remove classes de cor existentes e aplica as novas
      // Usamos cn para garantir que a classe de cor seja aplicada corretamente
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
      // Usamos 'end' para garantir que apenas a rota exata seja ativada,
      // a menos que seja a rota raiz "/"
      end={to !== "/"} 
      className={({ isActive }) =>
        cn(
          "flex items-center rounded-lg py-2 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground" // Ativo: Fundo roxo, texto branco
            : "text-sidebar-foreground", // Inativo: Texto cinza (para o label)
          // Estilos para estado colapsado: pl-6 pr-2 para centralização visual
          isCollapsed ? "justify-start w-full pl-6 pr-2 gap-0" : "px-3 gap-3",
          // Estilos para sub-item
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

interface SidebarProps {
  onNavigate?: () => void;
  isCollapsed: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ onNavigate, isCollapsed }) => {
  const { data: profile, isLoading } = useCurrentUserProfile();
  const { t } = useTranslation();
  const location = useLocation();
  
  // Permissões reintroduzidas usando o hook
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

  const isSuperAdmin = profile?.is_super_admin;

  const navItemProps = { isCollapsed, onClick: onNavigate };
  
  // 1. Estados controlados para os submenus
  const [isProductsServicesOpen, setIsProductsServicesOpen] = useState(
    location.pathname.startsWith('/products') || location.pathname.startsWith('/services')
  );
  const [isCompaniesOpen, setIsCompaniesOpen] = useState(
    location.pathname.startsWith('/companies')
  );
  
  // 2. Efeito para fechar os submenus quando a barra lateral é colapsada
  useEffect(() => {
    if (isCollapsed) {
      setIsProductsServicesOpen(false);
      setIsCompaniesOpen(false);
    }
  }, [isCollapsed]);
  
  // 3. Efeito para manter o submenu aberto se a rota for ativa (mesmo após navegação interna)
  useEffect(() => {
    const isProductsServicesActive = location.pathname.startsWith('/products') || location.pathname.startsWith('/services');
    const isCompaniesActive = location.pathname.startsWith('/companies');
    
    if (isProductsServicesActive && !isCollapsed) {
      setIsProductsServicesOpen(true);
    }
    if (isCompaniesActive && !isCollapsed) {
      setIsCompaniesOpen(true);
    }
  }, [location.pathname, isCollapsed]);


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
          <>
            {/* Submenu de Produtos/Serviços */}
            <Collapsible open={isProductsServicesOpen} onOpenChange={setIsProductsServicesOpen} disabled={isCollapsed}>
              <CollapsibleTrigger 
                className={cn(
                  "flex items-center justify-between w-full rounded-lg py-2 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isCollapsed ? "justify-start pl-6 pr-2" : "px-3"
                )}
              >
                <div className={cn("flex items-center", isCollapsed ? "justify-start w-full gap-0" : "gap-3")}>
                  {/* Ícone do Trigger deve ser roxo, pois não é um item de rota */}
                  <Package className="h-5 w-5" /> 
                  {!isCollapsed && t('nav_products_services')}
                </div>
                {!isCollapsed && <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />}
              </CollapsibleTrigger>
              <CollapsibleContent>
                {/* Wrapper para aplicar o espaçamento vertical suavemente */}
                <div className="space-y-1">
                  {canReadProducts && (
                    <NavItem
                      to="/products"
                      icon={<Package className="h-5 w-5" />}
                      label={t('nav_products')}
                      isSubItem
                      {...navItemProps}
                    />
                  )}
                  {canReadServices && (
                    <NavItem
                      to="/services"
                      icon={<Clock className="h-5 w-5" />}
                      label={t('nav_services')}
                      isSubItem
                      {...navItemProps}
                    />
                  )}
                  {canReadCategories && (
                    <NavItem
                      to="/products/categories"
                      icon={<Tag className="h-5 w-5" />}
                      label={t('page_title_categories')}
                      isSubItem
                      {...navItemProps}
                    />
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </>
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
          <Collapsible open={isCompaniesOpen} onOpenChange={setIsCompaniesOpen} disabled={isCollapsed}>
            <CollapsibleTrigger 
              className={cn(
                "flex items-center justify-between w-full rounded-lg py-2 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isCollapsed ? "justify-start pl-6 pr-2" : "px-3"
              )}
            >
              <div className={cn("flex items-center", isCollapsed ? "justify-start w-full gap-0" : "gap-3")}>
                <Building className="h-5 w-5" /> 
                {!isCollapsed && t('nav_companies')}
              </div>
              {!isCollapsed && <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-1">
                {canReadCompanies && (
                  <NavItem
                    to="/companies"
                    icon={<Building className="h-5 w-5" />}
                    label={t('company_list_title')}
                    isSubItem
                    {...navItemProps}
                  />
                )}
                {canReadCustomProfiles && (
                  <NavItem
                    to="/companies/profiles"
                    icon={<UserCheck className="h-5 w-5" />}
                    label={t('page_title_custom_profiles')}
                    isSubItem
                    {...navItemProps}
                  />
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
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