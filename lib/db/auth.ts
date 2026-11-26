import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Who is signed in, asked of Supabase once per page render however many places need it (each ask is a network
 * round trip). Outside a render, such as in a server action, React doesn't memoise, so it's always fresh there.
 */
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
});
