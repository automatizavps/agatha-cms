import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUsers } from "@/integrations/supabase/users";
import { Loader2, Search, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useProfiles } from "@/integrations/supabase/profiles";

const Users = () => {
  const { t } = useTranslation();
  const { data: users, isLoading, refetch } = useUsers();
  const { data: profiles } = useProfiles();
  const [searchTerm, setSearchTerm] = useState("");

  const profileMap = useMemo(() => {
    return profiles?.reduce((acc, profile) => {
      acc[profile.id] = profile.nome;
      return acc;
    }, {} as Record<number, string>) || {};
  }, [profiles]);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchTerm) return users;

    const lowerCaseSearch = searchTerm.toLowerCase();
    return users.filter(user =>
      user.nome_completo?.toLowerCase().includes(lowerCaseSearch) ||
      user.telefone?.toLowerCase().includes(lowerCaseSearch) ||
      profileMap[user.perfil_id]?.toLowerCase().includes(lowerCaseSearch)
    );
  }, [users, searchTerm, profileMap]);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <User className="h-7 w-7" />
          {t('nav_users')}
        </h1>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-semibold">{t('user_list')}</CardTitle>
            <div className="flex items-center space-x-2">
              {/* Botão de recarregar removido */}
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex justify-between items-center">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('search_users')}
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button asChild>
                <Link to="/users/new">{t('add_new_user')}</Link>
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
                      <TableHead>{t('profile')}</TableHead>
                      <TableHead className="hidden sm:table-cell">{t('phone')}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('address')}</TableHead>
                      <TableHead className="text-right">{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.nome_completo || '-'}</TableCell>
                          <TableCell>{profileMap[user.perfil_id] || t('unknown_profile')}</TableCell>
                          <TableCell className="hidden sm:table-cell">{user.telefone || '-'}</TableCell>
                          <TableCell className="hidden md:table-cell">{user.endereco_completo || '-'}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/users/${user.id}`}>{t('view')}</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {t('no_users_found')}
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

export default Users;