import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import CategoryForm from "./CategoryForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCategory, Category } from "@/integrations/supabase/categories";
import { showSuccess, showError } from "@/utils/toast";
import { useTranslation } from "react-i18next";

interface EditCategorySheetProps {
  category: Category;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditCategorySheet: React.FC<EditCategorySheetProps> = ({ category, isOpen, onOpenChange }) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: updateCategory,
    onSuccess: (data) => {
      showSuccess(t('category_updated_success', { name: data.nome }));
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      onOpenChange(false);
    },
    onError: (error) => {
      showError(t("error_loading_data") + ": " + error.message);
    },
  });

  const handleSubmit = (values: { nome: string; empresa_id?: string }) => {
    mutation.mutate({
      id: category.id,
      nome: values.nome,
    });
  };

  const initialValues = {
    nome: category.nome,
    empresa_id: category.empresa_id,
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('edit_category')}: {category.nome}</SheetTitle>
          {/* Adicionando SheetDescription para acessibilidade */}
          <SheetDescription className="sr-only">
            {t('edit_category_description', { defaultValue: 'Formulário para editar o nome da categoria.' })}
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 flex-1 overflow-y-auto">
          <CategoryForm 
            onSubmit={handleSubmit} 
            isSubmitting={mutation.isPending} 
            defaultValues={initialValues}
            isEditing={true}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EditCategorySheet;