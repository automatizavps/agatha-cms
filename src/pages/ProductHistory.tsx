import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Package, Tag, Factory, DollarSign, Clock, Building, TrendingUp, User, ListOrdered } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router-dom";
import { useProductById, ProductType } from "@/integrations/supabase/products";
import { showError } from "@/utils/toast";
import { PermissionGuard } from "@/hooks/use-permission";
import WeeklySalesChart from "@/components/WeeklySalesChart";
import { useProductSalesHistory, SaleHistoryItem } from "@/integrations/supabase/productHistory";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import ProductImageCarousel from "@/components/ProductImageCarousel";
import { Separator } from "@/components/ui/separator";

const ProductHistoryContent = () => {
  const { productId } = useParams<{ productId: string }>();
  const { t } = useTranslation();

  const { data: product, isLoading: isLoadingProduct, isError: isErrorProduct, error: errorProduct } = useProductById(productId || '');
  const { data: history, isLoading: isLoadingHistory, isError: isErrorHistory, error: errorHistory } = useProductSalesHistory(productId || '');

  const isLoading = isLoadingProduct || isLoadingHistory;
  const isError = isErrorProduct || isErrorHistory;
  const error = errorProduct || errorHistory;

  if (isError && error) {
    showError(t("error_loading_data") + ": " + error.message);
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }
  
  if (!product) {
    return (
      <DashboardLayout>
        <div className="text-center p-4 text-muted-foreground">
          {t('no_data_found')}
        </div>
      </DashboardLayout>
    );
  }
  
  const isProduct = product.tipo === 'produto';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };
  
  const getSaleTypeBadge = (type: SaleHistoryItem['tipo_venda']) => {
    const baseClasses = "capitalize";
    switch (type) {
      case 'Pedido':
        return <Badge className={baseClasses} variant="default">{t('nav_orders')}</Badge>;
      case 'Agendamento':
        return <Badge className={baseClasses} variant="secondary">{t('nav_appointments')}</Badge>;
      default:
        return <Badge className={baseClasses} variant="outline">{type}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl lg:text-2xl font-bold tracking-tight">
          {t('sales_history_title', { name: product.nome })}
        </h1>
        <p className="text-muted-foreground">
          {t('sales_history_subtitle', { type: isProduct ? t('nav_products') : t('nav_services') })}
        </p>
        
        {/* Detalhes do Produto e Gráfico */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Card de Detalhes do Produto (Colspan 1) */}
          <Card className="lg:col-span-1">
            <CardHeader className="p-0">
              <ProductImageCarousel photos={product.fotos} alt={product.nome} />
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <CardTitle className="text-xl font-bold">{product.nome}</CardTitle>
              <Separator />
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{t('product_table_header_price')}:</span>
                  <span className="font-semibold text-primary">{formatCurrency(product.preco)}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{t('product_table_header_category')}:</span>
                  <span>{product.categoria || t('none')}</span>
                </div>
                
                {isProduct ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{t('product_table_header_stock')}:</span>
                      <Badge variant={product.estoque_total && product.estoque_total > 10 ? 'default' : 'destructive'}>
                        {product.estoque_total !== null ? product.estoque_total : 'N/A'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Factory className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{t('product_table_header_brand')}:</span>
                      <span>{product.marca || t('none')}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{t('service_table_header_duration')}:</span>
                    <span>{product.tempo_servico ? `${product.tempo_servico} ${t('minutes')}` : t('none')}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{t('user_table_header_company')}:</span>
                  <span>{product.empresa?.nome || 'N/A'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Gráfico de Vendas Semanais (Colspan 2) */}
          <div className="lg:col-span-2">
            <WeeklySalesChart productId={product.id} productName={product.nome} />
          </div>
        </div>
        
        {/* Histórico de Vendas (Tabela) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ListOrdered className="h-5 w-5" /> {t('sales_history_table_title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingHistory ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : isErrorHistory || !history || history.length === 0 ? (
              <div className="text-center p-4 text-muted-foreground">
                {t('no_sales_history_found')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('order_table_header_date')}</TableHead>
                      <TableHead>{t('type')}</TableHead>
                      <TableHead>{t('order_table_header_client')}</TableHead>
                      <TableHead className="text-right">{t('quantity')}</TableHead>
                      <TableHead className="text-right">{t('unit_price')}</TableHead>
                      <TableHead className="text-right">{t('order_table_header_total')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(item.data_venda), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>{getSaleTypeBadge(item.tipo_venda)}</TableCell>
                        <TableCell className="font-medium flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {item.cliente_nome}
                          <span className="text-xs text-muted-foreground hidden sm:inline">
                            ({item.cliente_email || item.cliente_telefone || 'N/A'})
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{item.quantidade}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {formatCurrency(item.preco_unitario)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(item.valor_total)}
                        </TableCell>
                      </TableRow>
                    ))}
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

const ProductHistory = () => (
  // Perfis 1 (Super Admin) e 2 (Admin) têm permissão para visualizar histórico
  <PermissionGuard allowedProfileIds={[1, 2]}>
    <ProductHistoryContent />
  </PermissionGuard>
);

export default ProductHistory;