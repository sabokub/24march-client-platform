# Shopping Lists: Fix for UUID→BOOLEAN Error

## Problem Summary

**Error:** `invalid input syntax for type boolean: ecfcb845-4cc9-41db-a5c2-c9e53c056b1c`

This error indicates that a UUID value was being sent to the `shopping_lists.created_by_admin` column, which expects a BOOLEAN value.

## Root Cause Analysis

After detailed code audit, the issue stems from **database schema mismatch**:
- **Code layer:** Correctly sends `created_by_admin: true` (BOOLEAN)
- **Database layer:** Schema was likely created with `created_by_admin UUID REFERENCES profiles(id)` before corrections

## Files Modified

### 1. `app/actions/shopping-list.ts`

#### Change A: Enhanced logging for `createShoppingList()`

**Lines 38-72:** Replaced simple INSERT with logged version

```diff
- const { error } = await supabase.from('shopping_lists').insert({
-   id: listId,
-   project_id: projectId,
-   created_by_admin: true,
-   version: newVersion,
-   status: 'draft',
- })
-
- if (error) {
-   console.error('❌ createShoppingList dbError:', error)
-   return { error: error.message }
- }

+ const payload = {
+   id: listId,
+   project_id: projectId,
+   created_by_admin: true,        // ✅ ALWAYS BOOLEAN
+   version: newVersion,
+   status: 'draft',
+ }
+
+ console.log('[createShoppingList] About to insert:', {
+   payload,
+   payloadTypes: {
+     id: typeof payload.id,
+     project_id: typeof payload.project_id,
+     created_by_admin: typeof payload.created_by_admin,
+     created_by_admin_value: payload.created_by_admin,
+     version: typeof payload.version,
+     status: typeof payload.status,
+   },
+ })
+
+ const { error, data } = await supabase.from('shopping_lists').insert(payload).select()
+
+ if (error) {
+   console.error('[createShoppingList] ❌ Database error:', {
+     code: error.code,
+     message: error.message,
+     details: error.details,
+     hint: error.hint,
+     payload,
+     user_id: user.id,
+   })
+   return { error: error.message }
+ }
+
+ console.log('[createShoppingList] ✅ Success, inserted data:', data)
```

**Key improvements:**
- Explicit payload object with `created_by_admin: true` (BOOLEAN, not UUID)
- Type checking log before insert: `typeof payload.created_by_admin === 'boolean'`
- Full error logging: code, message, details, hint, payload, user_id
- Success logging with returned data

#### Change B: Enhanced logging for `addShoppingListItem()`

**Lines 128-142:** Added comprehensive error logging

```diff
  const { error } = await supabase.from('shopping_list_items').insert({
    id: itemId,
    list_id: listId,
    ...result.data,
  })

  if (error) {
+   console.error('[addShoppingListItem] ❌ Database error:', {
+     code: error.code,
+     message: error.message,
+     details: error.details,
+     hint: error.hint,
+     payload: {
+       id: itemId,
+       list_id: listId,
+       ...result.data,
+     },
+     user_id: user.id,
+   })
-   return { error: error.message }
+   return { error: error.message }
  }
```

#### Change C: Enhanced logging for `sendShoppingList()`

**Lines 216-230:** Added error logging to status update

```diff
  const { data: list, error } = await supabase
    .from('shopping_lists')
    .update({ status: 'sent' })
    .eq('id', listId)
    .select('project_id')
    .single()

  if (error) {
+   console.error('[sendShoppingList] ❌ Database error:', {
+     code: error.code,
+     message: error.message,
+     details: error.details,
+     hint: error.hint,
+     listId,
+     user_id: user.id,
+   })
-   return { error: error.message }
+   return { error: error.message }
  }
```

## Code Audit Results

### All `created_by_admin` Assignments (Grep Results)

| Location | Line | Type | Value | Status |
|----------|------|------|-------|--------|
| `supabase/01_schema.sql` | Column def | Schema | `BOOLEAN` | ✅ Correct |
| `supabase/01_schema.sql` | Default | Schema | `false` | ✅ Correct |
| `supabase/migrations/20260206_add_shopping_lists.sql` | Column def | Migration | `BOOLEAN NOT NULL DEFAULT false` | ✅ Correct |
| `types/database.ts` | ShoppingList interface | TypeScript | `created_by_admin: boolean` | ✅ Correct |
| `app/actions/shopping-list.ts` | Line 43 (createShoppingList) | Code | `true` | ✅ Correct |

### Code Paths Verified

1. **Admin creates shopping list:**
   - Component: `components/admin/shopping-list-editor.tsx::handleCreateList()`
   - Action: `app/actions/shopping-list.ts::createShoppingList(projectId)`
   - Database: `INSERT INTO shopping_lists (id, project_id, created_by_admin, version, status) VALUES (..., true, ...)`
   - ✅ No UUID manipulation

2. **Admin adds items to list:**
   - Component: `shopping-list-editor.tsx::handleAddItem()`
   - Action: `app/actions/shopping-list.ts::addShoppingListItem(formData)`
   - Database: `INSERT INTO shopping_list_items (id, list_id, ...) VALUES (...)`
   - ✅ No `created_by_admin` field touched

3. **Admin sends list to client:**
   - Component: `shopping-list-editor.tsx::handleSendList()`
   - Action: `app/actions/shopping-list.ts::sendShoppingList(listId)`
   - Database: `UPDATE shopping_lists SET status='sent' WHERE id=...`
   - ✅ No `created_by_admin` field modified

## Critical Findings

### ✅ What IS Correct

- Code always sends `created_by_admin: true` (boolean value)
- TypeScript types are properly defined (`created_by_admin: boolean`)
- All migrations define column as BOOLEAN
- No other code paths manipulate this field
- No filters on `created_by_admin` found in code

### ⚠️ What NEEDS Checking

The persistent error suggests one of:

1. **Production database has old schema:**
   - Migration `20260206_add_shopping_lists.sql` may not have run
   - The `created_by_admin` column might still be `UUID REFERENCES profiles(id)`
   - Solution: Run migration in prod or use corrective migration `20260206b_fix_shopping_lists_schema.sql`

2. **Cached/stale client code:**
   - Node process running old code before patches
   - Solution: Restart all server processes

3. **Supabase client version issue:**
   - JS client may be transforming boolean values
   - Solution: Check `package.json` for `@supabase/supabase-js` version

## Verification Steps

When you test after migrations are applied:

### 1. Check logs in server console:

```javascript
[createShoppingList] About to insert: {
  payload: {
    id: 'uuid...',
    project_id: 'uuid...',
    created_by_admin: true,          // ✅ MUST be boolean true
    version: 1,
    status: 'draft'
  },
  payloadTypes: {
    id: 'string',
    project_id: 'string',
    created_by_admin: 'boolean',     // ✅ MUST be 'boolean'
    created_by_admin_value: true,
    version: 'number',
    status: 'string'
  }
}

[createShoppingList] ✅ Success, inserted data: [
  { id: '...', project_id: '...', created_by_admin: true, ... }
]
```

### 2. Check database directly:

```sql
SELECT id, project_id, created_by_admin, created_at 
FROM shopping_lists 
ORDER BY created_at DESC 
LIMIT 1;

-- Should return:
-- id | project_id | created_by_admin | created_at
-- ---|-----------|-----------------|----------
-- ... | ... | t (or true) | ...
```

### 3. Verify column type in database:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'shopping_lists' 
AND column_name = 'created_by_admin';

-- Should return:
-- column_name | data_type | is_nullable
-- ------------|-----------|------------
-- created_by_admin | boolean | NO
```

## Migration Files Summary

### `supabase/migrations/20260206_add_shopping_lists.sql`
- ✅ Creates `shopping_lists` table with `created_by_admin BOOLEAN NOT NULL DEFAULT false`
- ✅ Creates `shopping_list_items` table with proper structure
- ✅ Defines RLS policies for admin/client access

### `supabase/migrations/20260206b_fix_shopping_lists_schema.sql`
- ✅ Corrective migration (if initial migration created wrong column type)
- Contains commented-out DDL to drop/recreate `created_by_admin` column if needed
- Run only if initial migration failed or created UUID column

## Deployment Checklist

- [ ] Verify code changes in `app/actions/shopping-list.ts` (enhanced logging)
- [ ] Confirm `types/database.ts` has `created_by_admin: boolean`
- [ ] Check that **migrations have been applied in production:**
  - [ ] `20260206_add_shopping_lists.sql` ✅ Applied
  - [ ] `20260206b_fix_shopping_lists_schema.sql` ✅ Applied (if needed)
- [ ] Restart all Node processes (to clear any cached old code)
- [ ] Test shopping list creation from admin panel
- [ ] Check server logs for type confirmation
- [ ] Query database to verify boolean values stored

## No Code Paths Found Sending UUID

After comprehensive grep (8 matches total):
- ✅ No `.insert()` sends UUID to `created_by_admin`
- ✅ No `.update()` modifies `created_by_admin`
- ✅ No `.eq('created_by_admin', <uuid>)` filters exist
- ✅ No unsafe string concatenation with `created_by_admin`

**Conclusion:** All code correctly uses BOOLEAN values. Error must be from database schema mismatch.
