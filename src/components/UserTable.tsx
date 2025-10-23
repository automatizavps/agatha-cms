import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserProfile, deleteUser } from "@/integrations/supabase/users";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, MoreHorizontal, Trash2, Pencil, Phone, MapPin } from "lucide-react";
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
import EditUserSheet from "./EditUserSheet";

interface UserTableProps {
  users: UserProfile[];
}

interface UserActionsProps {
  user: UserProfile;
  onEdit: (user: UserProfile) => void;
}

const UserActions: React.FC<UserActionsProps> = ({ user, onEdit }) => {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      showSuccess(`Usuário ${user.nome_completo} excluído com sucesso.`);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      showError("Falha ao excluir usuário: " + error.message);
    },
  });

  const handleDelete = () => {
    if (window.confirm(`Tem certeza que deseja excluir o usuário ${user.nome_completo}?`)) {
      deleteMutation.mutate(user.id);
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
        <DropdownMenuItem onClick={() => onEdit(user)}>
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


const UserTable: React.FC<UserTableProps> = ({ users }) => {
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user);
    setIsEditSheetOpen(true);
  };

  const handleCloseEditSheet = (open: boolean) => {
    setIsEditSheetOpen(open);
    if (!open) {
      setEditingUser(null);
    }
  };

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Avatar</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden lg:table-cell">Telefone</TableHead>
              <TableHead className="hidden xl:table-cell">Endereço</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url || undefined} alt={user.nome_completo} />
                    <AvatarFallback>
                      {user.nome_completo ? user.nome_completo[0] : <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">{user.nome_completo}</TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {user.telefone || 'N/A'}
                  </div>
                </TableCell>
                <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {user.endereco_completo || 'N/A'}
                  </div>
                </TableCell>
                <TableCell>{user.perfis?.nome || "N/A"}</TableCell>
                <TableCell className="text-right">
                  <UserActions user={user} onEdit={handleEdit} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {editingUser && (
        <EditUserSheet 
          user={editingUser} 
          isOpen={isEditSheetOpen} 
          onOpenChange={handleCloseEditSheet} 
        />
      )}
    </>
  );
};

export default UserTable;