import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { useProfiles } from "@/integrations/supabase/profiles";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import React from "react";

export function UserDisplay() {
  const { data: profile, isLoading: isLoadingProfile } = useCurrentUserProfile();
  const { data: profiles, isLoading: isLoadingProfiles } = useProfiles();

  const userProfile = profiles?.find(p => p.id === profile?.perfil_id);
  
  if (isLoadingProfile || isLoadingProfiles) {
    return (
      <div className="flex items-center space-x-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="space-y-1 hidden sm:block">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="flex items-center space-x-3">
      <Avatar className="h-9 w-9">
        <AvatarImage src={profile.avatar_url || undefined} alt={profile.nome_completo || "User"} />
        <AvatarFallback>{profile.nome_completo ? profile.nome_completo[0] : 'U'}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col text-sm leading-snug hidden sm:block">
        <span className="font-medium truncate max-w-[150px]">{profile.nome_completo || "Usuário"}</span>
        <span className="text-xs text-muted-foreground">
          {userProfile?.nome || `Perfil ID: ${profile.perfil_id}`}
        </span>
      </div>
    </div>
  );
}