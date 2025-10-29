import React from 'react';
import { useCategories } from '@/integrations/supabase/categories';
import { useTranslation } from 'react-i18next';
import { Loader2, Tag } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CompanyCategoriesTabProps {
  companyId: string;
}

const CompanyCategoriesTab: React.FC<CompanyCategoriesTabProps> = ({ companyId }) => {
  const { t } = useTranslation();
  // Filtra categorias pela empresa
  const { data: categories, isLoading, isError } = useCategories(companyId);

  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (isError || !categories || categories.length === 0) {
    return <p className="text-center text-muted-foreground p-4">{t('no_categories_found')}</p>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Tag className="h-5 w-5" /> {t('page_title_categories')} ({categories.length})
      </h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('category_name')}</TableHead>
              <TableHead className="hidden sm:table-cell">{t('order_table_header_date')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.nome}</TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  {format(new Date(category.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CompanyCategoriesTab;