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
import { LanguageSwitcher } from "./LanguageSwitcher"; // Importando LanguageSwitcher
import { useTranslation } from "react-i18next"; // Importando useTranslation

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

  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
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
              <LanguageSwitcher />
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 overflow-auto">{children}</main>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "grid min-h-screen w-full transition-all duration-300",
        isCollapsed ? "md:grid-cols-[70px_1fr]" : "md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]"
      )}
    >
      <div className="hidden border-r bg-sidebar md:block">
        <Sidebar isCollapsed={isCollapsed} />
      </div>
      <div className="flex flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
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
          <LanguageSwitcher />
          <ThemeToggle />
          <UserMenu />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;