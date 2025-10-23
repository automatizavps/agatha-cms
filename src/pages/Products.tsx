import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, Package, Search, Tag, Factory } from "lucide-react";
import { useProductsOnly } from "@/integrations/supabase/products";
import { showError } from "@/utils/toast";
import { PermissionGuard } from "@/hooks/use-permission";
import { Button } from "@/components/ui/button";
import AddProductSheet from "@/components/AddProductSheet";
import ProductOnlyTable from "@/components/ProductOnlyTable";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ProductsContent = () => {
  const { data: products, isLoading, isError, error, refetch, isRefetching } = useProductsOnly();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all');
  const [brandFilter, setBrandFilter] = useState<string | 'all'>('all');

  if (isError && error) {
    showError("Erro ao carregar produtos: " + error.message);
  }
  
  // Extrai categorias e marcas únicas
  const uniqueCategories = useMemo(() => {
    if (!products) return [];
    const categories = new Set<string>();
    products.forEach(p => {
      if (p.categoria) categories.add(p.categoria);
    });
    return Array.from(categories).sort();
  }, [products]);

  const uniqueBrands = useMemo(() => {
    if (!products) return [];
    const brands = new Set<string>();
    products.forEach(p => {
      if (p.marca) brands.add(p.marca);
    });
    return Array.from(brands).sort();
  }, [products]);
  
  const isChecking = isLoading;

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    let filtered = products;

    // 1. Filtragem por Categoria
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(product => product.categoria === categoryFilter);
    }
    
    // 2. Filtragem por Marca
    if (brandFilter !== 'all') {
      filtered = filtered.filter(product => product.marca === brandFilter);
    }

    // 3. Filtragem por Termo de Busca
    if (searchTerm) {
      const lowerCaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(product => 
        product.nome.toLowerCase().includes(lowerCaseSearch) ||
        (product.categoria && product.categoria.toLowerCase().includes(lowerCaseSearch)) ||
        (product.marca && product.marca.toLowerCase().includes(lowerCaseSearch))
      );
    }

    return filtered;
  }, [products, searchTerm, categoryFilter, brandFilter]);

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
          <div className="flex flex-col md:flex-row items-start md:items-center mb-4 gap-3">
            
            {/* Filtro de Categoria */}
            <div className="w-full md:w-48">
              <Select 
                onValueChange={setCategoryFilter} 
                value={categoryFilter} 
                disabled={isChecking}
              >
                <SelectTrigger className="w-full">
                  <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Filtrar por Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Categorias</SelectItem>
                  {uniqueCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Filtro de Marca */}
            <div className="w-full md:w-48">
              <Select 
                onValueChange={setBrandFilter} 
                value={brandFilter} 
                disabled={isChecking}
              >
                <SelectTrigger className="w-full">
                  <Factory className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Filtrar por Marca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Marcas</SelectItem>
                  {uniqueBrands.map((brand) => (
                    <SelectItem key={brand} value={brand}>
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Campo de Busca Textual */}
            <div className="relative w-full max-w-sm md:max-w-none md:flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, categoria ou marca..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                disabled={isChecking}
              />
            </div>
            
            {/* Botão de Recarregar */}
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => refetch()} 
              disabled={isRefetching}
              className="shrink-0"
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
              {searchTerm || categoryFilter !== 'all' || brandFilter !== 'all' ? "Nenhum produto encontrado com os filtros aplicados." : "Nenhum produto cadastrado."}
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