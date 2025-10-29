import React from 'react';
import { usePromotions, Promotion } from '@/integrations/supabase/promotions';
import { useTranslation } from 'react-i18next';
import { Loader2, DollarSign, Calendar } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, isPast, isFuture } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CompanyPromotionsTabProps {
  companyId: string;
}

const getStatusBadge = (promotion: Promotion, t: (key: string, options?: any) => string) => {
  const now = new Date();
  const startDate = new Date(promotion.data_inicio);
  const endDate = new Date(promotion.data_fim);
  
  let status: 'active' | 'scheduled' | 'expired' | 'inactive';
  
  if (!promotion.is_active) {
    status = 'inactive';
  } else if (now >= startDate && now <= endDate) {
    status = 'active';
  } else if (now < startDate) {
    status = 'scheduled';
  } else {
    status = 'expired';
  }
  
  const baseClasses = "capitalize px-2 py-0.5 rounded-full text-xs font-semibold";
  
  switch (status) {
    case 'active':
      return <Badge className={cn(baseClasses, "bg-green-600 hover:bg-green-600/90 text-white")}>{t('status_active')}</Badge>;
    case 'scheduled':
      return <Badge className={cn(baseClasses, "bg-blue-600 hover:bg-blue-600/90 text-white")}>{t('status_scheduled')}</Badge>;
    case 'expired':
      return <Badge variant="destructive">{t('status_expired')}</Badge>;
    case 'inactive':
    default:
      return <Badge variant="secondary">{t('status_inactive')}</Badge>;
  }
};

const CompanyPromotionsTab: React.FC<CompanyPromotionsTabProps> = ({ companyId }) => {
  const { t } = useTranslation();
  // Filtra promoções pela empresa
  const { data: promotions, isLoading, isError } = usePromotions(companyId);

  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (isError || !promotions || promotions.length === 0) {
    return <p className="text-center text-muted-foreground p-4">{t('no_promotions_found')}</p>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <DollarSign className="h-5 w-5" /> {t('page_title_promotions')} ({promotions.length})
      </h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('promotion_name')}</TableHead>
              <TableHead className="text-center">{t('discount_percentage')}</TableHead>
              <TableHead className="hidden sm:table-cell">{t('plan_duration')}</TableHead>
              <TableHead className="text-center">{t('order_table_header_status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {promotions.map((promo) => (
              <TableRow key={promo.id}>
                <TableCell className="font-medium">{promo.nome}</TableCell>
                <TableCell className="text-center font-semibold text-primary">
                  {promo.desconto_percentual}%
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(promo.data_inicio), "dd/MM/yyyy", { locale: ptBR })} - {format(new Date(promo.data_fim), "dd/MM/yyyy", { locale: ptBR })}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {getStatusBadge(promo, t)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CompanyPromotionsTab;