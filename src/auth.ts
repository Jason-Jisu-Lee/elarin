import { supabase } from "./supabase";

export interface SignUpParams {
  username: string;
  email: string;
  password: string;
  birthday: string; // "YYYY-MM-DD"
}

export interface AuthError {
  message: string;
}

/** Sign up a new user. Creates auth account + profile row. */
export async function signUp(
  params: SignUpParams,
): Promise<{ userId: string } | AuthError> {
  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: {
        username: params.username,
        birthday: params.birthday,
      },
    },
  });

  if (error) return { message: error.message };
  if (!data.user) return { message: "Sign up failed â€” no user returned." };

  // Insert profile row (upsert in case trigger already created it)
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: data.user.id,
    username: params.username,
    birthday: params.birthday,
    platform: "android",
  });

  if (profileError) return { message: profileError.message };

  return { userId: data.user.id };
}

/** Sign in with email + password. Returns userId or error. */
export async function signIn(
  email: string,
  password: string,
): Promise<{ userId: string } | AuthError> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { message: error.message };
  if (!data.user) return { message: "Sign in failed." };

  return { userId: data.user.id };
}

/** Get the current session's user ID, or null if not signed in. */
export async function getAccountId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user.id ?? null;
}

/** Get the current session's email, or null if not signed in. */
export async function getAccountEmail(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user.email ?? null;
}

/** Sign out the current user. */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/** Check whether a username is taken (case-insensitive). */
export async function isUsernameTaken(username: string): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .maybeSingle();
  return data !== null;
}

/**
 * Update a user's username. Checks uniqueness (case-insensitive, excluding self).
 * Returns null on success or an AuthError on failure.
 */
export async function updateUsername(
  userId: string,
  newUsername: string,
): Promise<AuthError | null> {
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", newUsername)
    .neq("id", userId)
    .maybeSingle();

  if (existing) return { message: "That username is already taken." };

  const { error } = await supabase
    .from("profiles")
    .update({ username: newUsername })
    .eq("id", userId);

  if (error) return { message: error.message };
  return null;
}

/** Record a goal action event in the events table. */
export async function recordEvent(params: {
  userId: string;
  goalId: string;
  action: "done" | "step_down" | "snooze";
  source: "in_app" | "notification";
}): Promise<void> {
  await supabase.from("events").insert({
    user_id: params.userId,
    goal_id: params.goalId,
    action: params.action,
    source: params.source,
    occurred_at: new Date().toISOString(),
  });
}


