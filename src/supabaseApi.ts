import { normalizeBackendApiBaseUrl } from "./lib/apiBase";

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    user_metadata?: {
      name?: string;
      full_name?: string;
      username?: string;
    };
  };
};

export type Profile = {
  user_id: string;
  email?: string | null;
  display_name: string;
  username: string;
  avatar_url?: string | null;
  banner_url?: string | null;
  bio?: string | null;
  profile_theme?: Record<string, unknown> | null;
  presence_status?: UserPresenceStatus | null;
  presence_updated_at?: string | null;
  current_game?: string | null;
  current_game_updated_at?: string | null;
};

export type UserPresenceStatus = "active" | "away" | "busy" | "offline";

export type FriendRequest = {
  id: number;
  sender_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  sender_profile?: Profile;
  receiver_profile?: Profile;
};

export type ProfileComment = {
  id: number;
  profile_user_id: string;
  author_user_id: string;
  content: string;
  created_at: string;
};

export type DmConversation = {
  id: number;
  user_a: string;
  user_b: string;
  created_at: string;
  dm_theme?: Record<string, unknown> | null;
  is_pinned?: boolean;
  pinned_at?: string | null;
};

export type DmConversationUserState = {
  conversation_id: number;
  user_id: string;
  is_pinned: boolean;
  pinned_at?: string | null;
};

export type GroupChat = {
  id: number;
  created_by: string;
  name: string;
  created_at: string;
};

export type GroupChatMember = {
  group_chat_id: number;
  user_id: string;
  added_by?: string | null;
  role: "owner" | "member";
  joined_at: string;
  last_read_message_id: number;
};

export type DmMessage = {
  id: number;
  conversation_id: number;
  sender_id: string;
  content: string;
  attachment_url?: string | null;
  attachment_type?: MessageAttachmentType | null;
  created_at: string;
  edited_at?: string | null;
  read_by_receiver_at?: string | null;
};

export type DmMessageReaction = {
  message_id: number;
  user_id: string;
  emoji: string;
  created_at: string;
};

export type GroupChatMessage = {
  id: number;
  group_chat_id: number;
  sender_id: string;
  content: string;
  attachment_url?: string | null;
  attachment_type?: MessageAttachmentType | null;
  created_at: string;
  edited_at?: string | null;
};

export type GroupChatMessageReaction = {
  message_id: number;
  user_id: string;
  emoji: string;
  created_at: string;
};

export type MessageAttachmentType = "image" | "gif";

export type GifResult = {
  id: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
  description: string;
};

export type LivekitKrispTokenPayload = {
  url: string;
  token: string;
  identity: string;
  room: string;
  ttlSeconds: number;
  expiresAt: string;
};

export type Glytch = {
  id: number;
  owner_id: string;
  name: string;
  invite_code: string;
  bio?: string | null;
  icon_url?: string | null;
  is_public?: boolean | null;
  max_members?: number | null;
  member_count?: number | null;
  is_joined?: boolean | null;
  created_at: string;
};

export type PublicGlytchDirectoryEntry = {
  id: number;
  owner_id: string;
  name: string;
  invite_code: string;
  bio?: string | null;
  icon_url?: string | null;
  is_public: boolean;
  max_members?: number | null;
  member_count: number;
  created_at: string;
  is_joined: boolean;
};

export type GlytchChannel = {
  id: number;
  glytch_id: number;
  category_id?: number | null;
  name: string;
  kind: "text" | "voice";
  text_post_mode: "all" | "images_only" | "text_only";
  voice_user_limit?: number | null;
  channel_theme?: Record<string, unknown> | null;
  created_by: string;
  created_at: string;
};

export type GlytchChannelCategory = {
  id: number;
  glytch_id: number;
  name: string;
  created_by: string;
  created_at: string;
};

export type GlytchMember = {
  glytch_id: number;
  user_id: string;
  role: "owner" | "admin" | "member";
  joined_at: string;
};

export type GlytchRole = {
  id: number;
  glytch_id: number;
  name: string;
  color: string;
  priority: number;
  is_system: boolean;
  is_default: boolean;
  permissions: Record<string, boolean>;
  created_at: string;
};

export type GlytchMemberRole = {
  glytch_id: number;
  user_id: string;
  role_id: number;
  assigned_at: string;
};

export type GlytchBan = {
  glytch_id: number;
  user_id: string;
  banned_by: string;
  reason?: string | null;
  banned_at: string;
};

export type GlytchUnbanRequestStatus = "pending" | "approved" | "rejected";

export type GlytchUnbanRequest = {
  id: number;
  glytch_id: number;
  user_id: string;
  status: GlytchUnbanRequestStatus;
  message?: string | null;
  requested_at: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_note?: string | null;
};

export type GlytchBotSettings = {
  glytch_id: number;
  enabled: boolean;
  block_external_links: boolean;
  block_invite_links: boolean;
  block_blocked_words: boolean;
  blocked_words: string[];
  dm_on_kick_or_ban: boolean;
  dm_on_message_block: boolean;
  third_party_bots_enabled: boolean;
  third_party_bot_webhook_url?: string | null;
  updated_by?: string | null;
  updated_at?: string;
};

export class JoinGlytchBannedError extends Error {
  glytchId: number | null;

  constructor(message: string, glytchId: number | null = null) {
    super(message);
    this.name = "JoinGlytchBannedError";
    this.glytchId = glytchId;
  }
}

export type GlytchChannelRolePermission = {
  glytch_id: number;
  role_id: number;
  channel_id: number;
  can_view: boolean;
  can_send_messages: boolean;
  can_join_voice: boolean;
  updated_at: string;
};

export type GlytchChannelSettingsInput = {
  text_post_mode?: "all" | "images_only" | "text_only";
  voice_user_limit?: number | null;
};

export type GlytchMessage = {
  id: number;
  glytch_channel_id: number;
  sender_id: string;
  content: string;
  attachment_url?: string | null;
  attachment_type?: MessageAttachmentType | null;
  bot_should_delete?: boolean;
  created_at: string;
  edited_at?: string | null;
};

export type GlytchMessageReaction = {
  message_id: number;
  user_id: string;
  emoji: string;
  created_at: string;
};

export type VoiceParticipant = {
  room_key: string;
  user_id: string;
  muted: boolean;
  deafened: boolean;
  moderator_forced_muted: boolean;
  moderator_forced_deafened: boolean;
  joined_at: string;
};

export type VoiceSignal = {
  id: number;
  room_key: string;
  sender_id: string;
  target_id: string | null;
  kind: "offer" | "answer" | "candidate";
  payload: Record<string, unknown>;
  created_at: string;
};

const apiBase = normalizeBackendApiBaseUrl(import.meta.env.VITE_API_URL as string | undefined);
const usingBackendRoutes = true;
const supabaseBaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/+$/, "");
const profileBucket = (import.meta.env.VITE_SUPABASE_PROFILE_BUCKET as string | undefined) || "profile-media";
const glytchBucket = (import.meta.env.VITE_SUPABASE_GLYTCH_BUCKET as string | undefined) || "glytch-media";
const messageBucket = (import.meta.env.VITE_SUPABASE_MESSAGE_BUCKET as string | undefined) || "message-media";
const MESSAGE_SIGN_URL_TTL_SECONDS = 3600;
const MESSAGE_SIGN_URL_REFRESH_BUFFER_MS = 30_000;
const MESSAGE_SIGN_URL_FAILURE_TTL_MS = 8 * 1000;
const messageSignedUrlCache = new Map<string, { signedUrl: string | null; expiresAt: number }>();
const FALLBACK_GIF_LIBRARY: GifResult[] = [
  {
    id: "fallback-happy",
    url: "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif",
    previewUrl: "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif",
    width: 480,
    height: 270,
    description: "Happy",
  },
  {
    id: "fallback-celebrate",
    url: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
    previewUrl: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
    width: 480,
    height: 270,
    description: "Celebrate",
  },
  {
    id: "fallback-thumbs-up",
    url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif",
    previewUrl: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif",
    width: 400,
    height: 225,
    description: "Thumbs up",
  },
  {
    id: "fallback-wow",
    url: "https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif",
    previewUrl: "https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif",
    width: 400,
    height: 225,
    description: "Wow",
  },
  {
    id: "fallback-lol",
    url: "https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif",
    previewUrl: "https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif",
    width: 500,
    height: 281,
    description: "Laugh",
  },
  {
    id: "fallback-clap",
    url: "https://media.giphy.com/media/26u4lOMA8JKSnL9Uk/giphy.gif",
    previewUrl: "https://media.giphy.com/media/26u4lOMA8JKSnL9Uk/giphy.gif",
    width: 480,
    height: 270,
    description: "Clap",
  },
  {
    id: "fallback-hello",
    url: "https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif",
    previewUrl: "https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif",
    width: 480,
    height: 270,
    description: "Hello",
  },
  {
    id: "fallback-facepalm",
    url: "https://media.giphy.com/media/3og0INyCmHlNylks9O/giphy.gif",
    previewUrl: "https://media.giphy.com/media/3og0INyCmHlNylks9O/giphy.gif",
    width: 480,
    height: 270,
    description: "Facepalm",
  },
  {
    id: "fallback-shrug",
    url: "https://media.giphy.com/media/3o7btNRptqBgLSKR2w/giphy.gif",
    previewUrl: "https://media.giphy.com/media/3o7btNRptqBgLSKR2w/giphy.gif",
    width: 480,
    height: 270,
    description: "Shrug",
  },
  {
    id: "fallback-hype",
    url: "https://media.giphy.com/media/9D8EF3Qjw7ieVX0ccG/giphy.gif",
    previewUrl: "https://media.giphy.com/media/9D8EF3Qjw7ieVX0ccG/giphy.gif",
    width: 480,
    height: 270,
    description: "Hype",
  },
];

function fallbackGifSearch(query: string, limit: number): { results: GifResult[]; next: string | null } {
  const trimmedQuery = query.trim().toLowerCase();
  const source =
    trimmedQuery.length === 0
      ? FALLBACK_GIF_LIBRARY
      : FALLBACK_GIF_LIBRARY.filter((gif) => gif.description.toLowerCase().includes(trimmedQuery));
  const results = (source.length > 0 ? source : FALLBACK_GIF_LIBRARY).slice(0, Math.max(1, limit));
  return { results, next: null };
}

function isLocalApiHost(value: string) {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

function assertConfig() {
  if (!apiBase) {
    throw new Error("Backend env vars missing. Set VITE_API_URL.");
  }
  if (import.meta.env.PROD && isLocalApiHost(apiBase)) {
    throw new Error("Invalid VITE_API_URL for production build. Use your deployed backend URL.");
  }
}

function getSupabasePublicBaseUrl() {
  if (!supabaseBaseUrl) {
    throw new Error("VITE_SUPABASE_URL is required to resolve media URLs.");
  }
  return supabaseBaseUrl;
}

function buildPublicMessageAssetUrl(objectPath: string) {
  return `${getSupabasePublicBaseUrl()}/storage/v1/object/public/${messageBucket}/${encodePath(objectPath)}`;
}

function absolutizeAttachmentCandidate(pathOrUrl: string) {
  const normalized = pathOrUrl.trim();
  if (!normalized) return normalized;
  if (/^https?:\/\//i.test(normalized)) return normalized;
  if (normalized.startsWith("/api/")) {
    return apiBase ? `${apiBase}${normalized}` : normalized;
  }
  if (normalized.startsWith("/storage/v1/") || normalized.startsWith("/object/")) {
    try {
      return toAbsoluteStorageUrl(normalized);
    } catch {
      return normalized;
    }
  }
  return normalized;
}

function toAbsoluteStorageUrl(pathOrUrl: string) {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  if (pathOrUrl.startsWith("/storage/v1/")) {
    return `${getSupabasePublicBaseUrl()}${pathOrUrl}`;
  }
  if (pathOrUrl.startsWith("/object/")) {
    return `${getSupabasePublicBaseUrl()}/storage/v1${pathOrUrl}`;
  }
  return `${getSupabasePublicBaseUrl()}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

function buildBackendSupabasePath(path: string): string {
  const parsed = new URL(path, "http://localhost");
  const { pathname, search } = parsed;

  if (pathname.startsWith("/auth/v1/")) {
    return `/api/auth/${pathname.slice("/auth/v1/".length)}${search}`;
  }
  if (pathname.startsWith("/rest/v1/rpc/")) {
    return `/api/rpc/${pathname.slice("/rest/v1/rpc/".length)}${search}`;
  }
  if (pathname.startsWith("/rest/v1/")) {
    return `/api/rest/${pathname.slice("/rest/v1/".length)}${search}`;
  }
  if (pathname.startsWith("/storage/v1/object/sign/")) {
    return `/api/storage/sign/${pathname.slice("/storage/v1/object/sign/".length)}${search}`;
  }
  if (pathname.startsWith("/storage/v1/object/")) {
    return `/api/storage/object/${pathname.slice("/storage/v1/object/".length)}${search}`;
  }

  throw new Error(`Unsupported Supabase route: ${pathname}`);
}

function resolveSupabaseEndpoint(path: string) {
  if (!apiBase) {
    throw new Error("Backend env vars missing. Set VITE_API_URL.");
  }

  return `${apiBase}${buildBackendSupabasePath(path)}`;
}

async function supabaseFetch(path: string, init?: RequestInit) {
  return fetch(resolveSupabaseEndpoint(path), init);
}

function supabaseHeaders(accessToken?: string): HeadersInit {
  assertConfig();
  const base: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (!accessToken) return base;

  return {
    ...base,
    Authorization: `Bearer ${accessToken}`,
  };
}

async function readJsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = extractErrorMessageFromPayload(data);
    throw new Error(message || "Supabase request failed.");
  }
  return data;
}

function extractErrorMessageFromPayload(data: unknown): string {
  if (Array.isArray(data) && typeof data[0]?.message === "string") {
    return data[0].message;
  }
  if (!data || typeof data !== "object") return "";
  const payload = data as { msg?: unknown; error_description?: unknown; message?: unknown };
  if (typeof payload.msg === "string") return payload.msg;
  if (typeof payload.error_description === "string") return payload.error_description;
  if (typeof payload.message === "string") return payload.message;
  return "";
}

function parseGlytchIdFromJoinErrorDetails(details: unknown): number | null {
  if (typeof details === "number" && Number.isFinite(details) && details > 0) {
    return Math.trunc(details);
  }

  if (typeof details === "string") {
    const raw = details.trim();
    if (!raw) return null;

    const direct = Number.parseInt(raw, 10);
    if (Number.isFinite(direct) && direct > 0) {
      return direct;
    }

    try {
      const parsed = JSON.parse(raw) as { glytch_id?: unknown } | null;
      const maybeId = parsed?.glytch_id;
      if (typeof maybeId === "number" && Number.isFinite(maybeId) && maybeId > 0) {
        return Math.trunc(maybeId);
      }
      if (typeof maybeId === "string") {
        const parsedId = Number.parseInt(maybeId, 10);
        if (Number.isFinite(parsedId) && parsedId > 0) {
          return parsedId;
        }
      }
    } catch {
      const match = raw.match(/glytch_id["'\s:=]+(\d+)/i);
      if (match) {
        const parsedId = Number.parseInt(match[1], 10);
        if (Number.isFinite(parsedId) && parsedId > 0) {
          return parsedId;
        }
      }
    }
  }

  if (details && typeof details === "object") {
    const maybeId = (details as { glytch_id?: unknown }).glytch_id;
    if (typeof maybeId === "number" && Number.isFinite(maybeId) && maybeId > 0) {
      return Math.trunc(maybeId);
    }
    if (typeof maybeId === "string") {
      const parsedId = Number.parseInt(maybeId, 10);
      if (Number.isFinite(parsedId) && parsedId > 0) {
        return parsedId;
      }
    }
  }

  return null;
}

function isMissingChannelSettingsSchemaError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("glytch_channels.text_post_mode") ||
    normalized.includes("glytch_channels.voice_user_limit") ||
    normalized.includes("glytch_channels.channel_theme") ||
    normalized.includes("voice_participants.moderator_forced_muted") ||
    normalized.includes("voice_participants.moderator_forced_deafened") ||
    normalized.includes("glytch_bans") ||
    normalized.includes("glytch_unban_requests") ||
    normalized.includes("glytch_bot_settings") ||
    normalized.includes("set_glytch_channel_settings") ||
    normalized.includes("set_glytch_channel_theme") ||
    normalized.includes("ban_user_from_glytch") ||
    normalized.includes("unban_user_from_glytch") ||
    normalized.includes("kick_member_from_glytch") ||
    normalized.includes("get_glytch_bot_settings") ||
    normalized.includes("set_glytch_bot_settings") ||
    normalized.includes("send_glytch_bot_dm_notice") ||
    normalized.includes("submit_glytch_unban_request") ||
    normalized.includes("review_glytch_unban_request") ||
    normalized.includes("p_force_muted") ||
    normalized.includes("p_force_deafened") ||
    (normalized.includes("text_post_mode") && normalized.includes("does not exist")) ||
    (normalized.includes("voice_user_limit") && normalized.includes("does not exist")) ||
    (normalized.includes("channel_theme") && normalized.includes("does not exist")) ||
    (normalized.includes("moderator_forced_muted") && normalized.includes("does not exist")) ||
    (normalized.includes("moderator_forced_deafened") && normalized.includes("does not exist")) ||
    (normalized.includes("glytch_bans") && normalized.includes("does not exist")) ||
    (normalized.includes("glytch_unban_requests") && normalized.includes("does not exist")) ||
    (normalized.includes("glytch_bot_settings") && normalized.includes("does not exist"))
  );
}

function isMissingDmThemeSchemaError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("dm_conversations.dm_theme") ||
    normalized.includes("set_dm_conversation_theme") ||
    (normalized.includes("dm_theme") && normalized.includes("does not exist"))
  );
}

function isMissingDmConversationStateSchemaError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("list_dm_conversations_for_user") ||
    normalized.includes("hide_dm_conversation") ||
    normalized.includes("set_dm_conversation_pinned") ||
    normalized.includes("dm_conversation_user_state")
  );
}

function isMissingProfileCommentsSchemaError(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("profile_comments");
}

function isMissingGlytchDirectorySchemaError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("glytches.is_public") ||
    normalized.includes("glytches.max_members") ||
    normalized.includes("join_public_glytch") ||
    normalized.includes("search_public_glytches") ||
    normalized.includes("set_glytch_profile") ||
    (normalized.includes("is_public") && normalized.includes("does not exist")) ||
    (normalized.includes("max_members") && normalized.includes("does not exist"))
  );
}

async function listDmConversationsLegacy(accessToken: string): Promise<DmConversation[]> {
  try {
    const query = new URLSearchParams({
      select: "id,user_a,user_b,created_at,dm_theme",
      order: "created_at.asc",
    });

    const res = await supabaseFetch(`/rest/v1/dm_conversations?${query.toString()}`, {
      method: "GET",
      headers: supabaseHeaders(accessToken),
    });

    return (await readJsonOrThrow(res)) as DmConversation[];
  } catch (err) {
    if (!(err instanceof Error) || !isMissingDmThemeSchemaError(err.message)) {
      throw err;
    }

    const fallbackQuery = new URLSearchParams({
      select: "id,user_a,user_b,created_at",
      order: "created_at.asc",
    });

    const fallbackRes = await supabaseFetch(`/rest/v1/dm_conversations?${fallbackQuery.toString()}`, {
      method: "GET",
      headers: supabaseHeaders(accessToken),
    });

    return (await readJsonOrThrow(fallbackRes)) as DmConversation[];
  }
}

function normalizeGlytchChannel(row: Partial<GlytchChannel>): GlytchChannel {
  const kind = row.kind === "voice" ? "voice" : "text";
  const textPostMode =
    row.text_post_mode === "images_only" || row.text_post_mode === "text_only" ? row.text_post_mode : "all";
  let parsedVoiceLimit: number | null = null;
  if (kind === "voice") {
    const rawLimit = row.voice_user_limit;
    if (typeof rawLimit === "number" && Number.isFinite(rawLimit) && rawLimit >= 1) {
      parsedVoiceLimit = rawLimit;
    } else if (typeof rawLimit === "string") {
      const parsed = Number.parseInt(rawLimit, 10);
      if (Number.isFinite(parsed) && parsed >= 1) {
        parsedVoiceLimit = parsed;
      }
    }
  }

  return {
    id: row.id as number,
    glytch_id: row.glytch_id as number,
    category_id: row.category_id ?? null,
    name: row.name as string,
    kind,
    text_post_mode: textPostMode,
    voice_user_limit: parsedVoiceLimit,
    channel_theme:
      row.channel_theme && typeof row.channel_theme === "object" && !Array.isArray(row.channel_theme)
        ? (row.channel_theme as Record<string, unknown>)
        : null,
    created_by: row.created_by as string,
    created_at: row.created_at as string,
  };
}

function normalizeVoiceParticipant(row: Partial<VoiceParticipant>): VoiceParticipant {
  return {
    room_key: row.room_key as string,
    user_id: row.user_id as string,
    muted: Boolean(row.muted),
    deafened: Boolean(row.deafened),
    moderator_forced_muted: Boolean(row.moderator_forced_muted),
    moderator_forced_deafened: Boolean(row.moderator_forced_deafened),
    joined_at: row.joined_at as string,
  };
}

function encodePath(path: string) {
  return path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function stripPathSearchAndHash(raw: string) {
  const queryIndex = raw.indexOf("?");
  const hashIndex = raw.indexOf("#");
  let endIndex = raw.length;
  if (queryIndex >= 0) {
    endIndex = Math.min(endIndex, queryIndex);
  }
  if (hashIndex >= 0) {
    endIndex = Math.min(endIndex, hashIndex);
  }
  return raw.slice(0, endIndex);
}

function decodePathSafely(raw: string) {
  let decoded = raw;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return decoded;
}

function normalizeMessageAssetObjectPath(raw: string): string | null {
  let normalized = stripPathSearchAndHash(raw.trim());
  if (!normalized) return null;
  normalized = decodePathSafely(normalized).replace(/^\/+/, "");

  const pathPrefixes = [
    `${messageBucket}/`,
    `storage/v1/object/public/${messageBucket}/`,
    `storage/v1/object/sign/${messageBucket}/`,
    `storage/v1/object/authenticated/${messageBucket}/`,
    `storage/v1/object/${messageBucket}/`,
    `api/storage/object/public/${messageBucket}/`,
    `api/storage/sign/${messageBucket}/`,
    `api/storage/object/authenticated/${messageBucket}/`,
    `api/storage/object/${messageBucket}/`,
    `api/media/message/${messageBucket}/`,
    `api/supabase/storage/v1/object/public/${messageBucket}/`,
    `api/supabase/storage/v1/object/sign/${messageBucket}/`,
    `api/supabase/storage/v1/object/authenticated/${messageBucket}/`,
    `api/supabase/storage/v1/object/${messageBucket}/`,
  ];

  for (const prefix of pathPrefixes) {
    if (normalized.startsWith(prefix)) {
      normalized = normalized.slice(prefix.length);
      break;
    }
  }

  if (normalized.startsWith("dm/") || normalized.startsWith("group/") || normalized.startsWith("glytch/")) {
    return normalized;
  }

  const embeddedMatch = normalized.match(/(?:^|\/)((?:dm|group|glytch)\/.+)$/);
  if (embeddedMatch && embeddedMatch[1]) {
    return embeddedMatch[1];
  }

  return null;
}

function extractMessageAssetPath(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const tryNormalizePathCandidate = (candidate: string | null | undefined): string | null => {
    if (typeof candidate !== "string") return null;
    const normalized = normalizeMessageAssetObjectPath(candidate);
    return normalized || null;
  };

  const directPath = normalizeMessageAssetObjectPath(trimmed);
  if (directPath) {
    return directPath;
  }

  const relativePathPrefixes = [
    `/storage/v1/object/public/${messageBucket}/`,
    `/storage/v1/object/sign/${messageBucket}/`,
    `/storage/v1/object/authenticated/${messageBucket}/`,
    `/storage/v1/object/${messageBucket}/`,
    `/api/storage/object/public/${messageBucket}/`,
    `/api/storage/sign/${messageBucket}/`,
    `/api/storage/object/authenticated/${messageBucket}/`,
    `/api/storage/object/${messageBucket}/`,
    `/api/media/message/${messageBucket}/`,
    `/api/media/message-upload/`,
    `/api/supabase/storage/v1/object/public/${messageBucket}/`,
    `/api/supabase/storage/v1/object/sign/${messageBucket}/`,
    `/api/supabase/storage/v1/object/authenticated/${messageBucket}/`,
    `/api/supabase/storage/v1/object/${messageBucket}/`,
  ];
  for (const prefix of relativePathPrefixes) {
    if (trimmed.startsWith(prefix)) {
      const normalized = normalizeMessageAssetObjectPath(trimmed.slice(prefix.length));
      if (normalized) return normalized;
    }
  }

  if (trimmed.startsWith("/api/media/message-upload") || trimmed.startsWith("/api/media/message")) {
    try {
      const parsedRelative = new URL(trimmed, "http://localhost");
      const queryPathKeys = ["objectPath", "path", "file", "attachment", "attachmentUrl", "url", "src"];
      for (const key of queryPathKeys) {
        const normalized = tryNormalizePathCandidate(parsedRelative.searchParams.get(key));
        if (normalized) return normalized;
      }
    } catch {
      // Ignore malformed relative URL candidates.
    }
  }

  try {
    const parsed = new URL(trimmed);
    const pathname = parsed.pathname || "";
    const decodedPathname = decodePathSafely(pathname);
    const queryPathKeys = ["objectPath", "path", "file", "attachment", "attachmentUrl", "url", "src"];
    for (const key of queryPathKeys) {
      const normalized = tryNormalizePathCandidate(parsed.searchParams.get(key));
      if (normalized) return normalized;
    }
    const candidatePathnames = Array.from(new Set([pathname, decodedPathname]));
    const pathPrefixes = [
      `/storage/v1/object/public/${messageBucket}/`,
      `/storage/v1/object/sign/${messageBucket}/`,
      `/storage/v1/object/authenticated/${messageBucket}/`,
      `/storage/v1/object/${messageBucket}/`,
      `/api/storage/object/public/${messageBucket}/`,
      `/api/storage/sign/${messageBucket}/`,
      `/api/storage/object/authenticated/${messageBucket}/`,
      `/api/storage/object/${messageBucket}/`,
      `/api/media/message/${messageBucket}/`,
      `/api/media/message/`,
      `/api/media/message-upload/${messageBucket}/`,
      `/api/media/message-upload/`,
      `/api/supabase/storage/v1/object/public/${messageBucket}/`,
      `/api/supabase/storage/v1/object/sign/${messageBucket}/`,
      `/api/supabase/storage/v1/object/authenticated/${messageBucket}/`,
      `/api/supabase/storage/v1/object/${messageBucket}/`,
    ];
    for (const pathCandidate of candidatePathnames) {
      for (const prefix of pathPrefixes) {
        if (pathCandidate.startsWith(prefix)) {
          const normalized = normalizeMessageAssetObjectPath(pathCandidate.slice(prefix.length));
          if (normalized) return normalized;
        }
      }
    }

    for (const pathCandidate of candidatePathnames) {
      const bucketPathMatch = pathCandidate.match(new RegExp(`/${messageBucket}/(.+)$`));
      if (bucketPathMatch && bucketPathMatch[1]) {
        const normalized = normalizeMessageAssetObjectPath(bucketPathMatch[1]);
        if (normalized) return normalized;
      }

      const backendMediaPathMatch = pathCandidate.match(/\/api\/media\/message\/(.+)$/);
      if (backendMediaPathMatch && backendMediaPathMatch[1]) {
        const normalized = normalizeMessageAssetObjectPath(backendMediaPathMatch[1]);
        if (normalized) return normalized;
      }

      const backendUploadPathMatch = pathCandidate.match(/\/api\/media\/message-upload\/(.+)$/);
      if (backendUploadPathMatch && backendUploadPathMatch[1]) {
        const normalized = normalizeMessageAssetObjectPath(backendUploadPathMatch[1]);
        if (normalized) return normalized;
      }

      const backendMediaPathMatchNoSlash = pathCandidate.match(/\/api\/media\/message(?:-upload)?$/);
      if (backendMediaPathMatchNoSlash) {
        for (const key of queryPathKeys) {
          const normalized = tryNormalizePathCandidate(parsed.searchParams.get(key));
          if (normalized) return normalized;
        }
      }
    }
  } catch {
    // Not a valid URL.
  }

  return null;
}

function messageFromUnknownJson(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const row = data as Record<string, unknown>;
  const meta = row.meta && typeof row.meta === "object" ? (row.meta as Record<string, unknown>) : null;
  if (typeof row.msg === "string") return row.msg;
  if (typeof row.message === "string") return row.message;
  if (typeof row.error === "string") return row.error;
  if (typeof row.error_description === "string") return row.error_description;
  if (meta && typeof meta.msg === "string") return meta.msg;
  return "";
}

function normalizeGiphyResponse(data: unknown): { results: GifResult[]; next: string | null } {
  const row = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const rawResults = Array.isArray(row.data)
    ? row.data
    : Array.isArray(row.results)
      ? row.results
      : [];

  const results: GifResult[] = rawResults
    .map((item): GifResult | null => {
      if (!item || typeof item !== "object") return null;
      const entry = item as Record<string, unknown>;
      const directUrlCandidate = typeof entry.url === "string"
        ? entry.url
        : typeof entry.gifUrl === "string"
          ? entry.gifUrl
          : "";
      const directPreviewCandidate = typeof entry.previewUrl === "string" ? entry.previewUrl : "";
      const directDescriptionCandidate = typeof entry.description === "string"
        ? entry.description
        : typeof entry.title === "string"
          ? entry.title
          : "GIF";
      const directWidthRaw = entry.width;
      const directHeightRaw = entry.height;
      if (directUrlCandidate.trim().length > 0) {
        const parsedWidth = typeof directWidthRaw === "string"
          ? Number.parseInt(directWidthRaw, 10)
          : typeof directWidthRaw === "number"
            ? directWidthRaw
            : 0;
        const parsedHeight = typeof directHeightRaw === "string"
          ? Number.parseInt(directHeightRaw, 10)
          : typeof directHeightRaw === "number"
            ? directHeightRaw
            : 0;
        const normalizedDirectUrl = directUrlCandidate.trim();
        return {
          id: typeof entry.id === "string" ? entry.id : normalizedDirectUrl,
          url: normalizedDirectUrl,
          previewUrl: directPreviewCandidate.trim() || normalizedDirectUrl,
          width: Number.isFinite(parsedWidth) ? parsedWidth : 0,
          height: Number.isFinite(parsedHeight) ? parsedHeight : 0,
          description: directDescriptionCandidate.trim() || "GIF",
        };
      }

      const images = entry.images && typeof entry.images === "object" ? (entry.images as Record<string, unknown>) : {};
      const original = images.original && typeof images.original === "object" ? (images.original as Record<string, unknown>) : null;
      const fixedSmall =
        images.fixed_width_small && typeof images.fixed_width_small === "object"
          ? (images.fixed_width_small as Record<string, unknown>)
          : null;
      const fixed = images.fixed_width && typeof images.fixed_width === "object" ? (images.fixed_width as Record<string, unknown>) : null;
      const downsized = images.downsized && typeof images.downsized === "object" ? (images.downsized as Record<string, unknown>) : null;

      const urlCandidates = [original?.url, downsized?.url, fixed?.url, fixedSmall?.url];
      const previewCandidates = [fixedSmall?.url, fixed?.url, downsized?.url, original?.url];
      const url = urlCandidates.find((candidate) => typeof candidate === "string" && candidate.length > 0) as string | undefined;
      if (!url) return null;

      const previewUrl =
        (previewCandidates.find((candidate) => typeof candidate === "string" && candidate.length > 0) as string | undefined) || url;
      const widthRaw = original?.width ?? fixed?.width ?? fixedSmall?.width;
      const heightRaw = original?.height ?? fixed?.height ?? fixedSmall?.height;
      const width = typeof widthRaw === "string" ? Number.parseInt(widthRaw, 10) : typeof widthRaw === "number" ? widthRaw : 0;
      const height = typeof heightRaw === "string" ? Number.parseInt(heightRaw, 10) : typeof heightRaw === "number" ? heightRaw : 0;

      return {
        id: typeof entry.id === "string" ? entry.id : url,
        url,
        previewUrl,
        width,
        height,
        description: typeof entry.title === "string" && entry.title.trim() ? entry.title : "GIF",
      };
    })
    .filter((item): item is GifResult => Boolean(item));

  const pagination = row.pagination && typeof row.pagination === "object" ? (row.pagination as Record<string, unknown>) : null;
  const offset = pagination && typeof pagination.offset === "number" ? pagination.offset : 0;
  const count = pagination && typeof pagination.count === "number" ? pagination.count : results.length;
  const total = pagination && typeof pagination.total_count === "number" ? pagination.total_count : count;
  const next = offset + count < total ? String(offset + count) : null;

  return {
    results,
    next,
  };
}

async function fetchGiphyGifs(query: string, limit: number): Promise<{ results: GifResult[]; next: string | null }> {
  if (!apiBase) {
    throw new Error("Backend env vars missing. Set VITE_API_URL.");
  }

  const params = new URLSearchParams({
    limit: String(limit),
  });
  if (query.trim()) {
    params.set("q", query.trim());
  }

  const res = await fetch(`${apiBase}/api/gifs/search?${params.toString()}`, {
    headers: {
      Accept: "application/json",
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = messageFromUnknownJson(data);
    throw new Error(message || `Could not load GIFs (status ${res.status}).`);
  }
  return normalizeGiphyResponse(data || {});
}

export async function requestLivekitKrispToken(
  accessToken: string,
  roomKey?: string | null,
): Promise<LivekitKrispTokenPayload> {
  assertConfig();
  if (!apiBase) {
    throw new Error("Backend env vars missing. Set VITE_API_URL.");
  }

  const requestBody: Record<string, unknown> = {};
  if (typeof roomKey === "string" && roomKey.trim()) {
    requestBody.roomKey = roomKey.trim();
  }

  const response = await fetch(`${apiBase}/api/voice/livekit-token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(requestBody),
  });

  const payload = (await response.json().catch(() => ({}))) as Partial<LivekitKrispTokenPayload> & {
    error?: string;
    message?: string;
  };
  if (!response.ok) {
    const message = payload.error || payload.message || `Could not request LiveKit token (status ${response.status}).`;
    throw new Error(message);
  }

  const url = typeof payload.url === "string" ? payload.url.trim() : "";
  const token = typeof payload.token === "string" ? payload.token.trim() : "";
  const identity = typeof payload.identity === "string" ? payload.identity.trim() : "";
  const room = typeof payload.room === "string" ? payload.room.trim() : "";
  const expiresAt = typeof payload.expiresAt === "string" ? payload.expiresAt : "";
  const ttlSeconds = Number.isFinite(Number(payload.ttlSeconds)) ? Number(payload.ttlSeconds) : 0;

  if (!url || !token || !identity || !room || !expiresAt || ttlSeconds <= 0) {
    throw new Error("LiveKit token response is missing required fields.");
  }

  return {
    url,
    token,
    identity,
    room,
    ttlSeconds,
    expiresAt,
  };
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  assertConfig();
  const res = await supabaseFetch(`/rest/v1/rpc/is_username_available`, {
    method: "POST",
    headers: supabaseHeaders(),
    body: JSON.stringify({ p_username: username.toLowerCase() }),
  });

  return (await readJsonOrThrow(res)) as boolean;
}

export async function signUp(email: string, password: string, username: string) {
  assertConfig();
  const normalizedUsername = username.toLowerCase();
  const res = await supabaseFetch(`/auth/v1/signup`, {
    method: "POST",
    headers: supabaseHeaders(),
    body: JSON.stringify({
      email,
      password,
      data: { name: normalizedUsername, username: normalizedUsername },
    }),
  });

  return (await readJsonOrThrow(res)) as { session: AuthSession | null; user: AuthSession["user"] | null };
}

export async function signIn(email: string, password: string) {
  assertConfig();
  const res = await supabaseFetch(`/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: supabaseHeaders(),
    body: JSON.stringify({ email, password }),
  });

  return (await readJsonOrThrow(res)) as AuthSession;
}

type ClaimSingleSessionOptions = {
  allowTakeover?: boolean;
};

function isSingleSessionConflictError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("already active in another session") ||
    message.includes("another active session") ||
    message.includes("single session")
  );
}

export async function claimSingleSessionLock(
  accessToken: string,
  sessionId: string,
  options: ClaimSingleSessionOptions = {},
) {
  assertConfig();
  const normalizedSessionId = sessionId.trim();
  if (!normalizedSessionId) {
    throw new Error("Session key is required.");
  }

  const claimBody = JSON.stringify({ p_session_id: normalizedSessionId });

  try {
    const res = await supabaseFetch(`/rest/v1/rpc/claim_single_session_login`, {
      method: "POST",
      headers: supabaseHeaders(accessToken),
      body: claimBody,
    });

    await readJsonOrThrow(res);
    return true;
  } catch (error) {
    if (!options.allowTakeover || !isSingleSessionConflictError(error)) {
      throw error;
    }

    // Manual login can recover from stale locks by clearing prior lock and retrying once.
    await releaseSingleSessionLock(accessToken, null);

    const retryRes = await supabaseFetch(`/rest/v1/rpc/claim_single_session_login`, {
      method: "POST",
      headers: supabaseHeaders(accessToken),
      body: claimBody,
    });

    await readJsonOrThrow(retryRes);
    return true;
  }
}

export async function releaseSingleSessionLock(accessToken: string, sessionId?: string | null) {
  assertConfig();
  const normalizedSessionId =
    typeof sessionId === "string" && sessionId.trim().length > 0 ? sessionId.trim() : null;

  const res = await supabaseFetch(`/rest/v1/rpc/release_single_session_login`, {
    method: "POST",
    headers: supabaseHeaders(accessToken),
    body: JSON.stringify({ p_session_id: normalizedSessionId }),
  });

  await readJsonOrThrow(res);
  return true;
}

export async function refreshSession(refreshToken: string) {
  assertConfig();
  const res = await supabaseFetch(`/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: supabaseHeaders(),
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  return (await readJsonOrThrow(res)) as AuthSession;
}

export async function getCurrentUser(accessToken: string) {
  assertConfig();
  const res = await supabaseFetch(`/auth/v1/user`, {
    method: "GET",
    headers: supabaseHeaders(accessToken),
  });

  return (await readJsonOrThrow(res)) as AuthSession["user"];
}

export async function getMyProfile(accessToken: string, userId: string): Promise<Profile | null> {
  assertConfig();
  const query = new URLSearchParams({
    select:
      "user_id,email,display_name,username,avatar_url,banner_url,bio,profile_theme,presence_status,presence_updated_at,current_game,current_game_updated_at",
    user_id: `eq.${userId}`,
    limit: "1",
  });

  const res = await supabaseFetch(`/rest/v1/profiles?${query.toString()}`, {
    method: "GET",
    headers: supabaseHeaders(accessToken),
  });

  const rows = (await readJsonOrThrow(res)) as Profile[];
  return rows[0] || null;
}

export async function upsertMyProfile(
  accessToken: string,
  userId: string,
  email: string,
  displayName: string,
  username: string,
) {
  assertConfig();
  const normalizedUsername = username.toLowerCase();
  const res = await supabaseFetch(`/rest/v1/profiles`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(accessToken),
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify([
      {
        user_id: userId,
        email: email.toLowerCase(),
        display_name: displayName,
        username: normalizedUsername,
      },
    ]),
  });

  return (await readJsonOrThrow(res)) as Profile[];
}

export async function findProfileByUsername(accessToken: string, username: string) {
  assertConfig();
  const normalizedInput = username.trim().toLowerCase().replace(/^@+/, "");
  const hashIndex = normalizedInput.lastIndexOf("#");
  const normalizedUsername =
    hashIndex > 0
      ? `${normalizedInput.slice(0, hashIndex)}${normalizedInput.slice(hashIndex + 1)}`
      : normalizedInput;
  const lookupUsername = normalizedUsername.replace(/[^a-z0-9]/g, "");
  const res = await supabaseFetch(`/rest/v1/rpc/find_public_profile_by_username`, {
    method: "POST",
    headers: supabaseHeaders(accessToken),
    body: JSON.stringify({ p_username: lookupUsername }),
  });
  const rows = (await readJsonOrThrow(res)) as Profile[];
  return rows[0] || null;
}

export async function sendFriendRequest(accessToken: string, senderId: string, receiverId: string) {
  assertConfig();
  const res = await supabaseFetch(`/rest/v1/friend_requests`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(accessToken),
      Prefer: "return=representation",
    },
    body: JSON.stringify([{ sender_id: senderId, receiver_id: receiverId }]),
  });

  return (await readJsonOrThrow(res)) as FriendRequest[];
}

export async function listFriendRequests(accessToken: string): Promise<FriendRequest[]> {
  assertConfig();
  const query = new URLSearchParams({
    select: "id,sender_id,receiver_id,status,created_at",
    order: "created_at.desc",
  });

  const res = await supabaseFetch(`/rest/v1/friend_requests?${query.toString()}`, {
    method: "GET",
    headers: supabaseHeaders(accessToken),
  });

  return (await readJsonOrThrow(res)) as FriendRequest[];
}

export async function respondToFriendRequest(accessToken: string, requestId: number, status: "accepted" | "rejected") {
  assertConfig();
  const res = await supabaseFetch(`/rest/v1/friend_requests?id=eq.${requestId}`, {
    method: "PATCH",
    headers: {
      ...supabaseHeaders(accessToken),
      Prefer: "return=representation",
    },
    body: JSON.stringify({ status }),
  });

  return (await readJsonOrThrow(res)) as FriendRequest[];
}

export async function acceptFriendRequest(accessToken: string, requestId: number) {
  assertConfig();
  const res = await supabaseFetch(`/rest/v1/rpc/accept_friend_request`, {
    method: "POST",
    headers: supabaseHeaders(accessToken),
    body: JSON.stringify({ p_request_id: requestId }),
  });

  return (await readJsonOrThrow(res)) as { conversation_id: number };
}

export async function unfriendUser(accessToken: string, userId: string) {
  assertConfig();
  const res = await supabaseFetch(`/rest/v1/rpc/unfriend_user`, {
    method: "POST",
    headers: supabaseHeaders(accessToken),
    body: JSON.stringify({ p_user_id: userId }),
  });

  return (await readJsonOrThrow(res)) as { removed_conversation: boolean; removed_requests: number };
}

export async function listDmConversations(accessToken: string): Promise<DmConversation[]> {
  assertConfig();
  try {
    const res = await supabaseFetch(`/rest/v1/rpc/list_dm_conversations_for_user`, {
      method: "POST",
      headers: supabaseHeaders(accessToken),
      body: JSON.stringify({}),
    });
    return (await readJsonOrThrow(res)) as DmConversation[];
  } catch (err) {
    if (!(err instanceof Error)) {
      throw err;
    }
    if (isMissingDmConversationStateSchemaError(err.message) || isMissingDmThemeSchemaError(err.message)) {
      return listDmConversationsLegacy(accessToken);
    }
    throw err;
  }
}

export async function listGroupChats(accessToken: string): Promise<GroupChat[]> {
  assertConfig();
  const query = new URLSearchParams({
    select: "id,created_by,name,created_at",
    order: "created_at.asc",
  });

  const res = await supabaseFetch(`/rest/v1/group_chats?${query.toString()}`, {
    method: "GET",
    headers: supabaseHeaders(accessToken),
  });

  return (await readJsonOrThrow(res)) as GroupChat[];
}

export async function listGroupChatMembers(accessToken: string, groupChatId: number): Promise<GroupChatMember[]> {
  assertConfig();
  const query = new URLSearchParams({
    select: "group_chat_id,user_id,added_by,role,joined_at,last_read_message_id",
    group_chat_id: `eq.${groupChatId}`,
    order: "joined_at.asc",
  });

  const res = await supabaseFetch(`/rest/v1/group_chat_members?${query.toString()}`, {
    method: "GET",
    headers: supabaseHeaders(accessToken),
  });

  return (await readJsonOrThrow(res)) as GroupChatMember[];
}

export async function createGroupChat(accessToken: string, name: string, memberIds: string[] = []) {
  assertConfig();
  const uniqueIds = Array.from(new Set(memberIds.filter((id) => typeof id === "string" && id.length > 0)));
  const res = await supabaseFetch(`/rest/v1/rpc/create_group_chat`, {
    method: "POST",
    headers: supabaseHeaders(accessToken),
    body: JSON.stringify({
      p_name: name.trim() || null,
      p_member_ids: uniqueIds.length > 0 ? uniqueIds : null,
    }),
  });

  const row = (await readJsonOrThrow(res)) as { group_chat_id?: number | string };
  const parsed = Number(row?.group_chat_id);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Group chat was created but no valid id was returned.");
  }
  return { group_chat_id: Math.trunc(parsed) };
}

export async function addGroupChatMembers(accessToken: string, groupChatId: number, memberIds: string[]) {
  assertConfig();
  const uniqueIds = Array.from(new Set(memberIds.filter((id) => typeof id === "string" && id.length > 0)));
  if (!Number.isFinite(groupChatId) || groupChatId <= 0) {
    throw new Error("Invalid group chat.");
  }
  if (uniqueIds.length === 0) {
    return { inserted_count: 0 };
  }

  const res = await supabaseFetch(`/rest/v1/rpc/add_group_chat_members`, {
    method: "POST",
    headers: supabaseHeaders(accessToken),
    body: JSON.stringify({
      p_group_chat_id: groupChatId,
      p_member_ids: uniqueIds,
    }),
  });

  const row = (await readJsonOrThrow(res)) as { inserted_count?: number | string };
  const parsed = Number(row?.inserted_count ?? 0);
  return {
    inserted_count: Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 0,
  };
}

export async function setDmConversationTheme(
  accessToken: string,
  conversationId: number,
  theme: Record<string, unknown> | null,
): Promise<DmConversation> {
  assertConfig();
  try {
    const res = await supabaseFetch(`/rest/v1/rpc/set_dm_conversation_theme`, {
      method: "POST",
      headers: supabaseHeaders(accessToken),
      body: JSON.stringify({
        p_conversation_id: conversationId,
        p_theme: theme,
      }),
    });

    return (await readJsonOrThrow(res)) as DmConversation;
  } catch (err) {
    if (err instanceof Error && isMissingDmThemeSchemaError(err.message)) {
      throw new Error("Shared DM themes are unavailable until the latest database migration is applied.");
    }
    throw err;
  }
}

export async function fetchProfilesByIds(accessToken: string, ids: string[]): Promise<Profile[]> {
  if (ids.length === 0) return [];
  assertConfig();
  const res = await supabaseFetch(`/rest/v1/rpc/list_public_profiles_by_ids`, {
    method: "POST",
    headers: supabaseHeaders(accessToken),
    body: JSON.stringify({ p_user_ids: ids }),
  });

  return (await readJsonOrThrow(res)) as Profile[];
}

export async function updateMyProfileCustomization(
  accessToken: string,
  userId: string,
  updates: {
    display_name?: string;
    avatar_url?: string | null;
    banner_url?: string | null;
    bio?: string | null;
    profile_theme?: Record<string, unknown>;
    presence_status?: UserPresenceStatus;
    presence_updated_at?: string;
    current_game?: string | null;
    current_game_updated_at?: string;
  },
) {
  assertConfig();
  const res = await supabaseFetch(`/rest/v1/profiles?user_id=eq.${userId}`, {
    method: "PATCH",
    headers: {
      ...supabaseHeaders(accessToken),
      Prefer: "return=representation",
    },
    body: JSON.stringify(updates),
  });

  return (await readJsonOrThrow(res)) as Profile[];
}

export async function listProfileComments(
  accessToken: string,
  profileUserId: string,
  limit = 120,
): Promise<ProfileComment[]> {
  assertConfig();
  const safeLimit = Math.min(200, Math.max(1, Math.trunc(limit)));

  try {
    const query = new URLSearchParams({
      select: "id,profile_user_id,author_user_id,content,created_at",
      profile_user_id: `eq.${profileUserId}`,
      order: "created_at.asc",
      limit: String(safeLimit),
    });
    const res = await supabaseFetch(`/rest/v1/profile_comments?${query.toString()}`, {
      method: "GET",
      headers: supabaseHeaders(accessToken),
    });

    return (await readJsonOrThrow(res)) as ProfileComment[];
  } catch (err) {
    if (err instanceof Error && isMissingProfileCommentsSchemaError(err.message)) {
      return [];
    }
    throw err;
  }
}

export async function createProfileComment(
  accessToken: string,
  profileUserId: string,
  content: string,
): Promise<ProfileComment[]> {
  assertConfig();

  try {
    const res = await supabaseFetch(`/rest/v1/profile_comments`, {
      method: "POST",
      headers: {
        ...supabaseHeaders(accessToken),
        Prefer: "return=representation",
      },
      body: JSON.stringify([
        {
          profile_user_id: profileUserId,
          content,
        },
      ]),
    });

    return (await readJsonOrThrow(res)) as ProfileComment[];
  } catch (err) {
    if (err instanceof Error && isMissingProfileCommentsSchemaError(err.message)) {
      throw new Error("Profile comments require the latest database migration.");
    }
    throw err;
  }
}

export async function deleteProfileComment(accessToken: string, commentId: number) {
  assertConfig();

  try {
    const res = await supabaseFetch(`/rest/v1/profile_comments?id=eq.${commentId}`, {
      method: "DELETE",
      headers: {
        ...supabaseHeaders(accessToken),
        Prefer: "return=minimal",
      },
    });

    await readJsonOrThrow(res);
    return { deleted: true };
  } catch (err) {
    if (err instanceof Error && isMissingProfileCommentsSchemaError(err.message)) {
      throw new Error("Profile comments require the latest database migration.");
    }
    throw err;
  }
}

export async function updateMyPresence(
  accessToken: string,
  userId: string,
  status?: UserPresenceStatus,
) {
  assertConfig();
  const normalizedStatus = status ? status.toLowerCase() : undefined;
  const body: { presence_updated_at: string; presence_status?: UserPresenceStatus } = {
    presence_updated_at: new Date().toISOString(),
  };
  if (normalizedStatus === "active" || normalizedStatus === "away" || normalizedStatus === "busy" || normalizedStatus === "offline") {
    body.presence_status = normalizedStatus;
  }

  const res = await supabaseFetch(`/rest/v1/profiles?user_id=eq.${userId}`, {
    method: "PATCH",
    headers: {
      ...supabaseHeaders(accessToken),
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });

  return (await readJsonOrThrow(res)) as Profile[];
}

export async function uploadProfileAsset(
  accessToken: string,
  userId: string,
  file: File,
  kind: "avatar" | "banner" | "theme",
) {
  assertConfig();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const objectPath = `${userId}/${kind}-${Date.now()}-${safeName}`;
  const encodedObjectPath = encodePath(objectPath);

  if (usingBackendRoutes) {
    if (!apiBase) {
      throw new Error("Supabase env vars missing. Set VITE_API_URL.");
    }

    const params = new URLSearchParams({ kind });
    const res = await fetch(`${apiBase}/api/media/profile-upload/${encodedObjectPath}?${params.toString()}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = messageFromUnknownJson(data);
      throw new Error(message || "Could not upload image.");
    }

    if (typeof data.url === "string" && data.url.trim().length > 0) {
      return data.url;
    }

    throw new Error("Profile upload succeeded but no URL was returned.");
  }

  const res = await supabaseFetch(`/storage/v1/object/${profileBucket}/${encodedObjectPath}`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(accessToken),
      "x-upsert": "true",
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });

  await readJsonOrThrow(res);
  return `${getSupabasePublicBaseUrl()}/storage/v1/object/public/${profileBucket}/${encodedObjectPath}`;
}

export async function uploadGlytchIcon(accessToken: string, userId: string, glytchId: number, file: File) {
  assertConfig();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const objectPath = `${userId}/${glytchId}/icon-${Date.now()}-${safeName}`;
  const encodedObjectPath = encodePath(objectPath);

  if (usingBackendRoutes) {
    if (!apiBase) {
      throw new Error("Supabase env vars missing. Set VITE_API_URL.");
    }

    const params = new URLSearchParams({ glytchId: String(glytchId) });
    const res = await fetch(`${apiBase}/api/media/glytch-icon-upload/${encodedObjectPath}?${params.toString()}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = messageFromUnknownJson(data);
      throw new Error(message || "Could not upload image.");
    }

    if (typeof data.url === "string" && data.url.trim().length > 0) {
      return data.url;
    }

    throw new Error("Glytch icon upload succeeded but no URL was returned.");
  }

  const res = await supabaseFetch(`/storage/v1/object/${glytchBucket}/${encodedObjectPath}`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(accessToken),
      "x-upsert": "true",
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });

  await readJsonOrThrow(res);
  return `${getSupabasePublicBaseUrl()}/storage/v1/object/public/${glytchBucket}/${encodedObjectPath}`;
}

export async function uploadMessageAsset(
  accessToken: string,
  userId: string,
  file: File,
  context: "dm" | "group" | "glytch",
  contextId: number,
): Promise<{ url: string; attachmentType: MessageAttachmentType }> {
  assertConfig();
  if (!Number.isFinite(contextId) || contextId <= 0) {
    throw new Error("Invalid message context.");
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const contextPrefix =
    context === "dm" ? `dm/${contextId}` : context === "group" ? `group/${contextId}` : `glytch/${contextId}`;
  const objectPath = `${contextPrefix}/${userId}/${Date.now()}-${safeName}`;
  const encodedObjectPath = encodePath(objectPath);
  const fallbackAttachmentType: MessageAttachmentType = file.type === "image/gif" ? "gif" : "image";

  if (usingBackendRoutes) {
    if (!apiBase) {
      throw new Error("Supabase env vars missing. Set VITE_API_URL.");
    }

    const params = new URLSearchParams({
      context,
      contextId: String(contextId),
    });
    const res = await fetch(`${apiBase}/api/media/message-upload/${encodedObjectPath}?${params.toString()}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = messageFromUnknownJson(data);
      throw new Error(message || "Could not upload attachment.");
    }

    const approvedPath = typeof data.objectPath === "string" && data.objectPath.trim().length > 0 ? data.objectPath : objectPath;
    const approvedUrl = typeof data.url === "string" && data.url.trim().length > 0 ? data.url.trim() : "";
    const approvedType = data.attachmentType === "gif" ? "gif" : data.attachmentType === "image" ? "image" : fallbackAttachmentType;
    const normalizedPathFromObject = extractMessageAssetPath(approvedPath);
    const normalizedPathFromUrl = extractMessageAssetPath(approvedUrl);

    return {
      url: normalizedPathFromObject || normalizedPathFromUrl || objectPath,
      attachmentType: approvedType,
    };
  }

  const res = await supabaseFetch(`/storage/v1/object/${messageBucket}/${encodedObjectPath}`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(accessToken),
      "x-upsert": "true",
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });

  await readJsonOrThrow(res);
  return {
    url: objectPath,
    attachmentType: fallbackAttachmentType,
  };
}

export async function ingestRemoteMessageAsset(
  accessToken: string,
  context: "dm" | "group" | "glytch",
  contextId: number,
  sourceUrl: string,
): Promise<{ url: string; attachmentType: MessageAttachmentType }> {
  if (!Number.isFinite(contextId) || contextId <= 0) {
    throw new Error("Invalid message context.");
  }
  const normalizedUrl = sourceUrl.trim();
  if (!normalizedUrl) {
    throw new Error("Missing media URL.");
  }
  if (!usingBackendRoutes) {
    throw new Error("Remote media moderation requires backend routes.");
  }
  if (!apiBase) {
    throw new Error("Supabase env vars missing. Set VITE_API_URL.");
  }

  const params = new URLSearchParams({
    context,
    contextId: String(contextId),
  });
  const res = await fetch(`${apiBase}/api/media/message-ingest?${params.toString()}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sourceUrl: normalizedUrl,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = messageFromUnknownJson(data);
    throw new Error(message || "Could not process remote media.");
  }

  const approvedPath = typeof data.objectPath === "string" && data.objectPath.trim().length > 0 ? data.objectPath : "";
  if (!approvedPath) {
    throw new Error("Remote media upload did not return a storage path.");
  }
  const approvedUrl = typeof data.url === "string" && data.url.trim().length > 0 ? data.url.trim() : "";
  const normalizedPathFromObject = extractMessageAssetPath(approvedPath);
  const normalizedPathFromUrl = extractMessageAssetPath(approvedUrl);
  const resolvedPath = normalizedPathFromObject || normalizedPathFromUrl;
  if (!resolvedPath) {
    throw new Error("Remote media upload returned an unusable storage path.");
  }

  return {
    url: resolvedPath,
    attachmentType: data.attachmentType === "gif" ? "gif" : "image",
  };
}

export async function resolveMessageAttachmentUrl(
  accessToken: string,
  attachmentUrl: string | null | undefined,
): Promise<string | null> {
  if (!attachmentUrl) return null;
  assertConfig();
  const objectPath = extractMessageAssetPath(attachmentUrl);
  if (!objectPath) return absolutizeAttachmentCandidate(attachmentUrl);
  const normalizedInput = attachmentUrl.trim();
  const isAbsoluteHttpInput = /^https?:\/\//i.test(normalizedInput);
  const inputLooksPublic =
    normalizedInput.includes(`/storage/v1/object/public/${messageBucket}/`) ||
    normalizedInput.includes(`/api/storage/object/public/${messageBucket}/`) ||
    normalizedInput.includes(`/api/supabase/storage/v1/object/public/${messageBucket}/`);
  let canonicalPublicUrl: string | null = null;
  try {
    canonicalPublicUrl = buildPublicMessageAssetUrl(objectPath);
  } catch {
    // Keep raw attachment URL/path as fallback.
  }
  const fallbackUrl = absolutizeAttachmentCandidate(
    inputLooksPublic && isAbsoluteHttpInput
      ? normalizedInput
      : canonicalPublicUrl || normalizedInput,
  );

  const cached = messageSignedUrlCache.get(objectPath);
  if (cached && cached.expiresAt - Date.now() > MESSAGE_SIGN_URL_REFRESH_BUFFER_MS) {
    return cached.signedUrl || fallbackUrl;
  }

  try {
    const encodedObjectPath = encodePath(objectPath);
    const res = await supabaseFetch(`/storage/v1/object/sign/${messageBucket}/${encodedObjectPath}`, {
      method: "POST",
      headers: supabaseHeaders(accessToken),
      body: JSON.stringify({ expiresIn: MESSAGE_SIGN_URL_TTL_SECONDS }),
    });
    const data = (await readJsonOrThrow(res)) as { signedURL?: string };
    if (!data.signedURL) {
      messageSignedUrlCache.set(objectPath, {
        signedUrl: fallbackUrl,
        expiresAt: Date.now() + MESSAGE_SIGN_URL_FAILURE_TTL_MS,
      });
      return fallbackUrl;
    }
    const signedUrl = toAbsoluteStorageUrl(data.signedURL);
    messageSignedUrlCache.set(objectPath, {
      signedUrl,
      expiresAt: Date.now() + MESSAGE_SIGN_URL_TTL_SECONDS * 1000,
    });
    return signedUrl;
  } catch {
    // Some older rows may reference deleted/private objects. Keep messages readable.
    messageSignedUrlCache.set(objectPath, {
      signedUrl: fallbackUrl,
      expiresAt: Date.now() + MESSAGE_SIGN_URL_FAILURE_TTL_MS,
    });
    return fallbackUrl;
  }
}

export function clearMessageAttachmentUrlCache() {
  messageSignedUrlCache.clear();
}

export async function searchGifLibrary(
  _accessToken: string,
  query: string,
  limit = 20,
): Promise<{ results: GifResult[]; next: string | null }> {
  const boundedLimit = Math.min(50, Math.max(1, limit));

  try {
    const response = await fetchGiphyGifs(query, boundedLimit);
    if (response.results.length === 0) {
      return fallbackGifSearch(query, boundedLimit);
    }
    return response;
  } catch {
    // Keep GIF search available even when provider keys or upstream networking fail.
    return fallbackGifSearch(query, boundedLimit);
  }
}

export async function fetchDmMessages(accessToken: string, conversationId: number): Promise<DmMessage[]> {
  assertConfig();
  const recentLimit = 250;
  const query = new URLSearchParams({
    select: "id,conversation_id,sender_id,content,attachment_url,attachment_type,created_at,edited_at,read_by_receiver_at",
    conversation_id: `eq.${conversationId}`,
    order: "id.desc",
    limit: String(recentLimit),
  });

  const res = await supabaseFetch(`/rest/v1/dm_messages?${query.toString()}`, {
    method: "GET",
    headers: supabaseHeaders(accessToken),
  });

  const rows = (await readJsonOrThrow(res)) as DmMessage[];
  return rows.reverse();
}

export async function fetchGroupChatMessages(accessToken: string, groupChatId: number): Promise<GroupChatMessage[]> {
  assertConfig();
  const recentLimit = 250;
  const query = new URLSearchParams({
    select: "id,group_chat_id,sender_id,content,attachment_url,attachment_type,created_at,edited_at",
    group_chat_id: `eq.${groupChatId}`,
    order: "id.desc",
    limit: String(recentLimit),
  });

  const res = await supabaseFetch(`/rest/v1/group_chat_messages?${query.toString()}`, {
    method: "GET",
    headers: supabaseHeaders(accessToken),
  });

  const rows = (await readJsonOrThrow(res)) as GroupChatMessage[];
  return rows.reverse();
}

export async function listDmMessageReactions(accessToken: string, messageIds: number[]): Promise<DmMessageReaction[]> {
  const uniqueIds = Array.from(new Set(messageIds.filter((id) => Number.isFinite(id) && id > 0)));
  if (uniqueIds.length === 0) return [];
  assertConfig();

  const query = new URLSearchParams({
    select: "message_id,user_id,emoji,created_at",
    message_id: `in.(${uniqueIds.join(",")})`,
    order: "created_at.asc",
    limit: "2000",
  });

  const res = await supabaseFetch(`/rest/v1/dm_message_reactions?${query.toString()}`, {
    method: "GET",
    headers: supabaseHeaders(accessToken),
  });

  return (await readJsonOrThrow(res)) as DmMessageReaction[];
}

export async function listGroupChatMessageReactions(
  accessToken: string,
  messageIds: number[],
): Promise<GroupChatMessageReaction[]> {
  const uniqueIds = Array.from(new Set(messageIds.filter((id) => Number.isFinite(id) && id > 0)));
  if (uniqueIds.length === 0) return [];
  assertConfig();

  const query = new URLSearchParams({
    select: "message_id,user_id,emoji,created_at",
    message_id: `in.(${uniqueIds.join(",")})`,
    order: "created_at.asc",
    limit: "3000",
  });

  const res = await supabaseFetch(`/rest/v1/group_chat_message_reactions?${query.toString()}`, {
    method: "GET",
    headers: supabaseHeaders(accessToken),
  });

  return (await readJsonOrThrow(res)) as GroupChatMessageReaction[];
}

export async function addDmMessageReaction(accessToken: string, messageId: number, userId: string, emoji: string) {
  assertConfig();
  const normalizedEmoji = emoji.trim();
  const res = await supabaseFetch(`/rest/v1/dm_message_reactions`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(accessToken),
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify([{ message_id: messageId, user_id: userId, emoji: normalizedEmoji }]),
  });

  return (await readJsonOrThrow(res)) as DmMessageReaction[];
}

export async function addGroupChatMessageReaction(accessToken: string, messageId: number, userId: string, emoji: string) {
  assertConfig();
  const normalizedEmoji = emoji.trim();
  const res = await supabaseFetch(`/rest/v1/group_chat_message_reactions`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(accessToken),
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify([{ message_id: messageId, user_id: userId, emoji: normalizedEmoji }]),
  });

  return (await readJsonOrThrow(res)) as GroupChatMessageReaction[];
}

export async function deleteDmMessageReaction(accessToken: string, messageId: number, userId: string, emoji: string) {
  assertConfig();
  const normalizedEmoji = emoji.trim();
  const query = new URLSearchParams({
    message_id: `eq.${messageId}`,
    user_id: `eq.${userId}`,
    emoji: `eq.${normalizedEmoji}`,
  });

  const res = await supabaseFetch(`/rest/v1/dm_message_reactions?${query.toString()}`, {
    method: "DELETE",
    headers: supabaseHeaders(accessToken),
  });

  await readJsonOrThrow(res);
}

export async function deleteGroupChatMessageReaction(accessToken: string, messageId: number, userId: string, emoji: string) {
  assertConfig();
  const normalizedEmoji = emoji.trim();
  const query = new URLSearchParams({
    message_id: `eq.${messageId}`,
    user_id: `eq.${userId}`,
    emoji: `eq.${normalizedEmoji}`,
  });

  const res = await supabaseFetch(`/rest/v1/group_chat_message_reactions?${query.toString()}`, {
    method: "DELETE",
    headers: supabaseHeaders(accessToken),
  });

  await readJsonOrThrow(res);
}

export async function deleteDmMessage(accessToken: string, messageId: number) {
  assertConfig();
  const res = await supabaseFetch(`/rest/v1/dm_messages?id=eq.${messageId}`, {
    method: "DELETE",
    headers: supabaseHeaders(accessToken),
  });
  await readJsonOrThrow(res);
}

export async function updateDmMessage(accessToken: string, messageId: number, content: string): Promise<DmMessage[]> {
  assertConfig();
  const res = await supabaseFetch(`/rest/v1/dm_messages?id=eq.${messageId}`, {
    method: "PATCH",
    headers: {
      ...supabaseHeaders(accessToken),
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      content,
      edited_at: new Date().toISOString(),
    }),
  });

  return (await readJsonOrThrow(res)) as DmMessage[];
}

export async function listUnreadDmMessages(
  accessToken: string,
  currentUserId: string,
  conversationIds: number[],
): Promise<Pick<DmMessage, "id" | "conversation_id">[]> {
  const uniqueIds = Array.from(new Set(conversationIds.filter((id) => Number.isFinite(id) && id > 0)));
  if (uniqueIds.length === 0) return [];
  assertConfig();

  const query = new URLSearchParams({
    select: "id,conversation_id",
    conversation_id: `in.(${uniqueIds.join(",")})`,
    sender_id: `neq.${currentUserId}`,
    read_by_receiver_at: "is.null",
    order: "id.desc",
    limit: "500",
  });

  const res = await supabaseFetch(`/rest/v1/dm_messages?${query.toString()}`, {
    method: "GET",
    headers: supabaseHeaders(accessToken),
  });

  return (await readJsonOrThrow(res)) as Pick<DmMessage, "id" | "conversation_id">[];
}

export async function listUnreadGroupChatCounts(
  accessToken: string,
  groupChatIds: number[],
): Promise<Array<{ group_chat_id: number; unread_count: number }>> {
  const uniqueIds = Array.from(new Set(groupChatIds.filter((id) => Number.isFinite(id) && id > 0)));
  if (uniqueIds.length === 0) return [];
  assertConfig();

  const res = await supabaseFetch(`/rest/v1/rpc/list_group_chat_unread_counts`, {
    method: "POST",
    headers: supabaseHeaders(accessToken),
    body: JSON.stringify({
      p_group_chat_ids: uniqueIds,
    }),
  });

  const rows = (await readJsonOrThrow(res)) as Array<{ group_chat_id?: number; unread_count?: number }>;
  return rows
    .map((row) => ({
      group_chat_id: Number(row.group_chat_id),
      unread_count: Number(row.unread_count),
    }))
    .filter((row) => Number.isFinite(row.group_chat_id) && row.group_chat_id > 0 && Number.isFinite(row.unread_count))
    .map((row) => ({
      group_chat_id: Math.trunc(row.group_chat_id),
      unread_count: Math.max(0, Math.trunc(row.unread_count)),
    }));
}

export async function markDmConversationRead(accessToken: string, conversationId: number) {
  assertConfig();
  const res = await supabaseFetch(`/rest/v1/rpc/mark_dm_conversation_read`, {
    method: "POST",
    headers: supabaseHeaders(accessToken),
    body: JSON.stringify({ p_conversation_id: conversationId }),
  });

  return (await readJsonOrThrow(res)) as {
    updated_count: number;
    deleted_bot_message_count?: number;
    deleted_empty_conversation?: boolean;
  };
}

export async function listDmConversationUserStates(
  accessToken: string,
  currentUserId: string,
  conversationIds: number[],
): Promise<DmConversationUserState[]> {
  const uniqueIds = Array.from(new Set(conversationIds.filter((id) => Number.isFinite(id) && id > 0)));
  if (uniqueIds.length === 0) return [];
  assertConfig();

  try {
    const query = new URLSearchParams({
      select: "conversation_id,user_id,is_pinned,pinned_at",
      user_id: `eq.${currentUserId}`,
      conversation_id: `in.(${uniqueIds.join(",")})`,
      order: "pinned_at.desc",
    });

    const res = await supabaseFetch(`/rest/v1/dm_conversation_user_state?${query.toString()}`, {
      method: "GET",
      headers: supabaseHeaders(accessToken),
    });

    return (await readJsonOrThrow(res)) as DmConversationUserState[];
  } catch (err) {
    if (err instanceof Error && isMissingDmConversationStateSchemaError(err.message)) {
      return [];
    }
    throw err;
  }
}

export async function hideDmConversation(accessToken: string, conversationId: number) {
  assertConfig();
  try {
    const res = await supabaseFetch(`/rest/v1/rpc/hide_dm_conversation`, {
      method: "POST",
      headers: supabaseHeaders(accessToken),
      body: JSON.stringify({ p_conversation_id: conversationId }),
    });

    return (await readJsonOrThrow(res)) as {
      conversation_id: number;
      hidden_after_message_id: number;
    };
  } catch (err) {
    if (err instanceof Error && isMissingDmConversationStateSchemaError(err.message)) {
      throw new Error("Delete DM from list requires the latest database migration.");
    }
    throw err;
  }
}

export async function setDmConversationPinned(accessToken: string, conversationId: number, pinned: boolean) {
  assertConfig();
  try {
    const res = await supabaseFetch(`/rest/v1/rpc/set_dm_conversation_pinned`, {
      method: "POST",
      headers: supabaseHeaders(accessToken),
      body: JSON.stringify({ p_conversation_id: conversationId, p_pinned: pinned }),
    });

    return (await readJsonOrThrow(res)) as {
      conversation_id: number;
      is_pinned: boolean;
      pinned_at?: string | null;
    };
  } catch (err) {
    if (err instanceof Error && isMissingDmConversationStateSchemaError(err.message)) {
      throw new Error("Pin DM requires the latest database migration.");
    }
    throw err;
  }
}

export async function markGroupChatRead(accessToken: string, groupChatId: number) {
  assertConfig();
  const res = await supabaseFetch(`/rest/v1/rpc/mark_group_chat_read`, {
    method: "POST",
    headers: supabaseHeaders(accessToken),
    body: JSON.stringify({ p_group_chat_id: groupChatId }),
  });

  return (await readJsonOrThrow(res)) as {
    updated?: boolean;
    last_read_message_id?: number;
  };
}

export async function fetchLatestDmMessages(accessToken: string, conversationIds: number[]): Promise<DmMessage[]> {
  const uniqueIds = Array.from(new Set(conversationIds.filter((id) => Number.isFinite(id) && id > 0)));
  if (uniqueIds.length === 0) return [];
  assertConfig();

  const limit = Math.min(200, Math.max(50, uniqueIds.length * 5));
  const query = new URLSearchParams({
    select: "id,conversation_id,sender_id,content,attachment_url,attachment_type,created_at,edited_at",
    conversation_id: `in.(${uniqueIds.join(",")})`,
    order: "id.desc",
    limit: String(limit),
  });

  const res = await supabaseFetch(`/rest/v1/dm_messages?${query.toString()}`, {
    method: "GET",
    headers: supabaseHeaders(accessToken),
  });

  return (await readJsonOrThrow(res)) as DmMessage[];
}

export async function fetchLatestGroupChatMessages(
  accessToken: string,
  groupChatIds: number[],
): Promise<GroupChatMessage[]> {
  const uniqueIds = Array.from(new Set(groupChatIds.filter((id) => Number.isFinite(id) && id > 0)));
  if (uniqueIds.length === 0) return [];
  assertConfig();

  const limit = Math.min(260, Math.max(60, uniqueIds.length * 6));
  const query = new URLSearchParams({
    select: "id,group_chat_id,sender_id,content,attachment_url,attachment_type,created_at,edited_at",
    group_chat_id: `in.(${uniqueIds.join(",")})`,
    order: "id.desc",
    limit: String(limit),
  });

  const res = await supabaseFetch(`/rest/v1/group_chat_messages?${query.toString()}`, {
    method: "GET",
    headers: supabaseHeaders(accessToken),
  });

  return (await readJsonOrThrow(res)) as GroupChatMessage[];
}

export async function fetchLatestGlytchMessages(accessToken: string, channelIds: number[]): Promise<GlytchMessage[]> {
  const uniqueIds = Array.from(new Set(channelIds.filter((id) => Number.isFinite(id) && id > 0)));
  if (uniqueIds.length === 0) return [];
  assertConfig();

  const limit = Math.min(320, Math.max(60, uniqueIds.length * 6));
  const query = new URLSearchParams({
    select: "id,glytch_channel_id,sender_id,content,attachment_url,attachment_type,created_at,edited_at",
    glytch_channel_id: `in.(${uniqueIds.join(",")})`,
    order: "id.desc",
    limit: String(limit),
  });

  const res = await supabaseFetch(`/rest/v1/glytch_messages?${query.toString()}`, {
    method: "GET",
    headers: supabaseHeaders(accessToken),
  });

  return (await readJsonOrThrow(res)) as GlytchMessage[];
}

export async function createDmMessage(
  accessToken: string,
  senderId: string,
  conversationId: number,
  content: string,
  attachmentUrl: string | null = null,
  attachmentType: MessageAttachmentType | null = null,
) {
  assertConfig();
  const res = await supabaseFetch(`/rest/v1/dm_messages`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(accessToken),
      Prefer: "return=representation",
    },
    body: JSON.stringify([
      {
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        attachment_url: attachmentUrl,
        attachment_type: attachmentType,
      },
    ]),
  });

  return (await readJsonOrThrow(res)) as DmMessage[];
}

export async function createGroupChatMessage(
  accessToken: string,
  senderId: string,
  groupChatId: number,
  content: string,
  attachmentUrl: string | null = null,
  attachmentType: MessageAttachmentType | null = null,
) {
  assertConfig();
  const res = await supabaseFetch(`/rest/v1/group_chat_messages`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(accessToken),
      Prefer: "return=representation",
    },
    body: JSON.stringify([
      {
        group_chat_id: groupChatId,
        sender_id: senderId,
        content,
        attachment_url: attachmentUrl,
        attachment_type: attachmentType,
      },
    ]),
  });

  return (await readJsonOrThrow(res)) as GroupChatMessage[];
}

export async function updateGroupChatMessage(
  accessToken: string,
  messageId: number,
  content: string,
): Promise<GroupChatMessage[]> {
  assertConfig();
  const res = await supabaseFetch(`/rest/v1/group_chat_messages?id=eq.${messageId}`, {
    method: "PATCH",
    headers: {
      ...supabaseHeaders(accessToken),
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      content,
      edited_at: new Date().toISOString(),
    }),
  });

  return (await readJsonOrThrow(res)) as GroupChatMessage[];
}

export async function createGlytch(
  accessToken: string,
  name: string,
  options?: { isPublic?: boolean; maxMembers?: number | null },
) {
  assertConfig();
  try {
    const res = await supabaseFetch(`/rest/v1/rpc/create_glytch`, {
      method: "POST",
      headers: supabaseHeaders(accessToken),
      body: JSON.stringify({
        p_name: name,
        p_is_public: Boolean(options?.isPublic),
        p_max_members:
          typeof options?.maxMembers === "number" && Number.isFinite(options.maxMembers)
            ? Math.trunc(options.maxMembers)
            : null,
      }),
    });
    return (await readJsonOrThrow(res)) as { glytch_id: number; invite_code: string; channel_id: number };
  } catch (err) {
    if (!(err instanceof Error) || !isMissingGlytchDirectorySchemaError(err.message)) {
      throw err;
    }

    const fallbackRes = await supabaseFetch(`/rest/v1/rpc/create_glytch`, {
      method: "POST",
      headers: supabaseHeaders(accessToken),
      body: JSON.stringify({ p_name: name }),
    });
    return (await readJsonOrThrow(fallbackRes)) as { glytch_id: number; invite_code: string; channel_id: number };
  }
}

export async function joinGlytchByCode(accessToken: string, inviteCode: string) {
  assertConfig();
  const res = await supabaseFetch(`/rest/v1/rpc/join_glytch_by_code`, {
    method: "POST",
    headers: supabaseHeaders(accessToken),
    body: JSON.stringify({ p_invite_code: inviteCode.trim().toLowerCase() }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = extractErrorMessageFromPayload(data) || "Supabase request failed.";
    const payload = data as { hint?: unknown; details?: unknown };
    const hint = typeof payload.hint === "string" ? payload.hint.trim().toUpperCase() : "";
    const normalizedMessage = message.toLowerCase();
    if (hint === "GLYTCH_BANNED" || normalizedMessage.includes("banned from this glytch")) {
      throw new JoinGlytchBannedError(message, parseGlytchIdFromJoinErrorDetails(payload.details));
    }
    throw new Error(message);
  }

  return data as { glytch_id: number };
}

export async function listGlytches(accessToken: string): Promise<Glytch[]> {
  assertConfig();
  try {
    const query = new URLSearchParams({
      select: "id,owner_id,name,invite_code,bio,icon_url,is_public,max_members,created_at",
      order: "created_at.asc",
    });

    const res = await supabaseFetch(`/rest/v1/glytches?${query.toString()}`, {
      method: "GET",
      headers: supabaseHeaders(accessToken),
    });

    return (await readJsonOrThrow(res)) as Glytch[];
  } catch (err) {
    if (!(err instanceof Error) || !isMissingGlytchDirectorySchemaError(err.message)) {
      throw err;
    }

    const fallbackQuery = new URLSearchParams({
      select: "id,owner_id,name,invite_code,bio,icon_url,created_at",
      order: "created_at.asc",
    });
    const fallbackRes = await supabaseFetch(`/rest/v1/glytches?${fallbackQuery.toString()}`, {
      method: "GET",
      headers: supabaseHeaders(accessToken),
    });
    const rows = (await readJsonOrThrow(fallbackRes)) as Glytch[];
    return rows.map((row) => ({
      ...row,
      is_public: false,
      max_members: null,
      member_count: null,
      is_joined: true,
    }));
  }
}

export async function searchPublicGlytches(
  accessToken: string,
  query: string,
  limit = 30,
): Promise<PublicGlytchDirectoryEntry[]> {
  assertConfig();
  const boundedLimit = Math.max(1, Math.min(80, Math.trunc(limit)));
  try {
    const res = await supabaseFetch(`/rest/v1/rpc/search_public_glytches`, {
      method: "POST",
      headers: supabaseHeaders(accessToken),
      body: JSON.stringify({
        p_query: query.trim() || null,
        p_limit: boundedLimit,
      }),
    });
    return (await readJsonOrThrow(res)) as PublicGlytchDirectoryEntry[];
  } catch (err) {
    if (err instanceof Error && isMissingGlytchDirectorySchemaError(err.message)) {
      throw new Error("Public Glytch discovery requires the latest database migration.");
    }
    throw err;
  }
}

export async function joinPublicGlytch(accessToken: string, glytchId: number): Promise<{ glytch_id: number }> {
  assertConfig();
  try {
    const res = await supabaseFetch(`/rest/v1/rpc/join_public_glytch`, {
      method: "POST",
      headers: supabaseHeaders(accessToken),
      body: JSON.stringify({
        p_glytch_id: glytchId,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = extractErrorMessageFromPayload(data) || "Supabase request failed.";
      const payload = data as { hint?: unknown; details?: unknown };
      const hint = typeof payload.hint === "string" ? payload.hint.trim().toUpperCase() : "";
      const normalizedMessage = message.toLowerCase();
      if (hint === "GLYTCH_BANNED" || normalizedMessage.includes("banned from this glytch")) {
        throw new JoinGlytchBannedError(message, parseGlytchIdFromJoinErrorDetails(payload.details));
      }
      throw new Error(message);
    }

    return data as { glytch_id: number };
  } catch (err) {
    if (err instanceof Error && isMissingGlytchDirectorySchemaError(err.message)) {
      throw new Error("Public Glytch joining requires the latest database migration.");
    }
    throw err;
  }
}

export async function setGlytchProfile(
  accessToken: string,
  glytchId: number,
  name: string,
  bio: string | null,
  options?: { isPublic?: boolean; maxMembers?: number | null },
) {
  assertConfig();
  const hasVisibilityOption = typeof options?.isPublic === "boolean";
  const hasMaxMembersOption = Boolean(options && Object.prototype.hasOwnProperty.call(options, "maxMembers"));
  const requestBody: Record<string, unknown> = {
    p_glytch_id: glytchId,
    p_name: name,
    p_bio: bio,
  };
  if (hasVisibilityOption) {
    requestBody.p_is_public = Boolean(options?.isPublic);
  }
  if (hasMaxMembersOption) {
    requestBody.p_max_members =
      typeof options?.maxMembers === "number" && Number.isFinite(options.maxMembers)
        ? Math.trunc(options.maxMembers)
        : null;
    requestBody.p_apply_max_members = true;
  }

  try {
    const res = await supabaseFetch(`/rest/v1/rpc/set_glytch_profile`, {
      method: "POST",
      headers: supabaseHeaders(accessToken),
      body: JSON.stringify(requestBody),
    });
    return (await readJsonOrThrow(res)) as Glytch;
  } catch (err) {
    if (!(err instanceof Error) || !isMissingGlytchDirectorySchemaError(err.message)) {
      throw err;
    }

    const fallbackRes = await supabaseFetch(`/rest/v1/rpc/set_glytch_profile`, {
      method: "POST",
      headers: supabaseHeaders(accessToken),
      body: JSON.stringify({
        p_glytch_id: glytchId,
        p_name: name,
        p_bio: bio,
      }),
    });
    const row = (await readJsonOrThrow(fallbackRes)) as Glytch;
    return {
      ...row,
      is_public: false,
      max_members: null,
    };
  }
}

export async function deleteGlytch(accessToken: string, glytchId: number, confirmationName: string) {
  assertConfig();
  const res = await supabaseFetch(`/rest/v1/rpc/delete_glytch`, {
    method: "POST",
    headers: supabaseHeaders(accessToken),
    body: JSON.stringify({
      p_glytch_id: glytchId,
      p_confirmation_name: confirmationName,
    }),
  });

  return (await readJsonOrThrow(res)) as { deleted: boolean; glytch_id: number };
}

export async function setGlytchIcon(accessToken: string, glytchId: number, iconUrl: string | null) {
  assertConfig();
  const res = await supabaseFetch(`/rest/v1/rpc/set_glytch_icon`, {
    method: "POST",
    headers: supabaseHeaders(accessToken),
    body: JSON.stringify({
      p_glytch_id: glytchId,
      p_icon_url: iconUrl,
    }),
  });

  return (await readJsonOrThrow(res)) as Glytch;
}

export async function listGlytchChannels(accessToken: string, glytchId: number): Promise<GlytchChannel[]> {
  assertConfig();
  try {
    const query = new URLSearchParams({
      select: "id,glytch_id,category_id,name,kind,text_post_mode,voice_user_limit,channel_theme,created_by,created_at",
      glytch_id: `eq.${glytchId}`,
      order: "created_at.asc",
    });

    const res = await supabaseFetch(`/rest/v1/glytch_channels?${query.toString()}`, {
      method: "GET",
      headers: supabaseHeaders(accessToken),
    });

    const rows = (await readJsonOrThrow(res)) as Array<Partial<GlytchChannel>>;
    return rows.map(normalizeGlytchChannel);
  } catch (err) {
    if (!(err instanceof Error) || !isMissingChannelSettingsSchemaError(err.message)) {
      throw err;
    }

    // Backward compatibility while older databases are still missing new channel-settings columns.
    const legacyQuery = new URLSearchParams({
      select: "id,glytch_id,category_id,name,kind,created_by,created_at",
      glytch_id: `eq.${glytchId}`,
      order: "created_at.asc",
    });
    const legacyRes = await supabaseFetch(`/rest/v1/glytch_channels?${legacyQuery.toString()}`, {
      method: "GET",
      headers: supabaseHeaders(accessToken),
    });
    const legacyRows = (await readJsonOrThrow(legacyRes)) as Array<Partial<GlytchChannel>>;
    return legacyRows.map(normalizeGlytchChannel);
  }
}

export async function createGlytchChannel(
  accessToken: string,
  createdBy: string,
  glytchId: number,
  name: string,
  kind: "text" | "voice",
  categoryId?: number | null,
  settings?: GlytchChannelSettingsInput,
) {
  assertConfig();
  const textPostMode = settings?.text_post_mode || "all";
  const voiceUserLimit = kind === "voice" ? settings?.voice_user_limit ?? null : null;
  try {
    const res = await supabaseFetch(`/rest/v1/glytch_channels`, {
      method: "POST",
      headers: {
        ...supabaseHeaders(accessToken),
        Prefer: "return=representation",
      },
      body: JSON.stringify([
        {
          glytch_id: glytchId,
          name: name.trim().toLowerCase(),
          kind,
          category_id: categoryId ?? null,
          text_post_mode: kind === "text" ? textPostMode : "all",
          voice_user_limit: voiceUserLimit,
          created_by: createdBy,
        },
      ]),
    });

    const rows = (await readJsonOrThrow(res)) as Array<Partial<GlytchChannel>>;
    return rows.map(normalizeGlytchChannel);
  } catch (err) {
    if (!(err instanceof Error) || !isMissingChannelSettingsSchemaError(err.message)) {
      throw err;
    }

    const legacyRes = await supabaseFetch(`/rest/v1/glytch_channels`, {
      method: "POST",
      headers: {
        ...supabaseHeaders(accessToken),
        Prefer: "return=representation",
      },
      body: JSON.stringify([
        {
          glytch_id: glytchId,
          name: name.trim().toLowerCase(),
          kind,
          category_id: categoryId ?? null,
          created_by: createdBy,
        },
      ]),
    });

    const legacyRows = (await readJsonOrThrow(legacyRes)) as Array<Partial<GlytchChannel>>;
    return legacyRows.map(normalizeGlytchChannel);
  }
}

export async function setGlytchChannelSettings(
  accessToken: string,
  channelId: number,
  settings: GlytchChannelSettingsInput,
) {
  assertConfig();
  try {
    const res = await supabaseFetch(`/rest/v1/rpc/set_glytch_channel_settings`, {
      method: "POST",
      headers: supabaseHeaders(accessToken),
      body: JSON.stringify({
        p_channel_id: channelId,
        p_text_post_mode: settings.text_post_mode ?? null,
        p_voice_user_limit: settings.voice_user_limit ?? null,
      }),
    });

    const row = (await readJsonOrThrow(res)) as Partial<GlytchChannel>;
    return normalizeGlytchChannel(row);
  } catch (err) {
    if (err instanceof Error && isMissingChannelSettingsSchemaError(err.message)) {
      throw new Error(
        "Channel settings are unavailable until the latest database migrations are applied.",
      );
    }
    throw err;
  }
}

export async function setGlytchChannelTheme(
  accessToken: string,
  channelId: number,
  theme: Record<string, unknown> | null,
) {
  assertConfig();
  try {
    const res = await supabaseFetch(`/rest/v1/rpc/set_glytch_channel_theme`, {
      method: "POST",
      headers: supabaseHeaders(accessToken),
      body: JSON.stringify({
        p_channel_id: channelId,
        p_theme: theme,
      }),
    });

    const row = (await readJsonOrThrow(res)) as Partial<GlytchChannel>;
    return normalizeGlytchChannel(row);
  } catch (err) {
    if (err instanceof Error && isMissingChannelSettingsSchemaError(err.message)) {
      throw new Error(
        "Channel background themes are unavailable until the latest database migrations are applied.",
      );
    }
    throw err;
  }
}

export async function listGlytchChannelCategories(
  accessToken: string,
  glytchId: number,
): Promise<GlytchChannelCategory[]> {
  assertConfig();
  const query = new URLSearchParams({
    select: "id,glytch_id,name,created_by,created_at",
    glytch_id: `eq.${glytchId}`,
    order: "created_at.asc",
  });

  const res = await supabaseFetch(`/rest/v1/glytch_channel_categories?${query.toString()}`, {
    method: "GET",
    headers: supabaseHeaders(accessToken),
  });

  return (await readJsonOrThrow(res)) as GlytchChannelCategory[];
}

export async function createGlytchChannelCategory(
  accessToken: string,
  createdBy: string,
  glytchId: number,
  name: string,
) {
  assertConfig();
  const res = await supabaseFetch(`/rest/v1/glytch_channel_categories`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(accessToken),
      Prefer: "return=representation",
    },
    body: JSON.stringify([
      {
        glytch_id: glytchId,
        name: name.trim(),
        created_by: createdBy,
      },
    ]),
  });

  return (await readJsonOrThrow(res)) as GlytchChannelCategory[];
}

export async function listGlytchRoles(accessToken: string, glytchId: number): Promise<GlytchRole[]> {
  assertConfig();
  const query = new URLSearchParams({
    select: "id,glytch_id,name,color,priority,is_system,is_default,permissions,created_at",
    glytch_id: `eq.${glytchId}`,
    order: "priority.desc,id.asc",
  });

  const res = await supabaseFetch(`/rest/v1/glytch_roles?${query.toString()}`, {
    method: "GET",
    headers: supabaseHeaders(accessToken),
  });

  return (await readJsonOrThrow(res)) as GlytchRole[];
}

export async function createGlytchRole(
  accessToken: string,
  glytchId: number,
  name: string,
  color = "#8eaefb",
) {
  assertConfig();
  const res = await supabaseFetch(`/rest/v1/rpc/create_glytch_role`, {
    method: "POST",
    headers: supabaseHeaders(accessToken),
    body: JSON.stringify({
      p_glytch_id: glytchId,
      p_name: name.trim(),
      p_color: color,
      p_permissions: {
        add_roles: false,
        manage_channels: false,
        create_channels: false,
        ban_members: false,
        view_channel: true,
        send_messages: true,
        join_voice: true,
        mute_deafen_members: false,
        kick_voice_members: false,
        edit_glytch_profile: false,
        manage_roles: false,
        manage_members: false,
        moderate_voice: false,
      },
    }),
  });

  return (await readJsonOrThrow(res)) as GlytchRole;
}

export async function updateGlytchRolePermissions(
  accessToken: string,
  roleId: number,
  permissions: Record<string, boolean>,
) {
  assertConfig();
  const res = await supabaseFetch(`/rest/v1/glytch_roles?id=eq.${roleId}`, {
    method: "PATCH",
    headers: {
      ...supabaseHeaders(accessToken),
      Prefer: "return=representation",
    },
    body: JSON.stringify({ permissions }),
  });

  return (await readJsonOrThrow(res)) as GlytchRole[];
}

export async function updateGlytchRolePriority(
  accessToken: string,
  roleId: number,
  priority: number,
) {
  assertConfig();
  const res = await supabaseFetch(`/rest/v1/glytch_roles?id=eq.${roleId}`, {
    method: "PATCH",
    headers: {
      ...supabaseHeaders(accessToken),
      Prefer: "return=representation",
    },
    body: JSON.stringify({ priority }),
  });

  return (await readJsonOrThrow(res)) as GlytchRole[];
}

export async function deleteGlytchRole(accessToken: string, roleId: number) {
  assertConfig();
  const query = new URLSearchParams({
    id: `eq.${roleId}`,
    is_system: "eq.false",
  });

  const res = await supabaseFetch(`/rest/v1/glytch_roles?${query.toString()}`, {
    method: "DELETE",
    headers: {
      ...supabaseHeaders(accessToken),
      Prefer: "return=representation",
    },
  });

  return (await readJsonOrThrow(res)) as GlytchRole[];
}

export async function listGlytchMembers(accessToken: string, glytchId: number): Promise<GlytchMember[]> {
  assertConfig();
  const query = new URLSearchParams({
    select: "glytch_id,user_id,role,joined_at",
    glytch_id: `eq.${glytchId}`,
    order: "joined_at.asc",
  });

  const res = await supabaseFetch(`/rest/v1/glytch_members?${query.toString()}`, {
    method: "GET",
    headers: supabaseHeaders(accessToken),
  });

  return (await readJsonOrThrow(res)) as GlytchMember[];
}

export async function listGlytchMemberRoles(accessToken: string, glytchId: number): Promise<GlytchMemberRole[]> {
  assertConfig();
  const query = new URLSearchParams({
    select: "glytch_id,user_id,role_id,assigned_at",
    glytch_id: `eq.${glytchId}`,
  });

  const res = await supabaseFetch(`/rest/v1/glytch_member_roles?${query.toString()}`, {
    method: "GET",
    headers: supabaseHeaders(accessToken),
  });

  return (await readJsonOrThrow(res)) as GlytchMemberRole[];
}

function defaultGlytchBotSettings(glytchId: number): GlytchBotSettings {
  return {
    glytch_id: glytchId,
    enabled: true,
    block_external_links: false,
    block_invite_links: true,
    block_blocked_words: false,
    blocked_words: [],
    dm_on_kick_or_ban: true,
    dm_on_message_block: true,
    third_party_bots_enabled: false,
    third_party_bot_webhook_url: null,
    updated_by: null,
  };
}

export async function getGlytchBotSettings(accessToken: string, glytchId: number): Promise<GlytchBotSettings> {
  assertConfig();
  try {
    const res = await supabaseFetch(`/rest/v1/rpc/get_glytch_bot_settings`, {
      method: "POST",
      headers: supabaseHeaders(accessToken),
      body: JSON.stringify({
        p_glytch_id: glytchId,
      }),
    });

    const row = (await readJsonOrThrow(res)) as Partial<GlytchBotSettings>;
    return {
      ...defaultGlytchBotSettings(glytchId),
      ...row,
      glytch_id: row.glytch_id ?? glytchId,
      blocked_words: Array.isArray(row.blocked_words)
        ? row.blocked_words.filter((word): word is string => typeof word === "string")
        : [],
    };
  } catch (err) {
    if (err instanceof Error && isMissingChannelSettingsSchemaError(err.message)) {
      return defaultGlytchBotSettings(glytchId);
    }
    throw err;
  }
}

export async function updateGlytchBotSettings(
  accessToken: string,
  glytchId: number,
  settings: Partial<Omit<GlytchBotSettings, "glytch_id" | "updated_by" | "updated_at">>,
): Promise<GlytchBotSettings> {
  assertConfig();
  const shouldApplyThirdPartyWebhook = Object.prototype.hasOwnProperty.call(settings, "third_party_bot_webhook_url");
  try {
    const res = await supabaseFetch(`/rest/v1/rpc/set_glytch_bot_settings`, {
      method: "POST",
      headers: supabaseHeaders(accessToken),
      body: JSON.stringify({
        p_glytch_id: glytchId,
        p_enabled: settings.enabled ?? null,
        p_block_external_links: settings.block_external_links ?? null,
        p_block_invite_links: settings.block_invite_links ?? null,
        p_block_blocked_words: settings.block_blocked_words ?? null,
        p_blocked_words: settings.blocked_words ?? null,
        p_dm_on_kick_or_ban: settings.dm_on_kick_or_ban ?? null,
        p_dm_on_message_block: settings.dm_on_message_block ?? null,
        p_third_party_bots_enabled: settings.third_party_bots_enabled ?? null,
        p_third_party_bot_webhook_url: shouldApplyThirdPartyWebhook ? settings.third_party_bot_webhook_url ?? null : null,
        p_apply_third_party_bot_webhook_url: shouldApplyThirdPartyWebhook,
      }),
    });

    const row = (await readJsonOrThrow(res)) as Partial<GlytchBotSettings>;
    return {
      ...defaultGlytchBotSettings(glytchId),
      ...row,
      glytch_id: row.glytch_id ?? glytchId,
      blocked_words: Array.isArray(row.blocked_words)
        ? row.blocked_words.filter((word): word is string => typeof word === "string")
        : [],
    };
  } catch (err) {
    if (err instanceof Error && isMissingChannelSettingsSchemaError(err.message)) {
      throw new Error("Glytch bot moderation settings are unavailable until the latest database migrations are applied.");
    }
    throw err;
  }
}

export async function listGlytchBans(accessToken: string, glytchId: number): Promise<GlytchBan[]> {
  assertConfig();
  try {
    const query = new URLSearchParams({
      select: "glytch_id,user_id,banned_by,reason,banned_at",
      glytch_id: `eq.${glytchId}`,
      order: "banned_at.desc",
    });

    const res = await supabaseFetch(`/rest/v1/glytch_bans?${query.toString()}`, {
      method: "GET",
      headers: supabaseHeaders(accessToken),
    });

    return (await readJsonOrThrow(res)) as GlytchBan[];
  } catch (err) {
    if (err instanceof Error && isMissingChannelSettingsSchemaError(err.message)) {
      return [];
    }
    throw err;
  }
}

export async function listGlytchUnbanRequests(
  accessToken: string,
  glytchId: number,
  status: GlytchUnbanRequestStatus | null = "pending",
): Promise<GlytchUnbanRequest[]> {
  assertConfig();
  try {
    const query = new URLSearchParams({
      select: "id,glytch_id,user_id,status,message,requested_at,reviewed_by,reviewed_at,review_note",
      glytch_id: `eq.${glytchId}`,
      order: "requested_at.desc",
    });
    if (status) {
      query.set("status", `eq.${status}`);
    }

    const res = await supabaseFetch(`/rest/v1/glytch_unban_requests?${query.toString()}`, {
      method: "GET",
      headers: supabaseHeaders(accessToken),
    });

    return (await readJsonOrThrow(res)) as GlytchUnbanRequest[];
  } catch (err) {
    if (err instanceof Error && isMissingChannelSettingsSchemaError(err.message)) {
      return [];
    }
    throw err;
  }
}

export async function submitGlytchUnbanRequest(
  accessToken: string,
  glytchId: number,
  message?: string | null,
) {
  assertConfig();
  try {
    const res = await supabaseFetch(`/rest/v1/rpc/submit_glytch_unban_request`, {
      method: "POST",
      headers: supabaseHeaders(accessToken),
      body: JSON.stringify({
        p_glytch_id: glytchId,
        p_message: message ?? null,
      }),
    });

    return (await readJsonOrThrow(res)) as GlytchUnbanRequest;
  } catch (err) {
    if (err instanceof Error && isMissingChannelSettingsSchemaError(err.message)) {
      throw new Error("Unban request system unavailable until the latest database migrations are applied.");
    }
    throw err;
  }
}

export async function reviewGlytchUnbanRequest(
  accessToken: string,
  requestId: number,
  status: "approved" | "rejected",
  reviewNote?: string | null,
) {
  assertConfig();
  try {
    const res = await supabaseFetch(`/rest/v1/rpc/review_glytch_unban_request`, {
      method: "POST",
      headers: supabaseHeaders(accessToken),
      body: JSON.stringify({
        p_request_id: requestId,
        p_status: status,
        p_review_note: reviewNote ?? null,
      }),
    });

    return (await readJsonOrThrow(res)) as GlytchUnbanRequest;
  } catch (err) {
    if (err instanceof Error && isMissingChannelSettingsSchemaError(err.message)) {
      throw new Error("Unban request system unavailable until the latest database migrations are applied.");
    }
    throw err;
  }
}

export async function banGlytchUser(
  accessToken: string,
  glytchId: number,
  userId: string,
  reason?: string | null,
) {
  assertConfig();
  try {
    const res = await supabaseFetch(`/rest/v1/rpc/ban_user_from_glytch`, {
      method: "POST",
      headers: supabaseHeaders(accessToken),
      body: JSON.stringify({
        p_glytch_id: glytchId,
        p_user_id: userId,
        p_reason: reason ?? null,
      }),
    });

    return (await readJsonOrThrow(res)) as GlytchBan;
  } catch (err) {
    if (err instanceof Error && isMissingChannelSettingsSchemaError(err.message)) {
      throw new Error("Ban system unavailable until the latest database migrations are applied.");
    }
    throw err;
  }
}

export async function unbanGlytchUser(accessToken: string, glytchId: number, userId: string) {
  assertConfig();
  try {
    const res = await supabaseFetch(`/rest/v1/rpc/unban_user_from_glytch`, {
      method: "POST",
      headers: supabaseHeaders(accessToken),
      body: JSON.stringify({
        p_glytch_id: glytchId,
        p_user_id: userId,
      }),
    });

    return (await readJsonOrThrow(res)) as boolean;
  } catch (err) {
    if (err instanceof Error && isMissingChannelSettingsSchemaError(err.message)) {
      throw new Error("Ban system unavailable until the latest database migrations are applied.");
    }
    throw err;
  }
}

export async function kickGlytchMember(accessToken: string, glytchId: number, userId: string) {
  assertConfig();
  try {
    const res = await supabaseFetch(`/rest/v1/rpc/kick_member_from_glytch`, {
      method: "POST",
      headers: supabaseHeaders(accessToken),
      body: JSON.stringify({
        p_glytch_id: glytchId,
        p_user_id: userId,
      }),
    });

    return (await readJsonOrThrow(res)) as boolean;
  } catch (err) {
    if (err instanceof Error && isMissingChannelSettingsSchemaError(err.message)) {
      throw new Error("Kick member system unavailable until the latest database migrations are applied.");
    }
    throw err;
  }
}

export async function leaveGlytch(accessToken: string, glytchId: number) {
  assertConfig();
  try {
    const res = await supabaseFetch(`/rest/v1/rpc/leave_glytch`, {
      method: "POST",
      headers: supabaseHeaders(accessToken),
      body: JSON.stringify({
        p_glytch_id: glytchId,
      }),
    });

    return (await readJsonOrThrow(res)) as boolean;
  } catch (err) {
    if (err instanceof Error && isMissingChannelSettingsSchemaError(err.message)) {
      throw new Error("Leave Glytch is unavailable until the latest database migrations are applied.");
    }
    throw err;
  }
}

export async function assignGlytchRole(
  accessToken: string,
  glytchId: number,
  userId: string,
  roleId: number,
) {
  assertConfig();
  const res = await supabaseFetch(`/rest/v1/rpc/assign_glytch_role`, {
    method: "POST",
    headers: supabaseHeaders(accessToken),
    body: JSON.stringify({
      p_glytch_id: glytchId,
      p_user_id: userId,
      p_role_id: roleId,
    }),
  });

  await readJsonOrThrow(res);
}

export async function listGlytchChannelRolePermissions(
  accessToken: string,
  glytchId: number,
): Promise<GlytchChannelRolePermission[]> {
  assertConfig();
  const query = new URLSearchParams({
    select: "glytch_id,role_id,channel_id,can_view,can_send_messages,can_join_voice,updated_at",
    glytch_id: `eq.${glytchId}`,
  });

  const res = await supabaseFetch(`/rest/v1/glytch_channel_role_permissions?${query.toString()}`, {
    method: "GET",
    headers: supabaseHeaders(accessToken),
  });

  return (await readJsonOrThrow(res)) as GlytchChannelRolePermission[];
}

export async function setRoleChannelPermissions(
  accessToken: string,
  roleId: number,
  channelId: number,
  canView: boolean,
  canSendMessages: boolean,
  canJoinVoice: boolean,
) {
  assertConfig();
  const res = await supabaseFetch(`/rest/v1/rpc/set_role_channel_permissions`, {
    method: "POST",
    headers: supabaseHeaders(accessToken),
    body: JSON.stringify({
      p_role_id: roleId,
      p_channel_id: channelId,
      p_can_view: canView,
      p_can_send_messages: canSendMessages,
      p_can_join_voice: canJoinVoice,
    }),
  });

  return (await readJsonOrThrow(res)) as GlytchChannelRolePermission;
}

export async function fetchGlytchMessages(accessToken: string, glytchChannelId: number): Promise<GlytchMessage[]> {
  assertConfig();
  const recentLimit = 250;
  const query = new URLSearchParams({
    select: "id,glytch_channel_id,sender_id,content,attachment_url,attachment_type,created_at,edited_at",
    glytch_channel_id: `eq.${glytchChannelId}`,
    order: "id.desc",
    limit: String(recentLimit),
  });

  const res = await supabaseFetch(`/rest/v1/glytch_messages?${query.toString()}`, {
    method: "GET",
    headers: supabaseHeaders(accessToken),
  });

  const rows = (await readJsonOrThrow(res)) as GlytchMessage[];
  return rows.reverse();
}

export async function listGlytchMessageReactions(
  accessToken: string,
  messageIds: number[],
): Promise<GlytchMessageReaction[]> {
  const uniqueIds = Array.from(new Set(messageIds.filter((id) => Number.isFinite(id) && id > 0)));
  if (uniqueIds.length === 0) return [];
  assertConfig();

  const query = new URLSearchParams({
    select: "message_id,user_id,emoji,created_at",
    message_id: `in.(${uniqueIds.join(",")})`,
    order: "created_at.asc",
    limit: "5000",
  });

  const res = await supabaseFetch(`/rest/v1/glytch_message_reactions?${query.toString()}`, {
    method: "GET",
    headers: supabaseHeaders(accessToken),
  });

  return (await readJsonOrThrow(res)) as GlytchMessageReaction[];
}

export async function addGlytchMessageReaction(accessToken: string, messageId: number, userId: string, emoji: string) {
  assertConfig();
  const normalizedEmoji = emoji.trim();
  const res = await supabaseFetch(`/rest/v1/glytch_message_reactions`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(accessToken),
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify([{ message_id: messageId, user_id: userId, emoji: normalizedEmoji }]),
  });

  return (await readJsonOrThrow(res)) as GlytchMessageReaction[];
}

export async function deleteGlytchMessageReaction(accessToken: string, messageId: number, userId: string, emoji: string) {
  assertConfig();
  const normalizedEmoji = emoji.trim();
  const query = new URLSearchParams({
    message_id: `eq.${messageId}`,
    user_id: `eq.${userId}`,
    emoji: `eq.${normalizedEmoji}`,
  });

  const res = await supabaseFetch(`/rest/v1/glytch_message_reactions?${query.toString()}`, {
    method: "DELETE",
    headers: supabaseHeaders(accessToken),
  });

  await readJsonOrThrow(res);
}

export async function createGlytchMessage(
  accessToken: string,
  senderId: string,
  glytchChannelId: number,
  content: string,
  attachmentUrl: string | null = null,
  attachmentType: MessageAttachmentType | null = null,
) {
  assertConfig();
  const res = await supabaseFetch(`/rest/v1/glytch_messages`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(accessToken),
      Prefer: "return=representation",
    },
    body: JSON.stringify([
      {
        glytch_channel_id: glytchChannelId,
        sender_id: senderId,
        content,
        attachment_url: attachmentUrl,
        attachment_type: attachmentType,
      },
    ]),
  });

  return (await readJsonOrThrow(res)) as GlytchMessage[];
}

export async function updateGlytchMessage(
  accessToken: string,
  messageId: number,
  content: string,
): Promise<GlytchMessage[]> {
  assertConfig();
  const res = await supabaseFetch(`/rest/v1/glytch_messages?id=eq.${messageId}`, {
    method: "PATCH",
    headers: {
      ...supabaseHeaders(accessToken),
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      content,
      edited_at: new Date().toISOString(),
    }),
  });

  return (await readJsonOrThrow(res)) as GlytchMessage[];
}

export async function joinVoiceRoom(
  accessToken: string,
  roomKey: string,
  userId: string,
  muted = false,
  deafened = false,
) {
  assertConfig();
  const res = await supabaseFetch(`/rest/v1/voice_participants`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(accessToken),
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify([{ room_key: roomKey, user_id: userId, muted, deafened }]),
  });

  const rows = (await readJsonOrThrow(res)) as Array<Partial<VoiceParticipant>>;
  return rows.map(normalizeVoiceParticipant);
}

export async function leaveVoiceRoom(accessToken: string, roomKey: string, userId: string) {
  assertConfig();
  const res = await supabaseFetch(`/rest/v1/voice_participants?room_key=eq.${encodeURIComponent(roomKey)}&user_id=eq.${userId}`, {
    method: "DELETE",
    headers: supabaseHeaders(accessToken),
  });

  await readJsonOrThrow(res);
}

export async function setVoiceMute(accessToken: string, roomKey: string, userId: string, muted: boolean) {
  assertConfig();
  const res = await supabaseFetch(`/rest/v1/voice_participants?room_key=eq.${encodeURIComponent(roomKey)}&user_id=eq.${userId}`, {
    method: "PATCH",
    headers: {
      ...supabaseHeaders(accessToken),
      Prefer: "return=representation",
    },
    body: JSON.stringify({ muted }),
  });

  const rows = (await readJsonOrThrow(res)) as Array<Partial<VoiceParticipant>>;
  return rows.map(normalizeVoiceParticipant);
}

export async function setVoiceState(
  accessToken: string,
  roomKey: string,
  userId: string,
  muted: boolean,
  deafened: boolean,
) {
  assertConfig();
  const res = await supabaseFetch(`/rest/v1/voice_participants?room_key=eq.${encodeURIComponent(roomKey)}&user_id=eq.${userId}`, {
    method: "PATCH",
    headers: {
      ...supabaseHeaders(accessToken),
      Prefer: "return=representation",
    },
    body: JSON.stringify({ muted, deafened }),
  });

  const rows = (await readJsonOrThrow(res)) as Array<Partial<VoiceParticipant>>;
  return rows.map(normalizeVoiceParticipant);
}

export async function listVoiceParticipants(accessToken: string, roomKey: string): Promise<VoiceParticipant[]> {
  assertConfig();
  try {
    const query = new URLSearchParams({
      select: "room_key,user_id,muted,deafened,moderator_forced_muted,moderator_forced_deafened,joined_at",
      room_key: `eq.${roomKey}`,
      order: "joined_at.asc",
    });

    const res = await supabaseFetch(`/rest/v1/voice_participants?${query.toString()}`, {
      method: "GET",
      headers: supabaseHeaders(accessToken),
    });

    const rows = (await readJsonOrThrow(res)) as Array<Partial<VoiceParticipant>>;
    return rows.map(normalizeVoiceParticipant);
  } catch (err) {
    if (!(err instanceof Error) || !isMissingChannelSettingsSchemaError(err.message)) {
      throw err;
    }

    // Backward compatibility before forced-state migration is applied.
    const legacyQuery = new URLSearchParams({
      select: "room_key,user_id,muted,deafened,joined_at",
      room_key: `eq.${roomKey}`,
      order: "joined_at.asc",
    });
    const legacyRes = await supabaseFetch(`/rest/v1/voice_participants?${legacyQuery.toString()}`, {
      method: "GET",
      headers: supabaseHeaders(accessToken),
    });
    const legacyRows = (await readJsonOrThrow(legacyRes)) as Array<Partial<VoiceParticipant>>;
    return legacyRows.map(normalizeVoiceParticipant);
  }
}

export async function forceVoiceParticipantState(
  accessToken: string,
  roomKey: string,
  targetUserId: string,
  forceMuted?: boolean,
  forceDeafened?: boolean,
) {
  assertConfig();
  try {
    const res = await supabaseFetch(`/rest/v1/rpc/force_voice_participant_state`, {
      method: "POST",
      headers: supabaseHeaders(accessToken),
      body: JSON.stringify({
        p_room_key: roomKey,
        p_target_user_id: targetUserId,
        p_force_muted: forceMuted ?? null,
        p_force_deafened: forceDeafened ?? null,
      }),
    });

    const row = (await readJsonOrThrow(res)) as Partial<VoiceParticipant>;
    return normalizeVoiceParticipant(row);
  } catch (err) {
    if (!(err instanceof Error) || !isMissingChannelSettingsSchemaError(err.message)) {
      throw err;
    }

    // Backward compatibility with older RPC signature.
    const legacyRes = await supabaseFetch(`/rest/v1/rpc/force_voice_participant_state`, {
      method: "POST",
      headers: supabaseHeaders(accessToken),
      body: JSON.stringify({
        p_room_key: roomKey,
        p_target_user_id: targetUserId,
        p_muted: forceMuted ?? null,
        p_deafened: forceDeafened ?? null,
      }),
    });
    const legacyRow = (await readJsonOrThrow(legacyRes)) as Partial<VoiceParticipant>;
    return normalizeVoiceParticipant(legacyRow);
  }
}

export async function kickVoiceParticipant(accessToken: string, roomKey: string, targetUserId: string) {
  assertConfig();
  const res = await supabaseFetch(`/rest/v1/rpc/kick_voice_participant`, {
    method: "POST",
    headers: supabaseHeaders(accessToken),
    body: JSON.stringify({
      p_room_key: roomKey,
      p_target_user_id: targetUserId,
    }),
  });

  return (await readJsonOrThrow(res)) as boolean;
}

export async function sendVoiceSignal(
  accessToken: string,
  roomKey: string,
  senderId: string,
  targetId: string | null,
  kind: VoiceSignal["kind"],
  payload: Record<string, unknown>,
) {
  assertConfig();
  const res = await supabaseFetch(`/rest/v1/voice_signals`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(accessToken),
      Prefer: "return=representation",
    },
    body: JSON.stringify([
      {
        room_key: roomKey,
        sender_id: senderId,
        target_id: targetId,
        kind,
        payload,
      },
    ]),
  });

  return (await readJsonOrThrow(res)) as VoiceSignal[];
}

export async function listVoiceSignals(
  accessToken: string,
  roomKey: string,
  currentUserId: string,
  sinceId: number,
): Promise<VoiceSignal[]> {
  assertConfig();
  const query = new URLSearchParams({
    select: "id,room_key,sender_id,target_id,kind,payload,created_at",
    room_key: `eq.${roomKey}`,
    id: `gt.${sinceId}`,
    or: `(target_id.is.null,target_id.eq.${currentUserId},sender_id.eq.${currentUserId})`,
    order: "id.asc",
  });

  const res = await supabaseFetch(`/rest/v1/voice_signals?${query.toString()}`, {
    method: "GET",
    headers: supabaseHeaders(accessToken),
  });

  return (await readJsonOrThrow(res)) as VoiceSignal[];
}

export async function getLatestVoiceSignalId(
  accessToken: string,
  roomKey: string,
  currentUserId: string,
): Promise<number> {
  assertConfig();
  const query = new URLSearchParams({
    select: "id",
    room_key: `eq.${roomKey}`,
    or: `(target_id.is.null,target_id.eq.${currentUserId},sender_id.eq.${currentUserId})`,
    order: "id.desc",
    limit: "1",
  });

  const res = await supabaseFetch(`/rest/v1/voice_signals?${query.toString()}`, {
    method: "GET",
    headers: supabaseHeaders(accessToken),
  });
  const rows = (await readJsonOrThrow(res)) as Array<{ id?: number }>;
  const latest = rows[0]?.id;
  if (!Number.isFinite(latest)) return 0;
  return Math.max(0, Math.trunc(latest || 0));
}
