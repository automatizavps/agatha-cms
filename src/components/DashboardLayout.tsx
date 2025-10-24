import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Bell,
  Home,
  Users,
  ShoppingCart,
  Settings,
  Menu,
  CalendarCheck,
  BarChart3,
  Building,
  Package,
  Briefcase,
  Users2,
  Tag,
  Lock,
  User,
  LogOut,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { useNotifications, markAllNotificationsAsRead } from "@/integrations/supabase/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showError, showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "./ui/avatar";

// Definição dos itens de navegação
interface NavItem {
  to: string;
  icon: React.ElementType;
  labelKey: string;
  allowedProfiles: number[]; // 1: Super Admin, 2: Admin, 3: Funcionário
  isSeparator?: boolean;
}

const navItems: NavItem[] = [
  { to: "/", icon: Home, labelKey: "nav_home", allowedProfiles: [1, 2, 3] },
  { to: "/analytics", icon: BarChart3, labelKey: "nav_analytics", allowedProfiles: [1, 2] },
  { to: "/appointments", icon: CalendarCheck, labelKey: "nav_appointments", allowedProfiles: [1, 2, 3] },
  { to: "/orders", icon: ShoppingCart, labelKey: "nav_orders", allowedProfiles: [1, 2] },
  { to: "/clients", icon: Users, labelKey: "nav_clients", allowedProfiles: [1, 2, 3] },
  { to: "/products", icon: Package, labelKey: "nav_products_services", allowedProfiles: [1, 2], isSeparator: true },
  { to: "/products/list", icon: Package, labelKey: "nav_products", allowedProfiles: [1, 2] },
  { to: "/services/list", icon: Briefcase, labelKey: "nav_services", allowedProfiles: [1, 2] },
  { to: "/categories", icon: Tag, labelKey: "nav_categories", allowedProfiles: [1, 2] },
  { to: "/teams", icon: Users2, labelKey: "nav_teams", allowedProfiles: [1, 2], isSeparator: true },
  { to: "/users", icon: Users, labelKey: "nav_users", allowedProfiles: [1, 2] },
  { to: "/companies", icon: Building, labelKey: "nav_companies", allowedProfiles: [1] },
  { to: "/settings", icon: Settings, labelKey: "nav_settings", allowedProfiles: [1, 2, 3], isSeparator: true },
];

interface NavLinkProps {
  to: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  isMobile?: boolean;
}

const NavLink: React.FC<NavLinkProps> = ({ to, icon: Icon, label, isActive, isMobile = false }) => {
  const baseClasses = "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary";
  const activeClasses = "bg-muted text-primary";
  const inactiveClasses = "text-muted-foreground";

  return (
    <Link
      to={to}
      className={cn(baseClasses, isActive ? activeClasses : inactiveClasses, isMobile ? "w-full" : "w-auto")}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
};

const NotificationDropdown = () => {
  // CORREÇÃO: useNotifications retorna { data: PaginatedNotifications }
  const { data: paginatedData, isLoading, refetch } = useNotifications(1, 5); 
  const notifications = paginatedData?.notifications || [];
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  
  const unreadCount = notifications.filter(n => !n.lida).length || 0;
  
  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      showSuccess(t('notifications_marked_read'));
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error) => {
      showError(t("error_loading_data") + ": " + error.message);
    },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full ring-2 ring-background bg-red-500" />
          )}
          <span className="sr-only">{t('nav_notifications')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex justify-between items-center">
          {t('nav_notifications')}
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
              className="text-xs h-6 p-1"
            >
              {markAllMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : t('mark_all_read')}
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {isLoading ? (
          <DropdownMenuItem disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('loading')}
          </DropdownMenuItem>
        ) : notifications && notifications.length > 0 ? (
          notifications.slice(0, 5).map((notification) => (
            <DropdownMenuItem key={notification.id} asChild className="h-auto py-2">
              <Link to={notification.link || "/notifications"} className="flex flex-col items-start space-y-1">
                <div className="flex justify-between w-full">
                  <span className={cn("font-medium text-sm", !notification.lida && "text-primary")}>
                    {notification.titulo}
                  </span>
                  {!notification.lida && (
                    <span className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {notification.mensagem}
                </p>
              </Link>
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem disabled>{t('no_notifications_found')}</DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/notifications" className="justify-center text-center text-sm text-primary">
            {t('view_all_notifications')}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const location = useLocation();
  const { data: profile, isLoading: isLoadingProfile } = useCurrentUserProfile();
  const { t } = useTranslation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError("Erro ao sair: " + error.message);
    } else {
      showSuccess("Você saiu com sucesso.");
    }
  };

  // Filtra os itens de navegação com base no perfil do usuário
  const filteredNavItems = useMemo(() => {
    if (!profile) return [];
    return navItems.filter(item => 
      item.allowedProfiles.includes(profile.perfil_id)
    );
  }, [profile]);
  
  // Fecha o sidebar móvel ao navegar
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const userInitials = profile?.nome_completo ? profile.nome_completo.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'US';

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      {/* Sidebar Desktop */}
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2 fixed w-[220px] lg:w-[280px]">
          <div className="flex h-16 items-center border-b px-6">
            <Link to="/" className="flex items-center gap-2 font-semibold">
              <Lock className="h-6 w-6" />
              <span className="">{t('app_name')}</span>
            </Link>
          </div>
          <nav className="flex-1 overflow-auto px-4 py-2 text-lg font-medium">
            <div className="grid gap-1">
              {filteredNavItems.map((item, index) => (
                <div key={index}>
                  {item.isSeparator && index > 0 && (
                    <div className="my-2 border-t border-muted-foreground/20" />
                  )}
                  <NavLink
                    to={item.to}
                    icon={item.icon}
                    label={t(item.labelKey)}
                    isActive={location.pathname === item.to || (item.labelKey === 'nav_products_services' && (location.pathname.startsWith('/products') || location.pathname.startsWith('/services')))}
                  />
                </div>
              ))}
            </div>
          </nav>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex flex-col">
        {/* Header Fixo */}
        <header 
          className="fixed top-0 z-30 flex h-16 w-full items-center gap-4 border-b bg-background px-6 md:w-[calc(100%-220px)] lg:w-[calc(100%-280px)] md:ml-[220px] lg:ml-[280px]"
        >
          {/* Botão de Toggle (Mobile) */}
          <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col w-[280px]">
              <Link to="/" className="flex items-center gap-2 text-lg font-semibold h-16 border-b px-4">
                <Lock className="h-6 w-6" />
                <span className="sr-only">{t('app_name')}</span>
              </Link>
              <nav className="grid gap-2 text-lg font-medium flex-1 overflow-auto py-4">
                {filteredNavItems.map((item, index) => (
                  <div key={index}>
                    {item.isSeparator && index > 0 && (
                      <div className="my-2 border-t border-muted-foreground/20" />
                    )}
                    <NavLink
                      to={item.to}
                      icon={item.icon}
                      label={t(item.labelKey)}
                      isActive={location.pathname === item.to || (item.labelKey === 'nav_products_services' && (location.pathname.startsWith('/products') || location.pathname.startsWith('/services')))}
                      isMobile
                    />
                  </div>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          
          {/* Nome da Página Atual (Mobile) */}
          <h1 className="text-lg font-semibold md:hidden">
            {t(filteredNavItems.find(item => location.pathname.startsWith(item.to) && item.to !== '/')?.labelKey || 'nav_home')}
          </h1>

          <div className="flex w-full items-center justify-end gap-4 md:ml-auto md:gap-2 lg:gap-4">
            <NotificationDropdown />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                  <span className="sr-only">Toggle user menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{profile?.nome_completo || "Usuário"}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile">
                    <User className="mr-2 h-4 w-4" /> {t('nav_profile')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings">
                    <Settings className="mr-2 h-4 w-4" /> {t('nav_settings')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" /> {t('logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        
        {/* Conteúdo Principal */}
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 mt-16">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;