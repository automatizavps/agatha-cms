import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, ShoppingCart, Search } from "lucide-react";
import { useOrders } from "@/integrations/supabase/orders";
import { showError } from "@/utils/toast";
import { PermissionGuard } from "@/hooks/use-permission";
import { Button } from "@/components/ui/button";
import OrderTable from "@/components/OrderTable";
import AddOrderSheet from "@/components/AddOrderSheet";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";

const OrdersContent = () => {
  const { data: orders, isLoading, isError, error, refetch, isRefetching } = useOrders();
  const [searchTerm, setSearchTerm] = useState("");

  if (isError && error) {
    showError("Erro ao carregar pedidos: " + error.message);
  }
  
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (!searchTerm) return orders;

    const lowerCaseSearch = searchTerm.toLowerCase();
    return orders.filter(order => 
      order.clientes?.nome.toLowerCase().includes(lowerCaseSearch) ||
      order.status.toLowerCase().includes(lowerCaseSearch) ||
      order.id.toLowerCase().includes(lowerCaseSearch)
    );
  }, [orders, searchTerm]);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gestão de Pedidos</h1>
        <AddOrderSheet />
      </div>
      
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" /> Lista de Pedidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, status ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                disabled={isLoading && !isRefetching}
              />
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => refetch()} 
              disabled={isRefetching}
              className="ml-2"
            >
              {isRefetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>

          {isLoading && !isRefetching ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="text-center p-8 space-y-4 border border-destructive rounded-md bg-red-50/50 dark:bg-red-900/10">
              <p className="text-destructive">
                Não foi possível carregar os dados dos pedidos.
              </p>
              <Button onClick={() => refetch()} disabled={isRefetching}>
                {isRefetching ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Tentar Novamente
              </Button>
            </div>
          ) : filteredOrders.length > 0 ? (
            <OrderTable orders={filteredOrders} />
          ) : (
            <div className="text-center p-4 text-muted-foreground">
              {searchTerm ? "Nenhum pedido encontrado com o termo de busca." : "Nenhum pedido cadastrado."}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

const Orders = () => (
  // Perfis 1 (Super Admin) e 2 (Admin) têm permissão para gerenciar pedidos
  <PermissionGuard allowedProfileIds={[1, 2]}>
    <OrdersContent />
  </PermissionGuard>
);

export default Orders;