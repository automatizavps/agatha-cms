import React from 'react';
import { useCommissionRules, CommissionRule, CommissionType } from '@/integrations/supabase/commissions';
import { useTranslation } from 'react-i18next';
import { Loader2, HandCoins, Tag, DollarSign, Percent } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface CompanyCommissionsTabProps {
  companyId: string;
}

const getEntityTypeBadge = (type: CommissionRule['tipo_entidade'], t: (key: string) => string) => {
  const baseClasses = "capitalize";
  switch (type) {
    case 'produto': return <Badge variant="default" className={baseClasses}>{t('nav_products')}</Badge>;
    case 'servico': return <Badge variant="secondary" className={baseClasses}>{t('nav_services')}</Badge>;
    case 'categoria': return <Badge variant="outline" className={baseClasses}>{t('page_title_categories')}</Badge>;
    default: return null;
  }
};

const formatValue = (rule: CommissionRule) => {
  if (rule.tipo_valor === 'fixo') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(rule.valor);
  }
  return `${rule.valor}%`;
};

const CompanyCommissionsTab: React.FC<CompanyCommissionsTabProps> = ({ companyId }) => {
  const { t } = useTranslation();
  // Filtra regras de comissão pela empresa
  const { data: rules, isLoading, isError } = useCommissionRules(companyId);

  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (isError || !rules || rules.length === 0) {
    return <p className="text-center text-muted-foreground p-4">{t('no_commission_rules_found')}</p>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <HandCoins className="h-5 w-5" /> {t('commission_rules_title')} ({rules.length})
      </h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('commission_entity_type')}</TableHead>
              <TableHead>{t('commission_entity')}</TableHead>
              <TableHead className="hidden sm:table-cell">{t('commission_value_type')}</TableHead>
              <TableHead className="text-right">{t('commission_value')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell className="font-medium">
                  {getEntityTypeBadge(rule.tipo_entidade, t)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {/* Exibe o nome da primeira entidade ou N/A */}
                  {rule.entidades?.[0]?.nome || 'N/A'}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground capitalize">
                  <div className="flex items-center gap-1">
                    {rule.tipo_valor === 'fixo' ? <DollarSign className="h-3 w-3" /> : <Percent className="h-3 w-3" />}
                    {t(rule.tipo_valor)}
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold text-primary">
                  {formatValue(rule)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CompanyCommissionsTab;