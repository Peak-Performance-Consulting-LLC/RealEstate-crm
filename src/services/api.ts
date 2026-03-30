import { supabase } from "@/lib/supabase";

export async function invokeFunction<TResponse, TPayload extends Record<string, unknown> = Record<string, unknown>>(name: string, payload: TPayload) {
  const { data, error } = await supabase.functions.invoke(name, {
    body: payload,
  });

  if (error) {
    throw error;
  }

  return data as TResponse;
}
