export interface UserProfile {
  id: string;
  email?: string;
  display_name?: string;
  avatar_url?: string;
  voice_enabled?: boolean;
  auto_speak?: boolean;
}

export interface AuthState {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}
