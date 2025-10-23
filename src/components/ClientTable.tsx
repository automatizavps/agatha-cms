import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Client, deleteClient } from "@/integrations/supabase/clients";
import { MoreHorizontal, Trash2, Pencil, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showError, showSuccess } from "@/utils/toast";
import EditClientSheet from "./EditClientSheet";

interface ClientTableProps {
  clients: Client[];
}

interface ClientActionsProps {
  client: Client;
  onEdit: (client: Client) => void;
}

const ClientActions: React.FC<ClientActionsProps> = ({ client, onEdit }) => {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: deleteClient,
    onSuccess: () => {
      showSuccess(`Cliente ${client.nome} excluído com sucesso.`);
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (error) => {
      showError("Falha ao excluir cliente: " + error.message);
    },
  });

  const handleDelete = () => {
    if (window.confirm(`Tem certeza que deseja excluir o cliente ${client.nome}?`)) {
      deleteMutation.mutate(client.id);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Abrir menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Ações</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onEdit(client)}>
          <Pencil className="mr-2 h-4 w-4" /> Editar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleDelete} 
          disabled={deleteMutation.isPending}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};


const ClientTable: React.FC<ClientTableProps> = ({ clients }) => {
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setIsEditSheetOpen(true);
  };

  const handleCloseEditSheet = (open: boolean) => {
    setIsEditSheetOpen(open);
    if (!open) {
      setEditingClient(null);
    }
  };

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden sm:table-cell">Email</TableHead>
              <TableHead className="hidden md:table-cell">Telefone</TableHead>
              <TableHead className="hidden lg:table-cell">Endereço</TableHead> {/* Nova Coluna */}
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  {client.nome}
                </TableCell>
                <TableCell className="hidden sm:table-cell">{client.email || 'N/A'}</TableCell>
                <TableCell className="hidden md:table-cell">{client.telefone || 'N/A'}</TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{client.endereco_completo || 'N/A'}</TableCell> {/* Novo Campo */}
                <TableCell className="text-right">
                  <ClientActions client={client} onEdit={handleEdit} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {editingClient && (
        <EditClientSheet 
          client={editingClient} 
          isOpen={isEditSheetOpen} 
          onOpenChange={handleCloseEditSheet} 
        />
      )}
    </>
  );
};

export default ClientTable;