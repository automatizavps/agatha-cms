import React from 'react';
import { useClients } from '@/integrations/supabase/clients';
import { useTranslation } from 'react-i18next';
import { Loader2, Briefcase, Phone, Mail } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface CompanyClientsTabProps {
  companyId: string;
}

const CompanyClientsTab: React.FC<CompanyClientsTabProps> = ({ companyId }) => {
  const { t } = useTranslation();
  const { data: allClients, isLoading, isError } = useClients();

  const clients = React.useMemo(() => {
    if (!allClients) return [];
    return allClients.filter(client => client.empresa_id === companyId);
  }, [allClients, companyId]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (isError || clients.length === 0) {
    return <p className="text-center text-muted-foreground p-4">{t('no_clients_found')}</p>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Briefcase className="h-5 w-5" /> {t('nav_clients')} ({clients.length})
      </h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Avatar</TableHead>
              <TableHead>{t('user_table_header_name')}</TableHead>
              <TableHead className="hidden sm:table-cell">{t('profile_email')}</TableHead>
              <TableHead className="hidden md:table-cell">{t('user_table_header_phone')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={client.avatar_url || undefined} alt={client.nome} className="object-cover" />
                    <AvatarFallback className="text-xs">{client.nome?.slice(0, 2).toUpperCase() || 'C'}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">{client.nome}</TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {client.email || 'N/A'}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {client.telefone || 'N/A'}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CompanyClientsTab;