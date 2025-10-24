import { Company as SupabaseCompany } from "@/integrations/supabase/companies";
import { UserProfile as SupabaseUserProfile } from "@/integrations/supabase/users";
import { Team as SupabaseTeam } from "@/integrations/supabase/teams";
import { Product as SupabaseProduct, ProductType } from "@/integrations/supabase/products";
import { Category as SupabaseCategory } from "@/integrations/supabase/categories";
import { Client as SupabaseClient } from "@/integrations/supabase/clients";
import { Order as SupabaseOrder, OrderStatus } from "@/integrations/supabase/orders";
import { Appointment as SupabaseAppointment } from "@/integrations/supabase/appointments";

// Re-exportando tipos com nomes mais curtos para uso em componentes
export type Company = SupabaseCompany;
export type UserProfile = SupabaseUserProfile;
export type Team = SupabaseTeam;
export type Product = SupabaseProduct;
export type Category = SupabaseCategory;
export type Client = SupabaseClient;
export type Order = SupabaseOrder;
export type Appointment = SupabaseAppointment;
export type ProductTypeEnum = ProductType;
export type OrderStatusEnum = OrderStatus;