import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListOrdered, Loader2, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTopSellingItems } from '@/integrations/supabase/dashboardMetrics';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // Importando Avatar
import { Image as ImageIcon } from 'lucide-react'; // Importando ImageIcon

interface TopSellingItemsCardProps {
  companyId: string | undefined;
}

const TopSellingItemsCard: React.FC<TopSellingItemsCardProps> = ({ companyId }) => {
  const { t } = useTranslation();
  const { data: items, isLoading, isError } = useTopSellingItems(companyId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ListOrdered className="h-5 w-5" /> {t('top_selling_items_title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !items || items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ListOrdered className="h-5 w-5" /> {t('top_selling_items_title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 text-muted-foreground">
          {isError ? t("chart_error") : t("no_data_found")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ListOrdered className="h-5 w-5" /> {t('top_selling_items_title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>{t('product_name')}</TableHead>
                <TableHead className="text-right">{t('total_sold')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.filter(item => item.tipo_produto === 'produto').map((item, index) => {
                const firstPhotoUrl = item.fotos?.[0];
                
                return (
                  <TableRow key={item.produto_id}>
                    <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                    <TableCell>
                      <Link to="/products" className="flex items-center gap-2 hover:underline">
                        <Avatar className="h-6 w-6 rounded-md">
                          <AvatarImage src={firstPhotoUrl} alt={item.nome_produto} />
                          <AvatarFallback className="rounded-md bg-muted/50">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </AvatarFallback>
                        </Avatar>
                        {item.nome_produto}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {item.total_vendido} {t('units')}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default TopSellingItemsCard;