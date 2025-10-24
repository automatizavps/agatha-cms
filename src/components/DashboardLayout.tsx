import React, { useState } from "react";
import Sidebar from "./Sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, ChevronLeft, ChevronRight } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import BreadcrumbNavigation from "./BreadcrumbNavigation";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { NotificationBell } from "./NotificationBell"; // Importando NotificationBell

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  // Estado para controlar o colapso da sidebar no desktop
  const [isCollapsed, setIsCollapsed] = useState(false); 
  const { t } = useTranslation(); // Usando tradução

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Larguras da sidebar para compensação
  const sidebarWidth = isCollapsed ? "70px" : "280px";
  const sidebarWidthMd = isCollapsed ? "70px" : "220px";


  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
        {/* Header Fixo no Mobile (h-14) */}
        <header className="fixed top-0 left-0 right-0 z-20 flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0 w-64">
              {/* Passa a função de fechamento para o Sidebar */}
              <Sidebar onNavigate={() => setIsSheetOpen(false)} isCollapsed={false} />
            </SheetContent>
          </Sheet>
          <div className="w-full flex items-center justify-between">
            <h1 className="text-lg font-semibold">{t('app_name')}</h1>
            <div className="flex items-center gap-2">
              <NotificationBell /> {/* Adicionado aqui */}
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </header>
        {/* Adiciona padding no topo para compensar o header fixo (h-14 -> pt-14) */}
        <main className="flex-1 p-4 pt-16 animate-fade-in">{children}</main>
      </div>
    );
  }

  // Layout Desktop/Tablet
  return (
    <div className="flex min-h-screen w-full overflow-x-hidden">
      
      {/* Sidebar Fixa */}
      <div 
        className={cn(
          "fixed top-0 left-0 h-screen border-r bg-sidebar transition-all duration-300 z-20 overflow-y-hidden overflow-x-hidden",
          isCollapsed ? "w-[70px]" : "w-[280px]"
        )}
        style={{ width: isCollapsed ? sidebarWidthMd : sidebarWidth }}
      >
        <Sidebar isCollapsed={isCollapsed} />
      </div>
      
      {/* Conteúdo Principal (agora com overflow-y-auto para gerenciar a rolagem) */}
      <div 
        className="flex flex-col flex-1 transition-all duration-300 min-h-screen overflow-y-auto" // RESTAURADO: overflow-y-auto
        style={{ marginLeft: isCollapsed ? sidebarWidthMd : sidebarWidth }}
      >
        {/* Header Fixo no Desktop (h-16) */}
        <header className="fixed top-0 z-20 flex h-16 items-center gap-4 border-b bg-background px-6 w-full"
          style={{ left: isCollapsed ? sidebarWidthMd : sidebarWidth }}
        >
          {/* Botão de Toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleCollapse} 
            className="mr-2"
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
            <span className="sr-only">Toggle sidebar</span>
          </Button>
          
          <div className="flex-1">
            <BreadcrumbNavigation />
          </div>
          <NotificationBell /> {/* Adicionado aqui */}
          <ThemeToggle />
          <UserMenu />
        </header>
        {/* Adiciona padding no topo para compensar o header fixo (h-16 -> pt-16) */}
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-4 lg:p-4 bg-background animate-fade-in pt-20">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;