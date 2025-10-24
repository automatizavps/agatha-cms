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
import { Loader2 } from "lucide-react";
import { Company } from "@/types/supabase"; // Importando o tipo centralizado

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
});

type CompanyFormValues = z.infer<typeof formSchema>;

interface CompanyFormProps {
  onSubmit: (values: { nome: string; cnpj: string | null; telefone: string | null; endereco_completo: string | null; email: string | null }) => void;
  isSubmitting: boolean;
  defaultValues?: Partial<CompanyFormValues>;
  isEditing?: boolean;
}

const CompanyForm: React.FC<CompanyFormProps> = ({ onSubmit, isSubmitting, defaultValues, isEditing = false }) => {
  
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: defaultValues?.nome || "",
      cnpj: defaultValues?.cnpj || "",
      telefone: defaultValues?.telefone || "",
      endereco_completo: defaultValues?.endereco_completo || "",
      email: defaultValues?.email || "",
    },
  });

  const handleSubmit = (values: CompanyFormValues) => {
    // Normaliza campos vazios para null antes de enviar ao Supabase
    const cnpj = values.cnpj ? values.cnpj : null;
    const telefone = values.telefone ? values.telefone : null;
    const endereco_completo = values.endereco_completo ? values.endereco_completo : null;
    const email = values.email ? values.email : null;
    
    onSubmit({
      nome: values.nome,
      cnpj: cnpj,
      telefone: telefone,
      endereco_completo: endereco_completo,
      email: email,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Empresa</FormLabel>
              <FormControl>
                <Input placeholder="Nome da Empresa" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="cnpj"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CNPJ (Opcional)</FormLabel>
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
              <FormLabel>Email (Opcional)</FormLabel>
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
              <FormLabel>Telefone (Opcional)</FormLabel>
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
              <FormLabel>Endereço Completo (Opcional)</FormLabel>
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
            "Salvar Alterações"
          ) : (
            "Cadastrar Empresa"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default CompanyForm;