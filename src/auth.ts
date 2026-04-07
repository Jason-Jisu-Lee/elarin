import { supabase } from "./supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  if (!data.user) return { message: "Sign up failed - no user returned." };

  // If no session (email confirmation enabled), we can't insert the profile
  // because RLS requires auth.uid(). Tell the user to confirm email first.
  if (!data.session) {
    return {
      message: "Check your email to confirm your account, then sign in.",
    };
  }

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

/** Resend the confirmation email for an unverified account. */
export async function resendVerification(
  email: string,
): Promise<AuthError | null> {
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
  });
  if (error) return { message: error.message };
  return null;
}

/** Send a password-reset email. */
export async function resetPassword(email: string): Promise<AuthError | null> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) return { message: error.message };
  return null;
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
  occurred_at?: string;
}): Promise<void> {
  await supabase.from("events").insert({
    user_id: params.userId,
    goal_id: params.goalId,
    action: params.action,
    source: params.source,
    occurred_at: params.occurred_at ?? new Date().toISOString(),
  });
}

/** Update the signed-in user's email. Supabase sends a confirmation to the new address. */
export async function updateEmail(newEmail: string): Promise<AuthError | null> {
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) return { message: error.message };
  return null;
}

/** Update the display name stored in auth user_metadata. */
export async function updateName(newName: string): Promise<AuthError | null> {
  const { error } = await supabase.auth.updateUser({
    data: { display_name: newName },
  });
  if (error) return { message: error.message };
  return null;
}

/** Get the display name from auth user_metadata. */
export async function getAccountName(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user.user_metadata?.display_name ?? null;
}

/** Update profile birthday. */
export async function updateBirthday(
  userId: string,
  birthday: string,
): Promise<AuthError | null> {
  const { error } = await supabase
    .from("profiles")
    .update({ birthday })
    .eq("id", userId);
  if (error) return { message: error.message };
  return null;
}

/**
 * Sync local goals and profile to Supabase after sign-in / account creation.
 * Upserts the profile row and inserts any local goals that don't exist remotely.
 */
export async function syncLocalDataToSupabase(userId: string): Promise<void> {
  // Sync profile (username)
  const rawProfile = await AsyncStorage.getItem("elarin:profile");
  if (rawProfile) {
    const profile = JSON.parse(rawProfile);
    if (profile.username) {
      await supabase.from("profiles").upsert({
        id: userId,
        username: profile.username,
        platform: "android",
      });
    }
  }

  // Sync goals
  const rawGoals = await AsyncStorage.getItem("elarin:goals");
  if (rawGoals) {
    const goals = JSON.parse(rawGoals);
    for (const goal of goals) {
      await supabase.from("goals").upsert({
        id: goal.id,
        user_id: userId,
        name: goal.name,
        tiers: goal.tiers,
        reminder: goal.reminder,
        created_at: new Date(goal.createdAt).toISOString(),
      });
    }
  }
}
