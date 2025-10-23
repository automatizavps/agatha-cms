import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClients } from "@/integrations/supabase/clients";
import { Loader2, Search, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";

const Clients = () => {
  const { t } = useTranslation();
  const { data: clients, isLoading, refetch } = useClients();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    if (!searchTerm) return clients;

    const lowerCaseSearch = searchTerm.toLowerCase();
    return clients.filter(client =>
      client.nome.toLowerCase().includes(lowerCaseSearch) ||
      client.email?.toLowerCase().includes(lowerCaseSearch) ||
      client.telefone?.toLowerCase().includes(lowerCaseSearch)
    );
  }, [clients, searchTerm]);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-7 w-7" />
          {t('nav_clients')}
        </h1>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-semibold">{t('client_list')}</CardTitle>
            <div className="flex items-center space-x-2">
              {/* Botão de recarregar removido */}
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex justify-between items-center">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('search_clients')}
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button asChild>
                <Link to="/clients/new">{t('add_new_client')}</Link>
              </Button>
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
                      <TableHead className="hidden sm:table-cell">{t('email')}</TableHead>
                      <TableHead>{t('phone')}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('address')}</TableHead>
                      <TableHead className="text-right">{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.length > 0 ? (
                      filteredClients.map((client) => (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium">{client.nome}</TableCell>
                          <TableCell className="hidden sm:table-cell">{client.email || '-'}</TableCell>
                          <TableCell>{client.telefone || '-'}</TableCell>
                          <TableCell className="hidden md:table-cell">{client.endereco_completo || '-'}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/clients/${client.id}`}>{t('view')}</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {t('no_clients_found')}
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

export default Clients;