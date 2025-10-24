import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, Package, Search, Tag, Factory, Building, AlertTriangle } from "lucide-react";
import { useProductsOnly, Product } from "@/integrations/supabase/products";
import { showError } from "@/utils/toast";
import { PermissionGuard } from "@/hooks/use-permission";
import { Button } from "@/components/ui/button";
import AddProductSheet from "@/components/AddProductSheet";
import ProductOnlyTable from "@/components/ProductOnlyTable";
import { Input } from "@/components/ui/input";
import { useState, useMemo, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { useCompanies } from "@/integrations/supabase/companies";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useSearchParams, useNavigate } from "react-router-dom";
import EditProductSheet from "@/components/EditProductSheet";
import { useCanRead, useCanWrite } from "@/hooks/use-module-permission"; // Importando hooks de permissão

const LOW_STOCK_THRESHOLD = 10;

const ProductsContent = () => {
  const { data: products, isLoading, isError, error, refetch, isRefetching } = useProductsOnly();
  const { data: profile, isLoading: isLoadingProfile } = useCurrentUserProfile();
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all');
  const [brandFilter, setBrandFilter] = useState<string | 'all'>('all');
  const [companyFilterId, setCompanyFilterId] = useState<string | 'all'>('all');
  const { t } = useTranslation();
  
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const isSuperAdmin = profile?.perfil_id === 1;
  const isChecking = isLoading || isLoadingProfile || (isSuperAdmin && isLoadingCompanies);
  
  // Permissões baseadas no perfil customizado
  const canReadProducts = useCanRead('products');
  const canWriteProducts = useCanWrite('products');
  
  if (!canReadProducts) {
    return null;
  }
  
  // Estado para edição automática
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

  // Efeito para verificar o parâmetro 'editId' na URL
  useEffect(() => {
    const editId = searchParams.get('editId');
    if (editId && products) {
      const productToEdit = products.find(p => p.id === editId);
      if (productToEdit) {
        setEditingProduct(productToEdit);
        setIsEditSheetOpen(true);
      } else if (!isLoading) {
        // Se o produto não for encontrado, remove o parâmetro da URL
        navigate('/products', { replace: true });
      }
    }
  }, [searchParams, products, isLoading, navigate]);
  
  // Função para lidar com a edição vinda da tabela
  const handleEditFromTable = (product: Product) => {
    setEditingProduct(product);
    setIsEditSheetOpen(true);
  };
  
  const handleCloseEditSheet = (open: boolean) => {
    setIsEditSheetOpen(open);
    if (!open) {
      setEditingProduct(null);
      // Limpa o parâmetro de busca da URL ao fechar
      navigate('/products', { replace: true });
    }
  };


  if (isError && error) {
    showError(t("error_loading_data") + ": " + error.message);
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
  
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    let filtered = products;
    
    // 1. Filtragem por Empresa (se Super Admin e filtro ativo)
    if (isSuperAdmin && companyFilterId !== 'all') {
      filtered = filtered.filter(product => product.empresa_id === companyFilterId);
    }

    // 2. Filtragem por Categoria
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(product => product.categoria === categoryFilter);
    }
    
    // 3. Filtragem por Marca
    if (brandFilter !== 'all') {
      filtered = filtered.filter(product => product.marca === brandFilter);
    }

    // 4. Filtragem por Termo de Busca
    if (searchTerm) {
      const lowerCaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(product => 
        product.nome.toLowerCase().includes(lowerCaseSearch) ||
        (product.categoria && product.categoria.toLowerCase().includes(lowerCaseSearch)) ||
        (product.marca && product.marca.toLowerCase().includes(lowerCaseSearch))
      );
    }

    return filtered;
  }, [products, searchTerm, categoryFilter, brandFilter, companyFilterId, isSuperAdmin]);
  
  // Produtos com estoque baixo (apenas produtos, excluindo serviços)
  const lowStockProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(p => 
      p.tipo === 'produto' && 
      p.estoque_total !== null && 
      p.estoque_total < LOW_STOCK_THRESHOLD
    );
  }, [products]);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl lg:text-2xl font-bold tracking-tight">{t('page_title_products')}</h1>
        {canWriteProducts && <AddProductSheet />}
      </div>
      
      {/* Alerta de Estoque Baixo com estilo customizado */}
      {lowStockProducts.length > 0 && (
        <Alert 
          className={cn(
            "mt-4 border-yellow-400/50 bg-[#2A2A2A] text-white", // Fundo customizado e texto branco
            "[&>svg]:text-yellow-400 [&>svg]:dark:text-yellow-400" // Ícone amarelo
          )}
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-yellow-400">{t('low_stock_alert_title')}</AlertTitle>
          <AlertDescription>
            {t('low_stock_alert_description', { threshold: LOW_STOCK_THRESHOLD })}
            <ul className="list-disc list-inside mt-2 space-y-1">
              {lowStockProducts.map(p => (
                <li key={p.id}>
                  {p.nome} ({p.estoque_total} {t('product_table_header_stock').toLowerCase()})
                  {isSuperAdmin && p.empresa?.nome && ` - ${t('user_table_header_company')}: ${p.empresa.nome}`}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5" /> {t('product_list_title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-start md:items-center mb-4 gap-3 flex-wrap">
            
            {/* Filtro de Empresa (Apenas para Super Admin) */}
            {isSuperAdmin && (
              <div className="w-full md:w-48">
                <Select 
                  onValueChange={setCompanyFilterId} 
                  value={companyFilterId} 
                  disabled={isLoadingCompanies || isChecking}
                >
                  <SelectTrigger className="w-full">
                    <Building className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder={t('filter_all_companies')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('filter_all_companies')}</SelectItem>
                    {companies?.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Filtro de Categoria */}
            <div className="w-full md:w-48">
              <Select 
                onValueChange={setCategoryFilter} 
                value={categoryFilter} 
                disabled={isChecking}
              >
                <SelectTrigger className="w-full">
                  <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder={t('filter_all_categories')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filter_all_categories')}</SelectItem>
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
                  <SelectValue placeholder={t('filter_all_brands')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filter_all_brands')}</SelectItem>
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
                placeholder={t('product_search_placeholder')}
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
                {t('error_loading_data')}
              </p>
              <Button onClick={() => refetch()} disabled={isRefetching}>
                {isRefetching ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {t('try_again')}
              </Button>
            </div>
          ) : filteredProducts.length > 0 ? (
            <ProductOnlyTable products={filteredProducts} onEdit={handleEditFromTable} />
          ) : (
            <div className="text-center p-4 text-muted-foreground">
              {t('no_products_found')}
            </div>
          )}
        </CardContent>
      </Card>
      
      {editingProduct && (
        <EditProductSheet 
          product={editingProduct} 
          isOpen={isEditSheetOpen} 
          onOpenChange={handleCloseEditSheet} 
        />
      )}
    </DashboardLayout>
  );
};

const Products = () => (
  // Permite acesso se for Super Admin (1) ou se tiver perfil customizado (3)
  <PermissionGuard allowedProfileIds={[1, 3]}>
    <ProductsContent />
  </PermissionGuard>
);

export default Products;