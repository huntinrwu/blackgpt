## BlackGPT Authentication & Cloud Sync

### 1. Database Setup
- **`conversations`** table: `id`, `user_id`, `title`, `created_at`, `updated_at`
- **`messages`** table: `id`, `conversation_id`, `role`, `content` (JSONB for multimodal), `created_at`
- RLS policies so users can only access their own data

### 2. Authentication
- Email & Password (with email verification)
- Google Sign-In (Lovable Cloud managed)
- Apple Sign-In (Lovable Cloud managed)
- Auth page with login/signup tabs + social buttons

### 3. App Flow
- **Guest mode** (no login): Works exactly like now — localStorage only, no sync
- **Logged in**: Chats sync to the cloud database. Accessible from any device
- Header gets a user avatar/login button
- Option to migrate localStorage chats to cloud on first login

### 4. Code Changes
- New `/auth` page with login/signup/social auth
- Update `useConversations` hook to use DB when authenticated, localStorage when guest
- Add auth state management with protected indicators
- Sidebar shows login prompt for guests
