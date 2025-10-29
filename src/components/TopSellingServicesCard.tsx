import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListOrdered, Loader2, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTopSellingServices } from '@/integrations/supabase/dashboardMetrics';
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
import { Package } from 'lucide-react'; // Importando Package (para fallback)

interface TopSellingServicesCardProps {
  companyId: string | undefined;
}

const TopSellingServicesCard: React.FC<TopSellingServicesCardProps> = ({ companyId }) => {
  const { t } = useTranslation();
  // Usando o novo hook que busca apenas serviços
  const { data: items, isLoading, isError } = useTopSellingServices(companyId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ListOrdered className="h-5 w-5" /> {t('top_selling_services_title')}
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
            <ListOrdered className="h-5 w-5" /> {t('top_selling_services_title')}
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
          <ListOrdered className="h-5 w-5" /> {t('top_selling_services_title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>{t('service_name')}</TableHead>
                <TableHead className="text-right">{t('total_realized')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => {
                const firstPhotoUrl = item.fotos?.[0];
                
                return (
                  <TableRow key={item.produto_id}>
                    <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                    <TableCell>
                      <Link to="/services" className="flex items-center gap-2 hover:underline">
                        <Avatar className="h-6 w-6 rounded-md">
                          <AvatarImage src={firstPhotoUrl} alt={item.nome_produto} />
                          <AvatarFallback className="rounded-md bg-muted/50">
                            {/* Usando Clock como fallback para serviços */}
                            <Clock className="h-4 w-4 text-muted-foreground" />
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

export default TopSellingServicesCard;