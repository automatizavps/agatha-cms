import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";
import { useSession } from "./auth";

const fetchUserEmail = async (userId: string, accessToken: string): Promise<string> => {
  const { data, error } = await supabase.functions.invoke("get-user-email", {
    body: { userId },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) {
    console.error("Error fetching user email via Edge Function:", error);
    throw new Error(error.message);
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data.email;
};

export const useUserEmail = (userId: string | undefined) => {
  const { session } = useSession();
  const accessToken = session?.access_token;

  return useQuery<string, Error>({
    queryKey: ["userEmail", userId],
    queryFn: () => fetchUserEmail(userId!, accessToken!),
    enabled: !!userId && !!accessToken,
  });
};