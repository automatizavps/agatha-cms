import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, Building } from "lucide-react";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { useCompanies } from "@/integrations/supabase/companies";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { checkCategoryNameUniqueness } from "@/integrations/supabase/categories";

// Definimos o esquema base
const baseFormSchema = z.object({
  nome: z.string().min(2, {
    message: "O nome deve ter pelo menos 2 caracteres.",
  }),
  empresa_id: z.string().uuid({
    message: "Selecione uma empresa válida.",
  }).or(z.literal("")).optional(),
});

type CategoryFormValues = z.infer<typeof baseFormSchema>;

interface CategoryFormProps {
  onSubmit: (values: { nome: string; empresa_id?: string }) => void;
  isSubmitting: boolean;
  defaultValues?: Partial<CategoryFormValues & { id?: string }>;
  isEditing?: boolean;
}

const CategoryForm: React.FC<CategoryFormProps> = ({ onSubmit, isSubmitting, defaultValues, isEditing = false }) => {
  const { data: profile, isLoading: isLoadingProfile } = useCurrentUserProfile();
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
  const { t } = useTranslation();
  
  const isSuperAdmin = profile?.is_super_admin;
  const isCheckingPermissions = isLoadingProfile || (isSuperAdmin && isLoadingCompanies);

  // Ajusta o schema dinamicamente: empresa_id é obrigatório na CRIAÇÃO para Super Admin
  const formSchema = isSuperAdmin && !isEditing
    ? baseFormSchema.extend({
        empresa_id: z.string().uuid({
          message: t("select_valid_company"),
        }).min(1, { message: t("company_required_super_admin") }),
      })
    : baseFormSchema;

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: defaultValues?.nome || "",
      empresa_id: defaultValues?.empresa_id || "",
    },
  });
  
  // Observa o ID da empresa selecionada (ou usa o ID do perfil se não for SA)
  const selectedCompanyId = isEditing 
    ? defaultValues?.empresa_id 
    : (isSuperAdmin ? form.watch('empresa_id') : profile?.empresa_id);
    
  const isCompanySelected = !!selectedCompanyId;

  // Adiciona validação assíncrona de unicidade
  const validateName = async (name: string) => {
    if (!isCompanySelected) {
      return true; // Não valida se a empresa não estiver selecionada (Super Admin)
    }
    
    const isUnique = await checkCategoryNameUniqueness(name, selectedCompanyId!, defaultValues?.id);
    if (!isUnique) {
      return t('category_name_exists');
    }
    return true;
  };


  const handleSubmit = (values: CategoryFormValues) => {
    // Se for Super Admin, envia o empresa_id selecionado. Caso contrário, não envia (será obtido via RPC).
    const empresa_id = isSuperAdmin ? values.empresa_id : undefined;

    onSubmit({
      nome: values.nome,
      empresa_id: empresa_id,
    });
  };
  
  if (isCheckingPermissions) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        
        {isSuperAdmin && (
          <FormField
            control={form.control}
            name="empresa_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('user_table_header_company')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingCompanies || isSubmitting || isEditing}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingCompanies ? t("loading_companies") : t("select_company")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {companies?.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('category_name')}</FormLabel>
              <FormControl>
                <Input 
                  placeholder={t('category_name_placeholder')} 
                  {...field} 
                  disabled={isSubmitting} 
                  onBlur={async (e) => {
                    field.onBlur();
                    if (e.target.value) {
                      await form.trigger('nome'); // Dispara a validação assíncrona
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
          rules={{ validate: validateName }}
        />
        
        <Button type="submit" className="w-full" disabled={isSubmitting || (isSuperAdmin && !isCompanySelected)}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : isEditing ? (
            t('save_changes')
          ) : (
            t('create_category')
          )}
        </Button>
      </form>
    </Form>
  );
};

export default CategoryForm;