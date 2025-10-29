import React from 'react';
import { useProductsOnly } from '@/integrations/supabase/products';
import { useTranslation } from 'react-i18next';
import { Loader2, Package, Tag, Factory, Image as ImageIcon } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface CompanyProductsTabProps {
  companyId: string;
}

const CompanyProductsTab: React.FC<CompanyProductsTabProps> = ({ companyId }) => {
  const { t } = useTranslation();
  const { data: allProducts, isLoading, isError } = useProductsOnly();

  const products = React.useMemo(() => {
    if (!allProducts) return [];
    return allProducts.filter(product => product.empresa_id === companyId);
  }, [allProducts, companyId]);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (isError || products.length === 0) {
    return <p className="text-center text-muted-foreground p-4">{t('no_products_found')}</p>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Package className="h-5 w-5" /> {t('nav_products')} ({products.length})
      </h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Foto</TableHead>
              <TableHead>{t('product_name')}</TableHead>
              <TableHead className="hidden sm:table-cell">{t('product_table_header_category')}</TableHead>
              <TableHead className="hidden md:table-cell">{t('product_table_header_brand')}</TableHead>
              <TableHead className="text-center">{t('product_table_header_stock')}</TableHead>
              <TableHead className="text-right">{t('product_table_header_price')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  {product.fotos && product.fotos.length > 0 ? (
                    <img src={product.fotos[0]} alt={product.nome} className="h-8 w-8 object-cover rounded-md" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground p-1 border rounded-md" />
                  )}
                </TableCell>
                <TableCell className="font-medium">{product.nome}</TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {product.categorias?.nome || 'N/A'}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Factory className="h-3 w-3" />
                    {product.marca || 'N/A'}
                  </div>
                </TableCell>
                <TableCell className="text-center font-semibold">
                  <Badge variant={product.estoque_total && product.estoque_total > 10 ? 'default' : 'destructive'}>
                    {product.estoque_total !== null ? product.estoque_total : 'N/A'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(product.preco)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CompanyProductsTab;