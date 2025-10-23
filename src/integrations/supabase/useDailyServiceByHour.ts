import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";

export interface HourlyServiceCount {
  hour: number;
  count: number;
}

const fetchDailyServiceCountByHour = async (companyId: string): Promise<HourlyServiceCount[]> => {
  const { data, error } = await supabase.rpc('get_daily_service_count_by_hour', { company_id_input: companyId });

  if (error) {
    console.error("Error fetching daily service count by hour:", error);
    throw new Error("Failed to fetch daily service count by hour: " + error.message);
  }
  
  return data.map(item => ({
    hour: item.hour,
    count: parseInt(item.count) || 0,
  })) as HourlyServiceCount[];
};

export const useDailyServiceByHour = (companyId: string | undefined) => {
  // Use the current date as part of the query key to ensure data refreshes daily
  const currentDate = new Date().toISOString().slice(0, 10); 
  
  return useQuery<HourlyServiceCount[], Error>({
    queryKey: ["dailyServiceByHour", companyId, currentDate],
    queryFn: () => fetchDailyServiceCountByHour(companyId!),
    enabled: !!companyId,
  });
};