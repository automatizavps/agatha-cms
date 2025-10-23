import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, Package, Search } from "lucide-react";
import { useProductsOnly } from "@/integrations/supabase/products";
import { showError } from "@/utils/toast";
import { PermissionGuard } from "@/hooks/use-permission";
import { Button } from "@/components/ui/button";
import AddProductSheet from "@/components/AddProductSheet";
import ProductOnlyTable from "@/components/ProductOnlyTable";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";

const ProductsContent = () => {
  const { data: products, isLoading, isError, error, refetch, isRefetching } = useProductsOnly();
  const [searchTerm, setSearchTerm] = useState("");

  if (isError && error) {
    showError("Erro ao carregar produtos: " + error.message);
  }
  
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!searchTerm) return products;

    const lowerCaseSearch = searchTerm.toLowerCase();
    return products.filter(product => 
      product.nome.toLowerCase().includes(lowerCaseSearch) ||
      (product.categoria && product.categoria.toLowerCase().includes(lowerCaseSearch)) ||
      (product.marca && product.marca.toLowerCase().includes(lowerCaseSearch))
    );
  }, [products, searchTerm]);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gestão de Produtos</h1>
        <AddProductSheet />
      </div>
      
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" /> Lista de Produtos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, categoria ou marca..."
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
                Não foi possível carregar os dados dos produtos.
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
          ) : filteredProducts.length > 0 ? (
            <ProductOnlyTable products={filteredProducts} />
          ) : (
            <div className="text-center p-4 text-muted-foreground">
              {searchTerm ? "Nenhum produto encontrado com o termo de busca." : "Nenhum produto cadastrado."}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

const Products = () => (
  // Perfis 1 (Super Admin) e 2 (Admin) têm permissão para gerenciar produtos
  <PermissionGuard allowedProfileIds={[1, 2]}>
    <ProductsContent />
  </PermissionGuard>
);

export default Products;