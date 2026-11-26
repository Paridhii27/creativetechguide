/**
 * Row Level Security tests. Runs against the Supabase project in .env.local
 * (needs NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY).
 * Creates throwaway users and entries, and deletes them afterwards.
 *   npm run test:rls
 */
import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { RELEVANCE_CASES } from "./relevance-cases";

config({ path: ".env.local" });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const configured = Boolean(URL && ANON && SERVICE);

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const run = randomUUID().slice(0, 8);

describe.skipIf(!configured)("RLS", () => {
  let service: SupabaseClient;
  let anon: SupabaseClient;
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  let admin: SupabaseClient;
  const ids: Record<string, string> = {};
  const createdEntries: string[] = [];

  async function makeUser(name: string, role: "user" | "admin" = "user") {
    const email = `rls-${name}-${run}@example.com`;
    const password = `pw-${randomUUID()}`;
    const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    ids[name] = data.user.id;
    if (role === "admin") {
      const { error: e } = await service.from("profiles").update({ role: "admin" }).eq("id", data.user.id);
      if (e) throw e;
    }
    const client = createClient(URL!, ANON!, opts);
    const { error: signInErr } = await client.auth.signInWithPassword({ email, password });
    if (signInErr) throw signInErr;
    return client;
  }

  const entry = (over: Record<string, unknown> = {}) => ({
    type: "opportunity",
    title: `RLS test ${run} ${randomUUID().slice(0, 4)}`,
    url: `https://example.com/rls/${run}/${randomUUID()}`,
    data: {},
    ...over,
  });

  beforeAll(async () => {
    service = createClient(URL!, SERVICE!, opts);
    anon = createClient(URL!, ANON!, opts);
    alice = await makeUser("alice");
    bob = await makeUser("bob");
    admin = await makeUser("admin", "admin");

    const pub = await service.from("entries").insert(entry({ visibility: "public", status: "approved" })).select("id").single();
    const pending = await service.from("entries").insert(entry({ visibility: "public", status: "pending_review" })).select("id").single();
    if (pub.error || pending.error) throw pub.error ?? pending.error;
    ids.publicApproved = pub.data.id;
    ids.publicPending = pending.data.id;
    createdEntries.push(pub.data.id, pending.data.id);
  });

  afterAll(async () => {
    if (!service) return;
    if (createdEntries.length) await service.from("entries").delete().in("id", createdEntries);
    await service.from("entries").delete().like("url", `https://example.com/rls/${run}/%`);
    for (const k of ["alice", "bob", "admin"]) if (ids[k]) await service.auth.admin.deleteUser(ids[k]);
  });

  describe("public catalogue", () => {
    it("anyone (logged out) can read public approved entries", async () => {
      const { data } = await anon.from("entries").select("id").eq("id", ids.publicApproved);
      expect(data).toHaveLength(1);
    });
    it("logged-out users cannot read entries that are not approved", async () => {
      const { data } = await anon.from("entries").select("id").eq("id", ids.publicPending);
      expect(data).toHaveLength(0);
    });
    it("logged-out users cannot write", async () => {
      const { error } = await anon.from("entries").insert(entry({ visibility: "private" }));
      expect(error).not.toBeNull();
    });
    it("browse_entries respects RLS", async () => {
      const { data, error } = await anon.rpc("browse_entries", { p_q: run, p_only_public: false, p_limit: 100 });
      expect(error).toBeNull();
      const got = (data as { id: string }[]).map((r) => r.id);
      expect(got).toContain(ids.publicApproved);
      expect(got).not.toContain(ids.publicPending);
    });
  });

  describe("private entries", () => {
    it("a user can create and read their own private entry; others can't see it", async () => {
      const { data, error } = await alice.from("entries").insert(entry({ owner_id: ids.alice })).select("id").single();
      expect(error).toBeNull();
      ids.alicePrivate = data!.id;
      createdEntries.push(data!.id);

      expect((await alice.from("entries").select("id").eq("id", ids.alicePrivate)).data).toHaveLength(1);
      expect((await bob.from("entries").select("id").eq("id", ids.alicePrivate)).data).toHaveLength(0);
      expect((await anon.from("entries").select("id").eq("id", ids.alicePrivate)).data).toHaveLength(0);
    });
    it("a user cannot create entries owned by someone else", async () => {
      const { error } = await bob.from("entries").insert(entry({ owner_id: ids.alice }));
      expect(error).not.toBeNull();
    });
    it("a user cannot create a public or approved entry", async () => {
      expect((await alice.from("entries").insert(entry({ owner_id: ids.alice, visibility: "public" }))).error).not.toBeNull();
      expect((await alice.from("entries").insert(entry({ owner_id: ids.alice, status: "approved" }))).error).not.toBeNull();
    });
    it("another user cannot update or delete it", async () => {
      await bob.from("entries").update({ title: "hijacked" }).eq("id", ids.alicePrivate);
      await bob.from("entries").delete().eq("id", ids.alicePrivate);
      const { data } = await service.from("entries").select("title").eq("id", ids.alicePrivate).single();
      expect(data!.title).not.toBe("hijacked");
    });
  });

  describe("suggest to the Map → review", () => {
    it("suggesting sets pending_review and the entry stays private", async () => {
      const { error } = await alice.from("entries").update({ status: "pending_review" }).eq("id", ids.alicePrivate);
      expect(error).toBeNull();
      const { data } = await service.from("entries").select("status,visibility").eq("id", ids.alicePrivate).single();
      expect(data).toEqual({ status: "pending_review", visibility: "private" });
      expect((await anon.from("entries").select("id").eq("id", ids.alicePrivate)).data).toHaveLength(0);
    });
    it("the owner cannot approve, reject or archive their own entry", async () => {
      for (const status of ["approved", "rejected", "archived"]) {
        await alice.from("entries").update({ status }).eq("id", ids.alicePrivate);
      }
      const { data } = await service.from("entries").select("status").eq("id", ids.alicePrivate).single();
      expect(data!.status).toBe("pending_review");
    });
    it("the owner cannot make it public", async () => {
      await alice.from("entries").update({ visibility: "public" }).eq("id", ids.alicePrivate);
      const { data } = await service.from("entries").select("visibility").eq("id", ids.alicePrivate).single();
      expect(data!.visibility).toBe("private");
    });
    it("an admin can see pending entries and approving makes them public", async () => {
      expect((await admin.from("entries").select("id").eq("id", ids.alicePrivate)).data).toHaveLength(1);
      const { error } = await admin.from("entries").update({ status: "approved" }).eq("id", ids.alicePrivate);
      expect(error).toBeNull();
      const { data } = await anon.from("entries").select("visibility,status").eq("id", ids.alicePrivate).single();
      expect(data).toEqual({ visibility: "public", status: "approved" });
    });
    it("once public, only admins can edit it", async () => {
      await alice.from("entries").update({ title: "changed by owner" }).eq("id", ids.alicePrivate);
      expect((await service.from("entries").select("title").eq("id", ids.alicePrivate).single()).data!.title).not.toBe("changed by owner");
      const { error } = await admin.from("entries").update({ title: "edited by admin" }).eq("id", ids.alicePrivate);
      expect(error).toBeNull();
      expect((await service.from("entries").select("title").eq("id", ids.alicePrivate).single()).data!.title).toBe("edited by admin");
    });
    it("non-admins cannot edit public entries they don't own", async () => {
      await bob.from("entries").update({ title: "vandalised" }).eq("id", ids.publicApproved);
      expect((await service.from("entries").select("title").eq("id", ids.publicApproved).single()).data!.title).not.toBe("vandalised");
    });
  });

  describe("removing things", () => {
    it("only admins can archive or delete what's on the Map, even for the person who added it", async () => {
      // alicePrivate was approved above, so it's now a public entry that alice owns.
      for (const client of [alice, bob]) {
        for (const id of [ids.alicePrivate, ids.publicApproved]) {
          await client.from("entries").update({ status: "archived" }).eq("id", id);
          await client.from("entries").delete().eq("id", id);
        }
      }
      const { data } = await service.from("entries").select("status").in("id", [ids.alicePrivate, ids.publicApproved]);
      expect(data).toEqual([{ status: "approved" }, { status: "approved" }]);
    });
    it("a user can delete their own private entry", async () => {
      const { data: mine } = await bob.from("entries").insert(entry({ owner_id: ids.bob })).select("id").single();
      createdEntries.push(mine!.id);
      expect((await bob.from("entries").delete().eq("id", mine!.id)).error).toBeNull();
      expect((await service.from("entries").select("id").eq("id", mine!.id)).data).toHaveLength(0);
    });
    it("removing a save from your layer leaves the entry on the Map", async () => {
      const state = { user_id: ids.bob, entry_id: ids.publicApproved };
      expect((await bob.from("user_entry_state").upsert({ ...state, saved: true }, { onConflict: "user_id,entry_id" })).error).toBeNull();
      expect((await bob.from("user_entry_state").upsert({ ...state, saved: false }, { onConflict: "user_id,entry_id" })).error).toBeNull();
      expect((await bob.from("user_entry_state").select("saved").eq("entry_id", ids.publicApproved)).data).toEqual([{ saved: false }]);
      expect((await anon.from("entries").select("id").eq("id", ids.publicApproved)).data).toHaveLength(1);
    });
  });

  describe("My Layer", () => {
    it("user_entry_state is private to its owner", async () => {
      const { error } = await alice.from("user_entry_state").insert({ user_id: ids.alice, entry_id: ids.publicApproved, saved: true, note: "secret" });
      expect(error).toBeNull();
      expect((await alice.from("user_entry_state").select("note").eq("entry_id", ids.publicApproved)).data).toEqual([{ note: "secret" }]);
      expect((await bob.from("user_entry_state").select("note").eq("user_id", ids.alice)).data).toHaveLength(0);
      expect((await anon.from("user_entry_state").select("note")).data ?? []).toHaveLength(0);
    });
    it("a user cannot write state for someone else", async () => {
      const { error } = await bob.from("user_entry_state").insert({ user_id: ids.alice, entry_id: ids.publicApproved, saved: true });
      expect(error).not.toBeNull();
    });
    it("collections and their items are private to the owner", async () => {
      const { data: c, error } = await alice.from("collections").insert({ owner_id: ids.alice, name: "Residencies" }).select("id").single();
      expect(error).toBeNull();
      expect((await alice.from("collection_items").insert({ collection_id: c!.id, entry_id: ids.publicApproved })).error).toBeNull();
      expect((await bob.from("collections").select("id").eq("id", c!.id)).data).toHaveLength(0);
      expect((await bob.from("collection_items").select("id").eq("collection_id", c!.id)).data).toHaveLength(0);
      expect((await bob.from("collection_items").insert({ collection_id: c!.id, entry_id: ids.publicApproved })).error).not.toBeNull();
    });
  });

  describe("profiles and admin-only tables", () => {
    it("a profile row exists after sign-up", async () => {
      const { data } = await alice.from("profiles").select("id,role").eq("id", ids.alice).single();
      expect(data).toEqual({ id: ids.alice, role: "user" });
    });
    it("users cannot promote themselves to admin", async () => {
      await alice.from("profiles").update({ role: "admin" }).eq("id", ids.alice);
      expect((await service.from("profiles").select("role").eq("id", ids.alice).single()).data!.role).toBe("user");
    });
    it("users can't read other users' profiles", async () => {
      expect((await bob.from("profiles").select("id").eq("id", ids.alice)).data).toHaveLength(0);
    });
    it("ingest_sources are admin-only", async () => {
      expect((await alice.from("ingest_sources").insert({ url: `https://example.com/rls/${run}/src`, kind: "page", expected_type: "job" })).error).not.toBeNull();
      expect((await anon.from("ingest_sources").select("id")).data ?? []).toHaveLength(0);
    });
  });

  describe("geographic lens relevance (SQL mirrors lib/relevance.ts)", () => {
    for (const [name, slug, e, expected] of RELEVANCE_CASES) {
      it(name, async () => {
        const { data, error } = await anon.rpc("relevance_for", { p_lens: slug, p_country: e.country, p_region: e.region, p_is_remote: e.is_remote, p_data: e.data });
        expect(error).toBeNull();
        expect(data).toBe(expected);
      });
    }
    it("a place lens hides entries not open to it and sorts based-in first", async () => {
      const mk = async (over: Record<string, unknown>) => {
        const { data, error } = await admin.from("entries").insert(entry({ status: "approved", visibility: "public", title: `RLS lens ${run} ${randomUUID().slice(0, 4)}`, ...over })).select("id").single();
        expect(error).toBeNull();
        createdEntries.push(data!.id);
        return data!.id as string;
      };
      const home = await mk({ country: "Brazil", region: "Latin America" });
      const open = await mk({ country: "Germany", region: "Europe", data: { open_worldwide: true } });
      const closed = await mk({ country: "Germany", region: "Europe", data: { eligibility_countries: ["EU"] } });
      const browse = (lens: string, rel: string | null = null) =>
        anon.rpc("browse_entries", { p_type: "opportunity", p_lens: lens, p_q: `RLS lens ${run}`, p_relevance: rel }).then((r) => (r.data ?? []).map((x: { id: string }) => x.id));
      expect(await browse("brazil")).toEqual([home, open]);
      expect(await browse("brazil", "not_open")).toEqual([closed]);
      expect((await browse("global")).sort()).toEqual([home, open, closed].sort());
      expect(await browse("germany")).toEqual(expect.arrayContaining([open, closed]));
    });
  });
});
