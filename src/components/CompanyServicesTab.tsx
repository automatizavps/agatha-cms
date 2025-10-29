import React from 'react';
import { useServicesOnly } from '@/integrations/supabase/products';
import { useTranslation } from 'react-i18next';
import { Loader2, Clock, Tag, Image as ImageIcon } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface CompanyServicesTabProps {
  companyId: string;
}

const CompanyServicesTab: React.FC<CompanyServicesTabProps> = ({ companyId }) => {
  const { t } = useTranslation();
  const { data: allServices, isLoading, isError } = useServicesOnly();

  const services = React.useMemo(() => {
    if (!allServices) return [];
    return allServices.filter(service => service.empresa_id === companyId);
  }, [allServices, companyId]);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (isError || services.length === 0) {
    return <p className="text-center text-muted-foreground p-4">{t('no_services_found')}</p>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Clock className="h-5 w-5" /> {t('nav_services')} ({services.length})
      </h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Foto</TableHead>
              <TableHead>{t('service_name')}</TableHead>
              <TableHead className="hidden sm:table-cell">{t('product_table_header_category')}</TableHead>
              <TableHead>{t('service_table_header_duration')}</TableHead>
              <TableHead className="text-right">{t('product_table_header_price')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service) => (
              <TableRow key={service.id}>
                <TableCell>
                  {service.fotos && service.fotos.length > 0 ? (
                    <img src={service.fotos[0]} alt={service.nome} className="h-8 w-8 object-cover rounded-md" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground p-1 border rounded-md" />
                  )}
                </TableCell>
                <TableCell className="font-medium">{service.nome}</TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {service.categorias?.nome || 'N/A'}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {service.tempo_servico ? `${service.tempo_servico} min` : 'N/A'}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(service.preco)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CompanyServicesTab;