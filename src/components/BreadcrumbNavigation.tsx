import React from "react";
import { useLocation, Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const BreadcrumbNavigation = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  // Mapeamento de rotas para chaves de tradução
  const routeKeyMap: Record<string, string> = {
    "/": "nav_home",
    "/analytics": "nav_analytics",
    "/users": "nav_users",
    "/clients": "nav_clients",
    "/products": "nav_products",
    "/services": "nav_services",
    "/orders": "nav_orders",
    "/companies": "nav_companies",
    "/settings": "nav_settings",
    "/profile": "nav_profile",
  };

  // Se estiver na raiz, não exibe breadcrumbs
  if (pathnames.length === 0) {
    return null;
  }

  return (
    <Breadcrumb className="hidden md:flex">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/" className="flex items-center gap-1">
              <Home className="h-4 w-4" />
              {t('nav_home')}
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        
        {pathnames.map((value, index) => {
          const to = `/${pathnames.slice(0, index + 1).join("/")}`;
          const isLast = index === pathnames.length - 1;
          
          // Usa a chave de tradução ou o valor da rota como fallback
          const translationKey = routeKeyMap[to];
          const name = translationKey ? t(translationKey) : value.charAt(0).toUpperCase() + value.slice(1);

          return (
            <React.Fragment key={to}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <span className="text-sm font-medium text-foreground">
                    {name}
                  </span>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={to} className={cn("text-sm", isLast ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
                      {name}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default BreadcrumbNavigation;