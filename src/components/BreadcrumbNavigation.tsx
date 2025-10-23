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

// Mapeamento de rotas para nomes amigáveis
const routeNameMap: Record<string, string> = {
  "/": "Home",
  "/analytics": "Analytics",
  "/users": "Gestão de Usuários",
  "/settings": "Configurações",
  "/appointments": "Agendamentos",
};

const BreadcrumbNavigation = () => {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

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
              Home
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        
        {pathnames.map((value, index) => {
          const to = `/${pathnames.slice(0, index + 1).join("/")}`;
          const isLast = index === pathnames.length - 1;
          const name = routeNameMap[to] || value.charAt(0).toUpperCase() + value.slice(1);

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