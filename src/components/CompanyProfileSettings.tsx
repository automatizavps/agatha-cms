import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Building } from "lucide-react";
import { useCompanies, updateCompany, Company } from "@/integrations/supabase/companies";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showError, showSuccess } from "@/utils/toast";
import CompanyForm from "./CompanyForm";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";

const CompanyProfileSettings = () => {
  const { data: companies, isLoading: isLoadingCompanies, isError, error } = useCompanies();
  const { data: profile, isLoading: isLoadingProfile } = useCurrentUserProfile();
  const queryClient = useQueryClient();

  const isLoading = isLoadingCompanies || isLoadingProfile;
  const company = companies?.[0]; // Para Admin, será a única empresa.
  
  // Permite edição para Super Admin (1) e Admin (2)
  const isAllowedToEdit = profile && (profile.perfil_id === 1 || profile.perfil_id === 2);

  const mutation = useMutation({
    mutationFn: updateCompany,
    onSuccess: (data) => {
      showSuccess(`Detalhes da empresa ${data.nome} atualizados com sucesso.`);
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (error) => {
      showError("Falha ao atualizar a empresa: " + error.message);
    },
  });

  const handleSubmit = (values: { nome: string; cnpj: string | null; telefone: string | null; endereco_completo: string | null; email: string | null }) => {
    if (!company) {
      showError("Nenhuma empresa associada encontrada para edição.");
      return;
    }
    mutation.mutate({
      id: company.id,
      ...values,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Detalhes da Empresa</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  if (!isAllowedToEdit) {
    return null; // Usuários sem permissão (Funcionários) não veem esta seção
  }

  if (isError || error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Detalhes da Empresa</CardTitle>
        </CardHeader>
        <CardContent className="text-destructive">
          Erro ao carregar dados da empresa.
        </CardContent>
      </Card>
    );
  }

  if (!company) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Detalhes da Empresa</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          Nenhuma empresa associada encontrada.
        </CardContent>
      </Card>
    );
  }

  // Valores iniciais para o formulário de edição
  const initialValues = {
    nome: company.nome,
    cnpj: company.cnpj,
    telefone: company.telefone,
    endereco_completo: company.endereco_completo,
    email: company.email,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" /> Detalhes da Empresa ({company.nome})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CompanyForm 
          onSubmit={handleSubmit} 
          isSubmitting={mutation.isPending} 
          defaultValues={initialValues}
          isEditing={true}
        />
      </CardContent>
    </Card>
  );
};

export default CompanyProfileSettings;