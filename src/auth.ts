import { supabase } from "./supabase";

export interface SignUpParams {
  username: string;
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
  // Derive a stable email from username (Supabase auth requires email)
  const email = `${params.username.toLowerCase()}@elarin.user`;

  const { data, error } = await supabase.auth.signUp({
    email,
    password: params.password,
    options: {
      data: {
        username: params.username,
        birthday: params.birthday,
      },
    },
  });

  if (error) return { message: error.message };
  if (!data.user) return { message: "Sign up failed — no user returned." };

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

/** Sign in with username + password. Returns userId or error. */
export async function signIn(
  username: string,
  password: string,
): Promise<{ userId: string } | AuthError> {
  const email = `${username.toLowerCase()}@elarin.user`;

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

/** Sign out the current user. */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/** Check whether a username is taken. */
export async function isUsernameTaken(username: string): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  return data !== null;
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
