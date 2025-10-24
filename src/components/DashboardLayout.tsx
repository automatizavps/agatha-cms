import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  LineChart,
  Package,
  Package2,
  Settings,
  ShoppingCart,
  Users2,
  Menu,
  Calendar,
  ClipboardList,
  Building,
  User,
  Users,
  Bell,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useSession } from '@/integrations/supabase/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { DashboardFilter } from './DashboardFilter';

// Definição dos tipos de perfil
const PERFIL_SUPER_ADMIN = 1;
const PERFIL_ADMIN = 2;
const PERFIL_FUNCIONARIO = 3;

// Hook para buscar o perfil do usuário
const useUserProfile = () => {
  const { session } = useSession();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: ['userProfile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('usuarios')
        .select('perfil_id, nome_completo, empresa_id')
        .eq('id', userId)
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!userId,
  });
};

// Hook para buscar o número de notificações não lidas
const useUnreadNotificationsCount = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['unreadNotificationsCount', userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { count, error } = await supabase
        .from('notificacoes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('lida', false);

      if (error) {
        console.error("Erro ao buscar notificações:", error);
        return 0;
      }
      return count || 0;
    },
    enabled: !!userId,
    refetchInterval: 60000, // Atualiza a cada 60 segundos
  });
};

// Definição dos itens de navegação
interface NavItem {
  to: string;
  icon: React.ElementType;
  labelKey: string;
  requiredProfiles: number[];
}

const navItems: NavItem[] = [
  { to: '/', icon: Home, labelKey: 'dashboard', requiredProfiles: [PERFIL_SUPER_ADMIN, PERFIL_ADMIN, PERFIL_FUNCIONARIO] },
  { to: '/appointments', icon: Calendar, labelKey: 'appointments', requiredProfiles: [PERFIL_SUPER_ADMIN, PERFIL_ADMIN, PERFIL_FUNCIONARIO] },
  { to: '/orders', icon: ShoppingCart, labelKey: 'orders', requiredProfiles: [PERFIL_SUPER_ADMIN, PERFIL_ADMIN, PERFIL_FUNCIONARIO] },
  { to: '/clients', icon: Users2, labelKey: 'clients', requiredProfiles: [PERFIL_SUPER_ADMIN, PERFIL_ADMIN, PERFIL_FUNCIONARIO] },
  { to: '/products', icon: Package, labelKey: 'products', requiredProfiles: [PERFIL_SUPER_ADMIN, PERFIL_ADMIN, PERFIL_FUNCIONARIO] },
  { to: '/services', icon: ClipboardList, labelKey: 'services', requiredProfiles: [PERFIL_SUPER_ADMIN, PERFIL_ADMIN, PERFIL_FUNCIONARIO] },
  { to: '/analytics', icon: LineChart, labelKey: 'analytics', requiredProfiles: [PERFIL_SUPER_ADMIN, PERFIL_ADMIN] },
  { to: '/teams', icon: Users, labelKey: 'teams', requiredProfiles: [PERFIL_SUPER_ADMIN, PERFIL_ADMIN] },
  { to: '/users', icon: User, labelKey: 'users', requiredProfiles: [PERFIL_SUPER_ADMIN, PERFIL_ADMIN] },
  { to: '/companies', icon: Building, labelKey: 'companies', requiredProfiles: [PERFIL_SUPER_ADMIN] },
];

const settingsItems: NavItem[] = [
  { to: '/products/categories', icon: Tag, labelKey: 'categories', requiredProfiles: [PERFIL_SUPER_ADMIN, PERFIL_ADMIN] },
  { to: '/settings', icon: Settings, labelKey: 'settings', requiredProfiles: [PERFIL_SUPER_ADMIN, PERFIL_ADMIN] },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { session } = useSession();
  const { toast } = useToast();
  const { data: userProfile, isLoading: isLoadingProfile } = useUserProfile();
  const { data: unreadCount } = useUnreadNotificationsCount(session?.user?.id);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const userPerfilId = userProfile?.perfil_id;

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: t('logout_error', { defaultValue: 'Erro ao sair' }),
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: t('logout_success', { defaultValue: 'Você saiu com sucesso.' }),
      });
    }
  };

  const filterNavItems = (items: NavItem[]) => {
    if (isLoadingProfile || !userPerfilId) return [];
    return items.filter(item => item.requiredProfiles.includes(userPerfilId));
  };

  const filteredNavItems = filterNavItems(navItems);
  const filteredSettingsItems = filterNavItems(settingsItems);

  const NavLink: React.FC<{ item: NavItem }> = ({ item }) => {
    const isActive = location.pathname === item.to;
    return (
      <Link
        key={item.to}
        to={item.to}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
          isActive
            ? 'bg-primary text-primary-foreground hover:text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        onClick={() => setIsSidebarOpen(false)}
      >
        <item.icon className="h-4 w-4" />
        {t(item.labelKey)}
      </Link>
    );
  };

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>{t('loading', { defaultValue: 'Carregando...' })}</p>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      {/* Sidebar Desktop */}
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-16 items-center border-b px-6">
            <Link to="/" className="flex items-center gap-2 font-semibold">
              <Package2 className="h-6 w-6" />
              <span className="">{t('app_name', { defaultValue: 'Dyad Manager' })}</span>
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto">
            <nav className="grid items-start px-4 text-sm font-medium lg:px-6 gap-1">
              {filteredNavItems.map((item) => (
                <NavLink key={item.to} item={item} />
              ))}
            </nav>
          </div>
          <div className="mt-auto p-4 border-t">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4 gap-1">
              <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase">{t('settings_title', { defaultValue: 'Configurações' })}</h4>
              {filteredSettingsItems.map((item) => (
                <NavLink key={item.to} item={item} />
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col">
        {/* Header (Agora não é mais sticky) */}
        <header className="flex h-16 items-center gap-4 border-b bg-background px-6">
          {/* Botão de Toggle (Mobile) */}
          <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">{t('toggle_navigation', { defaultValue: 'Toggle navigation menu' })}</span>
              </Button>
            </SheetTrigger>
            {/* Sidebar Mobile */}
            <SheetContent side="left" className="flex flex-col">
              <nav className="grid gap-2 text-lg font-medium">
                <Link
                  to="/"
                  className="flex items-center gap-2 text-lg font-semibold mb-4"
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <Package2 className="h-6 w-6" />
                  <span className="sr-only">{t('app_name', { defaultValue: 'Dyad Manager' })}</span>
                </Link>
                {filteredNavItems.map((item) => (
                  <NavLink key={item.to} item={item} />
                ))}
                <Separator className="my-2" />
                <h4 className="text-sm font-semibold text-muted-foreground mb-1 uppercase">{t('settings_title', { defaultValue: 'Configurações' })}</h4>
                {filteredSettingsItems.map((item) => (
                  <NavLink key={item.to} item={item} />
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          {/* Filtro de Dashboard (Visível apenas no Dashboard) */}
          {location.pathname === '/' && <DashboardFilter />}

          {/* Espaçador para empurrar itens para a direita */}
          <div className="flex-1" />

          {/* Notificações */}
          <Link to="/notifications" className="relative">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Bell className="h-5 w-5" />
              <span className="sr-only">{t('notifications', { defaultValue: 'Notificações' })}</span>
            </Button>
            {unreadCount && unreadCount > 0 ? (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            ) : null}
          </Link>

          {/* Dropdown de Usuário */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <User className="h-5 w-5" />
                <span className="sr-only">{t('toggle_user_menu', { defaultValue: 'Toggle user menu' })}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{userProfile?.nome_completo || t('my_account', { defaultValue: 'Minha Conta' })}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile">{t('profile', { defaultValue: 'Perfil' })}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>{t('logout', { defaultValue: 'Sair' })}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Conteúdo Principal */}
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;