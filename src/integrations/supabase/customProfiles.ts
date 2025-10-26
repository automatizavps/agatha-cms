import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./client";
import { createNotification } from "./notifications"; // Importando createNotification
import { QueryClient } from "@tanstack/react-query"; // Importando QueryClient

export type AccessType = 'leitura' | 'escrita' | 'sem_acesso';

export interface Module {
// ... (restante do arquivo)