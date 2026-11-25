/** Promote a user to admin:  npm run make-admin -- someone@example.com */
import { config } from "dotenv";
import { createAdminClient } from "../lib/supabase/admin";

config({ path: ".env.local" });

async function main() {
  const email = process.argv[2];
  if (!email) throw new Error("usage: npm run make-admin -- <email>");
  const db = createAdminClient();
  const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error(`No user with that email has signed in yet.`);
  const { error: upErr } = await db.from("profiles").upsert({ id: user.id, role: "admin" }, { onConflict: "id" });
  if (upErr) throw upErr;
  console.log(`${email} is now an admin`);
}
main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
