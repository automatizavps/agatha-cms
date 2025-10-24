import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, Tag, Search, Building } from "lucide-react";
import { useCategories } from "@/integrations/supabase/categories";
import { showError } from "@/utils/toast";
import { PermissionGuard } from "@/hooks/use-permission";
import { Button } from "@/components/ui/button";
import CategoryTable from "@/components/CategoryTable";
import AddCategorySheet from "@/components/AddCategorySheet";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";

const CategoriesContent = () => {
  const { data: categories, isLoading, isError, error, refetch, isRefetching } = useCategories();
  const [searchTerm, setSearchTerm] = useState("");
  const { t } = useTranslation();

  if (isError && error) {
    showError(t("error_loading_data") + ": " + error.message);
  }
  
  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    if (!searchTerm) return categories;

    const lowerCaseSearch = searchTerm.toLowerCase();
    return categories.filter(category => 
      category.nome.toLowerCase().includes(lowerCaseSearch)
    );
  }, [categories, searchTerm]);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{t('page_title_categories')}</h1>
        <AddCategorySheet />
      </div>
      
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" /> {t('category_list_title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('category_search_placeholder')}
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
          ) : filteredCategories.length > 0 ? (
            <CategoryTable categories={filteredCategories} />
          ) : (
            <div className="text-center p-4 text-muted-foreground">
              {searchTerm ? t('no_data_found') : t('no_categories_found')}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

const Categories = () => (
  // Perfis 1 (Super Admin) e 2 (Admin) têm permissão para gerenciar categorias
  <PermissionGuard allowedProfileIds={[1, 2]}>
    <CategoriesContent />
  </PermissionGuard>
);

export default Categories;