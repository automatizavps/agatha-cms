import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import ClientForm from "./ClientForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/integrations/supabase/clients";
import { showSuccess, showError } from "@/utils/toast";

const AddClientSheet = () => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createClient,
    onSuccess: (data) => {
      showSuccess(`Cliente ${data.nome} cadastrado com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setIsOpen(false);
    },
    onError: (error) => {
      showError("Falha ao cadastrar cliente: " + error.message);
    },
  });

  const handleSubmit = (values: { nome: string; email: string | null; telefone: string | null }) => {
    mutation.mutate(values);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Novo Cliente
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Cadastrar Novo Cliente</SheetTitle>
        </SheetHeader>
        <div className="py-4">
          <ClientForm 
            onSubmit={handleSubmit} 
            isSubmitting={mutation.isPending} 
            isEditing={false}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AddClientSheet;