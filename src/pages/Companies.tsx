import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCompanies } from "@/integrations/supabase/companies";
import { Loader2, Building, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";

const Companies = () => {
  const { t } = useTranslation();
  const { data: profile } = useCurrentUserProfile();
  const isSuperAdmin = profile?.perfil_id === 1;
  
  // Se não for Super Admin, só carrega a própria empresa (se houver)
  const { data: companies, isLoading, refetch } = useCompanies(isSuperAdmin ? undefined : profile?.empresa_id);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCompanies = useMemo(() => {
    if (!companies) return [];
    if (!searchTerm) return companies;

    const lowerCaseSearch = searchTerm.toLowerCase();
    return companies.filter(company =>
      company.nome.toLowerCase().includes(lowerCaseSearch) ||
      company.cnpj?.toLowerCase().includes(lowerCaseSearch) ||
      company.email?.toLowerCase().includes(lowerCaseSearch)
    );
  }, [companies, searchTerm]);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Building className="h-7 w-7" />
          {t('nav_companies')}
        </h1>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-semibold">{t('company_list')}</CardTitle>
            <div className="flex items-center space-x-2">
              {/* Botão de recarregar removido */}
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex justify-between items-center">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('search_companies')}
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {isSuperAdmin && (
                <Button asChild>
                  <Link to="/companies/new">{t('add_new_company')}</Link>
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('name')}</TableHead>
                      <TableHead className="hidden sm:table-cell">{t('cnpj')}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('email')}</TableHead>
                      <TableHead className="text-right">{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompanies.length > 0 ? (
                      filteredCompanies.map((company) => (
                        <TableRow key={company.id}>
                          <TableCell className="font-medium">{company.nome}</TableCell>
                          <TableCell className="hidden sm:table-cell">{company.cnpj || '-'}</TableCell>
                          <TableCell className="hidden md:table-cell">{company.email || '-'}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/companies/${company.id}`}>{t('view')}</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          {t('no_companies_found')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Companies;