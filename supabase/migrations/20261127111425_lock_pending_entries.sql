-- Once an entry is suggested to the Map, its owner can't change it until an admin has decided.
-- `using` is checked against the row as it is before the update, so draft/rejected → pending_review still works,
-- and every later update by the owner matches no rows. Admins have their own policy. Owners can still delete.
alter policy "entries: owner updates own private" on entries
  using (owner_id = (select auth.uid()) and visibility = 'private' and status <> 'pending_review');
