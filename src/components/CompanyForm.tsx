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
import { Loader2, ShieldCheck } from "lucide-react";
import { Company } from "@/integrations/supabase/companies";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { usePlans } from "@/integrations/supabase/plans";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";

const formSchema = z.object({
  nome: z.string().min(2, {
    message: "O nome deve ter pelo menos 2 caracteres.",
  }),
  cnpj: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  endereco_completo: z.string().optional().nullable(),
  email: z.string().email({
    message: "Insira um email válido.",
  }).or(z.literal("")).nullable(),
  plano_id: z.string().uuid({
    message: "Selecione um plano válido.",
  }).or(z.literal("")).optional().nullable(),
});

type CompanyFormValues = z.infer<typeof formSchema>;

interface CompanyFormProps {
  onSubmit: (values: { nome: string; cnpj: string | null; telefone: string | null; endereco_completo: string | null; email: string | null; plano_id: string | null }) => void;
  isSubmitting: boolean;
  defaultValues?: Partial<CompanyFormValues>;
  isEditing?: boolean;
}

const CompanyForm: React.FC<CompanyFormProps> = ({ onSubmit, isSubmitting, defaultValues, isEditing = false }) => {
  const { data: profile, isLoading: isLoadingProfile } = useCurrentUserProfile();
  const { data: plans, isLoading: isLoadingPlans } = usePlans();
  const { t } = useTranslation();
  
  const isSuperAdmin = profile?.is_super_admin;
  const isCheckingPermissions = isLoadingProfile || (isSuperAdmin && isLoadingPlans);
  
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: defaultValues?.nome || "",
      cnpj: defaultValues?.cnpj || "",
      telefone: defaultValues?.telefone || "",
      endereco_completo: defaultValues?.endereco_completo || "",
      email: defaultValues?.email || "",
      plano_id: defaultValues?.plano_id || "",
    },
  });

  const handleSubmit = (values: CompanyFormValues) => {
    // Normaliza campos vazios para null antes de enviar ao Supabase
    const cnpj = values.cnpj ? values.cnpj : null;
    const telefone = values.telefone ? values.telefone : null;
    const endereco_completo = values.endereco_completo ? values.endereco_completo : null;
    const email = values.email ? values.email : null;
    const plano_id = values.plano_id || null;
    
    onSubmit({
      nome: values.nome,
      cnpj: cnpj,
      telefone: telefone,
      endereco_completo: endereco_completo,
      email: email,
      plano_id: plano_id,
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
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('company_name', { defaultValue: 'Nome da Empresa' })}</FormLabel>
              <FormControl>
                <Input placeholder={t('company_name', { defaultValue: 'Nome da Empresa' })} {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Campo Plano (Apenas Super Admin) */}
        {isSuperAdmin && (
          <FormField
            control={form.control}
            name="plano_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('plan_name', { defaultValue: 'Plano de Assinatura' })}</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value || ""} 
                  disabled={isLoadingPlans || isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger>
                      <ShieldCheck className="mr-2 h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder={isLoadingPlans ? t("loading_plans") : t("select_plan", { defaultValue: "Selecione um plano" })} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {plans?.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.nome} ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plan.preco)})
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
          name="cnpj"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CNPJ ({t('optional')})</FormLabel>
              <FormControl>
                <Input 
                  placeholder="XX.XXX.XXX/XXXX-XX" 
                  {...field} 
                  disabled={isSubmitting}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('profile_email')} ({t('optional')})</FormLabel>
              <FormControl>
                <Input 
                  placeholder="contato@empresa.com" 
                  {...field} 
                  disabled={isSubmitting}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="telefone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('user_table_header_phone')} ({t('optional')})</FormLabel>
              <FormControl>
                <Input 
                  placeholder="(XX) XXXXX-XXXX" 
                  {...field} 
                  disabled={isSubmitting}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="endereco_completo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('client_table_header_address')} ({t('optional')})</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Rua, Número, Bairro, Cidade, Estado" 
                  {...field} 
                  disabled={isSubmitting}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : isEditing ? (
            t('save_changes')
          ) : (
            t('add_new_company')
          )}
        </Button>
      </form>
    </Form>
  );
};

export default CompanyForm;