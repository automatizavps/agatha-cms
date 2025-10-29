import React from 'react';
import { useUsers } from '@/integrations/supabase/users';
import { useTranslation } from 'react-i18next';
import { Loader2, Users, Mail, Phone, Building } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface CompanyUsersTabProps {
  companyId: string;
}

const CompanyUsersTab: React.FC<CompanyUsersTabProps> = ({ companyId }) => {
  const { t } = useTranslation();
  const { data: allUsers, isLoading, isError } = useUsers();

  const users = React.useMemo(() => {
    if (!allUsers) return [];
    // Filtra usuários que pertencem à empresa específica
    return allUsers.filter(user => user.empresa_id === companyId);
  }, [allUsers, companyId]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (isError || users.length === 0) {
    return <p className="text-center text-muted-foreground p-4">{t('no_users_found')}</p>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Users className="h-5 w-5" /> {t('nav_users')} ({users.length})
      </h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Avatar</TableHead>
              <TableHead>{t('user_table_header_name')}</TableHead>
              <TableHead className="hidden sm:table-cell">{t('user_table_header_profile')}</TableHead>
              <TableHead className="hidden md:table-cell">{t('profile_email')}</TableHead>
              <TableHead className="text-center">{t('order_table_header_status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url || undefined} alt={user.nome_completo} />
                    <AvatarFallback className="text-xs">{user.nome_completo?.slice(0, 2).toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">{user.nome_completo}</TableCell>
                <TableCell className="hidden sm:table-cell">{user.perfis?.nome || 'N/A'}</TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {user.email || 'N/A'}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {user.is_active ? (
                    <Badge className="bg-green-600 hover:bg-green-600/90 text-white">Ativo</Badge>
                  ) : (
                    <Badge variant="destructive">Inativo</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CompanyUsersTab;