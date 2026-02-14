import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, FormEvent, PointerEvent as ReactPointerEvent } from "react";
import {
  addDmMessageReaction,
  addGlytchMessageReaction,
  acceptFriendRequest,
  banGlytchUser,
  createDmMessage,
  deleteDmMessage,
  deleteGlytch,
  deleteDmMessageReaction,
  deleteGlytchMessageReaction,
  deleteGlytchRole,
  createGlytch,
  createGlytchChannel,
  createGlytchChannelCategory,
  createGlytchMessage,
  fetchDmMessages,
  fetchLatestDmMessages,
  fetchGlytchMessages,
  fetchProfilesByIds,
  findProfileByUsername,
  getMyProfile,
  forceVoiceParticipantState,
  joinGlytchByCode,
  kickGlytchMember,
  kickVoiceParticipant,
  listDmConversations,
  listFriendRequests,
  listGlytchBans,
  listUnreadDmMessages,
  listGlytchChannels,
  listGlytchChannelCategories,
  listGlytchChannelRolePermissions,
  listGlytchMemberRoles,
  listGlytchMessageReactions,
  listGlytchMembers,
  listGlytchRoles,
  listGlytches,
  listDmMessageReactions,
  listVoiceParticipants,
  listVoiceSignals,
  joinVoiceRoom,
  leaveVoiceRoom,
  respondToFriendRequest,
  resolveMessageAttachmentUrl,
  markDmConversationRead,
  assignGlytchRole,
  createGlytchRole,
  setGlytchProfile,
  setRoleChannelPermissions,
  setGlytchChannelSettings,
  setGlytchChannelTheme,
  setGlytchIcon,
  setDmConversationTheme,
  sendVoiceSignal,
  setVoiceState,
  searchGifLibrary,
  sendFriendRequest,
  updateGlytchRolePermissions,
  updateGlytchRolePriority,
  updateMyPresence,
  updateMyProfileCustomization,
  unbanGlytchUser,
  unfriendUser,
  uploadGlytchIcon,
  uploadMessageAsset,
  uploadProfileAsset,
  type DmConversation,
  type DmMessage,
  type DmMessageReaction,
  type FriendRequest,
  type Glytch,
  type GlytchChannel,
  type GlytchChannelCategory,
  type GlytchMember,
  type GlytchChannelRolePermission,
  type GlytchMessageReaction,
  type GlytchMemberRole,
  type GlytchBan,
  type GlytchRole,
  type MessageAttachmentType,
  type Profile,
  type UserPresenceStatus,
  type GifResult,
  type VoiceParticipant,
  type VoiceSignal,
} from "./supabaseApi";

type ChatDashboardProps = {
  currentUserId: string;
  currentUserName?: string;
  accessToken: string;
  onLogout?: () => void;
};

type ViewMode = "dm" | "glytch" | "glytch-settings" | "settings";
type GlytchActionMode = "none" | "create" | "join";
type DmPanelMode = "dms" | "friends";
type SettingsTab = "edit" | "theme" | "showcases" | "preview" | "notifications";
type GlytchSettingsTab = "profile" | "roles" | "moderation" | "channels";
type RoleSettingsMode = "new-role" | "permissions";
type GlytchRolePermissionKey =
  | "ban_members"
  | "manage_channels"
  | "mute_deafen_members"
  | "kick_voice_members"
  | "create_channels"
  | "add_roles"
  | "edit_glytch_profile";

type DmWithFriend = {
  conversationId: number;
  friendUserId: string;
  friendName: string;
  friendAvatarUrl: string;
  sharedBackground: BackgroundGradient | null;
};

type BackgroundGradient = {
  from: string;
  to: string;
  mode?: "gradient" | "image";
  imageUrl?: string;
};

type ShowcaseKind = "text" | "links" | "stats" | "gallery";
type ShowcaseVisibility = "public" | "friends" | "private";
type ProfileShowcase = {
  id: string;
  kind: ShowcaseKind;
  title: string;
  visibility: ShowcaseVisibility;
  text: string;
  entries: string[];
};

type UiMessage = {
  id: number;
  sender: "me" | "other";
  text: string;
  attachmentUrl: string | null;
  attachmentType: MessageAttachmentType | null;
  timestamp: Date;
  senderName: string;
  senderAvatarUrl: string;
  readAt: Date | null;
  reactions: UiMessageReaction[];
};

type UiMessageReaction = {
  emoji: string;
  count: number;
  reactedByMe: boolean;
};

type ComposerAttachment = {
  file: File;
  previewUrl: string;
  attachmentType: MessageAttachmentType;
};

type ComposerGif = {
  id: string;
  url: string;
  previewUrl: string;
  description: string;
};

type ProfileForm = {
  avatarUrl: string;
  bannerUrl: string;
  bio: string;
  presenceStatus: UserPresenceStatus;
  speakingRingColor: string;
  accentColor: string;
  backgroundFrom: string;
  backgroundTo: string;
  cardStyle: "glass" | "solid";
  appThemeMode: AppThemeMode;
  appTheme: AppThemePreset;
  dmBackgroundFrom: string;
  dmBackgroundTo: string;
  glytchBackgroundFrom: string;
  glytchBackgroundTo: string;
  dmBackgroundByConversation: Record<string, BackgroundGradient>;
  glytchBackgroundByChannel: Record<string, BackgroundGradient>;
  showcases: ProfileShowcase[];
  notificationsEnabled: boolean;
  notifyDmMessages: boolean;
  notifyDmCalls: boolean;
};

type UiVoiceParticipant = {
  userId: string;
  name: string;
  avatarUrl: string;
  muted: boolean;
  deafened: boolean;
  moderatorForcedMuted: boolean;
  moderatorForcedDeafened: boolean;
};

type UiGlytchMember = {
  userId: string;
  name: string;
  avatarUrl: string;
  roles: string[];
};

type UiGlytchBan = {
  userId: string;
  name: string;
  avatarUrl: string;
  reason: string | null;
  bannedByName: string;
  bannedAt: string;
};

type GlytchInviteMessagePayload = {
  glytchId: number;
  inviteCode: string;
  glytchName: string;
  glytchIconUrl?: string | null;
  inviterId: string;
  inviterName: string;
  createdAt: string;
};

type TextPostMode = GlytchChannel["text_post_mode"];
type AppThemeMode = "dark" | "light";
type AppThemePreset = "default" | "ocean" | "sunset" | "mint";
type AppThemePalette = {
  bg: string;
  panel: string;
  panelBorder: string;
  text: string;
  muted: string;
  accent: string;
  accentStrong: string;
  card: string;
  cardBorder: string;
  bubbleBot: string;
  bubbleMe: string;
  hot: string;
  orange: string;
  warn: string;
  violet: string;
};

const GLYTCH_MEMBERS_PANEL_WIDTH_STORAGE_KEY = "glytch.membersPanelWidth";
const GLYTCH_MEMBERS_PANEL_MIN_WIDTH = 220;
const GLYTCH_MEMBERS_PANEL_DEFAULT_WIDTH = 290;
const GLYTCH_MEMBERS_PANEL_MAX_WIDTH = 460;
const GLYTCH_MESSAGE_COLUMN_MIN_WIDTH = 420;
const MAX_MESSAGE_ATTACHMENT_BYTES = 8 * 1024 * 1024;
const MAX_THEME_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_GIF_RESULTS = 20;
const SHOWCASE_MAX_MODULES = 12;
const SHOWCASE_MAX_ENTRIES = 16;
const MAX_RENDERED_MESSAGES = 120;
const DEFAULT_DM_CHAT_BACKGROUND: BackgroundGradient = {
  from: "#111b2f",
  to: "#0d1730",
  mode: "gradient",
};
const DEFAULT_GLYTCH_CHAT_BACKGROUND: BackgroundGradient = {
  from: "#0f1c31",
  to: "#0b1528",
  mode: "gradient",
};
const SHOWCASE_MAX_TITLE_LENGTH = 60;
const SHOWCASE_MAX_TEXT_LENGTH = 1000;
const PRESENCE_HEARTBEAT_MS = 45_000;
const PRESENCE_AWAY_IDLE_MS = 5 * 60_000;
const PRESENCE_STALE_MS = 120_000;
const QUICK_EMOJIS = ["😀", "😂", "😍", "😭", "🔥", "👍", "👏", "🎉", "✨", "❤️"];
const REACTION_EMOJIS = ["👍", "❤️", "😂", "🔥", "👏", "🎉", "😮", "😢"];
const GLYTCH_INVITE_MESSAGE_PREFIX = "[[GLYTCH_INVITE]]";
const SHOWCASE_KIND_LABELS: Record<ShowcaseKind, string> = {
  text: "Text",
  links: "Links",
  stats: "Stats",
  gallery: "Gallery",
};
const SHOWCASE_KIND_HINTS: Record<ShowcaseKind, string> = {
  text: "Write a featured section in your own words.",
  links: "Drop portfolio, socials, or favorite references.",
  stats: "Highlight milestones with quick label:value pairs.",
  gallery: "Show image URLs as a visual gallery.",
};
const SHOWCASE_KIND_EMPTY_COPY: Record<ShowcaseKind, string> = {
  text: "No content yet.",
  links: "No links yet.",
  stats: "No stats yet.",
  gallery: "No images yet.",
};
const APP_THEME_PALETTES: Record<AppThemeMode, Record<AppThemePreset, AppThemePalette>> = {
  dark: {
    default: {
      bg: "#050914",
      panel: "#0c1629",
      panelBorder: "#1f3352",
      text: "#e7f1ff",
      muted: "#8da4c7",
      accent: "#2f9bff",
      accentStrong: "#63b7ff",
      card: "#101d33",
      cardBorder: "#284365",
      bubbleBot: "#13223d",
      bubbleMe: "#193a58",
      hot: "#ff6f91",
      orange: "#ff8a5e",
      warn: "#173158",
      violet: "#151d3a",
    },
    ocean: {
      bg: "#041018",
      panel: "#0a1c2b",
      panelBorder: "#1a3a50",
      text: "#dff8ff",
      muted: "#87aebf",
      accent: "#22c5d8",
      accentStrong: "#54e3f2",
      card: "#0d2336",
      cardBorder: "#23607a",
      bubbleBot: "#10283d",
      bubbleMe: "#124156",
      hot: "#5fd8ff",
      orange: "#3ddfa9",
      warn: "#12344a",
      violet: "#102947",
    },
    sunset: {
      bg: "#130a0a",
      panel: "#221113",
      panelBorder: "#503036",
      text: "#ffe7dd",
      muted: "#c49b8d",
      accent: "#ff7a59",
      accentStrong: "#ff9b73",
      card: "#2b171a",
      cardBorder: "#6a3f47",
      bubbleBot: "#341c20",
      bubbleMe: "#4b2527",
      hot: "#ff5f86",
      orange: "#ff9564",
      warn: "#3b1f26",
      violet: "#33202a",
    },
    mint: {
      bg: "#07120d",
      panel: "#10231a",
      panelBorder: "#2a4f3d",
      text: "#e4fff0",
      muted: "#93b9a4",
      accent: "#3fcb8f",
      accentStrong: "#72e8b3",
      card: "#152c21",
      cardBorder: "#3c6b55",
      bubbleBot: "#173226",
      bubbleMe: "#1f4635",
      hot: "#72e8b3",
      orange: "#8fe99e",
      warn: "#1f3a2e",
      violet: "#163229",
    },
  },
  light: {
    default: {
      bg: "#edf2fb",
      panel: "#e2eafc",
      panelBorder: "#b6ccfe",
      text: "#1e2b45",
      muted: "#5f7196",
      accent: "#abc4ff",
      accentStrong: "#8eaefb",
      card: "#d7e3fc",
      cardBorder: "#abc4ff",
      bubbleBot: "#d7e3fc",
      bubbleMe: "#abc4ff",
      hot: "#8eaefb",
      orange: "#8eaefb",
      warn: "#c1d3fe",
      violet: "#c1d3fe",
    },
    ocean: {
      bg: "#eaf6fb",
      panel: "#dff2fa",
      panelBorder: "#9ed4e9",
      text: "#163046",
      muted: "#4f6f84",
      accent: "#8fd3ff",
      accentStrong: "#62b9ef",
      card: "#d2ecf8",
      cardBorder: "#8fd3ff",
      bubbleBot: "#d2ecf8",
      bubbleMe: "#8fd3ff",
      hot: "#62b9ef",
      orange: "#62b9ef",
      warn: "#bfe9ff",
      violet: "#bfe9ff",
    },
    sunset: {
      bg: "#fff1e8",
      panel: "#ffe5d6",
      panelBorder: "#f8c8a6",
      text: "#4a2a1e",
      muted: "#8a5f4f",
      accent: "#ffb88c",
      accentStrong: "#ff9f66",
      card: "#ffd9c3",
      cardBorder: "#ffb88c",
      bubbleBot: "#ffd9c3",
      bubbleMe: "#ffb88c",
      hot: "#ff9f66",
      orange: "#ff9f66",
      warn: "#ffd3b5",
      violet: "#ffd3b5",
    },
    mint: {
      bg: "#eefbf4",
      panel: "#dcf5e8",
      panelBorder: "#a8debe",
      text: "#1d3a2c",
      muted: "#567a67",
      accent: "#9ad9b6",
      accentStrong: "#6ec59a",
      card: "#d1f0e0",
      cardBorder: "#9ad9b6",
      bubbleBot: "#d1f0e0",
      bubbleMe: "#9ad9b6",
      hot: "#6ec59a",
      orange: "#6ec59a",
      warn: "#bcead2",
      violet: "#bcead2",
    },
  },
};
const ROLE_PERMISSION_OPTIONS: Array<{ key: GlytchRolePermissionKey; label: string; fallbackKeys: string[] }> = [
  { key: "ban_members", label: "Can Ban Members", fallbackKeys: ["manage_members"] },
  { key: "manage_channels", label: "Can manage channels", fallbackKeys: [] },
  { key: "mute_deafen_members", label: "Can mute/deafen members", fallbackKeys: ["moderate_voice"] },
  { key: "kick_voice_members", label: "Can kick members from voice channels", fallbackKeys: ["moderate_voice"] },
  { key: "create_channels", label: "Can add channels", fallbackKeys: ["manage_channels"] },
  { key: "add_roles", label: "Can add roles", fallbackKeys: ["manage_roles"] },
  { key: "edit_glytch_profile", label: "Can edit Glytch profile settings", fallbackKeys: [] },
];

type VoiceAudioConstraints = MediaTrackConstraints & {
  voiceIsolation?: ConstrainBoolean;
  googAutoGainControl?: boolean;
  googEchoCancellation?: boolean;
  googHighpassFilter?: boolean;
  googNoiseSuppression?: boolean;
  googTypingNoiseDetection?: boolean;
};

type ElectronDesktopVideoTrackConstraints = MediaTrackConstraints & {
  mandatory?: {
    chromeMediaSource: "desktop";
    chromeMediaSourceId: string;
    maxFrameRate?: number;
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
  };
};

type ElectronDesktopAudioTrackConstraints = MediaTrackConstraints & {
  mandatory?: {
    chromeMediaSource: "desktop";
    chromeMediaSourceId: string;
  };
};

type LocalVideoShareKind = "screen" | "camera";

type DesktopSourceOption = {
  id: string;
  name: string;
  kind: "screen" | "window";
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getFriendId(conversation: DmConversation, me: string) {
  return conversation.user_a === me ? conversation.user_b : conversation.user_a;
}

function initialsFromName(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function normalizeTextPostMode(raw: unknown): TextPostMode {
  if (raw === "images_only" || raw === "text_only") {
    return raw;
  }
  return "all";
}

function normalizeAppTheme(raw: unknown): AppThemePreset {
  if (raw === "ocean" || raw === "sunset" || raw === "mint") {
    return raw;
  }
  return "default";
}

function normalizeAppThemeMode(raw: unknown): AppThemeMode {
  if (raw === "light") {
    return "light";
  }
  return "dark";
}

function textPostModeLabel(mode: TextPostMode): string {
  if (mode === "images_only") return "images-only";
  if (mode === "text_only") return "text-only";
  return "";
}

function normalizeBackgroundGradientMap(raw: unknown): Record<string, BackgroundGradient> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const parsed: Record<string, BackgroundGradient> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const normalized = normalizeBackgroundGradient(value);
    if (!normalized) continue;
    parsed[key] = normalized;
  }

  return parsed;
}

function normalizeBackgroundGradient(raw: unknown): BackgroundGradient | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const candidate = raw as Record<string, unknown>;
  if (typeof candidate.from !== "string" || typeof candidate.to !== "string") {
    return null;
  }
  const from = candidate.from.trim();
  const to = candidate.to.trim();
  if (!from || !to) {
    return null;
  }

  const imageUrl =
    typeof candidate.imageUrl === "string" && candidate.imageUrl.trim().length > 0
      ? candidate.imageUrl.trim()
      : undefined;
  let mode: "image" | "gradient";
  if (candidate.mode === "image") {
    mode = imageUrl ? "image" : "gradient";
  } else if (candidate.mode === "gradient") {
    mode = "gradient";
  } else {
    mode = imageUrl ? "image" : "gradient";
  }

  return {
    from,
    to,
    mode,
    imageUrl: mode === "image" ? imageUrl : undefined,
  };
}

function normalizeShowcaseKind(raw: unknown): ShowcaseKind {
  if (raw === "links" || raw === "stats" || raw === "gallery") {
    return raw;
  }
  return "text";
}

function normalizeShowcaseVisibility(raw: unknown): ShowcaseVisibility {
  if (raw === "friends" || raw === "private") {
    return raw;
  }
  return "public";
}

function normalizeShowcaseEntries(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0)
    .slice(0, SHOWCASE_MAX_ENTRIES);
}

function createShowcaseId(): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `showcase-${Date.now()}-${random}`;
}

function createShowcase(kind: ShowcaseKind): ProfileShowcase {
  if (kind === "links") {
    return {
      id: createShowcaseId(),
      kind,
      title: "Favorite Links",
      visibility: "public",
      text: "",
      entries: [],
    };
  }
  if (kind === "stats") {
    return {
      id: createShowcaseId(),
      kind,
      title: "Stats",
      visibility: "public",
      text: "",
      entries: [],
    };
  }
  if (kind === "gallery") {
    return {
      id: createShowcaseId(),
      kind,
      title: "Gallery",
      visibility: "public",
      text: "",
      entries: [],
    };
  }
  return {
    id: createShowcaseId(),
    kind: "text",
    title: "Featured",
    visibility: "public",
    text: "",
    entries: [],
  };
}

function createShowcaseStarterLayout(): ProfileShowcase[] {
  const featured = createShowcase("text");
  featured.title = "About Me";
  featured.text = "Share what you are into right now, your goals, or what you are building.";

  const links = createShowcase("links");
  links.title = "Featured Links";
  links.entries = ["Portfolio|https://example.com", "Favorite Track|https://example.com/song"];

  const stats = createShowcase("stats");
  stats.title = "Highlights";
  stats.entries = ["Wins: 120", "Current Streak: 8"];

  return [featured, links, stats];
}

function normalizeProfileShowcases(raw: unknown): ProfileShowcase[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item): ProfileShowcase | null => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const row = item as Record<string, unknown>;
      const kind = normalizeShowcaseKind(row.kind);
      const id = typeof row.id === "string" && row.id.trim().length > 0 ? row.id.trim() : createShowcaseId();
      const title = typeof row.title === "string" ? row.title.slice(0, SHOWCASE_MAX_TITLE_LENGTH) : "Showcase";
      const visibility = normalizeShowcaseVisibility(row.visibility);
      const text = typeof row.text === "string" ? row.text.slice(0, SHOWCASE_MAX_TEXT_LENGTH) : "";
      const entries = normalizeShowcaseEntries(row.entries);

      return {
        id,
        kind,
        title: title || "Showcase",
        visibility,
        text,
        entries,
      };
    })
    .filter((item): item is ProfileShowcase => Boolean(item))
    .slice(0, SHOWCASE_MAX_MODULES);
}

function parseShowcaseEntriesDraft(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, SHOWCASE_MAX_ENTRIES);
}

function parseShowcaseLinkEntry(entry: string): { label: string; url: string } {
  const [rawLabel, ...rest] = entry.split("|");
  if (rest.length === 0) {
    const url = entry.trim();
    return { label: url, url };
  }
  const label = rawLabel.trim() || "Link";
  const url = rest.join("|").trim();
  return { label, url };
}

function parseShowcaseStatEntry(entry: string): { label: string; value: string } {
  const [rawLabel, ...rest] = entry.split(":");
  if (rest.length === 0) {
    return { label: rawLabel.trim(), value: "" };
  }
  return {
    label: rawLabel.trim(),
    value: rest.join(":").trim(),
  };
}

function isShowcaseVisible(showcase: ProfileShowcase, options: { isSelf: boolean; isFriend: boolean }): boolean {
  if (options.isSelf) return true;
  if (showcase.visibility === "private") return false;
  if (showcase.visibility === "friends") return options.isFriend;
  return true;
}

function showcaseKindLabel(kind: ShowcaseKind): string {
  return SHOWCASE_KIND_LABELS[kind] || SHOWCASE_KIND_LABELS.text;
}

function showcaseKindHint(kind: ShowcaseKind): string {
  return SHOWCASE_KIND_HINTS[kind] || SHOWCASE_KIND_HINTS.text;
}

function showcaseVisibilityLabel(visibility: ShowcaseVisibility): string {
  if (visibility === "friends") return "Friends only";
  if (visibility === "private") return "Only me";
  return "Public";
}

function showcaseSummary(showcase: ProfileShowcase): string {
  if (showcase.kind === "text") {
    if (!showcase.text.trim()) return "No text yet.";
    const words = showcase.text.trim().split(/\s+/).filter(Boolean).length;
    return `${words} words`;
  }
  const count = showcase.entries.length;
  const noun = showcase.kind === "links" ? "link" : showcase.kind === "stats" ? "stat" : "image";
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function resolveChatBackgroundStyle(background: BackgroundGradient): CSSProperties {
  if (background.mode === "image" && background.imageUrl) {
    const sanitizedUrl = background.imageUrl.replace(/"/g, "%22");
    return {
      backgroundImage: `url("${sanitizedUrl}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      backgroundColor: background.from,
    };
  }

  return {
    backgroundImage: "none",
    backgroundSize: "auto",
    backgroundPosition: "initial",
    backgroundRepeat: "repeat",
    background: `linear-gradient(165deg, ${background.from}, ${background.to})`,
  };
}

function normalizePresenceStatus(raw: unknown): UserPresenceStatus {
  if (raw === "active" || raw === "away" || raw === "busy" || raw === "offline") {
    return raw;
  }
  return "active";
}

function presenceStatusLabel(status: UserPresenceStatus): string {
  if (status === "active") return "Active";
  if (status === "away") return "Away";
  if (status === "busy") return "Busy";
  return "Offline";
}

function presenceSortRank(status: UserPresenceStatus): number {
  if (status === "active") return 0;
  if (status === "busy") return 1;
  if (status === "away") return 2;
  return 3;
}

function effectivePresenceStatus(profile: Profile | null | undefined, now = Date.now()): UserPresenceStatus {
  if (!profile) return "offline";
  const base = normalizePresenceStatus(profile.presence_status);
  if (base === "offline") return "offline";
  const updatedAt = profile.presence_updated_at ? Date.parse(profile.presence_updated_at) : Number.NaN;
  if (!Number.isFinite(updatedAt)) return base;
  if (now - updatedAt > PRESENCE_STALE_MS) return "offline";
  return base;
}

function sortMessageReactions(reactions: UiMessageReaction[]) {
  return [...reactions].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.emoji.localeCompare(b.emoji);
  });
}

function buildMessageReactionMap(rows: Array<DmMessageReaction | GlytchMessageReaction>, currentUserId: string) {
  const grouped = new Map<number, Map<string, UiMessageReaction>>();

  for (const row of rows) {
    const messageMap = grouped.get(row.message_id) || new Map<string, UiMessageReaction>();
    const existing = messageMap.get(row.emoji);
    if (existing) {
      existing.count += 1;
      existing.reactedByMe = existing.reactedByMe || row.user_id === currentUserId;
    } else {
      messageMap.set(row.emoji, {
        emoji: row.emoji,
        count: 1,
        reactedByMe: row.user_id === currentUserId,
      });
    }
    grouped.set(row.message_id, messageMap);
  }

  const byMessage = new Map<number, UiMessageReaction[]>();
  grouped.forEach((messageMap, messageId) => {
    byMessage.set(messageId, sortMessageReactions(Array.from(messageMap.values())));
  });

  return byMessage;
}

function applyReactionToggle(reactions: UiMessageReaction[], emoji: string, addReaction: boolean): UiMessageReaction[] {
  const existing = reactions.find((reaction) => reaction.emoji === emoji);
  if (addReaction) {
    if (existing) {
      return sortMessageReactions(
        reactions.map((reaction) =>
          reaction.emoji === emoji ? { ...reaction, count: reaction.count + 1, reactedByMe: true } : reaction,
        ),
      );
    }
    return sortMessageReactions([...reactions, { emoji, count: 1, reactedByMe: true }]);
  }

  if (!existing) return reactions;
  if (existing.count <= 1) {
    return sortMessageReactions(reactions.filter((reaction) => reaction.emoji !== emoji));
  }

  return sortMessageReactions(
    reactions.map((reaction) =>
      reaction.emoji === emoji ? { ...reaction, count: reaction.count - 1, reactedByMe: false } : reaction,
    ),
  );
}

function buildMessageSnapshotKey(messages: UiMessage[]): string {
  return messages
    .map((message) => {
      const reactions = message.reactions
        .map((reaction) => `${reaction.emoji}:${reaction.count}:${reaction.reactedByMe ? 1 : 0}`)
        .join(",");
      const readAt = message.readAt ? message.readAt.getTime() : 0;
      return `${message.id}|${message.attachmentType || ""}|${readAt}|${reactions}`;
    })
    .join("~");
}

function clampVoiceVolume(volume: number): number {
  if (!Number.isFinite(volume)) return 1;
  return Math.max(0, Math.min(1, volume));
}

function hasOwnPermissionKey(permissions: Record<string, boolean> | undefined, key: string): boolean {
  return Boolean(permissions && Object.prototype.hasOwnProperty.call(permissions, key));
}

function readRolePermission(
  permissions: Record<string, boolean> | undefined,
  key: string,
  fallbackKeys: string[] = [],
): boolean {
  if (hasOwnPermissionKey(permissions, key)) {
    return Boolean(permissions?.[key]);
  }
  for (const fallbackKey of fallbackKeys) {
    if (hasOwnPermissionKey(permissions, fallbackKey)) {
      return Boolean(permissions?.[fallbackKey]);
    }
  }
  return false;
}

function rolePermissionValue(role: GlytchRole, key: GlytchRolePermissionKey): boolean {
  const option = ROLE_PERMISSION_OPTIONS.find((item) => item.key === key);
  return readRolePermission(role.permissions || {}, key, option?.fallbackKeys || []);
}

function compareRolesByHierarchy(a: Pick<GlytchRole, "priority" | "id">, b: Pick<GlytchRole, "priority" | "id">) {
  if (b.priority !== a.priority) return b.priority - a.priority;
  return a.id - b.id;
}

function roleColorVars(color?: string | null): CSSProperties | undefined {
  if (!color) return undefined;
  return { "--role-color": color } as CSSProperties;
}

function serializeGlytchInviteMessage(payload: GlytchInviteMessagePayload): string {
  return `${GLYTCH_INVITE_MESSAGE_PREFIX}${JSON.stringify(payload)}`;
}

function parseGlytchInviteMessage(content: string): GlytchInviteMessagePayload | null {
  if (!content.startsWith(GLYTCH_INVITE_MESSAGE_PREFIX)) return null;
  const jsonPart = content.slice(GLYTCH_INVITE_MESSAGE_PREFIX.length).trim();
  if (!jsonPart) return null;

  try {
    const parsed = JSON.parse(jsonPart) as Partial<GlytchInviteMessagePayload>;
    if (
      !parsed ||
      typeof parsed.glytchId !== "number" ||
      !Number.isFinite(parsed.glytchId) ||
      parsed.glytchId <= 0 ||
      typeof parsed.inviteCode !== "string" ||
      parsed.inviteCode.trim().length === 0 ||
      typeof parsed.glytchName !== "string" ||
      parsed.glytchName.trim().length === 0 ||
      typeof parsed.inviterId !== "string" ||
      parsed.inviterId.trim().length === 0 ||
      typeof parsed.inviterName !== "string" ||
      parsed.inviterName.trim().length === 0 ||
      typeof parsed.createdAt !== "string" ||
      parsed.createdAt.trim().length === 0
    ) {
      return null;
    }

    return {
      glytchId: parsed.glytchId,
      inviteCode: parsed.inviteCode.trim().toLowerCase(),
      glytchName: parsed.glytchName.trim(),
      glytchIconUrl:
        typeof parsed.glytchIconUrl === "string" && parsed.glytchIconUrl.trim().length > 0
          ? parsed.glytchIconUrl.trim()
          : null,
      inviterId: parsed.inviterId,
      inviterName: parsed.inviterName.trim(),
      createdAt: parsed.createdAt,
    };
  } catch {
    return null;
  }
}

function dmMessagePreviewText(message: Pick<DmMessage, "content" | "attachment_url">): string {
  const invite = parseGlytchInviteMessage(message.content || "");
  if (invite) {
    return `${invite.inviterName} invited you to join ${invite.glytchName}.`;
  }
  return message.content?.trim() || (message.attachment_url ? "Sent an image." : "Open DMs to read the latest message.");
}

function buildVoiceAudioConstraints(): VoiceAudioConstraints {
  return {
    echoCancellation: { ideal: true },
    noiseSuppression: { ideal: true },
    autoGainControl: { ideal: true },
    channelCount: { ideal: 1 },
    sampleRate: { ideal: 48000 },
    sampleSize: { ideal: 16 },
    // Non-standard but supported by some engines (ignored where unsupported).
    voiceIsolation: true,
    googAutoGainControl: true,
    googEchoCancellation: true,
    googHighpassFilter: true,
    googNoiseSuppression: true,
    googTypingNoiseDetection: true,
  };
}

function buildProfileForm(profile: Profile | null): ProfileForm {
  const rawTheme = profile?.profile_theme;
  const theme =
    rawTheme && typeof rawTheme === "object" && !Array.isArray(rawTheme)
      ? (rawTheme as Record<string, unknown>)
      : {};
  const notificationsEnabled =
    typeof theme.notificationsEnabled === "boolean" ? theme.notificationsEnabled : true;
  const notifyDmMessages = typeof theme.notifyDmMessages === "boolean" ? theme.notifyDmMessages : true;
  const notifyDmCalls = typeof theme.notifyDmCalls === "boolean" ? theme.notifyDmCalls : true;
  const dmBackgroundByConversation = normalizeBackgroundGradientMap(theme.dmBackgroundByConversation);
  const glytchBackgroundByChannel = normalizeBackgroundGradientMap(theme.glytchBackgroundByChannel);
  const showcases = normalizeProfileShowcases(theme.showcases);
  const legacyThemeValue = typeof theme.appTheme === "string" ? theme.appTheme : "";
  const isLegacyLightPreset = legacyThemeValue === "light";
  const appThemeMode = isLegacyLightPreset ? "light" : normalizeAppThemeMode(theme.appThemeMode);
  const appTheme = isLegacyLightPreset ? "default" : normalizeAppTheme(legacyThemeValue);
  return {
    avatarUrl: profile?.avatar_url || "",
    bannerUrl: profile?.banner_url || "",
    bio: profile?.bio || "",
    presenceStatus: normalizePresenceStatus(profile?.presence_status),
    speakingRingColor: typeof theme.speakingRingColor === "string" ? theme.speakingRingColor : "#46d28f",
    accentColor: typeof theme.accentColor === "string" ? theme.accentColor : "#2f9bff",
    backgroundFrom: typeof theme.backgroundFrom === "string" ? theme.backgroundFrom : "#0c1629",
    backgroundTo: typeof theme.backgroundTo === "string" ? theme.backgroundTo : "#193a58",
    cardStyle: theme.cardStyle === "solid" ? "solid" : "glass",
    appThemeMode,
    appTheme,
    dmBackgroundFrom:
      typeof theme.dmBackgroundFrom === "string" ? theme.dmBackgroundFrom : DEFAULT_DM_CHAT_BACKGROUND.from,
    dmBackgroundTo:
      typeof theme.dmBackgroundTo === "string" ? theme.dmBackgroundTo : DEFAULT_DM_CHAT_BACKGROUND.to,
    glytchBackgroundFrom:
      typeof theme.glytchBackgroundFrom === "string" ? theme.glytchBackgroundFrom : DEFAULT_GLYTCH_CHAT_BACKGROUND.from,
    glytchBackgroundTo:
      typeof theme.glytchBackgroundTo === "string" ? theme.glytchBackgroundTo : DEFAULT_GLYTCH_CHAT_BACKGROUND.to,
    dmBackgroundByConversation,
    glytchBackgroundByChannel,
    showcases,
    notificationsEnabled,
    notifyDmMessages,
    notifyDmCalls,
  };
}

function buildProfileThemePayload(form: ProfileForm): Record<string, unknown> {
  return {
    speakingRingColor: form.speakingRingColor,
    accentColor: form.accentColor,
    backgroundFrom: form.backgroundFrom,
    backgroundTo: form.backgroundTo,
    cardStyle: form.cardStyle,
    appThemeMode: form.appThemeMode,
    appTheme: form.appTheme,
    dmBackgroundFrom: form.dmBackgroundFrom,
    dmBackgroundTo: form.dmBackgroundTo,
    glytchBackgroundFrom: form.glytchBackgroundFrom,
    glytchBackgroundTo: form.glytchBackgroundTo,
    dmBackgroundByConversation: form.dmBackgroundByConversation,
    glytchBackgroundByChannel: form.glytchBackgroundByChannel,
    showcases: form.showcases.map((showcase) => ({
      id: showcase.id,
      kind: showcase.kind,
      title: showcase.title.trim() || "Showcase",
      visibility: showcase.visibility,
      text: showcase.text,
      entries: showcase.entries,
    })),
    notificationsEnabled: form.notificationsEnabled,
    notifyDmMessages: form.notifyDmMessages,
    notifyDmCalls: form.notifyDmCalls,
  };
}

export default function ChatDashboard({
  currentUserId,
  currentUserName = "User",
  accessToken,
  onLogout,
}: ChatDashboardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("dm");
  const [dmPanelMode, setDmPanelMode] = useState<DmPanelMode>("dms");

  const [friendUsername, setFriendUsername] = useState("");
  const [dmError, setDmError] = useState("");
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [dms, setDms] = useState<DmWithFriend[]>([]);
  const [unreadDmCounts, setUnreadDmCounts] = useState<Record<number, number>>({});
  const [knownProfiles, setKnownProfiles] = useState<Record<string, Profile>>({});
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const activeConversationIdRef = useRef<number | null>(null);
  const [viewedProfile, setViewedProfile] = useState<Profile | null>(null);

  const [glytchNameDraft, setGlytchNameDraft] = useState("");
  const [inviteCodeDraft, setInviteCodeDraft] = useState("");
  const [categoryNameDraft, setCategoryNameDraft] = useState("");
  const [channelNameDraft, setChannelNameDraft] = useState("");
  const [channelCategoryIdDraft, setChannelCategoryIdDraft] = useState<string>("");
  const [channelTypeDraft, setChannelTypeDraft] = useState<"text" | "voice">("text");
  const [channelTextPostModeDraft, setChannelTextPostModeDraft] = useState<TextPostMode>("all");
  const [channelVoiceUserLimitDraft, setChannelVoiceUserLimitDraft] = useState("");
  const [showChannelCreate, setShowChannelCreate] = useState(false);
  const [glytchActionMode, setGlytchActionMode] = useState<GlytchActionMode>("none");
  const [showGlytchDirectory, setShowGlytchDirectory] = useState(true);
  const [showGlytchInvitePanel, setShowGlytchInvitePanel] = useState(false);
  const [glytchInviteSearch, setGlytchInviteSearch] = useState("");
  const [glytchInviteBusyConversationId, setGlytchInviteBusyConversationId] = useState<number | null>(null);
  const [glytchInviteNotice, setGlytchInviteNotice] = useState("");
  const [glytchInviteError, setGlytchInviteError] = useState("");
  const [glytchError, setGlytchError] = useState("");
  const [glytches, setGlytches] = useState<Glytch[]>([]);
  const [activeGlytchId, setActiveGlytchId] = useState<number | null>(null);
  const activeGlytchIdRef = useRef<number | null>(null);
  const [channelCategories, setChannelCategories] = useState<GlytchChannelCategory[]>([]);
  const [channels, setChannels] = useState<GlytchChannel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<number | null>(null);
  const activeChannelIdRef = useRef<number | null>(null);
  const [glytchRoles, setGlytchRoles] = useState<GlytchRole[]>([]);
  const [glytchMemberRolesRows, setGlytchMemberRolesRows] = useState<GlytchMemberRole[]>([]);
  const [glytchMembersUi, setGlytchMembersUi] = useState<UiGlytchMember[]>([]);
  const [glytchBansUi, setGlytchBansUi] = useState<UiGlytchBan[]>([]);
  const [selectedBanMemberId, setSelectedBanMemberId] = useState<string>("");
  const [banReasonDraft, setBanReasonDraft] = useState("");
  const [banActionBusyKey, setBanActionBusyKey] = useState<string | null>(null);
  const [memberFriendActionUserId, setMemberFriendActionUserId] = useState<string | null>(null);
  const [memberFriendActionType, setMemberFriendActionType] = useState<"add" | "remove" | null>(null);
  const [memberFriendActionError, setMemberFriendActionError] = useState("");
  const [roleNameDraft, setRoleNameDraft] = useState("");
  const [roleColorDraft, setRoleColorDraft] = useState("#2f9bff");
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [selectedPermissionRoleId, setSelectedPermissionRoleId] = useState<number | null>(null);
  const [selectedPermissionChannelId, setSelectedPermissionChannelId] = useState<number | null>(null);
  const [roleSettingsMode, setRoleSettingsMode] = useState<RoleSettingsMode>("new-role");
  const [rolePermissionBusyKey, setRolePermissionBusyKey] = useState<string | null>(null);
  const [roleDeleteBusyId, setRoleDeleteBusyId] = useState<number | null>(null);
  const [roleHierarchyBusy, setRoleHierarchyBusy] = useState(false);
  const [draggingRoleId, setDraggingRoleId] = useState<number | null>(null);
  const [roleHierarchyDropTargetId, setRoleHierarchyDropTargetId] = useState<number | null>(null);
  const [selectedChannelSettingsChannelId, setSelectedChannelSettingsChannelId] = useState<number | null>(null);
  const [channelPermissionCanView, setChannelPermissionCanView] = useState(true);
  const [channelPermissionCanSend, setChannelPermissionCanSend] = useState(true);
  const [channelPermissionCanJoinVoice, setChannelPermissionCanJoinVoice] = useState(true);
  const [channelSettingsTextPostMode, setChannelSettingsTextPostMode] = useState<TextPostMode>("all");
  const [channelSettingsVoiceUserLimit, setChannelSettingsVoiceUserLimit] = useState("");
  const [channelRolePermissions, setChannelRolePermissions] = useState<GlytchChannelRolePermission[]>([]);
  const [roleError, setRoleError] = useState("");
  const [glytchIconBusy, setGlytchIconBusy] = useState(false);
  const [glytchIconError, setGlytchIconError] = useState("");
  const [glytchProfileNameDraft, setGlytchProfileNameDraft] = useState("");
  const [glytchProfileBioDraft, setGlytchProfileBioDraft] = useState("");
  const [glytchProfileBusy, setGlytchProfileBusy] = useState(false);
  const [glytchProfileError, setGlytchProfileError] = useState("");
  const [glytchDeleteConfirmName, setGlytchDeleteConfirmName] = useState("");
  const [glytchDeleteBusy, setGlytchDeleteBusy] = useState(false);
  const [glytchDeleteError, setGlytchDeleteError] = useState("");
  const [glytchSettingsTab, setGlytchSettingsTab] = useState<GlytchSettingsTab>("profile");
  const [rolesLoadedForGlytchId, setRolesLoadedForGlytchId] = useState<number | null>(null);

  const [settingsTab, setSettingsTab] = useState<SettingsTab>("edit");
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileForm>(buildProfileForm(null));
  const [isUserIdle, setIsUserIdle] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState("");
  const [profileSaveBusy, setProfileSaveBusy] = useState(false);
  const [avatarUploadBusy, setAvatarUploadBusy] = useState(false);
  const [bannerUploadBusy, setBannerUploadBusy] = useState(false);

  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [hasDraftText, setHasDraftText] = useState(false);
  const [composerAttachment, setComposerAttachment] = useState<ComposerAttachment | null>(null);
  const [selectedGif, setSelectedGif] = useState<ComposerGif | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<number | null>(null);
  const [reactionBusyKey, setReactionBusyKey] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifQueryDraft, setGifQueryDraft] = useState("");
  const [gifResults, setGifResults] = useState<GifResult[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [gifError, setGifError] = useState("");
  const [messageMediaBusy, setMessageMediaBusy] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [chatError, setChatError] = useState("");
  const [voiceRoomKey, setVoiceRoomKey] = useState<string | null>(null);
  const [voiceParticipants, setVoiceParticipants] = useState<UiVoiceParticipant[]>([]);
  const [voiceParticipantsByChannelId, setVoiceParticipantsByChannelId] = useState<Record<number, UiVoiceParticipant[]>>({});
  const [speakingUserIds, setSpeakingUserIds] = useState<string[]>([]);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [voiceDeafened, setVoiceDeafened] = useState(false);
  const [remoteUserVolumes, setRemoteUserVolumes] = useState<Record<string, number>>({});
  const [screenShareBusy, setScreenShareBusy] = useState(false);
  const [screenShareIncludeSystemAudio, setScreenShareIncludeSystemAudio] = useState(false);
  const [localVideoShareKind, setLocalVideoShareKind] = useState<LocalVideoShareKind | null>(null);
  const [desktopSourceOptions, setDesktopSourceOptions] = useState<DesktopSourceOption[]>([]);
  const [selectedDesktopSourceId, setSelectedDesktopSourceId] = useState("auto");
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);
  const [remoteScreenShareUserIds, setRemoteScreenShareUserIds] = useState<string[]>([]);
  const [voiceError, setVoiceError] = useState("");
  const [voiceModerationBusyKey, setVoiceModerationBusyKey] = useState<string | null>(null);
  const [joinInviteBusyMessageId, setJoinInviteBusyMessageId] = useState<number | null>(null);
  const [showQuickThemeEditor, setShowQuickThemeEditor] = useState(false);
  const [quickThemeModeDraft, setQuickThemeModeDraft] = useState<"gradient" | "image">("gradient");
  const [quickThemeFromDraft, setQuickThemeFromDraft] = useState("#111b2f");
  const [quickThemeToDraft, setQuickThemeToDraft] = useState("#0d1730");
  const [quickThemeImageDraft, setQuickThemeImageDraft] = useState("");
  const [quickThemeImageUploadBusy, setQuickThemeImageUploadBusy] = useState(false);
  const [quickThemeBusy, setQuickThemeBusy] = useState(false);
  const [quickThemeError, setQuickThemeError] = useState("");
  const [forcedDefaultDmConversationIds, setForcedDefaultDmConversationIds] = useState<Record<number, true>>({});
  const [forcedDefaultGlytchChannelIds, setForcedDefaultGlytchChannelIds] = useState<Record<number, true>>({});
  const [draggingShowcaseId, setDraggingShowcaseId] = useState<string | null>(null);
  const [showcaseDropTargetId, setShowcaseDropTargetId] = useState<string | null>(null);
  const lastPresenceInteractionAtRef = useRef(Date.now());
  const isUserIdleRef = useRef(false);
  const dmMessagesPollingInFlightRef = useRef(false);
  const glytchMessagesPollingInFlightRef = useRef(false);
  const messageDisplayRef = useRef<HTMLElement | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const messageInputRef = useRef<HTMLInputElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localScreenTrackRef = useRef<MediaStreamTrack | null>(null);
  const localScreenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const screenTrackSendersRef = useRef<Map<string, RTCRtpSender[]>>(new Map());
  const activeNegotiationPeerIdsRef = useRef<Set<string>>(new Set());
  const queuedNegotiationPeerIdsRef = useRef<Set<string>>(new Set());
  const cameraFallbackInFlightRef = useRef(false);
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const remoteScreenStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const remoteAudioElsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const speakingAnalyserCleanupRef = useRef<Map<string, () => void>>(new Map());
  const signalSinceIdRef = useRef(0);
  const previousVoiceParticipantIdsRef = useRef<string[]>([]);
  const soundContextRef = useRef<AudioContext | null>(null);
  const notificationPermissionRequestedRef = useRef(false);
  const dmLatestMessageIdsRef = useRef<Record<number, number>>({});
  const dmMessageNotificationSeededRef = useRef(false);
  const dmCallParticipantCountsRef = useRef<Record<number, number>>({});
  const dmCallNotificationSeededRef = useRef(false);
  const dmLastLoadedConversationIdRef = useRef<number | null>(null);
  const dmLastLoadedMessageIdRef = useRef(0);
  const glytchLastLoadedChannelIdRef = useRef<number | null>(null);
  const glytchLastLoadedMessageIdRef = useRef(0);
  const messageSnapshotKeyByContextRef = useRef<Record<string, string>>({});
  const activeMessageContextKeyRef = useRef<string | null>(null);
  const [membersPanelWidth, setMembersPanelWidth] = useState(() => {
    if (typeof window === "undefined") return GLYTCH_MEMBERS_PANEL_DEFAULT_WIDTH;
    const stored = Number(window.localStorage.getItem(GLYTCH_MEMBERS_PANEL_WIDTH_STORAGE_KEY));
    if (!Number.isFinite(stored)) return GLYTCH_MEMBERS_PANEL_DEFAULT_WIDTH;
    return Math.max(GLYTCH_MEMBERS_PANEL_MIN_WIDTH, Math.min(GLYTCH_MEMBERS_PANEL_MAX_WIDTH, stored));
  });
  const [isMembersPanelResizing, setIsMembersPanelResizing] = useState(false);
  const chatLayoutRef = useRef<HTMLDivElement | null>(null);
  const membersPanelResizeStartXRef = useRef(0);
  const membersPanelResizeStartWidthRef = useRef(GLYTCH_MEMBERS_PANEL_DEFAULT_WIDTH);

  const activeDm = useMemo(
    () => dms.find((dm) => dm.conversationId === activeConversationId) || null,
    [dms, activeConversationId],
  );

  const activeGlytch = useMemo(
    () => glytches.find((item) => item.id === activeGlytchId) || null,
    [glytches, activeGlytchId],
  );

  const activeChannel = useMemo(
    () => channels.find((channel) => channel.id === activeChannelId) || null,
    [channels, activeChannelId],
  );
  const activeChannelSharedBackground = useMemo(() => {
    if (activeChannelId && forcedDefaultGlytchChannelIds[activeChannelId]) {
      return null;
    }
    return normalizeBackgroundGradient(activeChannel?.channel_theme);
  }, [activeChannel?.channel_theme, activeChannelId, forcedDefaultGlytchChannelIds]);

  const myRoleIdsInActiveGlytch = useMemo(
    () =>
      new Set(
        glytchMemberRolesRows
          .filter((row) => row.user_id === currentUserId)
          .map((row) => row.role_id),
      ),
    [currentUserId, glytchMemberRolesRows],
  );

  const isCurrentUserActiveGlytchAdmin = useMemo(
    () => glytchRoles.some((role) => myRoleIdsInActiveGlytch.has(role.id) && role.is_system && role.name === "Admin"),
    [glytchRoles, myRoleIdsInActiveGlytch],
  );

  const hasActiveGlytchRolePermission = useCallback(
    (permissionKey: GlytchRolePermissionKey) =>
      glytchRoles.some(
        (role) => myRoleIdsInActiveGlytch.has(role.id) && rolePermissionValue(role, permissionKey),
      ),
    [glytchRoles, myRoleIdsInActiveGlytch],
  );

  const canManageRolesInActiveGlytch = useMemo(() => {
    if (!activeGlytch) return false;
    if (activeGlytch.owner_id === currentUserId) return true;
    if (isCurrentUserActiveGlytchAdmin) return true;
    return hasActiveGlytchRolePermission("add_roles");
  }, [
    activeGlytch,
    currentUserId,
    hasActiveGlytchRolePermission,
    isCurrentUserActiveGlytchAdmin,
  ]);

  const canBanMembersInActiveGlytch = useMemo(() => {
    if (!activeGlytch) return false;
    if (activeGlytch.owner_id === currentUserId) return true;
    if (isCurrentUserActiveGlytchAdmin) return true;
    return hasActiveGlytchRolePermission("ban_members");
  }, [
    activeGlytch,
    currentUserId,
    hasActiveGlytchRolePermission,
    isCurrentUserActiveGlytchAdmin,
  ]);

  const canManageChannelsInActiveGlytch = useMemo(() => {
    if (!activeGlytch) return false;
    if (activeGlytch.owner_id === currentUserId) return true;
    if (isCurrentUserActiveGlytchAdmin) return true;
    return hasActiveGlytchRolePermission("manage_channels");
  }, [
    activeGlytch,
    currentUserId,
    hasActiveGlytchRolePermission,
    isCurrentUserActiveGlytchAdmin,
  ]);

  const canCreateChannelsInActiveGlytch = useMemo(() => {
    if (!activeGlytch) return false;
    if (activeGlytch.owner_id === currentUserId) return true;
    if (isCurrentUserActiveGlytchAdmin) return true;
    return hasActiveGlytchRolePermission("create_channels");
  }, [
    activeGlytch,
    currentUserId,
    hasActiveGlytchRolePermission,
    isCurrentUserActiveGlytchAdmin,
  ]);

  const canModerateVoiceMuteDeafenInActiveGlytch = useMemo(() => {
    if (!activeGlytch) return false;
    if (activeGlytch.owner_id === currentUserId) return true;
    if (isCurrentUserActiveGlytchAdmin) return true;
    return hasActiveGlytchRolePermission("mute_deafen_members");
  }, [
    activeGlytch,
    currentUserId,
    hasActiveGlytchRolePermission,
    isCurrentUserActiveGlytchAdmin,
  ]);

  const canModerateVoiceKickInActiveGlytch = useMemo(() => {
    if (!activeGlytch) return false;
    if (activeGlytch.owner_id === currentUserId) return true;
    if (isCurrentUserActiveGlytchAdmin) return true;
    return hasActiveGlytchRolePermission("kick_voice_members");
  }, [
    activeGlytch,
    currentUserId,
    hasActiveGlytchRolePermission,
    isCurrentUserActiveGlytchAdmin,
  ]);

  const canEditGlytchProfileInActiveGlytch = useMemo(() => {
    if (!activeGlytch) return false;
    if (activeGlytch.owner_id === currentUserId) return true;
    if (isCurrentUserActiveGlytchAdmin) return true;
    return hasActiveGlytchRolePermission("edit_glytch_profile");
  }, [
    activeGlytch,
    currentUserId,
    hasActiveGlytchRolePermission,
    isCurrentUserActiveGlytchAdmin,
  ]);

  const canAccessGlytchSettingsInActiveGlytch =
    canManageRolesInActiveGlytch ||
    canCreateChannelsInActiveGlytch ||
    canManageChannelsInActiveGlytch ||
    canBanMembersInActiveGlytch ||
    canModerateVoiceMuteDeafenInActiveGlytch ||
    canModerateVoiceKickInActiveGlytch ||
    canEditGlytchProfileInActiveGlytch;

  const isActiveGlytchRoleAccessResolved = useMemo(() => {
    if (!activeGlytch) return false;
    if (activeGlytch.owner_id === currentUserId) return true;
    return rolesLoadedForGlytchId === activeGlytch.id;
  }, [activeGlytch, currentUserId, rolesLoadedForGlytchId]);

  const isActiveGlytchOwner = activeGlytch?.owner_id === currentUserId;
  const activeGlytchOwnerId = activeGlytch?.owner_id || null;
  const quickThemeTarget = useMemo(() => {
    if (viewMode === "dm" && activeConversationId) {
      return {
        kind: "dm" as const,
        key: String(activeConversationId),
        label: activeDm?.friendName || "DM",
      };
    }
    if (viewMode === "glytch" && activeChannel?.kind === "text" && activeChannelId) {
      return {
        kind: "glytch" as const,
        key: String(activeChannelId),
        label: `#${activeChannel.name}`,
      };
    }
    return null;
  }, [viewMode, activeConversationId, activeDm?.friendName, activeChannel?.kind, activeChannel?.name, activeChannelId]);
  const quickThemeTargetOverride = useMemo(() => {
    if (!quickThemeTarget) return null;
    const targetId = Number.parseInt(quickThemeTarget.key, 10);
    if (quickThemeTarget.kind === "dm") {
      if (Number.isFinite(targetId) && targetId > 0 && forcedDefaultDmConversationIds[targetId]) {
        return null;
      }
      return activeDm?.sharedBackground || null;
    }
    if (Number.isFinite(targetId) && targetId > 0 && forcedDefaultGlytchChannelIds[targetId]) {
      return null;
    }
    return activeChannelSharedBackground;
  }, [
    quickThemeTarget,
    activeDm?.sharedBackground,
    activeChannelSharedBackground,
    forcedDefaultDmConversationIds,
    forcedDefaultGlytchChannelIds,
  ]);
  const quickThemeLegacyDmOverride = useMemo(() => {
    if (!quickThemeTarget || quickThemeTarget.kind !== "dm") return null;
    const conversationId = Number.parseInt(quickThemeTarget.key, 10);
    if (Number.isFinite(conversationId) && conversationId > 0 && forcedDefaultDmConversationIds[conversationId]) {
      return null;
    }
    return profileForm.dmBackgroundByConversation[quickThemeTarget.key] || null;
  }, [profileForm.dmBackgroundByConversation, quickThemeTarget, forcedDefaultDmConversationIds]);
  const quickThemeHasOverride = useMemo(
    () => Boolean(quickThemeTargetOverride || quickThemeLegacyDmOverride),
    [quickThemeLegacyDmOverride, quickThemeTargetOverride],
  );
  const shouldShowQuickThemeControl = Boolean(
    quickThemeTarget && (quickThemeTarget.kind === "dm" || canManageChannelsInActiveGlytch),
  );
  const selectedPermissionRole = useMemo(
    () => glytchRoles.find((role) => role.id === selectedPermissionRoleId) || null,
    [glytchRoles, selectedPermissionRoleId],
  );
  const hierarchyRoles = useMemo(() => [...glytchRoles].sort(compareRolesByHierarchy), [glytchRoles]);
  const canConfirmDeleteActiveGlytch = Boolean(
    activeGlytch && glytchDeleteConfirmName.trim() === activeGlytch.name,
  );
  const isInGlytchView = viewMode === "glytch" || viewMode === "glytch-settings";
  const shouldShowGlytchRailIcon = isInGlytchView && Boolean(activeGlytch) && !showGlytchDirectory;
  const shouldHideGlytchMessageArea = viewMode === "glytch" && (showGlytchDirectory || !activeGlytch);
  const shouldShowVoiceControls = viewMode === "dm" || (viewMode === "glytch" && activeChannel?.kind === "voice");
  const shouldRenderHeaderActions = shouldShowVoiceControls || shouldShowQuickThemeControl;
  const effectiveVoiceMuted = voiceMuted || voiceDeafened;
  const canModerateCurrentVoiceRoom =
    Boolean(voiceRoomKey) &&
    viewMode === "glytch" &&
    activeChannel?.kind === "voice" &&
    (canModerateVoiceMuteDeafenInActiveGlytch || canModerateVoiceKickInActiveGlytch);
  const currentUserVoiceParticipant = useMemo(
    () => voiceParticipants.find((participant) => participant.userId === currentUserId) || null,
    [voiceParticipants, currentUserId],
  );
  const currentUserForceMuted = Boolean(currentUserVoiceParticipant?.moderatorForcedMuted);
  const currentUserForceDeafened = Boolean(currentUserVoiceParticipant?.moderatorForcedDeafened);

  const selectedVoiceRoomKey = useMemo(() => {
    if (viewMode === "dm") {
      return activeConversationId ? `dm:${activeConversationId}` : null;
    }
    if (viewMode === "glytch") {
      return activeChannelId && activeChannel?.kind === "voice" ? `glytch:${activeChannelId}` : null;
    }
    return null;
  }, [viewMode, activeConversationId, activeChannelId, activeChannel?.kind]);

  const presenceRoomKey = useMemo(
    () =>
      voiceRoomKey ||
      (viewMode === "glytch" && activeChannel?.kind === "voice" && activeChannelId
        ? `glytch:${activeChannelId}`
        : null),
    [voiceRoomKey, viewMode, activeChannel?.kind, activeChannelId],
  );

  const clampMembersPanelWidth = useCallback((nextWidth: number) => {
    const layoutWidth = chatLayoutRef.current?.clientWidth ?? 0;
    const maxFromLayout =
      layoutWidth > 0 ? layoutWidth - GLYTCH_MESSAGE_COLUMN_MIN_WIDTH : GLYTCH_MEMBERS_PANEL_MAX_WIDTH;
    const maxWidth = Math.max(
      GLYTCH_MEMBERS_PANEL_MIN_WIDTH,
      Math.min(GLYTCH_MEMBERS_PANEL_MAX_WIDTH, maxFromLayout),
    );
    return Math.max(GLYTCH_MEMBERS_PANEL_MIN_WIDTH, Math.min(maxWidth, nextWidth));
  }, []);

  const chatLayoutStyle = useMemo<CSSProperties | undefined>(
    () =>
      viewMode === "glytch"
        ? ({ "--members-panel-width": `${membersPanelWidth}px` } as CSSProperties)
        : undefined,
    [viewMode, membersPanelWidth],
  );

  const handleMembersPanelResizeStart = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (viewMode !== "glytch") return;
      if (
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(max-width: 860px)").matches
      ) {
        return;
      }
      event.preventDefault();
      membersPanelResizeStartXRef.current = event.clientX;
      membersPanelResizeStartWidthRef.current = clampMembersPanelWidth(membersPanelWidth);
      setIsMembersPanelResizing(true);
    },
    [clampMembersPanelWidth, membersPanelWidth, viewMode],
  );

  const isAppVisibleAndFocused = useCallback(
    () =>
      typeof document !== "undefined" &&
      document.visibilityState === "visible" &&
      typeof document.hasFocus === "function" &&
      document.hasFocus(),
    [],
  );

  const ensureNotificationPermission = useCallback(async (): Promise<NotificationPermission | "unsupported"> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }
    if (window.Notification.permission !== "default") {
      return window.Notification.permission;
    }
    if (notificationPermissionRequestedRef.current) {
      return window.Notification.permission;
    }
    notificationPermissionRequestedRef.current = true;
    try {
      return await window.Notification.requestPermission();
    } catch {
      return window.Notification.permission;
    }
  }, []);

  const triggerDesktopNotification = useCallback(
    async ({
      title,
      body,
      tag,
      icon,
      onClick,
    }: {
      title: string;
      body: string;
      tag: string;
      icon?: string;
      onClick?: () => void;
    }) => {
      const permission =
        typeof window !== "undefined" && "Notification" in window && window.Notification.permission === "granted"
          ? "granted"
          : await ensureNotificationPermission();
      if (permission !== "granted" || typeof window === "undefined" || !("Notification" in window)) return;

      try {
        const notification = new window.Notification(title, {
          body,
          tag,
          icon,
        });
        notification.onclick = () => {
          window.focus();
          onClick?.();
          notification.close();
        };
      } catch {
        // Ignore notification failures (blocked APIs, invalid icon URLs, etc.)
      }
    },
    [ensureNotificationPermission],
  );

  const ensureSoundContext = async () => {
    if (!soundContextRef.current) {
      soundContextRef.current = new AudioContext();
    }
    if (soundContextRef.current.state !== "running") {
      await soundContextRef.current.resume();
    }
  };

  const applyLocalVoiceMute = useCallback((muted: boolean) => {
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }, []);

  const applyRemoteAudioOutput = useCallback(
    (targetUserId?: string) => {
      const applyToAudio = (userId: string, audioEl: HTMLAudioElement) => {
        audioEl.muted = voiceDeafened;
        audioEl.volume = clampVoiceVolume(remoteUserVolumes[userId] ?? 1);
      };

      if (targetUserId) {
        const audioEl = remoteAudioElsRef.current.get(targetUserId);
        if (audioEl) {
          applyToAudio(targetUserId, audioEl);
        }
        return;
      }

      remoteAudioElsRef.current.forEach((audioEl, userId) => {
        applyToAudio(userId, audioEl);
      });
    },
    [remoteUserVolumes, voiceDeafened],
  );

  const handleSetRemoteUserVolume = useCallback(
    (userId: string, volume: number) => {
      const nextVolume = clampVoiceVolume(volume);
      setRemoteUserVolumes((prev) => ({
        ...prev,
        [userId]: nextVolume,
      }));
      const audioEl = remoteAudioElsRef.current.get(userId);
      if (audioEl) {
        audioEl.volume = nextVolume;
        audioEl.muted = voiceDeafened;
      }
    },
    [voiceDeafened],
  );

  const playVoiceLeaveSound = () => {
    try {
      const audioCtx = soundContextRef.current;
      if (!audioCtx || audioCtx.state !== "running") return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.value = 660;
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      const now = audioCtx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // Ignore audio context failures (autoplay policies, etc.)
    }
  };

  useEffect(() => {
    applyRemoteAudioOutput();
  }, [applyRemoteAudioOutput]);

  useEffect(() => {
    applyLocalVoiceMute(effectiveVoiceMuted);
  }, [applyLocalVoiceMute, effectiveVoiceMuted]);

  const voiceChannels = useMemo(() => channels.filter((channel) => channel.kind === "voice"), [channels]);
  const uncategorizedChannels = useMemo(
    () => channels.filter((channel) => !channel.category_id),
    [channels],
  );
  const categorizedChannels = useMemo(
    () =>
      channelCategories
        .map((category) => ({
          category,
          channels: channels.filter((channel) => channel.category_id === category.id),
        }))
        .filter((group) => group.channels.length > 0),
    [channels, channelCategories],
  );

  const pendingIncoming = useMemo(
    () => requests.filter((req) => req.receiver_id === currentUserId && req.status === "pending"),
    [requests, currentUserId],
  );

  const pendingOutgoing = useMemo(
    () => requests.filter((req) => req.sender_id === currentUserId && req.status === "pending"),
    [requests, currentUserId],
  );

  const friendUserIds = useMemo(() => new Set(dms.map((dm) => dm.friendUserId)), [dms]);
  const incomingRequestUserIds = useMemo(() => new Set(pendingIncoming.map((req) => req.sender_id)), [pendingIncoming]);
  const outgoingRequestUserIds = useMemo(() => new Set(pendingOutgoing.map((req) => req.receiver_id)), [pendingOutgoing]);
  const normalizedGlytchInviteSearch = glytchInviteSearch.trim().toLowerCase();
  const filteredGlytchInviteDms = useMemo(() => {
    if (!normalizedGlytchInviteSearch) return dms;
    return dms.filter((dm) => dm.friendName.toLowerCase().includes(normalizedGlytchInviteSearch));
  }, [dms, normalizedGlytchInviteSearch]);

  const selectedPresenceStatus = normalizePresenceStatus(profileForm.presenceStatus);
  const currentUserPresenceStatus = useMemo<UserPresenceStatus>(() => {
    if (selectedPresenceStatus !== "active") return selectedPresenceStatus;
    return isUserIdle ? "away" : "active";
  }, [selectedPresenceStatus, isUserIdle]);
  const currentUserPresenceLabel = presenceStatusLabel(currentUserPresenceStatus);

  const resolvePresenceForUser = useCallback(
    (userId: string): UserPresenceStatus => {
      if (userId === currentUserId) {
        return currentUserPresenceStatus;
      }
      const profile = knownProfiles[userId];
      return effectivePresenceStatus(profile);
    },
    [currentUserId, currentUserPresenceStatus, knownProfiles],
  );

  const highestRoleByUserId = useMemo(() => {
    const roleById = new Map(glytchRoles.map((role) => [role.id, role]));
    const assignedRolesByUser = new Map<string, GlytchRole[]>();

    glytchMemberRolesRows.forEach((memberRole) => {
      const role = roleById.get(memberRole.role_id);
      if (!role) return;
      const existing = assignedRolesByUser.get(memberRole.user_id) || [];
      assignedRolesByUser.set(memberRole.user_id, [...existing, role]);
    });

    const highestByUser = new Map<string, GlytchRole | null>();
    glytchMembersUi.forEach((member) => {
      const assigned = [...(assignedRolesByUser.get(member.userId) || [])].sort(compareRolesByHierarchy);
      highestByUser.set(member.userId, assigned[0] || null);
    });

    return highestByUser;
  }, [glytchMemberRolesRows, glytchMembersUi, glytchRoles]);

  const roleColorByName = useMemo(() => {
    const map = new Map<string, string>();
    glytchRoles.forEach((role) => {
      map.set(role.name, role.color);
    });
    return map;
  }, [glytchRoles]);

  const groupedGlytchMembers = useMemo(() => {
    type GlytchMemberGroup = {
      key: string;
      label: string;
      color: string | null;
      orderValue: number;
      roleId: number | null;
      members: UiGlytchMember[];
    };

    const groups = new Map<string, GlytchMemberGroup>();
    glytchMembersUi.forEach((member) => {
      const highestRole = highestRoleByUserId.get(member.userId) || null;
      const key = highestRole ? `role:${highestRole.id}` : "role:none";
      const existing = groups.get(key);
      if (existing) {
        existing.members.push(member);
        return;
      }
      groups.set(key, {
        key,
        label: highestRole?.name || "No Role",
        color: highestRole?.color || null,
        orderValue: highestRole?.priority ?? Number.NEGATIVE_INFINITY,
        roleId: highestRole?.id ?? null,
        members: [member],
      });
    });

    const sortMembers = (a: UiGlytchMember, b: UiGlytchMember) => {
      const statusDelta = presenceSortRank(resolvePresenceForUser(a.userId)) - presenceSortRank(resolvePresenceForUser(b.userId));
      if (statusDelta !== 0) return statusDelta;
      return a.name.localeCompare(b.name);
    };

    const grouped = Array.from(groups.values()).map((group) => ({
      ...group,
      members: [...group.members].sort(sortMembers),
    }));

    grouped.sort((a, b) => {
      if (b.orderValue !== a.orderValue) return b.orderValue - a.orderValue;
      if (a.roleId !== null && b.roleId !== null && a.roleId !== b.roleId) return a.roleId - b.roleId;
      return a.label.localeCompare(b.label);
    });

    return grouped;
  }, [glytchMembersUi, highestRoleByUserId, resolvePresenceForUser]);

  const bannedMemberIds = useMemo(() => new Set(glytchBansUi.map((ban) => ban.userId)), [glytchBansUi]);
  const bannableGlytchMembers = useMemo(
    () =>
      glytchMembersUi.filter(
        (member) =>
          member.userId !== currentUserId &&
          member.userId !== activeGlytch?.owner_id &&
          !bannedMemberIds.has(member.userId),
      ),
    [activeGlytch?.owner_id, bannedMemberIds, currentUserId, glytchMembersUi],
  );

  const onlineGlytchMembersCount = useMemo(
    () => glytchMembersUi.filter((member) => resolvePresenceForUser(member.userId) !== "offline").length,
    [glytchMembersUi, resolvePresenceForUser],
  );

  const sidebarAvatar = profileForm.avatarUrl || currentProfile?.avatar_url || "";
  const displayName = currentProfile?.username || currentUserName;
  const dmMessageNotificationsEnabled = profileForm.notificationsEnabled && profileForm.notifyDmMessages;
  const dmCallNotificationsEnabled = profileForm.notificationsEnabled && profileForm.notifyDmCalls;
  const isElectronRuntime = typeof window !== "undefined" && Boolean(window.electronAPI?.isElectron);
  const isComposerInputFocused = useCallback(
    () =>
      typeof document !== "undefined" &&
      Boolean(messageInputRef.current) &&
      document.activeElement === messageInputRef.current,
    [],
  );
  const shouldPauseBackgroundPolling = useCallback(
    () => isElectronRuntime && isComposerInputFocused(),
    [isComposerInputFocused, isElectronRuntime],
  );
  const shouldDeferMessagePolling = useCallback(
    () => shouldPauseBackgroundPolling(),
    [shouldPauseBackgroundPolling],
  );
  const isScreenSharing = Boolean(localScreenStream);
  const remoteScreenShares = useMemo(
    () =>
      remoteScreenShareUserIds
        .map((userId) => {
          const stream = remoteScreenStreamsRef.current.get(userId);
          if (!stream) return null;
          const profile = userId === currentUserId ? currentProfile : knownProfiles[userId];
          return {
            userId,
            stream,
            name: profile?.username || profile?.display_name || (userId === currentUserId ? displayName : "User"),
          };
        })
        .filter((entry): entry is { userId: string; stream: MediaStream; name: string } => Boolean(entry)),
    [remoteScreenShareUserIds, knownProfiles, currentProfile, currentUserId, displayName],
  );
  const presentingUserIds = useMemo(() => {
    const ids = new Set(remoteScreenShareUserIds);
    if (isScreenSharing) {
      ids.add(currentUserId);
    }
    return ids;
  }, [remoteScreenShareUserIds, isScreenSharing, currentUserId]);
  const shouldShowScreenSharePanel = Boolean(voiceRoomKey && (isScreenSharing || remoteScreenShares.length > 0));
  const selectedDesktopSourceLabel = useMemo(() => {
    if (selectedDesktopSourceId === "auto") return "Display";
    return desktopSourceOptions.find((source) => source.id === selectedDesktopSourceId)?.name || "Display";
  }, [desktopSourceOptions, selectedDesktopSourceId]);
  const localScreenShareCaption = useMemo(() => {
    if (localVideoShareKind === "camera") return "You (camera fallback)";
    return selectedDesktopSourceId === "auto" ? "You (sharing)" : `You (${selectedDesktopSourceLabel})`;
  }, [localVideoShareKind, selectedDesktopSourceId, selectedDesktopSourceLabel]);

  const attachVideoStream = useCallback((videoEl: HTMLVideoElement | null, stream: MediaStream | null) => {
    if (!videoEl) return;
    if (!stream) {
      if (videoEl.srcObject) {
        videoEl.srcObject = null;
      }
      return;
    }
    if (videoEl.srcObject !== stream) {
      videoEl.srcObject = stream;
      videoEl.onloadedmetadata = () => {
        void videoEl.play().catch(() => undefined);
      };
    }
    const playPromise = videoEl.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => undefined);
    }
  }, []);

  const closeVideoFullscreen = useCallback(() => {
    if (typeof document === "undefined") return;
    const doc = document as Document & {
      webkitExitFullscreen?: () => Promise<void> | void;
      mozCancelFullScreen?: () => Promise<void> | void;
      msExitFullscreen?: () => Promise<void> | void;
    };
    if (typeof doc.exitFullscreen === "function" && doc.fullscreenElement) {
      void doc.exitFullscreen().catch(() => undefined);
      return;
    }
    if (typeof doc.webkitExitFullscreen === "function") {
      void doc.webkitExitFullscreen();
      return;
    }
    if (typeof doc.mozCancelFullScreen === "function") {
      void doc.mozCancelFullScreen();
      return;
    }
    if (typeof doc.msExitFullscreen === "function") {
      void doc.msExitFullscreen();
    }
  }, []);

  const openVideoFullscreen = useCallback((containerEl: HTMLElement | null) => {
    if (!containerEl) return;
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
    };
    if (doc.fullscreenElement === containerEl || doc.webkitFullscreenElement === containerEl) {
      closeVideoFullscreen();
      return;
    }

    const candidate = containerEl as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
      mozRequestFullScreen?: () => Promise<void> | void;
      msRequestFullscreen?: () => Promise<void> | void;
    };
    if (typeof candidate.requestFullscreen === "function") {
      void candidate.requestFullscreen().catch(() => undefined);
      return;
    }
    if (typeof candidate.webkitRequestFullscreen === "function") {
      void candidate.webkitRequestFullscreen();
      return;
    }
    if (typeof candidate.mozRequestFullScreen === "function") {
      void candidate.mozRequestFullScreen();
      return;
    }
    if (typeof candidate.msRequestFullscreen === "function") {
      void candidate.msRequestFullscreen();
    }
  }, [closeVideoFullscreen]);

  const refreshDesktopSourceOptions = useCallback(async () => {
    if (!isElectronRuntime || !window.electronAPI?.listDesktopSources) return;
    try {
      const sources = await window.electronAPI.listDesktopSources();
      setDesktopSourceOptions(sources);
      setSelectedDesktopSourceId((prev) => {
        if (prev === "auto") return prev;
        if (sources.some((source) => source.id === prev)) return prev;
        return "auto";
      });
    } catch {
      // Keep the previous source list if desktop capture listing fails.
    }
  }, [isElectronRuntime]);

  useEffect(() => {
    if (!voiceRoomKey) return;
    if (!isElectronRuntime) return;
    void refreshDesktopSourceOptions();

    const interval = window.setInterval(() => {
      void refreshDesktopSourceOptions();
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isElectronRuntime, refreshDesktopSourceOptions, voiceRoomKey]);

  const requestElectronScreenStream = useCallback(
    async (preferredSourceId: string | null, includeSystemAudio: boolean): Promise<MediaStream> => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Screen sharing is not supported in this browser.");
      }
      if (!window.electronAPI?.isElectron || !window.electronAPI.getDesktopSourceId) {
        throw new Error("Screen sharing is not supported in this browser.");
      }

      const sourceId = await window.electronAPI.getDesktopSourceId(preferredSourceId);
      if (!sourceId) {
        throw new Error("Could not find a screen source to share.");
      }

      const videoConstraints: ElectronDesktopVideoTrackConstraints = {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: sourceId,
          maxFrameRate: 60,
        },
      };

      let requestedAudioError: unknown = null;
      if (includeSystemAudio) {
        const audioConstraints: ElectronDesktopAudioTrackConstraints = {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: sourceId,
          },
        };
        try {
          return await navigator.mediaDevices.getUserMedia({
            video: videoConstraints as MediaTrackConstraints,
            audio: audioConstraints as MediaTrackConstraints,
          });
        } catch (err) {
          requestedAudioError = err;
        }
      }

      try {
        return await navigator.mediaDevices.getUserMedia({
          video: videoConstraints as MediaTrackConstraints,
          audio: false,
        });
      } catch (err) {
        throw requestedAudioError ?? err;
      }
    },
    [],
  );

  const isMessageListNearBottom = useCallback((threshold = 72) => {
    const container = messageDisplayRef.current;
    if (!container) return true;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    return distanceFromBottom <= threshold;
  }, []);

  const scrollMessageListToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    requestAnimationFrame(() => {
      messageEndRef.current?.scrollIntoView({ behavior, block: "end" });
    });
  }, []);

  useEffect(() => {
    return () => {
      if (composerAttachment?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(composerAttachment.previewUrl);
      }
    };
  }, [composerAttachment]);

  useEffect(() => {
    setShowEmojiPicker(false);
    setShowGifPicker(false);
    setReactionPickerMessageId(null);
    setReactionBusyKey(null);
    setGifQueryDraft("");
    setGifResults([]);
    setGifError("");
    setComposerAttachment(null);
    setSelectedGif(null);
  }, [viewMode, activeConversationId, activeChannelId]);

  useEffect(() => {
    if (!showGifPicker) return;
    const canCompose =
      viewMode === "dm"
        ? !!activeConversationId
        : viewMode === "glytch"
          ? !!activeChannelId && activeChannel?.kind !== "voice" && activeChannel?.text_post_mode !== "text_only"
          : false;
    if (!canCompose) return;

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        setGifLoading(true);
        setGifError("");
        const response = await searchGifLibrary(accessToken, gifQueryDraft.trim(), MAX_GIF_RESULTS);
        if (cancelled) return;
        setGifResults(response.results);
      } catch (err) {
        if (cancelled) return;
        setGifError(err instanceof Error ? err.message : "Could not load GIFs.");
      } finally {
        if (!cancelled) {
          setGifLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [showGifPicker, accessToken, gifQueryDraft, viewMode, activeConversationId, activeChannelId, activeChannel?.kind, activeChannel?.text_post_mode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      setMembersPanelWidth((prev) => clampMembersPanelWidth(prev));
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [clampMembersPanelWidth]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(GLYTCH_MEMBERS_PANEL_WIDTH_STORAGE_KEY, String(Math.round(membersPanelWidth)));
  }, [membersPanelWidth]);

  useEffect(() => {
    if (!isMembersPanelResizing) return;
    const handlePointerMove = (event: PointerEvent) => {
      const deltaX = event.clientX - membersPanelResizeStartXRef.current;
      const nextWidth = clampMembersPanelWidth(membersPanelResizeStartWidthRef.current - deltaX);
      setMembersPanelWidth(nextWidth);
    };
    const stopResizing = () => {
      setIsMembersPanelResizing(false);
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResizing);
    window.addEventListener("pointercancel", stopResizing);

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResizing);
      window.removeEventListener("pointercancel", stopResizing);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [clampMembersPanelWidth, isMembersPanelResizing]);

  const loadMyProfile = useCallback(async () => {
    const profile = await getMyProfile(accessToken, currentUserId);
    setCurrentProfile(profile);
    setProfileForm(buildProfileForm(profile));
    if (profile) {
      setKnownProfiles((prev) => ({ ...prev, [profile.user_id]: profile }));
    }
  }, [accessToken, currentUserId]);

  const loadDmSidebarData = useCallback(async () => {
    const [requestRows, conversations] = await Promise.all([
      listFriendRequests(accessToken),
      listDmConversations(accessToken),
    ]);
    const conversationIds = conversations.map((conv) => conv.id);
    const friendIds = conversations.map((conv) => getFriendId(conv, currentUserId));
    const requestUserIds = requestRows.flatMap((req) => [req.sender_id, req.receiver_id]);
    const [profiles, unreadRows] = await Promise.all([
      fetchProfilesByIds(
        accessToken,
        Array.from(new Set([...friendIds, ...requestUserIds])),
      ),
      listUnreadDmMessages(accessToken, currentUserId, conversationIds),
    ]);
    const profileMap = new Map<string, Profile>(profiles.map((p) => [p.user_id, p]));
    setKnownProfiles((prev) => ({
      ...prev,
      ...Object.fromEntries(profiles.map((profile) => [profile.user_id, profile])),
    }));

    const enrichedRequests = requestRows.map((req) => ({
      ...req,
      sender_profile: profileMap.get(req.sender_id),
      receiver_profile: profileMap.get(req.receiver_id),
    }));

    setRequests(enrichedRequests);

    const nextDms = conversations.map((conv) => {
      const friendUserId = getFriendId(conv, currentUserId);
      const profile = profileMap.get(friendUserId);
      const isForcedDefault = Boolean(forcedDefaultDmConversationIds[conv.id]);
      return {
        conversationId: conv.id,
        friendUserId,
        friendName: profile?.username || profile?.display_name || "User",
        friendAvatarUrl: profile?.avatar_url || "",
        sharedBackground: isForcedDefault ? null : normalizeBackgroundGradient(conv.dm_theme),
      };
    });

    setDms(nextDms);
    const nextUnreadCounts: Record<number, number> = {};
    unreadRows.forEach((row) => {
      nextUnreadCounts[row.conversation_id] = (nextUnreadCounts[row.conversation_id] || 0) + 1;
    });
    setUnreadDmCounts(nextUnreadCounts);

    const currentConversationId = activeConversationIdRef.current;
    if (nextDms.length > 0 && !nextDms.some((dm) => dm.conversationId === currentConversationId)) {
      setActiveConversationId(nextDms[0].conversationId);
    }
    if (nextDms.length === 0) {
      setActiveConversationId(null);
      setUnreadDmCounts({});
    }
  }, [accessToken, currentUserId, forcedDefaultDmConversationIds]);

  const loadGlytchSidebarData = useCallback(async () => {
    const rows = await listGlytches(accessToken);
    setGlytches(rows);

    if (rows.length === 0) {
      setActiveGlytchId(null);
      setChannelCategories([]);
      setChannels([]);
      setActiveChannelId(null);
      return;
    }

    const currentGlytchId = activeGlytchIdRef.current;
    const currentChannelId = activeChannelIdRef.current;
    const nextGlytchId = rows.some((g) => g.id === currentGlytchId) ? currentGlytchId : null;
    setActiveGlytchId(nextGlytchId);

    if (!nextGlytchId) {
      setChannelCategories([]);
      setChannels([]);
      setActiveChannelId(null);
      return;
    }

    const [categoryRows, channelRows] = await Promise.all([
      listGlytchChannelCategories(accessToken, nextGlytchId),
      listGlytchChannels(accessToken, nextGlytchId),
    ]);
    const normalizedChannelRows = channelRows.map((channel) =>
      forcedDefaultGlytchChannelIds[channel.id] ? { ...channel, channel_theme: null } : channel,
    );
    setChannelCategories(categoryRows);
    setChannels(normalizedChannelRows);

    if (normalizedChannelRows.length === 0) {
      setActiveChannelId(null);
      return;
    }

    if (!normalizedChannelRows.some((channel) => channel.id === currentChannelId)) {
      setActiveChannelId(normalizedChannelRows[0].id);
    }
  }, [accessToken, forcedDefaultGlytchChannelIds]);

  const loadGlytchRoleData = useCallback(async (glytchId: number) => {
    const [roles, members, memberRoles, perChannelPermissions, bans] = await Promise.all([
      listGlytchRoles(accessToken, glytchId),
      listGlytchMembers(accessToken, glytchId),
      listGlytchMemberRoles(accessToken, glytchId),
      listGlytchChannelRolePermissions(accessToken, glytchId),
      listGlytchBans(accessToken, glytchId),
    ]);

    setGlytchRoles(roles);
    setGlytchMemberRolesRows(memberRoles);
    setChannelRolePermissions(perChannelPermissions);

    const profileIds = Array.from(new Set([
      ...members.map((member) => member.user_id),
      ...bans.map((ban) => ban.user_id),
      ...bans.map((ban) => ban.banned_by),
    ]));
    const profiles = await fetchProfilesByIds(accessToken, profileIds);
    const profileMap = new Map(profiles.map((profile) => [profile.user_id, profile]));
    setKnownProfiles((prev) => ({
      ...prev,
      ...Object.fromEntries(profiles.map((profile) => [profile.user_id, profile])),
    }));
    const roleById = new Map(roles.map((role) => [role.id, role]));
    const roleIdsByUser = new Map<string, number[]>();
    memberRoles.forEach((memberRole: GlytchMemberRole) => {
      if (!roleById.has(memberRole.role_id)) return;
      const existing = roleIdsByUser.get(memberRole.user_id) || [];
      roleIdsByUser.set(memberRole.user_id, [...existing, memberRole.role_id]);
    });

    const uiMembers: UiGlytchMember[] = members.map((member: GlytchMember) => {
      const profile = profileMap.get(member.user_id);
      const sortedRoleNames = (roleIdsByUser.get(member.user_id) || [])
        .map((roleId) => roleById.get(roleId))
        .filter((role): role is GlytchRole => Boolean(role))
        .sort(compareRolesByHierarchy)
        .map((role) => role.name);
      return {
        userId: member.user_id,
        name: profile?.username || profile?.display_name || "User",
        avatarUrl: profile?.avatar_url || "",
        roles: sortedRoleNames,
      };
    });

    setGlytchMembersUi(uiMembers);
    const uiBans: UiGlytchBan[] = bans.map((ban: GlytchBan) => {
      const bannedProfile = profileMap.get(ban.user_id);
      const bannerProfile = profileMap.get(ban.banned_by);
      return {
        userId: ban.user_id,
        name: bannedProfile?.username || bannedProfile?.display_name || "User",
        avatarUrl: bannedProfile?.avatar_url || "",
        reason: ban.reason || null,
        bannedByName: bannerProfile?.username || bannerProfile?.display_name || "Moderator",
        bannedAt: ban.banned_at,
      };
    });
    setGlytchBansUi(uiBans);

    const hasSelectedRole = selectedRoleId ? roles.some((role) => role.id === selectedRoleId) : false;
    if (roles.length > 0 && !hasSelectedRole) {
      setSelectedRoleId(roles[0].id);
    } else if (roles.length === 0) {
      setSelectedRoleId(null);
    }

    const hasPermissionRoleSelection = selectedPermissionRoleId
      ? roles.some((role) => role.id === selectedPermissionRoleId)
      : false;
    if (roles.length > 0 && !hasPermissionRoleSelection) {
      setSelectedPermissionRoleId(roles[0].id);
    } else if (roles.length === 0) {
      setSelectedPermissionRoleId(null);
    }

    const hasSelectedMember = selectedMemberId ? uiMembers.some((member) => member.userId === selectedMemberId) : false;
    if (uiMembers.length > 0 && !hasSelectedMember) {
      setSelectedMemberId(uiMembers[0].userId);
    } else if (uiMembers.length === 0) {
      setSelectedMemberId("");
    }

    const hasPermissionChannelSelection = selectedPermissionChannelId
      ? channels.some((channel) => channel.id === selectedPermissionChannelId)
      : false;
    if (channels.length > 0 && !hasPermissionChannelSelection) {
      setSelectedPermissionChannelId(channels[0].id);
    } else if (channels.length === 0) {
      setSelectedPermissionChannelId(null);
    }
  }, [accessToken, channels, selectedMemberId, selectedPermissionChannelId, selectedPermissionRoleId, selectedRoleId]);

  useEffect(() => {
    if (!selectedPermissionRoleId || !selectedPermissionChannelId) return;

    const role = glytchRoles.find((item) => item.id === selectedPermissionRoleId);
    const channel = channels.find((item) => item.id === selectedPermissionChannelId);
    const existing = channelRolePermissions.find(
      (item) => item.role_id === selectedPermissionRoleId && item.channel_id === selectedPermissionChannelId,
    );

    if (existing) {
      setChannelPermissionCanView(existing.can_view);
      setChannelPermissionCanSend(existing.can_send_messages);
      setChannelPermissionCanJoinVoice(existing.can_join_voice);
      return;
    }

    const rolePerms = role?.permissions || {};
    setChannelPermissionCanView(rolePerms.view_channel ?? true);
    setChannelPermissionCanSend(channel?.kind === "voice" ? false : rolePerms.send_messages ?? true);
    setChannelPermissionCanJoinVoice(channel?.kind === "voice" ? (rolePerms.join_voice ?? true) : false);
  }, [selectedPermissionRoleId, selectedPermissionChannelId, channelRolePermissions, glytchRoles, channels]);

  useEffect(() => {
    const hasSelection = selectedChannelSettingsChannelId
      ? channels.some((channel) => channel.id === selectedChannelSettingsChannelId)
      : false;
    if (channels.length > 0 && !hasSelection) {
      setSelectedChannelSettingsChannelId(channels[0].id);
      return;
    }
    if (channels.length === 0) {
      setSelectedChannelSettingsChannelId(null);
      return;
    }

    const selectedChannel = channels.find((channel) => channel.id === selectedChannelSettingsChannelId) || null;
    if (!selectedChannel) return;

    setChannelSettingsTextPostMode(normalizeTextPostMode(selectedChannel.text_post_mode));
    setChannelSettingsVoiceUserLimit(
      selectedChannel.kind === "voice" && selectedChannel.voice_user_limit ? String(selectedChannel.voice_user_limit) : "",
    );
  }, [channels, selectedChannelSettingsChannelId]);

  useEffect(() => {
    if (!showQuickThemeEditor || !quickThemeTarget) return;
    if (quickThemeTarget.kind === "dm") {
      const conversationId = Number.parseInt(quickThemeTarget.key, 10);
      const isForcedDefault =
        Number.isFinite(conversationId) && conversationId > 0 && Boolean(forcedDefaultDmConversationIds[conversationId]);
      const personalFallback =
        isForcedDefault ? null : profileForm.dmBackgroundByConversation[quickThemeTarget.key] || null;
      const sharedBackground = isForcedDefault ? null : activeDm?.sharedBackground || null;
      const background =
        sharedBackground ||
        personalFallback ||
        (isForcedDefault
          ? DEFAULT_DM_CHAT_BACKGROUND
          : {
              from: profileForm.dmBackgroundFrom,
              to: profileForm.dmBackgroundTo,
            });
      setQuickThemeModeDraft(background.mode === "image" && background.imageUrl ? "image" : "gradient");
      setQuickThemeFromDraft(background.from);
      setQuickThemeToDraft(background.to);
      setQuickThemeImageDraft(background.imageUrl || "");
      setQuickThemeError("");
      return;
    }
    const isForcedDefaultChannel =
      Boolean(activeChannelId) && Boolean(forcedDefaultGlytchChannelIds[activeChannelId || 0]);
    const background =
      activeChannelSharedBackground ||
      (isForcedDefaultChannel
        ? DEFAULT_GLYTCH_CHAT_BACKGROUND
        : {
            from: profileForm.glytchBackgroundFrom,
            to: profileForm.glytchBackgroundTo,
          });
    setQuickThemeModeDraft(background.mode === "image" && background.imageUrl ? "image" : "gradient");
    setQuickThemeFromDraft(background.from);
    setQuickThemeToDraft(background.to);
    setQuickThemeImageDraft(background.imageUrl || "");
    setQuickThemeError("");
  }, [
    activeChannelSharedBackground,
    activeChannelId,
    activeDm?.sharedBackground,
    forcedDefaultDmConversationIds,
    forcedDefaultGlytchChannelIds,
    profileForm.dmBackgroundByConversation,
    profileForm.dmBackgroundFrom,
    profileForm.dmBackgroundTo,
    profileForm.glytchBackgroundFrom,
    profileForm.glytchBackgroundTo,
    quickThemeTarget,
    showQuickThemeEditor,
  ]);

  useEffect(() => {
    setShowQuickThemeEditor(false);
    setQuickThemeModeDraft("gradient");
    setQuickThemeImageDraft("");
    setQuickThemeImageUploadBusy(false);
    setQuickThemeError("");
  }, [quickThemeTarget?.kind, quickThemeTarget?.key]);

  useEffect(() => {
    if (bannableGlytchMembers.length === 0) {
      setSelectedBanMemberId("");
      return;
    }
    if (!selectedBanMemberId || !bannableGlytchMembers.some((member) => member.userId === selectedBanMemberId)) {
      setSelectedBanMemberId(bannableGlytchMembers[0].userId);
    }
  }, [bannableGlytchMembers, selectedBanMemberId]);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    activeGlytchIdRef.current = activeGlytchId;
  }, [activeGlytchId]);

  useEffect(() => {
    if (!activeGlytchId) {
      setShowGlytchDirectory(true);
    }
  }, [activeGlytchId]);

  useEffect(() => {
    setShowGlytchInvitePanel(false);
    setGlytchInviteSearch("");
    setGlytchInviteBusyConversationId(null);
    setGlytchInviteNotice("");
    setGlytchInviteError("");
  }, [activeGlytchId]);

  useEffect(() => {
    if (activeGlytch && !showGlytchDirectory) return;
    setShowGlytchInvitePanel(false);
    setGlytchInviteSearch("");
    setGlytchInviteBusyConversationId(null);
    setGlytchInviteNotice("");
    setGlytchInviteError("");
  }, [activeGlytch, showGlytchDirectory]);

  useEffect(() => {
    activeChannelIdRef.current = activeChannelId;
  }, [activeChannelId]);

  useEffect(() => {
    void loadMyProfile();
  }, [loadMyProfile]);

  useEffect(() => {
    isUserIdleRef.current = isUserIdle;
  }, [isUserIdle]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    const markInteraction = () => {
      lastPresenceInteractionAtRef.current = Date.now();
      if (isUserIdleRef.current) {
        isUserIdleRef.current = false;
        setIsUserIdle(false);
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        markInteraction();
      }
    };

    window.addEventListener("pointerdown", markInteraction);
    window.addEventListener("keydown", markInteraction);
    window.addEventListener("focus", markInteraction);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pointerdown", markInteraction);
      window.removeEventListener("keydown", markInteraction);
      window.removeEventListener("focus", markInteraction);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const evaluateIdle = () => {
      const hidden = document.visibilityState === "hidden";
      const idleByInactivity = Date.now() - lastPresenceInteractionAtRef.current >= PRESENCE_AWAY_IDLE_MS;
      const nextIsUserIdle = hidden || idleByInactivity;
      if (nextIsUserIdle === isUserIdleRef.current) return;
      isUserIdleRef.current = nextIsUserIdle;
      setIsUserIdle(nextIsUserIdle);
    };

    evaluateIdle();
    const interval = window.setInterval(evaluateIdle, 15_000);
    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const selectedStatus = currentUserPresenceStatus;

    const syncPresence = async (withStatus: boolean) => {
      try {
        const updated = await updateMyPresence(accessToken, currentUserId, withStatus ? selectedStatus : undefined);
        const nextProfile = updated[0];
        if (!mounted || !nextProfile) return;
        setCurrentProfile(nextProfile);
        setKnownProfiles((prev) => ({ ...prev, [nextProfile.user_id]: nextProfile }));
        setViewedProfile((prev) => (prev?.user_id === nextProfile.user_id ? nextProfile : prev));
      } catch {
        // Ignore heartbeat failures and retry on next poll.
      }
    };

    void syncPresence(true);

    if (selectedStatus === "offline") {
      return () => {
        mounted = false;
      };
    }

    const interval = window.setInterval(() => {
      void syncPresence(false);
    }, PRESENCE_HEARTBEAT_MS);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [accessToken, currentUserId, currentUserPresenceStatus]);

  useEffect(() => {
    if (!activeGlytchId) {
      setChannelCategories([]);
      setChannels([]);
      setActiveChannelId(null);
      setGlytchRoles([]);
      setGlytchMemberRolesRows([]);
      setGlytchMembersUi([]);
      setChannelRolePermissions([]);
      setSelectedPermissionRoleId(null);
      setSelectedPermissionChannelId(null);
      setRolesLoadedForGlytchId(null);
      return;
    }

    let mounted = true;
    const loadChannels = async () => {
      try {
        const [categoryRows, channelRows] = await Promise.all([
          listGlytchChannelCategories(accessToken, activeGlytchId),
          listGlytchChannels(accessToken, activeGlytchId),
        ]);
        const normalizedChannelRows = channelRows.map((channel) =>
          forcedDefaultGlytchChannelIds[channel.id] ? { ...channel, channel_theme: null } : channel,
        );
        if (!mounted) return;
        setChannelCategories(categoryRows);
        setChannels(normalizedChannelRows);
        if (normalizedChannelRows.length === 0) {
          setActiveChannelId(null);
          return;
        }
        if (!normalizedChannelRows.some((channel) => channel.id === activeChannelId)) {
          setActiveChannelId(normalizedChannelRows[0].id);
        }
      } catch (err) {
        if (!mounted) return;
        setGlytchError(err instanceof Error ? err.message : "Could not load channels.");
      }
    };

    void loadChannels();

    return () => {
      mounted = false;
    };
  }, [accessToken, activeGlytchId, activeChannelId, forcedDefaultGlytchChannelIds]);

  useEffect(() => {
    if (!activeGlytchId) return;
    let mounted = true;
    setRolesLoadedForGlytchId(null);

    const loadRoles = async () => {
      try {
        await loadGlytchRoleData(activeGlytchId);
        if (!mounted) return;
        setRolesLoadedForGlytchId(activeGlytchId);
        setRoleError("");
      } catch (err) {
        if (!mounted) return;
        setRoleError(err instanceof Error ? err.message : "Could not load roles.");
      }
    };

    void loadRoles();
    const interval = window.setInterval(() => {
      if (shouldPauseBackgroundPolling()) return;
      void loadRoles();
    }, isElectronRuntime ? 12_000 : 5_000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [activeGlytchId, isElectronRuntime, loadGlytchRoleData, shouldPauseBackgroundPolling]);

  useEffect(() => {
    if (viewMode !== "glytch-settings") return;
    if (!activeGlytch) {
      setViewMode("glytch");
      return;
    }
    if (!isActiveGlytchRoleAccessResolved) return;
    if (!canAccessGlytchSettingsInActiveGlytch) {
      setViewMode("glytch");
    }
  }, [viewMode, activeGlytch, isActiveGlytchRoleAccessResolved, canAccessGlytchSettingsInActiveGlytch]);

  useEffect(() => {
    if (!canCreateChannelsInActiveGlytch) {
      setShowChannelCreate(false);
    }
  }, [canCreateChannelsInActiveGlytch]);

  useEffect(() => {
    if (!activeGlytch) {
      setGlytchProfileNameDraft("");
      setGlytchProfileBioDraft("");
      setGlytchDeleteConfirmName("");
      setGlytchDeleteError("");
      return;
    }
    setGlytchProfileNameDraft(activeGlytch.name || "");
    setGlytchProfileBioDraft(activeGlytch.bio || "");
    setGlytchDeleteConfirmName("");
    setGlytchDeleteError("");
  }, [activeGlytch]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        await loadDmSidebarData();
      } catch (err) {
        if (!mounted) return;
        setDmError(err instanceof Error ? err.message : "Could not load friend data.");
      }
    };

    void load();
    const interval = window.setInterval(() => {
      if (shouldPauseBackgroundPolling()) return;
      void load();
    }, isElectronRuntime ? 8_000 : 4_000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [isElectronRuntime, loadDmSidebarData, shouldPauseBackgroundPolling]);

  useEffect(() => {
    if (dms.length === 0) {
      dmLatestMessageIdsRef.current = {};
      dmMessageNotificationSeededRef.current = false;
      return;
    }

    let mounted = true;

    const pollLatestMessages = async () => {
      try {
        const rows = await fetchLatestDmMessages(
          accessToken,
          dms.map((dm) => dm.conversationId),
        );
        if (!mounted) return;

        const latestByConversation = new Map<number, (typeof rows)[number]>();
        rows.forEach((row) => {
          if (!latestByConversation.has(row.conversation_id)) {
            latestByConversation.set(row.conversation_id, row);
          }
        });

        const previousByConversation = dmLatestMessageIdsRef.current;
        const nextByConversation: Record<number, number> = {};

        for (const dm of dms) {
          const previousId = previousByConversation[dm.conversationId] ?? 0;
          nextByConversation[dm.conversationId] = previousId;

          const latest = latestByConversation.get(dm.conversationId);
          if (!latest) continue;

          nextByConversation[dm.conversationId] = latest.id;
          const hasNewIncomingMessage =
            dmMessageNotificationSeededRef.current &&
            latest.sender_id !== currentUserId &&
            latest.id > previousId;
          if (!hasNewIncomingMessage) continue;
          if (!dmMessageNotificationsEnabled) continue;

          const viewingThisDm =
            viewMode === "dm" && activeConversationId === dm.conversationId && isAppVisibleAndFocused();
          if (viewingThisDm) continue;

          void triggerDesktopNotification({
            title: `New message from ${dm.friendName}`,
            body: dmMessagePreviewText(latest),
            tag: `dm-message-${dm.conversationId}`,
            icon: dm.friendAvatarUrl || undefined,
            onClick: () => {
              setViewMode("dm");
              setDmPanelMode("dms");
              setActiveConversationId(dm.conversationId);
            },
          });
        }

        dmLatestMessageIdsRef.current = nextByConversation;
        if (!dmMessageNotificationSeededRef.current) {
          dmMessageNotificationSeededRef.current = true;
        }
      } catch {
        // Keep notification polling silent to avoid interrupting chat usage.
      }
    };

    void pollLatestMessages();
    const interval = window.setInterval(() => {
      if (shouldPauseBackgroundPolling()) return;
      void pollLatestMessages();
    }, isElectronRuntime ? 8_000 : 4_000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [
    accessToken,
    activeConversationId,
    currentUserId,
    dmMessageNotificationsEnabled,
    dms,
    isElectronRuntime,
    isAppVisibleAndFocused,
    shouldPauseBackgroundPolling,
    triggerDesktopNotification,
    viewMode,
  ]);

  useEffect(() => {
    if (dms.length === 0) {
      dmCallParticipantCountsRef.current = {};
      dmCallNotificationSeededRef.current = false;
      return;
    }

    let mounted = true;

    const pollIncomingDmCalls = async () => {
      try {
        const snapshots = await Promise.all(
          dms.map(async (dm) => {
            const roomKey = `dm:${dm.conversationId}`;
            const participants = await listVoiceParticipants(accessToken, roomKey);
            return { dm, roomKey, participants };
          }),
        );
        if (!mounted) return;

        const previousCounts = dmCallParticipantCountsRef.current;
        const nextCounts: Record<number, number> = {};

        for (const { dm, roomKey, participants } of snapshots) {
          const previousCount = previousCounts[dm.conversationId] ?? 0;
          const otherParticipantCount = participants.filter((row) => row.user_id !== currentUserId).length;
          nextCounts[dm.conversationId] = otherParticipantCount;

          const hasIncomingCallNow = otherParticipantCount > 0;
          const callJustStarted = previousCount === 0 && hasIncomingCallNow;
          const shouldNotifyIncomingCall =
            dmCallNotificationSeededRef.current && callJustStarted && voiceRoomKey !== roomKey;
          if (!shouldNotifyIncomingCall) continue;
          if (!dmCallNotificationsEnabled) continue;

          void triggerDesktopNotification({
            title: `Incoming call from ${dm.friendName}`,
            body: "Open this DM and join voice to answer.",
            tag: `dm-call-${dm.conversationId}`,
            icon: dm.friendAvatarUrl || undefined,
            onClick: () => {
              setViewMode("dm");
              setDmPanelMode("dms");
              setActiveConversationId(dm.conversationId);
            },
          });
        }

        dmCallParticipantCountsRef.current = nextCounts;
        if (!dmCallNotificationSeededRef.current) {
          dmCallNotificationSeededRef.current = true;
        }
      } catch {
        // Keep notification polling silent to avoid interrupting chat usage.
      }
    };

    void pollIncomingDmCalls();
    const interval = window.setInterval(() => {
      if (shouldPauseBackgroundPolling()) return;
      void pollIncomingDmCalls();
    }, isElectronRuntime ? 8_000 : 4_000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [
    accessToken,
    currentUserId,
    dmCallNotificationsEnabled,
    dms,
    isElectronRuntime,
    shouldPauseBackgroundPolling,
    triggerDesktopNotification,
    voiceRoomKey,
  ]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        await loadGlytchSidebarData();
      } catch (err) {
        if (!mounted) return;
        setGlytchError(err instanceof Error ? err.message : "Could not load Glytches.");
      }
    };

    void load();
    const interval = window.setInterval(() => {
      if (shouldPauseBackgroundPolling()) return;
      void load();
    }, isElectronRuntime ? 8_000 : 4_000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [isElectronRuntime, loadGlytchSidebarData, shouldPauseBackgroundPolling]);

  useEffect(() => {
    if (viewMode !== "dm") {
      dmLastLoadedConversationIdRef.current = null;
      dmLastLoadedMessageIdRef.current = 0;
    }
    if (viewMode !== "glytch") {
      glytchLastLoadedChannelIdRef.current = null;
      glytchLastLoadedMessageIdRef.current = 0;
    }
  }, [viewMode]);

  useEffect(() => {
    const nextContextKey =
      viewMode === "dm"
        ? activeConversationId
          ? `dm:${activeConversationId}`
          : null
        : viewMode === "glytch"
          ? activeChannelId && activeChannel?.kind !== "voice"
            ? `glytch:${activeChannelId}`
            : null
          : null;

    if (activeMessageContextKeyRef.current === nextContextKey) return;
    activeMessageContextKeyRef.current = nextContextKey;
    setMessages([]);
    setChatError("");
  }, [activeChannel?.kind, activeChannelId, activeConversationId, viewMode]);

  useEffect(() => {
    if (viewMode !== "dm") return;
    if (!activeConversationId) {
      setMessages([]);
      dmLastLoadedConversationIdRef.current = null;
      dmLastLoadedMessageIdRef.current = 0;
      return;
    }

    let mounted = true;

    const loadMessages = async () => {
      if (dmMessagesPollingInFlightRef.current) return;
      dmMessagesPollingInFlightRef.current = true;
      const conversationId = activeConversationId;
      const isConversationSwitch = dmLastLoadedConversationIdRef.current !== conversationId;
      let shouldAutoScrollAfterLoad = false;
      let scrollBehavior: ScrollBehavior = "smooth";
      if (isConversationSwitch) {
        setLoadingMessages(true);
      }
      try {
        const rows = await fetchDmMessages(accessToken, conversationId);
        if (!mounted) return;
        const reactionRows = await listDmMessageReactions(
          accessToken,
          rows.map((row) => row.id),
        );
        if (!mounted) return;
        const reactionMap = buildMessageReactionMap(reactionRows, currentUserId);
        const normalized = await Promise.all(
          rows.map(async (row) => ({
            id: row.id,
            text: row.content,
            attachmentUrl: await resolveMessageAttachmentUrl(accessToken, row.attachment_url || null),
            attachmentType: row.attachment_type || null,
            timestamp: new Date(row.created_at),
            sender: row.sender_id === currentUserId ? ("me" as const) : ("other" as const),
            senderName: row.sender_id === currentUserId ? currentUserName : activeDm?.friendName || "Friend",
            senderAvatarUrl: row.sender_id === currentUserId ? currentProfile?.avatar_url || "" : activeDm?.friendAvatarUrl || "",
            readAt: row.read_by_receiver_at ? new Date(row.read_by_receiver_at) : null,
            reactions: reactionMap.get(row.id) || [],
          })),
        );
        if (!mounted) return;

        const previousLatestMessageId = isConversationSwitch ? 0 : dmLastLoadedMessageIdRef.current;
        const nextLatestMessageId = normalized[normalized.length - 1]?.id ?? 0;
        const hasNewerMessages = nextLatestMessageId > previousLatestMessageId;
        const contextKey = `dm:${conversationId}`;
        shouldAutoScrollAfterLoad = isConversationSwitch || (hasNewerMessages && isMessageListNearBottom());
        scrollBehavior = isConversationSwitch ? "auto" : "smooth";
        dmLastLoadedConversationIdRef.current = conversationId;
        dmLastLoadedMessageIdRef.current = nextLatestMessageId;
        const nextSnapshotKey = buildMessageSnapshotKey(normalized);
        const previousSnapshotKey = messageSnapshotKeyByContextRef.current[contextKey] || "";
        const hasMessageSnapshotChanged = nextSnapshotKey !== previousSnapshotKey;
        messageSnapshotKeyByContextRef.current[contextKey] = nextSnapshotKey;

        if (isConversationSwitch || hasMessageSnapshotChanged) {
          setMessages(normalized);
        }
        setChatError("");

        const hasUnreadIncoming = rows.some((row) => row.sender_id !== currentUserId && !row.read_by_receiver_at);
        if (hasUnreadIncoming) {
          void markDmConversationRead(accessToken, conversationId)
            .then(() => {
              setUnreadDmCounts((prev) => {
                if (!prev[conversationId]) return prev;
                return { ...prev, [conversationId]: 0 };
              });
            })
            .catch(() => undefined);
        }
      } catch (err) {
        if (!mounted) return;
        setChatError(err instanceof Error ? err.message : "Could not load messages.");
      } finally {
        if (mounted) {
          if (isConversationSwitch) {
            setLoadingMessages(false);
          }
          if (shouldAutoScrollAfterLoad) {
            scrollMessageListToBottom(scrollBehavior);
          }
        }
        dmMessagesPollingInFlightRef.current = false;
      }
    };

    void loadMessages();
    const interval = window.setInterval(() => {
      if (shouldDeferMessagePolling()) return;
      void loadMessages();
    }, isElectronRuntime ? 5_000 : 3_000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [
    accessToken,
    activeConversationId,
    currentUserId,
    currentUserName,
    currentProfile?.avatar_url,
    activeDm?.friendName,
    activeDm?.friendAvatarUrl,
    isElectronRuntime,
    shouldDeferMessagePolling,
    viewMode,
    isMessageListNearBottom,
    scrollMessageListToBottom,
  ]);

  useEffect(() => {
    if (viewMode !== "glytch") return;
    if (!activeChannelId || activeChannel?.kind === "voice") {
      setMessages([]);
      glytchLastLoadedChannelIdRef.current = null;
      glytchLastLoadedMessageIdRef.current = 0;
      return;
    }

    let mounted = true;

    const loadMessages = async () => {
      if (glytchMessagesPollingInFlightRef.current) return;
      glytchMessagesPollingInFlightRef.current = true;
      const channelId = activeChannelId;
      const isChannelSwitch = glytchLastLoadedChannelIdRef.current !== channelId;
      let shouldAutoScrollAfterLoad = false;
      let scrollBehavior: ScrollBehavior = "smooth";
      if (isChannelSwitch) {
        setLoadingMessages(true);
      }
      try {
        const rows = await fetchGlytchMessages(accessToken, channelId);
        if (!mounted) return;

        const senderIds = Array.from(new Set(rows.map((row) => row.sender_id)));
        const [profiles, reactionRows] = await Promise.all([
          fetchProfilesByIds(accessToken, senderIds),
          listGlytchMessageReactions(
            accessToken,
            rows.map((row) => row.id),
          ),
        ]);
        if (!mounted) return;
        const profileMap = new Map(profiles.map((profile) => [profile.user_id, profile]));
        const reactionMap = buildMessageReactionMap(reactionRows, currentUserId);
        const normalized = await Promise.all(
          rows.map(async (row) => ({
            id: row.id,
            text: row.content,
            attachmentUrl: await resolveMessageAttachmentUrl(accessToken, row.attachment_url || null),
            attachmentType: row.attachment_type || null,
            timestamp: new Date(row.created_at),
            sender: row.sender_id === currentUserId ? ("me" as const) : ("other" as const),
            senderName:
              row.sender_id === currentUserId
                ? currentUserName
                : profileMap.get(row.sender_id)?.username || profileMap.get(row.sender_id)?.display_name || "Member",
            senderAvatarUrl:
              row.sender_id === currentUserId
                ? currentProfile?.avatar_url || ""
                : profileMap.get(row.sender_id)?.avatar_url || "",
            readAt: null,
            reactions: reactionMap.get(row.id) || [],
          })),
        );
        if (!mounted) return;

        const previousLatestMessageId = isChannelSwitch ? 0 : glytchLastLoadedMessageIdRef.current;
        const nextLatestMessageId = normalized[normalized.length - 1]?.id ?? 0;
        const hasNewerMessages = nextLatestMessageId > previousLatestMessageId;
        const contextKey = `glytch:${channelId}`;
        shouldAutoScrollAfterLoad = isChannelSwitch || (hasNewerMessages && isMessageListNearBottom());
        scrollBehavior = isChannelSwitch ? "auto" : "smooth";
        glytchLastLoadedChannelIdRef.current = channelId;
        glytchLastLoadedMessageIdRef.current = nextLatestMessageId;
        const nextSnapshotKey = buildMessageSnapshotKey(normalized);
        const previousSnapshotKey = messageSnapshotKeyByContextRef.current[contextKey] || "";
        const hasMessageSnapshotChanged = nextSnapshotKey !== previousSnapshotKey;
        messageSnapshotKeyByContextRef.current[contextKey] = nextSnapshotKey;

        if (isChannelSwitch || hasMessageSnapshotChanged) {
          setMessages(normalized);
        }
        setChatError("");
      } catch (err) {
        if (!mounted) return;
        setChatError(err instanceof Error ? err.message : "Could not load messages.");
      } finally {
        if (mounted) {
          if (isChannelSwitch) {
            setLoadingMessages(false);
          }
          if (shouldAutoScrollAfterLoad) {
            scrollMessageListToBottom(scrollBehavior);
          }
        }
        glytchMessagesPollingInFlightRef.current = false;
      }
    };

    void loadMessages();
    const interval = window.setInterval(() => {
      if (shouldDeferMessagePolling()) return;
      void loadMessages();
    }, isElectronRuntime ? 5_000 : 3_000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [
    accessToken,
    activeChannelId,
    activeChannel?.kind,
    currentUserId,
    currentUserName,
    currentProfile?.avatar_url,
    isElectronRuntime,
    shouldDeferMessagePolling,
    viewMode,
    isMessageListNearBottom,
    scrollMessageListToBottom,
  ]);

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!presenceRoomKey) return;
    let mounted = true;

    const refreshParticipants = async () => {
      try {
        const rows = await listVoiceParticipants(accessToken, presenceRoomKey);
        if (!mounted) return;
        const nextParticipantIds = rows.map((row) => row.user_id);
        const previousParticipantIds = previousVoiceParticipantIdsRef.current;
        if (previousParticipantIds.length > 0) {
          const removedIds = previousParticipantIds.filter((id) => !nextParticipantIds.includes(id));
          const someoneElseLeft = removedIds.some((id) => id !== currentUserId);
          if (someoneElseLeft) {
            playVoiceLeaveSound();
          }
        }
        previousVoiceParticipantIdsRef.current = nextParticipantIds;

        const myParticipantRow = rows.find((row) => row.user_id === currentUserId) || null;
        if (voiceRoomKey && !myParticipantRow) {
          await stopVoiceSession(false);
          if (!mounted) return;
          setVoiceError("You were removed from this voice channel.");
          return;
        }
        if (myParticipantRow) {
          const nextMuted = myParticipantRow.muted || myParticipantRow.deafened;
          if (voiceMuted !== myParticipantRow.muted) {
            setVoiceMuted(myParticipantRow.muted);
          }
          if (voiceDeafened !== myParticipantRow.deafened) {
            setVoiceDeafened(myParticipantRow.deafened);
          }
          applyLocalVoiceMute(nextMuted);
        }

        const ids = Array.from(new Set(rows.map((row) => row.user_id)));
        const missingIds = ids.filter((id) => !knownProfiles[id] && id !== currentUserId);
        if (missingIds.length > 0) {
          const fetched = await fetchProfilesByIds(accessToken, missingIds);
          if (!mounted) return;
          if (fetched.length > 0) {
            setKnownProfiles((prev) => ({
              ...prev,
              ...Object.fromEntries(fetched.map((profile) => [profile.user_id, profile])),
            }));
          }
        }

        const nextParticipants: UiVoiceParticipant[] = rows.map((row: VoiceParticipant) => {
          const profile = row.user_id === currentUserId ? currentProfile : knownProfiles[row.user_id];
          return {
            userId: row.user_id,
            name: profile?.username || profile?.display_name || (row.user_id === currentUserId ? displayName : "User"),
            avatarUrl: profile?.avatar_url || "",
            muted: row.muted,
            deafened: row.deafened,
            moderatorForcedMuted: row.moderator_forced_muted,
            moderatorForcedDeafened: row.moderator_forced_deafened,
          };
        });
        setVoiceParticipants(nextParticipants);

        if (voiceRoomKey) {
          const peerIds = rows.map((row) => row.user_id).filter((id) => id !== currentUserId);
          for (const userId of peerIds) {
            if (!peerConnectionsRef.current.has(userId) && currentUserId < userId) {
              await getOrCreatePeerConnection(userId, true);
            }
          }

          for (const userId of Array.from(peerConnectionsRef.current.keys())) {
            if (!peerIds.includes(userId)) {
              closePeerConnection(userId);
            }
          }
        }
      } catch (err) {
        if (!mounted) return;
        setVoiceError(err instanceof Error ? err.message : "Could not load voice participants.");
      }
    };

    void refreshParticipants();
    const interval = window.setInterval(() => {
      void refreshParticipants();
    }, 1000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [
    accessToken,
    applyLocalVoiceMute,
    currentProfile,
    currentUserId,
    displayName,
    knownProfiles,
    presenceRoomKey,
    voiceDeafened,
    voiceMuted,
    voiceRoomKey,
  ]);
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    const shouldTrackChannelParticipants = viewMode === "glytch" || viewMode === "glytch-settings";
    if (!shouldTrackChannelParticipants || !activeGlytchId || voiceChannels.length === 0) {
      setVoiceParticipantsByChannelId({});
      return;
    }

    let mounted = true;

    const refreshVoiceParticipantsByChannel = async () => {
      try {
        const snapshots = await Promise.all(
          voiceChannels.map(async (channel) => ({
            channelId: channel.id,
            rows: await listVoiceParticipants(accessToken, `glytch:${channel.id}`),
          })),
        );
        if (!mounted) return;

        const allIds = Array.from(new Set(snapshots.flatMap(({ rows }) => rows.map((row) => row.user_id))));
        const missingIds = allIds.filter((id) => id !== currentUserId && !knownProfiles[id]);
        let fetchedProfiles: Profile[] = [];
        if (missingIds.length > 0) {
          fetchedProfiles = await fetchProfilesByIds(accessToken, missingIds);
          if (!mounted) return;
          if (fetchedProfiles.length > 0) {
            setKnownProfiles((prev) => ({
              ...prev,
              ...Object.fromEntries(fetchedProfiles.map((profile) => [profile.user_id, profile])),
            }));
          }
        }

        const fetchedProfileMap = new Map(fetchedProfiles.map((profile) => [profile.user_id, profile]));
        const nextByChannel: Record<number, UiVoiceParticipant[]> = {};
        for (const { channelId, rows } of snapshots) {
          nextByChannel[channelId] = rows.map((row) => {
            const profile =
              row.user_id === currentUserId ? currentProfile : knownProfiles[row.user_id] || fetchedProfileMap.get(row.user_id);
            return {
              userId: row.user_id,
              name: profile?.username || profile?.display_name || (row.user_id === currentUserId ? displayName : "User"),
              avatarUrl: profile?.avatar_url || "",
              muted: row.muted,
              deafened: row.deafened,
              moderatorForcedMuted: row.moderator_forced_muted,
              moderatorForcedDeafened: row.moderator_forced_deafened,
            };
          });
        }

        setVoiceParticipantsByChannelId(nextByChannel);
      } catch {
        // Keep sidebar stable if polling a channel fails.
      }
    };

    void refreshVoiceParticipantsByChannel();
    const interval = window.setInterval(() => {
      if (shouldPauseBackgroundPolling()) return;
      void refreshVoiceParticipantsByChannel();
    }, isElectronRuntime ? 6_000 : 2_000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [
    accessToken,
    activeGlytchId,
    currentProfile,
    currentUserId,
    displayName,
    isElectronRuntime,
    knownProfiles,
    shouldPauseBackgroundPolling,
    viewMode,
    voiceChannels,
  ]);

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!voiceRoomKey) return;
    let mounted = true;

    const refreshSignals = async () => {
      try {
        const rows = await listVoiceSignals(accessToken, voiceRoomKey, currentUserId, signalSinceIdRef.current);
        if (!mounted || rows.length === 0) return;

        for (const signal of rows as VoiceSignal[]) {
          signalSinceIdRef.current = Math.max(signalSinceIdRef.current, signal.id);

          if (signal.sender_id === currentUserId) continue;

          if (signal.kind === "offer") {
            const pc = await getOrCreatePeerConnection(signal.sender_id, false);
            const payload = signal.payload as { sdp?: RTCSessionDescriptionInit };
            if (!payload?.sdp) continue;
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            await flushPendingCandidates(signal.sender_id, pc);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await sendVoiceSignal(accessToken, voiceRoomKey, currentUserId, signal.sender_id, "answer", {
              sdp: answer,
            });
            continue;
          }

          if (signal.kind === "answer") {
            const pc = await getOrCreatePeerConnection(signal.sender_id, false);
            const payload = signal.payload as { sdp?: RTCSessionDescriptionInit };
            if (!payload?.sdp) continue;
            // Ignore late/duplicate answers after negotiation has already settled.
            if (pc.signalingState !== "have-local-offer") {
              continue;
            }
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            } catch (err) {
              const message = err instanceof Error ? err.message.toLowerCase() : "";
              if (message.includes("called in wrong state")) {
                continue;
              }
              throw err;
            }
            await flushPendingCandidates(signal.sender_id, pc);
            continue;
          }

          if (signal.kind === "candidate") {
            const pc = await getOrCreatePeerConnection(signal.sender_id, false);
            const payload = signal.payload as { candidate?: RTCIceCandidateInit };
            if (!payload?.candidate) continue;
            if (!pc.remoteDescription) {
              const queued = pendingCandidatesRef.current.get(signal.sender_id) || [];
              queued.push(payload.candidate);
              pendingCandidatesRef.current.set(signal.sender_id, queued);
              continue;
            }
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch {
              // Ignore stale candidates during reconnect races.
            }
          }
        }
      } catch (err) {
        if (!mounted) return;
        setVoiceError(err instanceof Error ? err.message : "Could not sync voice.");
      }
    };

    void refreshSignals();
    const interval = window.setInterval(() => {
      void refreshSignals();
    }, 1000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [accessToken, currentUserId, voiceRoomKey]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // Room-switch cleanup intentionally tracks room keys only.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!voiceRoomKey) return;
    if (selectedVoiceRoomKey === voiceRoomKey) return;
    void stopVoiceSession(true);
  }, [selectedVoiceRoomKey, voiceRoomKey]);
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    previousVoiceParticipantIdsRef.current = [];
  }, [presenceRoomKey]);

  // Intentional mount/unmount cleanup effect.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    return () => {
      if (soundContextRef.current) {
        void soundContextRef.current.close();
        soundContextRef.current = null;
      }
      void stopVoiceSession(true);
    };
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps */

  const handleAddFriend = async (e: FormEvent) => {
    e.preventDefault();
    const username = friendUsername.trim().toLowerCase();
    if (!username) {
      setDmError("Enter a username.");
      return;
    }

    try {
      const profile = await findProfileByUsername(accessToken, username);
      if (!profile) {
        setDmError("No user found with that username.");
        return;
      }
      if (profile.user_id === currentUserId) {
        setDmError("You cannot add yourself.");
        return;
      }
      if (friendUserIds.has(profile.user_id)) {
        setDmError("You are already friends with that user.");
        return;
      }

      await sendFriendRequest(accessToken, currentUserId, profile.user_id);
      setFriendUsername("");
      setDmError("");
      await loadDmSidebarData();
    } catch (err) {
      setDmError(err instanceof Error ? err.message : "Could not send request.");
    }
  };

  const handleAccept = async (requestId: number) => {
    try {
      await acceptFriendRequest(accessToken, requestId);
      setDmError("");
      await loadDmSidebarData();
    } catch (err) {
      setDmError(err instanceof Error ? err.message : "Could not accept request.");
    }
  };

  const handleReject = async (requestId: number) => {
    try {
      await respondToFriendRequest(accessToken, requestId, "rejected");
      setDmError("");
      await loadDmSidebarData();
    } catch (err) {
      setDmError(err instanceof Error ? err.message : "Could not reject request.");
    }
  };

  const handleCreateGlytch = async (e: FormEvent) => {
    e.preventDefault();
    const name = glytchNameDraft.trim();
    if (!name) {
      setGlytchError("Enter a Glytch name.");
      return;
    }

    try {
      const created = await createGlytch(accessToken, name);
      setGlytchNameDraft("");
      setGlytchError("");
      await loadGlytchSidebarData();
      setViewMode("glytch");
      setActiveGlytchId(created.glytch_id);
      setActiveChannelId(created.channel_id);
      setGlytchActionMode("none");
      setShowGlytchDirectory(false);
    } catch (err) {
      setGlytchError(err instanceof Error ? err.message : "Could not create Glytch.");
    }
  };

  const handleJoinGlytch = async (e: FormEvent) => {
    e.preventDefault();
    const code = inviteCodeDraft.trim().toLowerCase();
    if (!code) {
      setGlytchError("Enter an invite code.");
      return;
    }

    try {
      const joined = await joinGlytchByCode(accessToken, code);
      setInviteCodeDraft("");
      setGlytchError("");
      await loadGlytchSidebarData();
      setViewMode("glytch");
      setActiveGlytchId(joined.glytch_id);
      setGlytchActionMode("none");
      setShowGlytchDirectory(false);
    } catch (err) {
      setGlytchError(err instanceof Error ? err.message : "Could not join Glytch.");
    }
  };

  const handleInviteFriendToActiveGlytch = async (dm: DmWithFriend) => {
    if (!activeGlytch) {
      setGlytchInviteError("Select a Glytch first.");
      return;
    }

    const inviteCode = activeGlytch.invite_code?.trim().toLowerCase();
    if (!inviteCode) {
      setGlytchInviteError("This Glytch invite code is not available.");
      return;
    }

    const inviterName =
      (currentProfile?.username || currentProfile?.display_name || currentUserName || "User").trim() || "User";

    try {
      setGlytchInviteBusyConversationId(dm.conversationId);
      setGlytchInviteError("");
      setGlytchInviteNotice("");
      await createDmMessage(
        accessToken,
        currentUserId,
        dm.conversationId,
        serializeGlytchInviteMessage({
          glytchId: activeGlytch.id,
          inviteCode,
          glytchName: activeGlytch.name,
          glytchIconUrl: activeGlytch.icon_url || null,
          inviterId: currentUserId,
          inviterName,
          createdAt: new Date().toISOString(),
        }),
      );
      setGlytchInviteNotice(`Invite sent to ${dm.friendName}.`);
    } catch (err) {
      setGlytchInviteError(err instanceof Error ? err.message : "Could not send invite.");
    } finally {
      setGlytchInviteBusyConversationId((prev) => (prev === dm.conversationId ? null : prev));
    }
  };

  const handleJoinInviteFromDmMessage = useCallback(async (messageId: number, invite: GlytchInviteMessagePayload) => {
    try {
      setJoinInviteBusyMessageId(messageId);
      setChatError("");
      const existing = glytches.find((glytch) => glytch.id === invite.glytchId);
      let joinedGlytchId: number;
      if (existing) {
        joinedGlytchId = existing.id;
      } else {
        const joined = await joinGlytchByCode(accessToken, invite.inviteCode);
        await loadGlytchSidebarData();
        joinedGlytchId = joined.glytch_id;
      }

      setActiveGlytchId(joinedGlytchId);
      setViewMode("glytch");
      setShowGlytchDirectory(false);
      await deleteDmMessage(accessToken, messageId);
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Could not join Glytch.");
    } finally {
      setJoinInviteBusyMessageId((prev) => (prev === messageId ? null : prev));
    }
  }, [accessToken, glytches, loadGlytchSidebarData]);

  const handleRejectInviteFromDmMessage = useCallback(async (messageId: number) => {
    try {
      setJoinInviteBusyMessageId(messageId);
      setChatError("");
      await deleteDmMessage(accessToken, messageId);
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Could not reject invite.");
    } finally {
      setJoinInviteBusyMessageId((prev) => (prev === messageId ? null : prev));
    }
  }, [accessToken]);

  const handleCreateChannel = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeGlytchId) {
      setGlytchError("Select a Glytch first.");
      return;
    }
    if (!canCreateChannelsInActiveGlytch) {
      setGlytchError("Only owner, admins, and allowed roles can create channels.");
      return;
    }

    const name = channelNameDraft.trim().toLowerCase();
    if (!name) {
      setGlytchError("Enter a channel name.");
      return;
    }

    const hasVoiceLimitDraft = channelVoiceUserLimitDraft.trim().length > 0;
    const parsedVoiceLimit = Number.parseInt(channelVoiceUserLimitDraft.trim(), 10);
    const voiceUserLimit =
      channelTypeDraft === "voice" && hasVoiceLimitDraft && Number.isFinite(parsedVoiceLimit) ? parsedVoiceLimit : null;

    if (channelTypeDraft === "voice" && hasVoiceLimitDraft && (!Number.isFinite(parsedVoiceLimit) || parsedVoiceLimit < 1 || parsedVoiceLimit > 99)) {
      setGlytchError("Voice user limit must be between 1 and 99.");
      return;
    }

    try {
      const parsedCategoryId = Number(channelCategoryIdDraft);
      const categoryId = Number.isFinite(parsedCategoryId) && parsedCategoryId > 0 ? parsedCategoryId : null;
      const inserted = await createGlytchChannel(
        accessToken,
        currentUserId,
        activeGlytchId,
        name,
        channelTypeDraft,
        categoryId,
        {
          text_post_mode: channelTypeDraft === "text" ? channelTextPostModeDraft : "all",
          voice_user_limit: channelTypeDraft === "voice" ? voiceUserLimit : null,
        },
      );
      const created = inserted[0];
      const [categoryRows, channelRows] = await Promise.all([
        listGlytchChannelCategories(accessToken, activeGlytchId),
        listGlytchChannels(accessToken, activeGlytchId),
      ]);
      setChannelCategories(categoryRows);
      setChannels(channelRows);
      setActiveChannelId(created?.id ?? channelRows[0]?.id ?? null);
      setChannelNameDraft("");
      setChannelCategoryIdDraft("");
      setChannelTypeDraft("text");
      setChannelTextPostModeDraft("all");
      setChannelVoiceUserLimitDraft("");
      setShowChannelCreate(false);
      setGlytchError("");
    } catch (err) {
      setGlytchError(err instanceof Error ? err.message : "Could not create channel.");
    }
  };

  const handleCreateCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeGlytchId) {
      setGlytchError("Select a Glytch first.");
      return;
    }
    if (!canCreateChannelsInActiveGlytch) {
      setGlytchError("Only owner, admins, and allowed roles can create categories.");
      return;
    }

    const name = categoryNameDraft.trim();
    if (!name) {
      setGlytchError("Enter a category name.");
      return;
    }

    try {
      const inserted = await createGlytchChannelCategory(accessToken, currentUserId, activeGlytchId, name);
      const categoryRows = await listGlytchChannelCategories(accessToken, activeGlytchId);
      setChannelCategories(categoryRows);
      if (inserted[0]?.id) {
        setChannelCategoryIdDraft(String(inserted[0].id));
      }
      setCategoryNameDraft("");
      setGlytchError("");
    } catch (err) {
      setGlytchError(err instanceof Error ? err.message : "Could not create category.");
    }
  };

  const handleCreateRole = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeGlytchId) {
      setRoleError("Select a Glytch first.");
      return;
    }
    if (!canManageRolesInActiveGlytch) {
      setRoleError("You do not have permission to add roles.");
      return;
    }

    const name = roleNameDraft.trim();
    if (!name) {
      setRoleError("Enter a role name.");
      return;
    }

    try {
      const createdRole = await createGlytchRole(accessToken, activeGlytchId, name, roleColorDraft);
      setRoleNameDraft("");
      setSelectedRoleId(createdRole.id);
      setSelectedPermissionRoleId(createdRole.id);
      setRoleError("");
      await loadGlytchRoleData(activeGlytchId);
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : "Could not create role.");
    }
  };

  const handleAssignRole = async (e: FormEvent) => {
    e.preventDefault();
    if (!canManageRolesInActiveGlytch) {
      setRoleError("You do not have permission to add roles.");
      return;
    }
    if (!activeGlytchId || !selectedMemberId || !selectedRoleId) {
      setRoleError("Select a member and role.");
      return;
    }

    try {
      await assignGlytchRole(accessToken, activeGlytchId, selectedMemberId, selectedRoleId);
      setRoleError("");
      await loadGlytchRoleData(activeGlytchId);
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : "Could not assign role.");
    }
  };

  const handleBanMember = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeGlytchId) {
      setRoleError("Select a Glytch first.");
      return;
    }
    if (!canBanMembersInActiveGlytch) {
      setRoleError("You do not have permission to ban members.");
      return;
    }
    if (!selectedBanMemberId) {
      setRoleError("Select a member to ban.");
      return;
    }

    const busyKey = `ban:${selectedBanMemberId}`;
    setBanActionBusyKey(busyKey);
    setRoleError("");

    try {
      await banGlytchUser(accessToken, activeGlytchId, selectedBanMemberId, banReasonDraft.trim() || null);
      setBanReasonDraft("");
      await loadGlytchRoleData(activeGlytchId);
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : "Could not ban member.");
    } finally {
      setBanActionBusyKey((prev) => (prev === busyKey ? null : prev));
    }
  };

  const handleKickMember = async () => {
    if (!activeGlytchId) {
      setRoleError("Select a Glytch first.");
      return;
    }
    if (!canBanMembersInActiveGlytch) {
      setRoleError("You do not have permission to kick members.");
      return;
    }
    if (!selectedBanMemberId) {
      setRoleError("Select a member to kick.");
      return;
    }

    const busyKey = `kick:${selectedBanMemberId}`;
    setBanActionBusyKey(busyKey);
    setRoleError("");

    try {
      const kicked = await kickGlytchMember(accessToken, activeGlytchId, selectedBanMemberId);
      if (!kicked) {
        setRoleError("Could not kick member. They may have already left.");
      }
      await loadGlytchRoleData(activeGlytchId);
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : "Could not kick member.");
    } finally {
      setBanActionBusyKey((prev) => (prev === busyKey ? null : prev));
    }
  };

  const handleUnbanMember = async (userId: string) => {
    if (!activeGlytchId) {
      setRoleError("Select a Glytch first.");
      return;
    }
    if (!canBanMembersInActiveGlytch) {
      setRoleError("You do not have permission to unban members.");
      return;
    }

    const busyKey = `unban:${userId}`;
    setBanActionBusyKey(busyKey);
    setRoleError("");

    try {
      await unbanGlytchUser(accessToken, activeGlytchId, userId);
      await loadGlytchRoleData(activeGlytchId);
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : "Could not unban member.");
    } finally {
      setBanActionBusyKey((prev) => (prev === busyKey ? null : prev));
    }
  };

  const handleSaveChannelPermissions = async (e: FormEvent) => {
    e.preventDefault();
    if (!canManageRolesInActiveGlytch) {
      setRoleError("You do not have permission to edit role permissions.");
      return;
    }
    if (!selectedPermissionRoleId || !selectedPermissionChannelId) {
      setRoleError("Select a role and channel.");
      return;
    }

    try {
      await setRoleChannelPermissions(
        accessToken,
        selectedPermissionRoleId,
        selectedPermissionChannelId,
        channelPermissionCanView,
        channelPermissionCanSend,
        channelPermissionCanJoinVoice,
      );
      setRoleError("");
      if (activeGlytchId) {
        await loadGlytchRoleData(activeGlytchId);
      }
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : "Could not save channel permissions.");
    }
  };

  const handleChangePresenceStatus = async (nextStatus: UserPresenceStatus) => {
    if (nextStatus === "active") {
      lastPresenceInteractionAtRef.current = Date.now();
      if (isUserIdleRef.current) {
        isUserIdleRef.current = false;
        setIsUserIdle(false);
      }
    }
    setProfileSaveError("");
    setProfileForm((prev) => ({ ...prev, presenceStatus: nextStatus }));
    try {
      const updated = await updateMyPresence(accessToken, currentUserId, nextStatus);
      const nextProfile = updated[0] || null;
      setCurrentProfile(nextProfile);
      if (nextProfile) {
        setKnownProfiles((prev) => ({ ...prev, [nextProfile.user_id]: nextProfile }));
        setViewedProfile((prev) => (prev?.user_id === nextProfile.user_id ? nextProfile : prev));
      }
    } catch (err) {
      setProfileSaveError(err instanceof Error ? err.message : "Could not update status.");
    }
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileSaveBusy(true);
    setProfileSaveError("");

    try {
      const updated = await updateMyProfileCustomization(accessToken, currentUserId, {
        avatar_url: profileForm.avatarUrl.trim() || null,
        banner_url: profileForm.bannerUrl.trim() || null,
        bio: profileForm.bio.trim() || null,
        profile_theme: buildProfileThemePayload(profileForm),
      });

      const nextProfile = updated[0] || null;
      setCurrentProfile(nextProfile);
      if (nextProfile) {
        setKnownProfiles((prev) => ({ ...prev, [nextProfile.user_id]: nextProfile }));
        setViewedProfile((prev) => (prev?.user_id === nextProfile.user_id ? nextProfile : prev));
        setProfileForm((prev) => ({ ...buildProfileForm(nextProfile), presenceStatus: prev.presenceStatus }));
      }
    } catch (err) {
      setProfileSaveError(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setProfileSaveBusy(false);
    }
  };

  const handleSaveNotificationSettings = async (e: FormEvent) => {
    e.preventDefault();
    setProfileSaveBusy(true);
    setProfileSaveError("");

    try {
      const updated = await updateMyProfileCustomization(accessToken, currentUserId, {
        profile_theme: buildProfileThemePayload(profileForm),
      });

      const nextProfile = updated[0] || null;
      setCurrentProfile(nextProfile);
      if (nextProfile) {
        setKnownProfiles((prev) => ({ ...prev, [nextProfile.user_id]: nextProfile }));
        setViewedProfile((prev) => (prev?.user_id === nextProfile.user_id ? nextProfile : prev));
        setProfileForm((prev) => ({ ...buildProfileForm(nextProfile), presenceStatus: prev.presenceStatus }));
      }

      if (profileForm.notificationsEnabled && (profileForm.notifyDmMessages || profileForm.notifyDmCalls)) {
        const permission = await ensureNotificationPermission();
        if (permission === "denied") {
          setProfileSaveError("Notifications are enabled, but browser/OS permission is blocked.");
        }
      }
    } catch (err) {
      setProfileSaveError(err instanceof Error ? err.message : "Could not save notification settings.");
    } finally {
      setProfileSaveBusy(false);
    }
  };

  const handleSaveThemeSettings = async (e: FormEvent) => {
    e.preventDefault();
    setProfileSaveBusy(true);
    setProfileSaveError("");

    try {
      const updated = await updateMyProfileCustomization(accessToken, currentUserId, {
        profile_theme: buildProfileThemePayload(profileForm),
      });

      const nextProfile = updated[0] || null;
      setCurrentProfile(nextProfile);
      if (nextProfile) {
        setKnownProfiles((prev) => ({ ...prev, [nextProfile.user_id]: nextProfile }));
        setViewedProfile((prev) => (prev?.user_id === nextProfile.user_id ? nextProfile : prev));
        setProfileForm((prev) => ({ ...buildProfileForm(nextProfile), presenceStatus: prev.presenceStatus }));
      }
    } catch (err) {
      setProfileSaveError(err instanceof Error ? err.message : "Could not save theme settings.");
    } finally {
      setProfileSaveBusy(false);
    }
  };

  const handleSaveShowcaseSettings = async (e: FormEvent) => {
    e.preventDefault();
    setProfileSaveBusy(true);
    setProfileSaveError("");

    try {
      const updated = await updateMyProfileCustomization(accessToken, currentUserId, {
        profile_theme: buildProfileThemePayload(profileForm),
      });

      const nextProfile = updated[0] || null;
      setCurrentProfile(nextProfile);
      if (nextProfile) {
        setKnownProfiles((prev) => ({ ...prev, [nextProfile.user_id]: nextProfile }));
        setViewedProfile((prev) => (prev?.user_id === nextProfile.user_id ? nextProfile : prev));
        setProfileForm((prev) => ({ ...buildProfileForm(nextProfile), presenceStatus: prev.presenceStatus }));
      }
    } catch (err) {
      setProfileSaveError(err instanceof Error ? err.message : "Could not save showcases.");
    } finally {
      setProfileSaveBusy(false);
    }
  };

  const handleAddShowcase = (kind: ShowcaseKind) => {
    setProfileForm((prev) => ({
      ...prev,
      showcases:
        prev.showcases.length >= SHOWCASE_MAX_MODULES ? prev.showcases : [...prev.showcases, createShowcase(kind)],
    }));
  };

  const handleAddShowcaseStarterLayout = () => {
    setProfileForm((prev) => {
      if (prev.showcases.length >= SHOWCASE_MAX_MODULES) return prev;
      const remaining = SHOWCASE_MAX_MODULES - prev.showcases.length;
      const additions = createShowcaseStarterLayout().slice(0, remaining);
      if (additions.length === 0) return prev;
      return {
        ...prev,
        showcases: [...prev.showcases, ...additions],
      };
    });
  };

  const handleDropShowcase = (draggedShowcaseId: string, targetShowcaseId: string) => {
    if (!draggedShowcaseId || !targetShowcaseId || draggedShowcaseId === targetShowcaseId) {
      return;
    }
    setProfileForm((prev) => {
      const draggedIndex = prev.showcases.findIndex((showcase) => showcase.id === draggedShowcaseId);
      const targetIndex = prev.showcases.findIndex((showcase) => showcase.id === targetShowcaseId);
      if (draggedIndex < 0 || targetIndex < 0 || draggedIndex === targetIndex) return prev;

      const nextShowcases = [...prev.showcases];
      const [moved] = nextShowcases.splice(draggedIndex, 1);
      nextShowcases.splice(targetIndex, 0, moved);

      return {
        ...prev,
        showcases: nextShowcases,
      };
    });
  };

  const handleRemoveShowcase = (showcaseId: string) => {
    setProfileForm((prev) => ({
      ...prev,
      showcases: prev.showcases.filter((showcase) => showcase.id !== showcaseId),
    }));
  };

  const handleDuplicateShowcase = (showcaseId: string) => {
    setProfileForm((prev) => {
      if (prev.showcases.length >= SHOWCASE_MAX_MODULES) return prev;
      const sourceIndex = prev.showcases.findIndex((showcase) => showcase.id === showcaseId);
      if (sourceIndex < 0) return prev;
      const source = prev.showcases[sourceIndex];
      const duplicated: ProfileShowcase = {
        ...source,
        id: createShowcaseId(),
        title: `${source.title || "Showcase"} Copy`.slice(0, SHOWCASE_MAX_TITLE_LENGTH),
      };
      const next = [...prev.showcases];
      next.splice(sourceIndex + 1, 0, duplicated);
      return {
        ...prev,
        showcases: next,
      };
    });
  };

  const handleUpdateShowcase = (showcaseId: string, updates: Partial<ProfileShowcase>) => {
    setProfileForm((prev) => ({
      ...prev,
      showcases: prev.showcases.map((showcase) =>
        showcase.id === showcaseId
          ? {
              ...showcase,
              ...updates,
            }
          : showcase,
      ),
    }));
  };

  const handleQuickThemeImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!quickThemeTarget) {
      setQuickThemeError("Open a DM or text channel first.");
      e.target.value = "";
      return;
    }
    if (quickThemeTarget.kind === "glytch" && !canManageChannelsInActiveGlytch) {
      setQuickThemeError("You do not have permission to change this channel background.");
      e.target.value = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      setQuickThemeError("Select an image file.");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_THEME_IMAGE_BYTES) {
      setQuickThemeError("Theme image must be 8MB or smaller.");
      e.target.value = "";
      return;
    }

    setQuickThemeImageUploadBusy(true);
    setQuickThemeError("");
    try {
      const uploadedUrl = await uploadProfileAsset(accessToken, currentUserId, file, "theme");
      setQuickThemeImageDraft(uploadedUrl);
      setQuickThemeModeDraft("image");
    } catch (err) {
      setQuickThemeError(err instanceof Error ? err.message : "Could not upload theme image.");
    } finally {
      setQuickThemeImageUploadBusy(false);
      e.target.value = "";
    }
  };

  const handleSaveQuickThemeOverride = async () => {
    if (!quickThemeTarget) return;
    if (quickThemeTarget.kind === "glytch" && !canManageChannelsInActiveGlytch) {
      setQuickThemeError("You do not have permission to change this channel background.");
      return;
    }
    setQuickThemeBusy(true);
    setQuickThemeError("");

    const normalizedFrom = quickThemeFromDraft.trim();
    const normalizedTo = quickThemeToDraft.trim();
    const normalizedImageUrl = quickThemeImageDraft.trim();
    if (!normalizedFrom || !normalizedTo) {
      setQuickThemeError("Select both colors before saving.");
      setQuickThemeBusy(false);
      return;
    }
    if (quickThemeModeDraft === "image" && !normalizedImageUrl) {
      setQuickThemeError("Add an image URL or upload one before saving.");
      setQuickThemeBusy(false);
      return;
    }

    const nextOverride: BackgroundGradient = {
      from: normalizedFrom,
      to: normalizedTo,
      mode: quickThemeModeDraft,
      imageUrl: quickThemeModeDraft === "image" ? normalizedImageUrl : undefined,
    };
    const nextThemePayload: Record<string, unknown> = {
      from: normalizedFrom,
      to: normalizedTo,
      mode: quickThemeModeDraft,
      imageUrl: quickThemeModeDraft === "image" ? normalizedImageUrl : "",
    };

    try {
      if (quickThemeTarget.kind === "dm") {
        const conversationId = Number.parseInt(quickThemeTarget.key, 10);
        if (!Number.isFinite(conversationId) || conversationId <= 0) {
          throw new Error("Invalid DM conversation.");
        }
        const updatedConversation = await setDmConversationTheme(accessToken, conversationId, nextThemePayload);
        const sharedBackground = normalizeBackgroundGradient(updatedConversation.dm_theme) || nextOverride;
        setDms((prev) =>
          prev.map((dm) =>
            dm.conversationId === conversationId
              ? {
                  ...dm,
                  sharedBackground,
                }
              : dm,
          ),
        );
        setForcedDefaultDmConversationIds((prev) => {
          if (!prev[conversationId]) return prev;
          const next = { ...prev };
          delete next[conversationId];
          return next;
        });
      } else {
        const channelId = Number.parseInt(quickThemeTarget.key, 10);
        if (!Number.isFinite(channelId) || channelId <= 0) {
          throw new Error("Invalid Glytch channel.");
        }
        const updatedChannel = await setGlytchChannelTheme(accessToken, channelId, nextThemePayload);
        setChannels((prev) =>
          prev.map((channel) =>
            channel.id === channelId
              ? { ...channel, channel_theme: updatedChannel.channel_theme ?? (nextOverride as Record<string, unknown>) }
              : channel,
          ),
        );
        setForcedDefaultGlytchChannelIds((prev) => {
          if (!prev[channelId]) return prev;
          const next = { ...prev };
          delete next[channelId];
          return next;
        });
      }
      setShowQuickThemeEditor(false);
    } catch (err) {
      setQuickThemeError(err instanceof Error ? err.message : "Could not save theme override.");
    } finally {
      setQuickThemeBusy(false);
    }
  };

  const handleClearQuickThemeOverride = async () => {
    if (!quickThemeTarget) return;
    if (quickThemeTarget.kind === "glytch" && !canManageChannelsInActiveGlytch) {
      setQuickThemeError("You do not have permission to change this channel background.");
      return;
    }
    setQuickThemeBusy(true);
    setQuickThemeError("");

    try {
      if (quickThemeTarget.kind === "dm") {
        const conversationId = Number.parseInt(quickThemeTarget.key, 10);
        if (!Number.isFinite(conversationId) || conversationId <= 0) {
          throw new Error("Invalid DM conversation.");
        }
        const defaultTheme = DEFAULT_DM_CHAT_BACKGROUND;
        const defaultThemePayload: Record<string, unknown> = {
          ...defaultTheme,
          imageUrl: "",
        };
        setDms((prev) =>
          prev.map((dm) =>
            dm.conversationId === conversationId
              ? {
                  ...dm,
                  sharedBackground: defaultTheme,
                }
              : dm,
          ),
        );
        setForcedDefaultDmConversationIds((prev) => ({ ...prev, [conversationId]: true }));
        setProfileForm((prev) => {
          const nextByConversation = { ...prev.dmBackgroundByConversation };
          delete nextByConversation[quickThemeTarget.key];
          return {
            ...prev,
            dmBackgroundByConversation: nextByConversation,
          };
        });
        await setDmConversationTheme(accessToken, conversationId, defaultThemePayload);
      } else {
        const channelId = Number.parseInt(quickThemeTarget.key, 10);
        if (!Number.isFinite(channelId) || channelId <= 0) {
          throw new Error("Invalid Glytch channel.");
        }
        const defaultTheme = DEFAULT_GLYTCH_CHAT_BACKGROUND;
        const defaultThemePayload: Record<string, unknown> = {
          ...defaultTheme,
          imageUrl: "",
        };
        setChannels((prev) =>
          prev.map((channel) =>
            channel.id === channelId ? { ...channel, channel_theme: defaultThemePayload } : channel,
          ),
        );
        setForcedDefaultGlytchChannelIds((prev) => ({ ...prev, [channelId]: true }));
        await setGlytchChannelTheme(accessToken, channelId, defaultThemePayload);
      }
      setQuickThemeModeDraft("gradient");
      setQuickThemeImageDraft("");
      setShowQuickThemeEditor(false);
    } catch (err) {
      setQuickThemeError(err instanceof Error ? err.message : "Could not clear theme override.");
    } finally {
      setQuickThemeBusy(false);
    }
  };

  const handleProfileImageUpload =
    (kind: "avatar" | "banner") => async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (kind === "avatar") {
        setAvatarUploadBusy(true);
      } else {
        setBannerUploadBusy(true);
      }
      setProfileSaveError("");

      try {
        const uploadedUrl = await uploadProfileAsset(accessToken, currentUserId, file, kind);
        if (kind === "avatar") {
          setProfileForm((prev) => ({ ...prev, avatarUrl: uploadedUrl }));
        } else {
          setProfileForm((prev) => ({ ...prev, bannerUrl: uploadedUrl }));
        }
      } catch (err) {
        setProfileSaveError(err instanceof Error ? err.message : "Could not upload image.");
      } finally {
        if (kind === "avatar") {
          setAvatarUploadBusy(false);
        } else {
          setBannerUploadBusy(false);
        }
        e.target.value = "";
      }
    };

  const handleGlytchIconUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!activeGlytch) {
      setGlytchIconError("Select a Glytch first.");
      e.target.value = "";
      return;
    }

    if (!canEditGlytchProfileInActiveGlytch) {
      setGlytchIconError("You do not have permission to update the Glytch icon.");
      e.target.value = "";
      return;
    }

    setGlytchIconBusy(true);
    setGlytchIconError("");
    try {
      const uploadedUrl = await uploadGlytchIcon(accessToken, currentUserId, activeGlytch.id, file);
      const updated = await setGlytchIcon(accessToken, activeGlytch.id, uploadedUrl);
      setGlytches((prev) =>
        prev.map((glytch) => (glytch.id === activeGlytch.id ? { ...glytch, icon_url: updated.icon_url } : glytch)),
      );
    } catch (err) {
      setGlytchIconError(err instanceof Error ? err.message : "Could not upload Glytch icon.");
    } finally {
      setGlytchIconBusy(false);
      e.target.value = "";
    }
  };

  const handleSaveGlytchProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeGlytch) {
      setGlytchProfileError("Select a Glytch first.");
      return;
    }
    if (!canEditGlytchProfileInActiveGlytch) {
      setGlytchProfileError("You do not have permission to update Glytch profile settings.");
      return;
    }

    const name = glytchProfileNameDraft.trim();
    if (!name) {
      setGlytchProfileError("Glytch name is required.");
      return;
    }

    setGlytchProfileBusy(true);
    setGlytchProfileError("");
    try {
      const updated = await setGlytchProfile(accessToken, activeGlytch.id, name, glytchProfileBioDraft.trim() || null);
      setGlytches((prev) => prev.map((glytch) => (glytch.id === activeGlytch.id ? { ...glytch, ...updated } : glytch)));
      setGlytchProfileNameDraft(updated.name || "");
      setGlytchProfileBioDraft(updated.bio || "");
    } catch (err) {
      setGlytchProfileError(err instanceof Error ? err.message : "Could not save Glytch profile.");
    } finally {
      setGlytchProfileBusy(false);
    }
  };

  const handleDeleteGlytch = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeGlytch) {
      setGlytchDeleteError("Select a Glytch first.");
      return;
    }
    if (activeGlytch.owner_id !== currentUserId) {
      setGlytchDeleteError("Only the Glytch owner can delete this Glytch.");
      return;
    }

    const confirmation = glytchDeleteConfirmName.trim();
    if (confirmation !== activeGlytch.name) {
      setGlytchDeleteError(`Type "${activeGlytch.name}" exactly to confirm deletion.`);
      return;
    }

    setGlytchDeleteBusy(true);
    setGlytchDeleteError("");
    try {
      await deleteGlytch(accessToken, activeGlytch.id, confirmation);
      setGlytchError("");
      setGlytchProfileError("");
      setGlytchIconError("");
      setGlytchDeleteConfirmName("");
      setShowChannelCreate(false);
      await loadGlytchSidebarData();
      setViewMode("glytch");
      setGlytchSettingsTab("profile");
    } catch (err) {
      setGlytchDeleteError(err instanceof Error ? err.message : "Could not delete Glytch.");
    } finally {
      setGlytchDeleteBusy(false);
    }
  };

  const handleToggleRolePermission = async (role: GlytchRole, key: GlytchRolePermissionKey) => {
    if (!activeGlytchId) {
      setRoleError("Select a Glytch first.");
      return;
    }
    if (!canManageRolesInActiveGlytch) {
      setRoleError("You do not have permission to edit role permissions.");
      return;
    }
    if (role.is_system && role.name === "Owner") {
      setRoleError("Owner role permissions are fixed.");
      return;
    }

    const busyKey = `${role.id}:${key}`;
    setRolePermissionBusyKey(busyKey);
    setRoleError("");

    try {
      const nextValue = !rolePermissionValue(role, key);
      const nextPermissions: Record<string, boolean> = {
        ...(role.permissions || {}),
        [key]: nextValue,
      };

      if (key === "ban_members") {
        nextPermissions.manage_members = nextValue;
      }
      if (key === "add_roles") {
        nextPermissions.manage_roles = nextValue;
      }
      if (key === "mute_deafen_members" || key === "kick_voice_members") {
        const muteDeafenEnabled =
          key === "mute_deafen_members"
            ? nextValue
            : readRolePermission(nextPermissions, "mute_deafen_members", ["moderate_voice"]);
        const kickEnabled =
          key === "kick_voice_members"
            ? nextValue
            : readRolePermission(nextPermissions, "kick_voice_members", ["moderate_voice"]);
        nextPermissions.moderate_voice = muteDeafenEnabled || kickEnabled;
      }

      await updateGlytchRolePermissions(accessToken, role.id, nextPermissions);
      await loadGlytchRoleData(activeGlytchId);
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : "Could not update role permissions.");
    } finally {
      setRolePermissionBusyKey((prev) => (prev === busyKey ? null : prev));
    }
  };

  const handleDeleteRole = async () => {
    if (!activeGlytchId) {
      setRoleError("Select a Glytch first.");
      return;
    }
    if (!canManageRolesInActiveGlytch) {
      setRoleError("You do not have permission to delete roles.");
      return;
    }
    if (!selectedPermissionRole) {
      setRoleError("Select a role to delete.");
      return;
    }
    if (selectedPermissionRole.is_system) {
      setRoleError("System roles cannot be deleted.");
      return;
    }

    const busyRoleId = selectedPermissionRole.id;
    setRoleDeleteBusyId(busyRoleId);
    setRoleError("");

    try {
      await deleteGlytchRole(accessToken, busyRoleId);
      await loadGlytchRoleData(activeGlytchId);
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : "Could not delete role.");
    } finally {
      setRoleDeleteBusyId((prev) => (prev === busyRoleId ? null : prev));
    }
  };

  const saveRoleHierarchy = async (nextHierarchy: GlytchRole[]) => {
    if (!activeGlytchId) {
      setRoleError("Select a Glytch first.");
      return;
    }
    if (!canManageRolesInActiveGlytch) {
      setRoleError("You do not have permission to reorder roles.");
      return;
    }

    const ownerRole = nextHierarchy.find((role) => role.is_system && role.name === "Owner") || null;
    const movableRoles = nextHierarchy.filter((role) => !(role.is_system && role.name === "Owner"));
    const normalized = ownerRole ? [ownerRole, ...movableRoles] : movableRoles;
    const basePriority = normalized.length * 10;
    const updates = normalized
      .map((role, index) => ({
        roleId: role.id,
        nextPriority: basePriority - index * 10,
        currentPriority: role.priority,
      }))
      .filter((entry) => entry.currentPriority !== entry.nextPriority);

    if (updates.length === 0) return;

    setRoleHierarchyBusy(true);
    setRoleError("");

    try {
      await Promise.all(
        updates.map((entry) => updateGlytchRolePriority(accessToken, entry.roleId, entry.nextPriority)),
      );
      await loadGlytchRoleData(activeGlytchId);
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : "Could not update role hierarchy.");
    } finally {
      setRoleHierarchyBusy(false);
      setDraggingRoleId(null);
      setRoleHierarchyDropTargetId(null);
    }
  };

  const handleRoleHierarchyDrop = async (targetRoleId: number) => {
    if (draggingRoleId === null || roleHierarchyBusy) return;
    if (draggingRoleId === targetRoleId) return;

    const draggedIndex = hierarchyRoles.findIndex((role) => role.id === draggingRoleId);
    const targetIndex = hierarchyRoles.findIndex((role) => role.id === targetRoleId);
    if (draggedIndex < 0 || targetIndex < 0) return;

    const draggedRole = hierarchyRoles[draggedIndex];
    const targetRole = hierarchyRoles[targetIndex];
    if ((draggedRole.is_system && draggedRole.name === "Owner") || (targetRole.is_system && targetRole.name === "Owner")) {
      return;
    }

    const nextHierarchy = [...hierarchyRoles];
    const [movedRole] = nextHierarchy.splice(draggedIndex, 1);
    nextHierarchy.splice(targetIndex, 0, movedRole);

    await saveRoleHierarchy(nextHierarchy);
  };

  const handleSaveChannelSettings = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeGlytchId) {
      setGlytchError("Select a Glytch first.");
      return;
    }
    if (!canManageChannelsInActiveGlytch) {
      setGlytchError("Only owner, admins, and allowed roles can manage channel settings.");
      return;
    }
    if (!selectedChannelSettingsChannelId) {
      setGlytchError("Select a channel first.");
      return;
    }

    const selectedChannel = channels.find((channel) => channel.id === selectedChannelSettingsChannelId);
    if (!selectedChannel) {
      setGlytchError("Select a valid channel.");
      return;
    }

    const hasVoiceLimitDraft = channelSettingsVoiceUserLimit.trim().length > 0;
    const parsedVoiceLimit = Number.parseInt(channelSettingsVoiceUserLimit.trim(), 10);
    const voiceLimit =
      selectedChannel.kind === "voice" && hasVoiceLimitDraft && Number.isFinite(parsedVoiceLimit) ? parsedVoiceLimit : null;

    if (selectedChannel.kind === "voice" && hasVoiceLimitDraft && (!Number.isFinite(parsedVoiceLimit) || parsedVoiceLimit < 1 || parsedVoiceLimit > 99)) {
      setGlytchError("Voice user limit must be between 1 and 99.");
      return;
    }

    try {
      await setGlytchChannelSettings(accessToken, selectedChannel.id, {
        text_post_mode: selectedChannel.kind === "text" ? channelSettingsTextPostMode : "all",
        voice_user_limit: selectedChannel.kind === "voice" ? voiceLimit : null,
      });
      setGlytchError("");
      const channelRows = await listGlytchChannels(accessToken, activeGlytchId);
      setChannels(channelRows);
    } catch (err) {
      setGlytchError(err instanceof Error ? err.message : "Could not save channel settings.");
    }
  };

  const handleModerateVoiceParticipant = async (
    participant: UiVoiceParticipant,
    action: "kick" | "toggleMute" | "toggleDeafen",
  ) => {
    if (!voiceRoomKey) return;
    if (viewMode !== "glytch") return;
    if (action === "kick" && !canModerateVoiceKickInActiveGlytch) return;
    if ((action === "toggleMute" || action === "toggleDeafen") && !canModerateVoiceMuteDeafenInActiveGlytch) return;
    if (participant.userId === currentUserId) return;
    if (action === "toggleMute" && participant.moderatorForcedDeafened) {
      setVoiceError("Disable force deafen before changing force mute.");
      return;
    }

    const busyKey = `${action}:${participant.userId}`;
    setVoiceModerationBusyKey(busyKey);
    setVoiceError("");

    try {
      if (action === "kick") {
        await kickVoiceParticipant(accessToken, voiceRoomKey, participant.userId);
      } else if (action === "toggleMute") {
        const nextForceMuted = !participant.moderatorForcedMuted;
        await forceVoiceParticipantState(
          accessToken,
          voiceRoomKey,
          participant.userId,
          nextForceMuted,
          participant.moderatorForcedDeafened,
        );
      } else {
        const nextForceDeafened = !participant.moderatorForcedDeafened;
        await forceVoiceParticipantState(
          accessToken,
          voiceRoomKey,
          participant.userId,
          participant.moderatorForcedMuted || nextForceDeafened,
          nextForceDeafened,
        );
      }
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : "Could not moderate voice participant.");
    } finally {
      setVoiceModerationBusyKey((prev) => (prev === busyKey ? null : prev));
    }
  };

  const handleSendFriendRequestToMember = async (targetUserId: string) => {
    if (targetUserId === currentUserId) return;
    if (friendUserIds.has(targetUserId)) return;
    if (incomingRequestUserIds.has(targetUserId) || outgoingRequestUserIds.has(targetUserId)) return;

    try {
      setMemberFriendActionUserId(targetUserId);
      setMemberFriendActionType("add");
      setMemberFriendActionError("");
      await sendFriendRequest(accessToken, currentUserId, targetUserId);
      await loadDmSidebarData();
    } catch (err) {
      setMemberFriendActionError(err instanceof Error ? err.message : "Could not send friend request.");
    } finally {
      setMemberFriendActionUserId(null);
      setMemberFriendActionType(null);
    }
  };

  const handleUnfriendUser = async (targetUserId: string) => {
    if (targetUserId === currentUserId) return;
    if (!friendUserIds.has(targetUserId)) return;

    try {
      setMemberFriendActionUserId(targetUserId);
      setMemberFriendActionType("remove");
      setMemberFriendActionError("");
      setDmError("");
      await unfriendUser(accessToken, targetUserId);
      await loadDmSidebarData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not unfriend user.";
      setMemberFriendActionError(message);
      setDmError(message);
    } finally {
      setMemberFriendActionUserId(null);
      setMemberFriendActionType(null);
    }
  };

  const handleComposerAttachmentChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setChatError("Only image and GIF files are supported.");
      return;
    }
    if (file.size > MAX_MESSAGE_ATTACHMENT_BYTES) {
      setChatError("Attachments must be 8MB or smaller.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const attachmentType: MessageAttachmentType = file.type === "image/gif" ? "gif" : "image";
    setComposerAttachment({ file, previewUrl, attachmentType });
    setSelectedGif(null);
    setShowGifPicker(false);
    setChatError("");
  };

  const removeComposerAttachment = () => {
    setComposerAttachment(null);
  };

  const handleSelectGif = (gif: GifResult) => {
    setSelectedGif({
      id: gif.id,
      url: gif.url,
      previewUrl: gif.previewUrl || gif.url,
      description: gif.description,
    });
    setComposerAttachment(null);
    setShowGifPicker(false);
    setChatError("");
  };

  const removeSelectedGif = () => {
    setSelectedGif(null);
  };

  const handleInsertEmoji = (emoji: string) => {
    const input = messageInputRef.current;
    if (input) {
      input.value = `${input.value}${emoji}`;
      const nextHasDraftText = input.value.trim().length > 0;
      setHasDraftText((prev) => (prev === nextHasDraftText ? prev : nextHasDraftText));
    }
    setShowEmojiPicker(false);
    input?.focus();
  };

  const handleToggleMessageReaction = useCallback(async (messageId: number, emoji: string) => {
    const normalizedEmoji = emoji.trim();
    if (!normalizedEmoji) return;

    const targetMessage = messages.find((msg) => msg.id === messageId);
    if (!targetMessage) return;
    const existing = targetMessage.reactions.find((reaction) => reaction.emoji === normalizedEmoji);
    const shouldAdd = !(existing && existing.reactedByMe);

    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        return {
          ...msg,
          reactions: applyReactionToggle(msg.reactions, normalizedEmoji, shouldAdd),
        };
      }),
    );

    const busyKey = `${messageId}:${normalizedEmoji}`;
    setReactionBusyKey(busyKey);
    setChatError("");

    try {
      if (viewMode === "dm") {
        if (shouldAdd) {
          await addDmMessageReaction(accessToken, messageId, currentUserId, normalizedEmoji);
        } else {
          await deleteDmMessageReaction(accessToken, messageId, currentUserId, normalizedEmoji);
        }
      } else if (viewMode === "glytch") {
        if (shouldAdd) {
          await addGlytchMessageReaction(accessToken, messageId, currentUserId, normalizedEmoji);
        } else {
          await deleteGlytchMessageReaction(accessToken, messageId, currentUserId, normalizedEmoji);
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                reactions: applyReactionToggle(msg.reactions, normalizedEmoji, !shouldAdd),
              }
            : msg,
        ),
      );
      setChatError(err instanceof Error ? err.message : "Could not update reaction.");
    } finally {
      setReactionBusyKey((prev) => (prev === busyKey ? null : prev));
      setReactionPickerMessageId((prev) => (prev === messageId ? null : prev));
    }
  }, [accessToken, currentUserId, messages, viewMode]);

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    const text = (messageInputRef.current?.value || "").trim();
    const hasAttachment = Boolean(composerAttachment);
    const hasGif = Boolean(selectedGif);
    if (!text && !hasAttachment && !hasGif) return;
    if (viewMode === "glytch" && activeChannel?.kind === "text" && activeChannel.text_post_mode === "text_only" && (hasAttachment || hasGif)) {
      setChatError("This channel is text-only. Remove images/GIFs before sending.");
      return;
    }
    if (viewMode === "glytch" && activeChannel?.kind === "text" && activeChannel.text_post_mode === "images_only" && !hasAttachment && !hasGif) {
      setChatError("This channel is images-only. Attach an image or GIF to send.");
      return;
    }
    if (viewMode === "dm" && !activeConversationId) return;
    if (viewMode === "glytch" && (!activeChannelId || activeChannel?.kind === "voice")) return;

    setChatError("");

    let uploadedAttachmentUrl: string | null = selectedGif?.url || null;
    let uploadedAttachmentType: MessageAttachmentType | null = selectedGif ? "gif" : null;

    if (composerAttachment) {
      try {
        setMessageMediaBusy(true);
        const uploaded = await uploadMessageAsset(
          accessToken,
          currentUserId,
          composerAttachment.file,
          viewMode === "dm" ? "dm" : "glytch",
          viewMode === "dm" ? activeConversationId! : activeChannelId!,
        );
        uploadedAttachmentUrl = uploaded.url;
        uploadedAttachmentType = uploaded.attachmentType;
      } catch (err) {
        setChatError(err instanceof Error ? err.message : "Could not upload attachment.");
        return;
      } finally {
        setMessageMediaBusy(false);
      }
    }

    if (viewMode === "dm") {
      if (!activeConversationId) return;
      try {
        const shouldAutoScrollAfterSend = isMessageListNearBottom();
        const inserted = await createDmMessage(
          accessToken,
          currentUserId,
          activeConversationId,
          text,
          uploadedAttachmentUrl,
          uploadedAttachmentType,
        );
        const appended = await Promise.all(
          inserted.map(async (row) => ({
            id: row.id,
            sender: "me" as const,
            text: row.content,
            attachmentUrl: await resolveMessageAttachmentUrl(accessToken, row.attachment_url || uploadedAttachmentUrl || null),
            attachmentType: row.attachment_type || uploadedAttachmentType || null,
            timestamp: new Date(row.created_at),
            senderName: currentUserName,
            senderAvatarUrl: currentProfile?.avatar_url || "",
            readAt: row.read_by_receiver_at ? new Date(row.read_by_receiver_at) : null,
            reactions: [],
          })),
        );
        setMessages((prev) => [...prev, ...appended]);
        if (appended.length > 0 && dmLastLoadedConversationIdRef.current === activeConversationId) {
          const latestId = appended[appended.length - 1]?.id ?? 0;
          dmLastLoadedMessageIdRef.current = Math.max(dmLastLoadedMessageIdRef.current, latestId);
        }
        if (shouldAutoScrollAfterSend) {
          scrollMessageListToBottom("smooth");
        }
        if (messageInputRef.current) {
          messageInputRef.current.value = "";
        }
        setHasDraftText(false);
        setComposerAttachment(null);
        setSelectedGif(null);
        setShowEmojiPicker(false);
        setShowGifPicker(false);
        setChatError("");
      } catch (err) {
        setChatError(err instanceof Error ? err.message : "Could not send message.");
      }
      return;
    }

    if (viewMode === "glytch") {
      try {
        const inserted = await createGlytchMessage(
          accessToken,
          currentUserId,
          activeChannelId!,
          text,
          uploadedAttachmentUrl,
          uploadedAttachmentType,
        );
        const appended = await Promise.all(
          inserted.map(async (row) => ({
            id: row.id,
            sender: "me" as const,
            text: row.content,
            attachmentUrl: await resolveMessageAttachmentUrl(accessToken, row.attachment_url || uploadedAttachmentUrl || null),
            attachmentType: row.attachment_type || uploadedAttachmentType || null,
            timestamp: new Date(row.created_at),
            senderName: currentUserName,
            senderAvatarUrl: currentProfile?.avatar_url || "",
            readAt: null,
            reactions: [],
          })),
        );
        setMessages((prev) => [...prev, ...appended]);
        if (messageInputRef.current) {
          messageInputRef.current.value = "";
        }
        setHasDraftText(false);
        setComposerAttachment(null);
        setSelectedGif(null);
        setShowEmojiPicker(false);
        setShowGifPicker(false);
        setChatError("");
      } catch (err) {
        setChatError(err instanceof Error ? err.message : "Could not send message.");
      }
    }
  };

  const syncRemoteScreenShareUsers = useCallback(() => {
    setRemoteScreenShareUserIds(Array.from(remoteScreenStreamsRef.current.keys()));
  }, []);

  const removeRemoteScreenShare = useCallback(
    (userId: string) => {
      const removed = remoteScreenStreamsRef.current.delete(userId);
      if (!removed) return;
      syncRemoteScreenShareUsers();
    },
    [syncRemoteScreenShareUsers],
  );

  const renegotiatePeerConnection = useCallback(
    async (targetUserId: string, pc: RTCPeerConnection) => {
      if (!voiceRoomKey) return;
      if (pc.connectionState === "closed") return;

      if (activeNegotiationPeerIdsRef.current.has(targetUserId)) {
        queuedNegotiationPeerIdsRef.current.add(targetUserId);
        window.setTimeout(() => {
          const nextPc = peerConnectionsRef.current.get(targetUserId);
          if (!nextPc) return;
          void renegotiatePeerConnection(targetUserId, nextPc);
        }, 250);
        return;
      }

      if (pc.signalingState !== "stable") {
        queuedNegotiationPeerIdsRef.current.add(targetUserId);
        window.setTimeout(() => {
          const nextPc = peerConnectionsRef.current.get(targetUserId);
          if (!nextPc) return;
          void renegotiatePeerConnection(targetUserId, nextPc);
        }, 250);
        return;
      }

      activeNegotiationPeerIdsRef.current.add(targetUserId);
      try {
        queuedNegotiationPeerIdsRef.current.delete(targetUserId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendVoiceSignal(accessToken, voiceRoomKey, currentUserId, targetUserId, "offer", {
          sdp: offer,
        });
      } catch {
        // Ignore renegotiation races while peers reconnect.
      } finally {
        activeNegotiationPeerIdsRef.current.delete(targetUserId);
        if (queuedNegotiationPeerIdsRef.current.has(targetUserId)) {
          const nextPc = peerConnectionsRef.current.get(targetUserId);
          if (nextPc && nextPc.connectionState !== "closed") {
            window.setTimeout(() => {
              const stablePc = peerConnectionsRef.current.get(targetUserId);
              if (!stablePc) return;
              void renegotiatePeerConnection(targetUserId, stablePc);
            }, 250);
          } else {
            queuedNegotiationPeerIdsRef.current.delete(targetUserId);
          }
        }
      }
    },
    [accessToken, currentUserId, voiceRoomKey],
  );

  const attachLocalShareTracksToPeers = useCallback(
    (stream: MediaStream) => {
      for (const [userId, pc] of peerConnectionsRef.current.entries()) {
        const senders: RTCRtpSender[] = [];
        stream.getTracks().forEach((streamTrack) => {
          senders.push(pc.addTrack(streamTrack, stream));
        });
        if (senders.length > 0) {
          screenTrackSendersRef.current.set(userId, senders);
        }
        void renegotiatePeerConnection(userId, pc);
      }
    },
    [renegotiatePeerConnection],
  );

  const stopLocalScreenShare = useCallback(
    async (renegotiatePeers: boolean) => {
      const currentTrack = localScreenTrackRef.current;
      const currentStream = localScreenStreamRef.current;

      localScreenTrackRef.current = null;
      localScreenStreamRef.current = null;
      setLocalScreenStream(null);
      setLocalVideoShareKind(null);
      cameraFallbackInFlightRef.current = false;

      if (currentTrack) {
        currentTrack.onended = null;
      }
      if (currentStream) {
        currentStream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            // Ignore track-stop errors from stale streams.
          }
        });
      }

      const peersToRenegotiate: Array<[string, RTCPeerConnection]> = [];
      for (const [userId, senders] of screenTrackSendersRef.current.entries()) {
        const pc = peerConnectionsRef.current.get(userId);
        if (!pc) continue;
        senders.forEach((sender) => {
          try {
            pc.removeTrack(sender);
          } catch {
            // Ignore remove failures for already-closed senders.
          }
        });
        if (renegotiatePeers) {
          peersToRenegotiate.push([userId, pc]);
        }
      }
      screenTrackSendersRef.current.clear();

      if (renegotiatePeers) {
        for (const [userId, pc] of peersToRenegotiate) {
          await renegotiatePeerConnection(userId, pc);
        }
      }
    },
    [renegotiatePeerConnection],
  );

  const startCameraFallbackShare = useCallback(async (): Promise<boolean> => {
    if (cameraFallbackInFlightRef.current) return false;
    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return false;

    cameraFallbackInFlightRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          frameRate: { ideal: 30, max: 60 },
        },
        audio: false,
      });

      const [track] = stream.getVideoTracks();
      if (!track) {
        stream.getTracks().forEach((streamTrack) => streamTrack.stop());
        return false;
      }

      try {
        track.contentHint = "motion";
      } catch {
        // Ignore unsupported content hints.
      }

      localScreenTrackRef.current = track;
      localScreenStreamRef.current = stream;
      setLocalScreenStream(stream);
      setLocalVideoShareKind("camera");

      track.onended = () => {
        void stopLocalScreenShare(true).catch(() => undefined);
      };

      attachLocalShareTracksToPeers(stream);
      return true;
    } catch {
      return false;
    } finally {
      cameraFallbackInFlightRef.current = false;
    }
  }, [attachLocalShareTracksToPeers, stopLocalScreenShare]);

  const handleStartScreenShare = async () => {
    if (!voiceRoomKey) {
      setVoiceError("Join voice before starting screen share.");
      return;
    }
    if (localScreenTrackRef.current) return;
    if (typeof navigator === "undefined") {
      setVoiceError("Screen sharing unavailable: browser runtime is missing.");
      return;
    }
    if (!navigator.mediaDevices) {
      if (window.electronAPI?.isElectron) {
        setVoiceError("Screen sharing unavailable: mediaDevices API missing. Restart Electron and try again.");
      } else {
        setVoiceError("Screen sharing unavailable: this browser does not expose media devices on this page.");
      }
      return;
    }

    const canUseDisplayMedia = typeof navigator.mediaDevices.getDisplayMedia === "function";
    const canUseElectronFallback = Boolean(
      window.electronAPI?.isElectron &&
        window.electronAPI.getDesktopSourceId &&
        typeof navigator.mediaDevices.getUserMedia === "function",
    );
    const preferredDesktopSourceId = selectedDesktopSourceId === "auto" ? null : selectedDesktopSourceId;
    const shouldUseElectronSourceSelection = Boolean(preferredDesktopSourceId && canUseElectronFallback);
    if (!canUseDisplayMedia && !canUseElectronFallback) {
      if (window.electronAPI?.isElectron) {
        setVoiceError("Screen sharing unavailable: missing capture APIs in Electron runtime.");
      } else {
        setVoiceError("Screen sharing is not supported in this browser.");
      }
      return;
    }

    setScreenShareBusy(true);
    setVoiceError("");
    try {
      let stream: MediaStream;
      if (shouldUseElectronSourceSelection) {
        stream = await requestElectronScreenStream(preferredDesktopSourceId, screenShareIncludeSystemAudio);
      } else if (canUseDisplayMedia) {
        try {
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              frameRate: { ideal: 30, max: 60 },
            },
            audio: screenShareIncludeSystemAudio,
          });
        } catch (displayError) {
          const isSupportIssue =
            displayError instanceof DOMException &&
            (displayError.name === "NotSupportedError" || displayError.name === "NotFoundError");
          if (!isSupportIssue || !canUseElectronFallback) {
            throw displayError;
          }
          stream = await requestElectronScreenStream(preferredDesktopSourceId, screenShareIncludeSystemAudio);
        }
      } else {
        stream = await requestElectronScreenStream(preferredDesktopSourceId, screenShareIncludeSystemAudio);
      }
      const [track] = stream.getVideoTracks();
      if (!track) {
        stream.getTracks().forEach((streamTrack) => streamTrack.stop());
        throw new Error("Could not capture a screen video track.");
      }
      try {
        track.contentHint = "detail";
      } catch {
        // Ignore unsupported content hints.
      }

      localScreenTrackRef.current = track;
      localScreenStreamRef.current = stream;
      setLocalScreenStream(stream);
      setLocalVideoShareKind("screen");

      track.onended = () => {
        void (async () => {
          await stopLocalScreenShare(true).catch(() => undefined);
          const switchedToCamera = await startCameraFallbackShare();
          if (switchedToCamera) {
            setVoiceError("Screen share ended. Switched to camera.");
          } else {
            setVoiceError("Screen share ended.");
          }
        })();
      };

      attachLocalShareTracksToPeers(stream);

      if (screenShareIncludeSystemAudio && stream.getAudioTracks().length === 0) {
        setVoiceError("System audio is unavailable for this source. Sharing video only.");
      }
    } catch (err) {
      await stopLocalScreenShare(false).catch(() => undefined);
      setVoiceError(err instanceof Error ? err.message : "Could not start screen sharing.");
    } finally {
      setScreenShareBusy(false);
    }
  };

  const handleStopScreenShare = async () => {
    if (!localScreenTrackRef.current && !localScreenStreamRef.current) return;
    setScreenShareBusy(true);
    setVoiceError("");
    try {
      await stopLocalScreenShare(true);
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : "Could not stop screen sharing.");
    } finally {
      setScreenShareBusy(false);
    }
  };

  const startSpeakingMeter = useCallback((userId: string, stream: MediaStream) => {
    if (speakingAnalyserCleanupRef.current.has(userId)) {
      const cleanup = speakingAnalyserCleanupRef.current.get(userId);
      cleanup?.();
      speakingAnalyserCleanupRef.current.delete(userId);
    }

    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.75;
    source.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);
    let rafId = 0;
    let active = true;

    const tick = () => {
      if (!active) return;
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i += 1) sum += data[i];
      const avg = sum / data.length;
      const isSpeaking = avg > 22;

      setSpeakingUserIds((prev) => {
        const has = prev.includes(userId);
        if (isSpeaking && !has) return [...prev, userId];
        if (!isSpeaking && has) return prev.filter((id) => id !== userId);
        return prev;
      });

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    const cleanup = () => {
      active = false;
      window.cancelAnimationFrame(rafId);
      source.disconnect();
      analyser.disconnect();
      void audioCtx.close();
      setSpeakingUserIds((prev) => prev.filter((id) => id !== userId));
    };

    speakingAnalyserCleanupRef.current.set(userId, cleanup);
  }, []);

  const closePeerConnection = useCallback((userId: string) => {
    const pc = peerConnectionsRef.current.get(userId);
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.close();
      peerConnectionsRef.current.delete(userId);
    }
    screenTrackSendersRef.current.delete(userId);
    activeNegotiationPeerIdsRef.current.delete(userId);
    queuedNegotiationPeerIdsRef.current.delete(userId);

    const audio = remoteStreamsRef.current.get(userId);
    if (audio) {
      remoteStreamsRef.current.delete(userId);
    }

    const audioEl = remoteAudioElsRef.current.get(userId);
    if (audioEl) {
      audioEl.pause();
      audioEl.srcObject = null;
      remoteAudioElsRef.current.delete(userId);
    }

    const cleanup = speakingAnalyserCleanupRef.current.get(userId);
    if (cleanup) {
      cleanup();
      speakingAnalyserCleanupRef.current.delete(userId);
    }

    if (remoteScreenStreamsRef.current.delete(userId)) {
      syncRemoteScreenShareUsers();
    }

    pendingCandidatesRef.current.delete(userId);
  }, [syncRemoteScreenShareUsers]);

  const teardownVoice = useCallback(() => {
    Array.from(peerConnectionsRef.current.keys()).forEach(closePeerConnection);
    const selfCleanup = speakingAnalyserCleanupRef.current.get(currentUserId);
    if (selfCleanup) {
      selfCleanup();
      speakingAnalyserCleanupRef.current.delete(currentUserId);
    }
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    if (localScreenTrackRef.current) {
      localScreenTrackRef.current.onended = null;
    }
    localScreenStreamRef.current?.getTracks().forEach((track) => track.stop());
    localScreenTrackRef.current = null;
    localScreenStreamRef.current = null;
    setLocalScreenStream(null);
    setLocalVideoShareKind(null);
    screenTrackSendersRef.current.clear();
    activeNegotiationPeerIdsRef.current.clear();
    queuedNegotiationPeerIdsRef.current.clear();
    cameraFallbackInFlightRef.current = false;
    remoteScreenStreamsRef.current.clear();
    setRemoteScreenShareUserIds([]);
    setScreenShareBusy(false);
    signalSinceIdRef.current = 0;
    setSpeakingUserIds([]);
  }, [closePeerConnection, currentUserId]);

  const stopVoiceSession = useCallback(async (notifyServer: boolean) => {
    const roomToLeave = voiceRoomKey;
    teardownVoice();
    setVoiceParticipants([]);
    setVoiceRoomKey(null);
    setVoiceError("");

    if (notifyServer && roomToLeave) {
      await leaveVoiceRoom(accessToken, roomToLeave, currentUserId).catch(() => undefined);
    }
  }, [accessToken, currentUserId, teardownVoice, voiceRoomKey]);

  const flushPendingCandidates = async (userId: string, pc: RTCPeerConnection) => {
    const queued = pendingCandidatesRef.current.get(userId);
    if (!queued || queued.length === 0 || !pc.remoteDescription) return;

    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // Ignore stale or malformed candidates.
      }
    }
    pendingCandidatesRef.current.delete(userId);
  };

  const getOrCreatePeerConnection = useCallback(async (targetUserId: string, initiateOffer: boolean) => {
    const existing = peerConnectionsRef.current.get(targetUserId);
    if (existing) return existing;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    const localStream = localStreamRef.current;
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }
    const localScreenStream = localScreenStreamRef.current;
    if (localScreenStream) {
      const senders: RTCRtpSender[] = [];
      localScreenStream.getTracks().forEach((streamTrack) => {
        senders.push(pc.addTrack(streamTrack, localScreenStream));
      });
      if (senders.length > 0) {
        screenTrackSendersRef.current.set(targetUserId, senders);
      }
    }

    pc.onicecandidate = (event) => {
      if (!event.candidate || !voiceRoomKey) return;
      void sendVoiceSignal(accessToken, voiceRoomKey, currentUserId, targetUserId, "candidate", {
        candidate: event.candidate.toJSON(),
      });
    };

    pc.ontrack = (event) => {
      if (event.track.kind === "audio") {
        let audioStream = remoteStreamsRef.current.get(targetUserId);
        if (!audioStream) {
          audioStream = new MediaStream();
          remoteStreamsRef.current.set(targetUserId, audioStream);
        }
        const hasTrack = audioStream.getAudioTracks().some((audioTrack) => audioTrack.id === event.track.id);
        if (!hasTrack) {
          audioStream.addTrack(event.track);
        }
        event.track.onended = () => {
          const trackedStream = remoteStreamsRef.current.get(targetUserId);
          if (!trackedStream) return;
          const remainingTracks = trackedStream.getAudioTracks().filter((audioTrack) => audioTrack.readyState !== "ended");
          if (remainingTracks.length === 0) {
            const cleanup = speakingAnalyserCleanupRef.current.get(targetUserId);
            cleanup?.();
            speakingAnalyserCleanupRef.current.delete(targetUserId);
            setSpeakingUserIds((prev) => prev.filter((id) => id !== targetUserId));
          }
        };

        let audio = remoteAudioElsRef.current.get(targetUserId);
        if (!audio) {
          audio = new Audio();
          audio.autoplay = true;
          remoteAudioElsRef.current.set(targetUserId, audio);
        }
        if (audio.srcObject !== audioStream) {
          audio.srcObject = audioStream;
        }
        applyRemoteAudioOutput(targetUserId);
        void audio.play().catch(() => undefined);
        startSpeakingMeter(targetUserId, audioStream);
        return;
      }

      if (event.track.kind === "video") {
        const videoStream = new MediaStream([event.track]);
        remoteScreenStreamsRef.current.set(targetUserId, videoStream);
        syncRemoteScreenShareUsers();
        videoStream.onremovetrack = () => {
          if (videoStream.getVideoTracks().length === 0) {
            removeRemoteScreenShare(targetUserId);
          }
        };
        event.track.onended = () => {
          removeRemoteScreenShare(targetUserId);
        };
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected" || pc.connectionState === "closed") {
        closePeerConnection(targetUserId);
      }
    };

    peerConnectionsRef.current.set(targetUserId, pc);

    if (initiateOffer && voiceRoomKey) {
      await renegotiatePeerConnection(targetUserId, pc);
    }

    return pc;
  }, [
    accessToken,
    applyRemoteAudioOutput,
    closePeerConnection,
    currentUserId,
    removeRemoteScreenShare,
    renegotiatePeerConnection,
    startSpeakingMeter,
    syncRemoteScreenShareUsers,
    voiceRoomKey,
  ]);

  const handleJoinVoice = async () => {
    const room =
      viewMode === "dm"
        ? activeConversationId
          ? `dm:${activeConversationId}`
          : null
        : viewMode === "glytch"
          ? activeChannelId && activeChannel?.kind === "voice"
            ? `glytch:${activeChannelId}`
            : null
          : null;

    if (!room) {
      setVoiceError(
        viewMode === "glytch"
          ? "Select a voice channel first."
          : "Select a DM first.",
      );
      return;
    }

    if (voiceRoomKey === room) return;

    if (viewMode === "glytch" && activeChannel?.kind === "voice" && activeChannel.voice_user_limit) {
      const participantCount = (voiceParticipantsByChannelId[activeChannel.id] || []).length;
      if (participantCount >= activeChannel.voice_user_limit) {
        setVoiceError("This voice channel is full.");
        return;
      }
    }

    if (voiceRoomKey) {
      await stopVoiceSession(true);
    }

    try {
      await ensureSoundContext();
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: buildVoiceAudioConstraints(),
          video: false,
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: 1,
            },
            video: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        }
      }

      const [localTrack] = stream.getAudioTracks();
      if (localTrack?.applyConstraints) {
        await localTrack
          .applyConstraints({
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          })
          .catch(() => undefined);
      }

      localStreamRef.current = stream;
      applyLocalVoiceMute(effectiveVoiceMuted);
      startSpeakingMeter(currentUserId, stream);
      signalSinceIdRef.current = 0;

      await joinVoiceRoom(accessToken, room, currentUserId, effectiveVoiceMuted, voiceDeafened);
      setVoiceRoomKey(room);
      setVoiceError("");
    } catch (err) {
      teardownVoice();
      setVoiceError(err instanceof Error ? err.message : "Could not join voice.");
    }
  };

  const handleLeaveVoice = async () => {
    await stopVoiceSession(true);
  };

  const handleToggleMute = async () => {
    if (!voiceRoomKey) return;
    if (currentUserForceMuted || currentUserForceDeafened) {
      setVoiceError(
        currentUserForceDeafened
          ? "You are force deafened by a moderator."
          : "You are force muted by a moderator.",
      );
      return;
    }
    await ensureSoundContext().catch(() => undefined);
    const previousMuted = voiceMuted;
    const nextMuted = !voiceMuted;
    const nextEffectiveMuted = nextMuted || voiceDeafened;
    setVoiceMuted(nextMuted);
    applyLocalVoiceMute(nextEffectiveMuted);
    try {
      await setVoiceState(accessToken, voiceRoomKey, currentUserId, nextEffectiveMuted, voiceDeafened);
    } catch (err) {
      setVoiceMuted(previousMuted);
      applyLocalVoiceMute(previousMuted || voiceDeafened);
      setVoiceError(err instanceof Error ? err.message : "Could not update mute state.");
    }
  };

  const handleToggleDeafen = async () => {
    if (!voiceRoomKey) return;
    if (currentUserForceDeafened) {
      setVoiceError("You are force deafened by a moderator.");
      return;
    }
    const previousDeafened = voiceDeafened;
    const nextDeafened = !voiceDeafened;
    const nextEffectiveMuted = voiceMuted || nextDeafened;
    setVoiceDeafened(nextDeafened);
    applyLocalVoiceMute(nextEffectiveMuted);
    try {
      await setVoiceState(accessToken, voiceRoomKey, currentUserId, nextEffectiveMuted, nextDeafened);
    } catch (err) {
      setVoiceDeafened(previousDeafened);
      applyLocalVoiceMute(voiceMuted || previousDeafened);
      setVoiceError(err instanceof Error ? err.message : "Could not update deafen state.");
    }
  };

  const muteButtonLabel = currentUserForceDeafened
    ? "Force deafened by moderator"
    : currentUserForceMuted
      ? "Force muted by moderator"
      : voiceDeafened
        ? "Muted while deafened"
        : voiceMuted
          ? "Unmute microphone"
          : "Mute microphone";
  const deafenButtonLabel = currentUserForceDeafened ? "Force deafened by moderator" : voiceDeafened ? "Undeafen" : "Deafen";
  const shareScreenButtonLabel = screenShareBusy
    ? isScreenSharing
      ? "Stopping screen share..."
      : "Starting screen share..."
    : isScreenSharing
      ? "Stop screen share"
      : "Start screen share";

  const canComposeInCurrentView =
    viewMode === "dm"
      ? !!activeConversationId
      : viewMode === "glytch"
        ? !!activeChannelId && activeChannel?.kind !== "voice"
        : false;
  const isCurrentChannelImagesOnly =
    viewMode === "glytch" && activeChannel?.kind === "text" && activeChannel.text_post_mode === "images_only";
  const isCurrentChannelTextOnly =
    viewMode === "glytch" && activeChannel?.kind === "text" && activeChannel.text_post_mode === "text_only";
  const hasMediaToSend = Boolean(composerAttachment) || Boolean(selectedGif);
  const canAttachMediaInCurrentView = canComposeInCurrentView && !isCurrentChannelTextOnly;

  const canSend =
    (hasDraftText || hasMediaToSend) &&
    canComposeInCurrentView &&
    (!isCurrentChannelImagesOnly || hasMediaToSend) &&
    (!isCurrentChannelTextOnly || !hasMediaToSend) &&
    !messageMediaBusy;
  const isCurrentMessageBackgroundForcedDefault = useMemo(() => {
    if (viewMode === "dm" && activeConversationId) {
      return Boolean(forcedDefaultDmConversationIds[activeConversationId]);
    }
    if (viewMode === "glytch" && activeChannel?.kind === "text" && activeChannelId) {
      return Boolean(forcedDefaultGlytchChannelIds[activeChannelId]);
    }
    return false;
  }, [activeChannel?.kind, activeChannelId, activeConversationId, forcedDefaultDmConversationIds, forcedDefaultGlytchChannelIds, viewMode]);
  const messageDisplayStyle = useMemo<CSSProperties | undefined>(() => {
    if (viewMode === "dm") {
      const isForcedDefaultConversation =
        Boolean(activeConversationId) && Boolean(forcedDefaultDmConversationIds[activeConversationId || 0]);
      const sharedOverride = isForcedDefaultConversation ? null : activeDm?.sharedBackground || null;
      const personalOverride =
        isForcedDefaultConversation || !activeConversationId
          ? null
          : profileForm.dmBackgroundByConversation[String(activeConversationId)] || null;
      const background =
        sharedOverride ||
        personalOverride ||
        (isForcedDefaultConversation
          ? DEFAULT_DM_CHAT_BACKGROUND
          : {
              from: profileForm.dmBackgroundFrom,
              to: profileForm.dmBackgroundTo,
            });
      return {
        ...resolveChatBackgroundStyle(background),
        "--chat-bg-from": background.from,
        "--chat-bg-to": background.to,
      } as CSSProperties;
    }
    if (viewMode === "glytch" && activeChannel?.kind === "text") {
      const isForcedDefaultChannel = Boolean(activeChannelId) && Boolean(forcedDefaultGlytchChannelIds[activeChannelId || 0]);
      const background =
        (isForcedDefaultChannel ? null : activeChannelSharedBackground) ||
        (isForcedDefaultChannel
          ? DEFAULT_GLYTCH_CHAT_BACKGROUND
          : {
              from: profileForm.glytchBackgroundFrom,
              to: profileForm.glytchBackgroundTo,
            });
      return {
        ...resolveChatBackgroundStyle(background),
        "--chat-bg-from": background.from,
        "--chat-bg-to": background.to,
      } as CSSProperties;
    }
    return undefined;
  }, [
    activeChannel?.kind,
    activeChannelId,
    activeChannelSharedBackground,
    activeDm?.sharedBackground,
    activeConversationId,
    forcedDefaultDmConversationIds,
    forcedDefaultGlytchChannelIds,
    profileForm.dmBackgroundFrom,
    profileForm.dmBackgroundTo,
    profileForm.dmBackgroundByConversation,
    profileForm.glytchBackgroundFrom,
    profileForm.glytchBackgroundTo,
    viewMode,
  ]);

  const latestSeenOutgoingMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const message = messages[i];
      if (message.sender === "me" && message.readAt) {
        return message.id;
      }
    }
    return null;
  }, [messages]);
  const renderedMessageRows = useMemo(
    () => {
      const visibleMessages =
        messages.length > MAX_RENDERED_MESSAGES ? messages.slice(messages.length - MAX_RENDERED_MESSAGES) : messages;
      return visibleMessages.map((msg) => {
        const invitePayload = viewMode === "dm" ? parseGlytchInviteMessage(msg.text || "") : null;
        return (
          <article key={msg.id} className={`messageRow ${msg.sender === "me" ? "fromMe" : "fromOther"}`}>
            <span className="messageAvatar" aria-hidden="true">
              {msg.senderAvatarUrl ? <img src={msg.senderAvatarUrl} alt="" /> : <span>{initialsFromName(msg.senderName)}</span>}
            </span>
            <div className="messageContent">
              {msg.sender !== "me" && <p className="senderName">{msg.senderName}</p>}
              <div className="messageBody">
                {invitePayload ? (
                  <div className="dmInviteCard">
                    <div className="dmInviteHeader">
                      <span className="dmInviteIcon" aria-hidden="true">
                        {invitePayload.glytchIconUrl ? <img src={invitePayload.glytchIconUrl} alt="" /> : <span>{initialsFromName(invitePayload.glytchName)}</span>}
                      </span>
                      <div className="dmInviteHeaderText">
                        <p className="dmInviteTitle">
                          {msg.sender === "other"
                            ? `${invitePayload.inviterName} invited you to join ${invitePayload.glytchName}.`
                            : `You invited this user to join ${invitePayload.glytchName}.`}
                        </p>
                        <p className="dmInviteMeta">Glytch invite</p>
                      </div>
                    </div>
                    {msg.sender === "other" && (
                      <div className="dmInviteActionRow">
                        <button
                          type="button"
                          className="dmInviteJoinButton"
                          onClick={() => void handleJoinInviteFromDmMessage(msg.id, invitePayload)}
                          disabled={joinInviteBusyMessageId === msg.id}
                        >
                          {joinInviteBusyMessageId === msg.id ? "Joining..." : "Join"}
                        </button>
                        <button
                          type="button"
                          className="dmInviteRejectButton"
                          onClick={() => void handleRejectInviteFromDmMessage(msg.id)}
                          disabled={joinInviteBusyMessageId === msg.id}
                        >
                          {joinInviteBusyMessageId === msg.id ? "Working..." : "Reject"}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  msg.text && <div className="msg">{msg.text}</div>
                )}
                {msg.attachmentUrl && (
                  <a href={msg.attachmentUrl} target="_blank" rel="noreferrer" className="messageMediaLink">
                    <img
                      src={msg.attachmentUrl}
                      alt={`${msg.senderName} attachment`}
                      className={msg.attachmentType === "gif" ? "messageMedia gif" : "messageMedia"}
                      loading="lazy"
                    />
                  </a>
                )}
              </div>
              <div className="messageReactions">
                {msg.reactions.map((reaction) => {
                  const reactionKey = `${msg.id}:${reaction.emoji}`;
                  return (
                    <button
                      key={reaction.emoji}
                      type="button"
                      className={`messageReactionChip${reaction.reactedByMe ? " mine" : ""}`}
                      onClick={() => {
                        void handleToggleMessageReaction(msg.id, reaction.emoji);
                      }}
                      disabled={reactionBusyKey === reactionKey}
                      aria-label={`Toggle ${reaction.emoji} reaction`}
                    >
                      <span>{reaction.emoji}</span>
                      <span>{reaction.count}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  className={`messageReactionAdd${reactionPickerMessageId === msg.id ? " active" : ""}`}
                  onClick={() =>
                    setReactionPickerMessageId((prev) => {
                      if (prev === msg.id) return null;
                      return msg.id;
                    })
                  }
                  disabled={Boolean(reactionBusyKey)}
                  aria-label="Add reaction"
                >
                  🙂
                </button>
                {reactionPickerMessageId === msg.id && (
                  <div className="messageReactionPicker" role="listbox" aria-label="Pick reaction emoji">
                    {REACTION_EMOJIS.map((emoji) => {
                      const reactionKey = `${msg.id}:${emoji}`;
                      const reactedByMe = msg.reactions.some((reaction) => reaction.emoji === emoji && reaction.reactedByMe);
                      return (
                        <button
                          key={emoji}
                          type="button"
                          className={`messageReactionOption${reactedByMe ? " active" : ""}`}
                          onClick={() => {
                            void handleToggleMessageReaction(msg.id, emoji);
                          }}
                          disabled={reactionBusyKey === reactionKey}
                          aria-label={`React with ${emoji}`}
                        >
                          {emoji}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="msgMeta">
                <time className="msgTime">{formatTime(msg.timestamp)}</time>
                {msg.sender === "me" && latestSeenOutgoingMessageId === msg.id && <span className="msgSeen">Seen</span>}
              </div>
            </div>
          </article>
        );
      });
    },
    [
      handleJoinInviteFromDmMessage,
      handleRejectInviteFromDmMessage,
      handleToggleMessageReaction,
      joinInviteBusyMessageId,
      latestSeenOutgoingMessageId,
      messages,
      reactionBusyKey,
      reactionPickerMessageId,
      viewMode,
    ],
  );

  const openProfileViewer = async (userId: string) => {
    setMemberFriendActionError("");
    if (userId === currentUserId) {
      if (currentProfile) {
        setViewedProfile(currentProfile);
      } else {
        const mine = await getMyProfile(accessToken, currentUserId);
        if (mine) setViewedProfile(mine);
      }
      return;
    }

    const existing = knownProfiles[userId];
    if (existing) {
      setViewedProfile(existing);
      return;
    }

    const fetched = await fetchProfilesByIds(accessToken, [userId]);
    if (fetched[0]) {
      setKnownProfiles((prev) => ({ ...prev, [userId]: fetched[0] }));
      setViewedProfile(fetched[0]);
    }
  };

  const viewedThemeRaw = viewedProfile?.profile_theme;
  const viewedTheme =
    viewedThemeRaw && typeof viewedThemeRaw === "object" && !Array.isArray(viewedThemeRaw)
      ? (viewedThemeRaw as Record<string, unknown>)
      : {};
  const viewedAccent = typeof viewedTheme.accentColor === "string" ? viewedTheme.accentColor : "#2f9bff";
  const viewedFrom = typeof viewedTheme.backgroundFrom === "string" ? viewedTheme.backgroundFrom : "#0c1629";
  const viewedTo = typeof viewedTheme.backgroundTo === "string" ? viewedTheme.backgroundTo : "#193a58";
  const viewedCardStyle = viewedTheme.cardStyle === "solid" ? "solid" : "glass";
  const viewedDisplayName = viewedProfile?.username || viewedProfile?.display_name || "User";
  const viewedProfileUserId = viewedProfile?.user_id || null;
  const viewedPresenceStatus = viewedProfileUserId ? resolvePresenceForUser(viewedProfileUserId) : "offline";
  const viewedPresenceLabel = presenceStatusLabel(viewedPresenceStatus);
  const viewedIsSelf = viewedProfileUserId === currentUserId;
  const viewedIsFriend = viewedProfileUserId ? friendUserIds.has(viewedProfileUserId) : false;
  const viewedHasIncomingRequest = viewedProfileUserId ? incomingRequestUserIds.has(viewedProfileUserId) : false;
  const viewedHasOutgoingRequest = viewedProfileUserId ? outgoingRequestUserIds.has(viewedProfileUserId) : false;
  const viewedCanAddFriend =
    Boolean(viewedProfileUserId) && !viewedIsSelf && !viewedIsFriend && !viewedHasIncomingRequest && !viewedHasOutgoingRequest;
  const viewedCanUnfriend = Boolean(viewedProfileUserId) && !viewedIsSelf && viewedIsFriend;
  const viewedActionBusy = viewedProfileUserId ? memberFriendActionUserId === viewedProfileUserId : false;
  const viewedRelationshipLabel = viewedIsSelf
    ? "This is your profile."
    : viewedIsFriend
      ? "You are friends."
      : viewedHasOutgoingRequest
        ? "Friend request sent."
        : viewedHasIncomingRequest
          ? "This user sent you a friend request."
          : "Not friends yet.";
  const viewedShowcases = normalizeProfileShowcases(viewedTheme.showcases).filter((showcase) =>
    isShowcaseVisible(showcase, { isSelf: viewedIsSelf, isFriend: viewedIsFriend }),
  );
  const previewShowcases = profileForm.showcases;
  const showcaseLimitReached = profileForm.showcases.length >= SHOWCASE_MAX_MODULES;
  const voiceSpeakingRingColor = profileForm.speakingRingColor.trim() || "#46d28f";
  const appThemePalette =
    APP_THEME_PALETTES[profileForm.appThemeMode]?.[profileForm.appTheme] || APP_THEME_PALETTES.dark.default;
  const pageStyle = useMemo(
    () =>
      ({
        colorScheme: profileForm.appThemeMode,
        "--voice-speaking-ring-color": voiceSpeakingRingColor,
        "--bg": appThemePalette.bg,
        "--panel": appThemePalette.panel,
        "--panel-border": appThemePalette.panelBorder,
        "--text": appThemePalette.text,
        "--muted": appThemePalette.muted,
        "--accent": appThemePalette.accent,
        "--accent-strong": appThemePalette.accentStrong,
        "--card": appThemePalette.card,
        "--card-border": appThemePalette.cardBorder,
        "--bubble-bot": appThemePalette.bubbleBot,
        "--bubble-me": appThemePalette.bubbleMe,
        "--hot": appThemePalette.hot,
        "--orange": appThemePalette.orange,
        "--warn": appThemePalette.warn,
        "--violet": appThemePalette.violet,
      }) as CSSProperties,
    [appThemePalette, profileForm.appThemeMode, voiceSpeakingRingColor],
  );

  const renderProfileShowcaseContent = (showcase: ProfileShowcase) => {
    if (showcase.kind === "text") {
      return <p className="profileShowcaseText">{showcase.text || SHOWCASE_KIND_EMPTY_COPY.text}</p>;
    }

    if (showcase.kind === "links") {
      if (showcase.entries.length === 0) return <p className="profileShowcaseText">{SHOWCASE_KIND_EMPTY_COPY.links}</p>;
      return (
        <ul className="profileShowcaseLinks">
          {showcase.entries.map((entry) => {
            const parsed = parseShowcaseLinkEntry(entry);
            const href =
              parsed.url.startsWith("http://") || parsed.url.startsWith("https://") ? parsed.url : `https://${parsed.url}`;
            return (
              <li key={`${showcase.id}:${entry}`}>
                <a href={href} target="_blank" rel="noreferrer">
                  {parsed.label}
                </a>
              </li>
            );
          })}
        </ul>
      );
    }

    if (showcase.kind === "stats") {
      if (showcase.entries.length === 0) return <p className="profileShowcaseText">{SHOWCASE_KIND_EMPTY_COPY.stats}</p>;
      return (
        <div className="profileShowcaseStats">
          {showcase.entries.map((entry) => {
            const parsed = parseShowcaseStatEntry(entry);
            return (
              <p key={`${showcase.id}:${entry}`} className="profileShowcaseStatRow">
                <span>{parsed.label || "Stat"}</span>
                <strong>{parsed.value || "-"}</strong>
              </p>
            );
          })}
        </div>
      );
    }

    if (showcase.entries.length === 0) {
      return <p className="profileShowcaseText">{SHOWCASE_KIND_EMPTY_COPY.gallery}</p>;
    }
    return (
      <div className="profileShowcaseGallery">
        {showcase.entries.map((entry) => (
          <img key={`${showcase.id}:${entry}`} src={entry} alt={showcase.title || "Showcase image"} />
        ))}
      </div>
    );
  };

  const renderProfileShowcaseList = (showcases: ProfileShowcase[]) => {
    if (showcases.length === 0) {
      return <p className="smallMuted">No showcases yet.</p>;
    }

    return (
      <div className="profileShowcaseList">
        {showcases.map((showcase) => (
          <section key={showcase.id} className="profileShowcaseCard">
            <div className="profileShowcaseHeadRow">
              <p className="profileShowcaseTitle">{showcase.title || "Showcase"}</p>
              <span className={`profileShowcaseKindTag ${showcase.kind}`}>{showcaseKindLabel(showcase.kind)}</span>
            </div>
            {renderProfileShowcaseContent(showcase)}
          </section>
        ))}
      </div>
    );
  };

  const handleOpenGlytchDirectory = useCallback(() => {
    setShowGlytchDirectory(true);
    setActiveGlytchId(null);
    setActiveChannelId(null);
    setMessages([]);
    setChatError("");
    setShowQuickThemeEditor(false);
  }, []);

  return (
    <div className="page" style={pageStyle}>
      <aside className="sidemenu">
        <nav className="primaryNav" aria-label="Main sections">
          {shouldShowGlytchRailIcon && activeGlytch && (
            <button
              type="button"
              className={showGlytchDirectory ? "navGlytchIconButton active" : "navGlytchIconButton"}
              aria-label={showGlytchDirectory ? "Hide Glytch list" : "Show Glytch list"}
              title={activeGlytch.name}
              data-glytch-name={activeGlytch.name}
              onClick={handleOpenGlytchDirectory}
            >
              <span className="navGlytchIcon" aria-hidden="true">
                {activeGlytch.icon_url ? (
                  <img src={activeGlytch.icon_url} alt="" />
                ) : (
                  <span>{initialsFromName(activeGlytch.name)}</span>
                )}
              </span>
            </button>
          )}
          <button
            className={viewMode === "dm" ? "navOption active" : "navOption"}
            type="button"
            onClick={() => setViewMode("dm")}
          >
            <span className="navOptionIcon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="presentation">
                <path
                  d="M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 16.5H9l-4.5 3v-3H4A1.5 1.5 0 0 1 2.5 15V7A1.5 1.5 0 0 1 4 5.5Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span>DMs</span>
          </button>
          <button
            className={viewMode === "glytch" || viewMode === "glytch-settings" ? "navOption active" : "navOption"}
            type="button"
            onClick={() => setViewMode("glytch")}
          >
            <span className="navOptionIcon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="presentation">
                <rect
                  x="4"
                  y="4"
                  width="16"
                  height="5"
                  rx="1.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <rect
                  x="4"
                  y="10.5"
                  width="16"
                  height="5"
                  rx="1.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <rect
                  x="4"
                  y="17"
                  width="16"
                  height="3"
                  rx="1.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
              </svg>
            </span>
            <span>Glytches</span>
          </button>

          <div className="railIdentity">
            <button
              className="avatarButton railAvatarButton withPresence"
              type="button"
              title={`Status: ${currentUserPresenceLabel}`}
              onClick={() => setViewMode("settings")}
            >
              {sidebarAvatar ? (
                <img src={sidebarAvatar} alt="Profile" />
              ) : (
                <span>{initialsFromName(displayName)}</span>
              )}
              <span className={`presenceDot ${currentUserPresenceStatus}`} aria-hidden="true" />
            </button>

            <div className="identityCard railIdentityPopover">
              <button
                className="avatarButton withPresence"
                type="button"
                title={`Status: ${currentUserPresenceLabel}`}
                onClick={() => setViewMode("settings")}
              >
                {sidebarAvatar ? (
                  <img src={sidebarAvatar} alt="Profile" />
                ) : (
                  <span>{initialsFromName(displayName)}</span>
                )}
                <span className={`presenceDot ${currentUserPresenceStatus}`} aria-hidden="true" />
              </button>
              <div className="identityMeta">
                <p className="signedInAs">Signed in as</p>
                <p className="userName">{displayName}</p>
                <p className={`presenceLabel ${currentUserPresenceStatus}`}>{currentUserPresenceLabel}</p>
                <label className="presenceSelectLabel">
                  Status
                  <select
                    value={profileForm.presenceStatus}
                    onChange={(e) => {
                      const nextStatus = normalizePresenceStatus(e.target.value);
                      void handleChangePresenceStatus(nextStatus);
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="away">Away</option>
                    <option value="busy">Busy</option>
                    <option value="offline">Offline</option>
                  </select>
                </label>
                <button className="settingsLink" type="button" onClick={() => setViewMode("settings")}>
                  Profile Settings
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="sideContent">
          <div className="sideContentBody">
            {viewMode === "dm" ? (
              <>
                <div className="subModeSwitch">
                  <button
                    className={dmPanelMode === "dms" ? "channelItem active" : "channelItem"}
                    type="button"
                    onClick={() => setDmPanelMode("dms")}
                  >
                    Direct Messages
                  </button>
                  <button
                    className={dmPanelMode === "friends" ? "channelItem active" : "channelItem"}
                    type="button"
                    onClick={() => setDmPanelMode("friends")}
                  >
                    Friends
                  </button>
                </div>

                {dmPanelMode === "friends" ? (
                  <>
                    <form className="addFriendForm" onSubmit={handleAddFriend}>
                      <input
                        value={friendUsername}
                        onChange={(e) => setFriendUsername(e.target.value)}
                        placeholder="Friend username"
                        aria-label="Friend username"
                      />
                      <button type="submit">Add</button>
                    </form>

                    {dmError && <p className="chatError">{dmError}</p>}

                    <section className="requestSection" aria-label="Incoming requests">
                      <p className="sectionLabel">Incoming Requests</p>
                      {pendingIncoming.length === 0 && <p className="smallMuted">None</p>}
                      {pendingIncoming.map((req) => (
                        <div key={req.id} className="requestCard">
                          <p>{req.sender_profile?.username || req.sender_profile?.display_name || "User"}</p>
                          <div className="requestActions">
                            <button
                              type="button"
                              className="ghostButton"
                              onClick={() => void openProfileViewer(req.sender_id)}
                            >
                              View
                            </button>
                            <button type="button" onClick={() => void handleAccept(req.id)}>
                              Accept
                            </button>
                            <button type="button" className="ghostButton" onClick={() => void handleReject(req.id)}>
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </section>

                    <section className="requestSection" aria-label="Sent requests">
                      <p className="sectionLabel">Sent Requests</p>
                      {pendingOutgoing.length === 0 && <p className="smallMuted">None</p>}
                      {pendingOutgoing.map((req) => (
                        <div key={req.id} className="requestActions">
                          <p className="smallMuted">
                            {req.receiver_profile?.username || req.receiver_profile?.display_name || "User"}
                          </p>
                          <button
                            type="button"
                            className="ghostButton"
                            onClick={() => void openProfileViewer(req.receiver_id)}
                          >
                            View
                          </button>
                        </div>
                      ))}
                    </section>
                  </>
                ) : (
                  <nav className="channelList" aria-label="Direct messages">
                    <p className="sectionLabel">Direct Messages</p>
                    {dms.length === 0 && <p className="smallMuted">No DMs yet</p>}
                    {dms.map((dm) => {
                      const unreadCount = unreadDmCounts[dm.conversationId] || 0;
                      const unreadLabel = unreadCount > 99 ? "99+" : String(unreadCount);
                      const dmPresenceStatus = resolvePresenceForUser(dm.friendUserId);
                      const dmPresenceTitle = `Status: ${presenceStatusLabel(dmPresenceStatus)}`;
                      return (
                        <div key={dm.conversationId} className="friendRow">
                          <button
                            className="friendAvatarButton"
                            type="button"
                            aria-label={`View ${dm.friendName} profile`}
                            onClick={() => void openProfileViewer(dm.friendUserId)}
                          >
                            <span className="friendAvatar withPresence" title={dmPresenceTitle}>
                              {dm.friendAvatarUrl ? (
                                <img src={dm.friendAvatarUrl} alt="" />
                              ) : (
                                <span>{initialsFromName(dm.friendName)}</span>
                              )}
                              <span className={`presenceDot ${dmPresenceStatus}`} aria-hidden="true" />
                            </span>
                          </button>
                          <button
                            className={
                              dm.conversationId === activeConversationId
                                ? "channelItem friendItem active"
                                : "channelItem friendItem"
                            }
                            type="button"
                            onClick={() => setActiveConversationId(dm.conversationId)}
                          >
                            <span>{dm.friendName}</span>
                            {unreadCount > 0 && <span className="unreadBubble">{unreadLabel}</span>}
                          </button>
                        </div>
                      );
                    })}
                  </nav>
                )}
              </>
            ) : viewMode === "glytch" || viewMode === "glytch-settings" ? (
              <>
                {glytchError && <p className="chatError">{glytchError}</p>}

                {showGlytchDirectory || !activeGlytch ? (
                  <>
                    <div className="glytchActions">
                      <button
                        className={glytchActionMode === "create" ? "channelItem active" : "channelItem"}
                        type="button"
                        onClick={() => setGlytchActionMode((prev) => (prev === "create" ? "none" : "create"))}
                      >
                        Create Glytch
                      </button>
                      <button
                        className={glytchActionMode === "join" ? "channelItem active" : "channelItem"}
                        type="button"
                        onClick={() => setGlytchActionMode((prev) => (prev === "join" ? "none" : "join"))}
                      >
                        Join Glytch
                      </button>
                    </div>

                    {glytchActionMode === "create" && (
                      <form className="stackedForm" onSubmit={handleCreateGlytch}>
                        <input
                          value={glytchNameDraft}
                          onChange={(e) => setGlytchNameDraft(e.target.value)}
                          placeholder="New Glytch name"
                          aria-label="New Glytch name"
                        />
                        <button type="submit">Create</button>
                      </form>
                    )}

                    {glytchActionMode === "join" && (
                      <form className="stackedForm" onSubmit={handleJoinGlytch}>
                        <input
                          value={inviteCodeDraft}
                          onChange={(e) => setInviteCodeDraft(e.target.value)}
                          placeholder="Invite code"
                          aria-label="Invite code"
                        />
                        <button type="submit">Join</button>
                      </form>
                    )}

                    <section className="requestSection">
                      <p className="sectionLabel">Your Glytches</p>
                      {glytches.length === 0 && <p className="smallMuted">No Glytches yet</p>}
                      {glytches.map((glytch) => (
                        <div key={glytch.id} className="glytchRow">
                          <button
                            className={glytch.id === activeGlytchId ? "channelItem active" : "channelItem"}
                            type="button"
                            onClick={() => {
                              setActiveGlytchId(glytch.id);
                              setViewMode("glytch");
                              setShowGlytchDirectory(false);
                            }}
                          >
                            <span className="glytchItemLabel">
                              <span className="glytchItemIcon" aria-hidden="true">
                                {glytch.icon_url ? <img src={glytch.icon_url} alt="" /> : <span>{initialsFromName(glytch.name)}</span>}
                              </span>
                              <span className="glytchItemName">{glytch.name}</span>
                            </span>
                          </button>
                          {(glytch.owner_id === currentUserId ||
                            (glytch.id === activeGlytchId &&
                              rolesLoadedForGlytchId === glytch.id &&
                              canAccessGlytchSettingsInActiveGlytch)) && (
                            <button
                              className={
                                glytch.id === activeGlytchId && viewMode === "glytch-settings"
                                  ? "glytchSettingsButton active"
                                  : "glytchSettingsButton"
                              }
                              type="button"
                              aria-label={`Open settings for ${glytch.name}`}
                              title={`Open settings for ${glytch.name}`}
                              onClick={() => {
                                setActiveGlytchId(glytch.id);
                                setGlytchSettingsTab("profile");
                                setViewMode("glytch-settings");
                                setShowGlytchDirectory(false);
                              }}
                            >
                              ⚙
                            </button>
                          )}
                        </div>
                      ))}
                    </section>
                  </>
                ) : (
                  <section className="requestSection activeGlytchSection">
                    <p className="sectionLabel">Current Glytch</p>
                    <div className="activeGlytchSummaryRow">
                      <span className="glytchItemIcon" aria-hidden="true">
                        {activeGlytch.icon_url ? <img src={activeGlytch.icon_url} alt="" /> : <span>{initialsFromName(activeGlytch.name)}</span>}
                      </span>
                      <span className="activeGlytchSummaryName">{activeGlytch.name}</span>
                      {(isActiveGlytchOwner || (isActiveGlytchRoleAccessResolved && canAccessGlytchSettingsInActiveGlytch)) && (
                        <button
                          className={viewMode === "glytch-settings" ? "glytchSettingsButton active" : "glytchSettingsButton"}
                          type="button"
                          aria-label={`Open settings for ${activeGlytch.name}`}
                          title={`Open settings for ${activeGlytch.name}`}
                          onClick={() => {
                            setGlytchSettingsTab("profile");
                            setViewMode("glytch-settings");
                          }}
                        >
                          ⚙
                        </button>
                      )}
                    </div>
                    <button type="button" className="ghostButton activeGlytchSwitchButton" onClick={handleOpenGlytchDirectory}>
                      Switch Glytch
                    </button>
                    <button
                      type="button"
                      className={showGlytchInvitePanel ? "channelItem active" : "channelItem"}
                      onClick={() => {
                        setShowGlytchInvitePanel((prev) => !prev);
                        setGlytchInviteNotice("");
                        setGlytchInviteError("");
                      }}
                    >
                      Invite Friends
                    </button>
                    {showGlytchInvitePanel && (
                      <div className="glytchInvitePanel">
                        <input
                          className="glytchInviteSearch"
                          value={glytchInviteSearch}
                          onChange={(e) => setGlytchInviteSearch(e.target.value)}
                          placeholder="Search friends"
                          aria-label="Search friends"
                        />
                        {glytchInviteError && <p className="chatError">{glytchInviteError}</p>}
                        {glytchInviteNotice && <p className="glytchInviteNotice">{glytchInviteNotice}</p>}
                        {dms.length === 0 ? (
                          <p className="smallMuted">Add friends to invite them.</p>
                        ) : filteredGlytchInviteDms.length === 0 ? (
                          <p className="smallMuted">No friends matched your search.</p>
                        ) : (
                          <div className="glytchInviteList">
                            {filteredGlytchInviteDms.map((dm) => {
                              const busy = glytchInviteBusyConversationId === dm.conversationId;
                              return (
                                <div key={dm.conversationId} className="glytchInviteRow">
                                  <span className="glytchInviteFriend">
                                    <span className="friendAvatar" aria-hidden="true">
                                      {dm.friendAvatarUrl ? <img src={dm.friendAvatarUrl} alt="" /> : <span>{initialsFromName(dm.friendName)}</span>}
                                    </span>
                                    <span className="glytchInviteFriendName">{dm.friendName}</span>
                                  </span>
                                  <button
                                    type="button"
                                    className="glytchInviteAction"
                                    onClick={() => void handleInviteFriendToActiveGlytch(dm)}
                                    disabled={busy}
                                  >
                                    {busy ? "Sending..." : "Invite"}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                )}

                {!showGlytchDirectory && activeGlytch && (
                  <section className="requestSection">
                    <p className="sectionLabel">Channels</p>
                    {channels.length === 0 && <p className="smallMuted">No channels</p>}

                    {categorizedChannels.map((group) => (
                      <div key={group.category.id} className="channelCategoryGroup">
                        <p className="channelCategoryTitle">{group.category.name}</p>
                        <div className="channelCategoryChannels">
                          {group.channels.map((channel) => {
                            const channelParticipants = voiceParticipantsByChannelId[channel.id] || [];
                            return (
                              <div key={channel.id} className="voiceChannelGroup">
                                <button
                                  className={channel.id === activeChannelId ? "channelItem active" : "channelItem"}
                                  type="button"
                                  onClick={() => setActiveChannelId(channel.id)}
                                >
                                  {channel.kind === "voice" ? "🔊" : "#"} {channel.name}
                                  {channel.kind === "text" && textPostModeLabel(channel.text_post_mode) && ` • ${textPostModeLabel(channel.text_post_mode)}`}
                                  {channel.kind === "voice" && channel.voice_user_limit
                                    ? ` (${channelParticipants.length}/${channel.voice_user_limit})`
                                    : ""}
                                </button>
                                {channel.kind === "voice" && channelParticipants.length > 0 && (
                                  <div className="voiceChannelMembers" aria-label={`${channel.name} participants`}>
                                    {channelParticipants.map((participant) => {
                                      const participantIsMe = participant.userId === currentUserId;
                                      const participantIsSpeaking = speakingUserIds.includes(participant.userId);
                                      const participantIsDeafened = participantIsMe ? voiceDeafened : participant.deafened;
                                      const participantIsMuted = participantIsMe ? effectiveVoiceMuted : participant.muted;
                                      const participantPresenceStatus = resolvePresenceForUser(participant.userId);
                                      const participantPresenceTitle = `Status: ${presenceStatusLabel(participantPresenceStatus)}`;
                                      const avatarClass = participantIsDeafened
                                        ? "friendAvatar withPresence voiceStateAvatar voiceDeafenedAvatar"
                                        : participantIsMuted
                                          ? "friendAvatar withPresence voiceStateAvatar voiceMutedAvatar"
                                          : participantIsSpeaking
                                            ? "friendAvatar withPresence voiceSpeakingAvatar"
                                            : "friendAvatar withPresence";
                                      return (
                                        <button
                                          key={participant.userId}
                                          type="button"
                                          className="voiceChannelMember"
                                          onClick={() => void openProfileViewer(participant.userId)}
                                        >
                                          <span className={avatarClass} title={participantPresenceTitle}>
                                            {participant.avatarUrl ? (
                                              <img src={participant.avatarUrl} alt="" />
                                            ) : (
                                              <span>{initialsFromName(participant.name)}</span>
                                            )}
                                            <span className={`presenceDot ${participantPresenceStatus}`} aria-hidden="true" />
                                          </span>
                                          <span className="voiceChannelMemberName">
                                            {participant.name}
                                            {participant.userId === activeGlytchOwnerId && (
                                              <span className="ownerCrown" aria-label="Glytch owner" title="Glytch owner">
                                                👑
                                              </span>
                                            )}
                                          </span>
                                          {participantIsDeafened && (
                                            <span className="voiceChannelMemberStateIcon" aria-label="Deafened" title="Deafened">
                                              <svg viewBox="0 0 24 24" role="presentation">
                                                <path
                                                  d="M4 13a8 8 0 0 1 16 0"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  strokeWidth="1.8"
                                                  strokeLinecap="round"
                                                />
                                                <rect
                                                  x="2.5"
                                                  y="12"
                                                  width="4.5"
                                                  height="8"
                                                  rx="2"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  strokeWidth="1.8"
                                                />
                                                <rect
                                                  x="17"
                                                  y="12"
                                                  width="4.5"
                                                  height="8"
                                                  rx="2"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  strokeWidth="1.8"
                                                />
                                                <path
                                                  d="M4 4l16 16"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  strokeWidth="2"
                                                  strokeLinecap="round"
                                                />
                                              </svg>
                                            </span>
                                          )}
                                          {!participantIsDeafened && participantIsMuted && (
                                            <span className="voiceChannelMemberStateIcon" aria-label="Muted" title="Muted">
                                              <svg viewBox="0 0 24 24" role="presentation">
                                                <path
                                                  d="M12 3a3 3 0 0 0-3 3v5a3 3 0 1 0 6 0V6a3 3 0 0 0-3-3Z"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  strokeWidth="1.8"
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                />
                                                <path
                                                  d="M4 4l16 16"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  strokeWidth="2"
                                                  strokeLinecap="round"
                                                />
                                              </svg>
                                            </span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {uncategorizedChannels.length > 0 && (
                      <div className="channelCategoryGroup">
                        <p className="channelCategoryTitle">Uncategorized</p>
                        <div className="channelCategoryChannels">
                          {uncategorizedChannels.map((channel) => {
                            const channelParticipants = voiceParticipantsByChannelId[channel.id] || [];
                            return (
                              <div key={channel.id} className="voiceChannelGroup">
                                <button
                                  className={channel.id === activeChannelId ? "channelItem active" : "channelItem"}
                                  type="button"
                                  onClick={() => setActiveChannelId(channel.id)}
                                >
                                  {channel.kind === "voice" ? "🔊" : "#"} {channel.name}
                                  {channel.kind === "text" && textPostModeLabel(channel.text_post_mode) && ` • ${textPostModeLabel(channel.text_post_mode)}`}
                                  {channel.kind === "voice" && channel.voice_user_limit
                                    ? ` (${channelParticipants.length}/${channel.voice_user_limit})`
                                    : ""}
                                </button>
                                {channel.kind === "voice" && channelParticipants.length > 0 && (
                                  <div className="voiceChannelMembers" aria-label={`${channel.name} participants`}>
                                    {channelParticipants.map((participant) => {
                                      const participantIsMe = participant.userId === currentUserId;
                                      const participantIsSpeaking = speakingUserIds.includes(participant.userId);
                                      const participantIsDeafened = participantIsMe ? voiceDeafened : participant.deafened;
                                      const participantIsMuted = participantIsMe ? effectiveVoiceMuted : participant.muted;
                                      const participantPresenceStatus = resolvePresenceForUser(participant.userId);
                                      const participantPresenceTitle = `Status: ${presenceStatusLabel(participantPresenceStatus)}`;
                                      const avatarClass = participantIsDeafened
                                        ? "friendAvatar withPresence voiceStateAvatar voiceDeafenedAvatar"
                                        : participantIsMuted
                                          ? "friendAvatar withPresence voiceStateAvatar voiceMutedAvatar"
                                          : participantIsSpeaking
                                            ? "friendAvatar withPresence voiceSpeakingAvatar"
                                            : "friendAvatar withPresence";
                                      return (
                                        <button
                                          key={participant.userId}
                                          type="button"
                                          className="voiceChannelMember"
                                          onClick={() => void openProfileViewer(participant.userId)}
                                        >
                                          <span className={avatarClass} title={participantPresenceTitle}>
                                            {participant.avatarUrl ? (
                                              <img src={participant.avatarUrl} alt="" />
                                            ) : (
                                              <span>{initialsFromName(participant.name)}</span>
                                            )}
                                            <span className={`presenceDot ${participantPresenceStatus}`} aria-hidden="true" />
                                          </span>
                                          <span className="voiceChannelMemberName">
                                            {participant.name}
                                            {participant.userId === activeGlytchOwnerId && (
                                              <span className="ownerCrown" aria-label="Glytch owner" title="Glytch owner">
                                                👑
                                              </span>
                                            )}
                                          </span>
                                          {participantIsDeafened && (
                                            <span className="voiceChannelMemberStateIcon" aria-label="Deafened" title="Deafened">
                                              <svg viewBox="0 0 24 24" role="presentation">
                                                <path
                                                  d="M4 13a8 8 0 0 1 16 0"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  strokeWidth="1.8"
                                                  strokeLinecap="round"
                                                />
                                                <rect
                                                  x="2.5"
                                                  y="12"
                                                  width="4.5"
                                                  height="8"
                                                  rx="2"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  strokeWidth="1.8"
                                                />
                                                <rect
                                                  x="17"
                                                  y="12"
                                                  width="4.5"
                                                  height="8"
                                                  rx="2"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  strokeWidth="1.8"
                                                />
                                                <path
                                                  d="M4 4l16 16"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  strokeWidth="2"
                                                  strokeLinecap="round"
                                                />
                                              </svg>
                                            </span>
                                          )}
                                          {!participantIsDeafened && participantIsMuted && (
                                            <span className="voiceChannelMemberStateIcon" aria-label="Muted" title="Muted">
                                              <svg viewBox="0 0 24 24" role="presentation">
                                                <path
                                                  d="M12 3a3 3 0 0 0-3 3v5a3 3 0 1 0 6 0V6a3 3 0 0 0-3-3Z"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  strokeWidth="1.8"
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                />
                                                <path
                                                  d="M4 4l16 16"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  strokeWidth="2"
                                                  strokeLinecap="round"
                                                />
                                              </svg>
                                            </span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </section>
                )}

              </>
            ) : (
              <section className="requestSection">
                <p className="sectionLabel">Settings</p>
                <p className="smallMuted">Edit your profile in the main panel.</p>
              </section>
            )}
          </div>

        </div>
      </aside>

      <main className="glytchapp">
        <header className="chat-header">
          <div className="chatHeaderTitle">
            {viewMode === "dm" ? (
              activeDm ? (
                <button
                  type="button"
                  className="profileHeaderButton"
                  onClick={() => void openProfileViewer(activeDm.friendUserId)}
                >
                  DM with {activeDm.friendName}
                </button>
              ) : (
                <span>Direct Messages</span>
              )
            ) : viewMode === "glytch" ? (
              <span>
                {activeGlytch && activeChannel
                  ? `${activeGlytch.name} / ${activeChannel.kind === "voice" ? "🔊" : "#"}${activeChannel.name}`
                  : "Glytches"}
              </span>
            ) : viewMode === "glytch-settings" ? (
              <span>{activeGlytch ? `${activeGlytch.name} / Settings` : "Glytch Settings"}</span>
            ) : (
              <span>Profile Settings</span>
            )}
          </div>
          {shouldRenderHeaderActions && (
            <div className="chatHeaderActions">
              {shouldShowVoiceControls &&
                (voiceRoomKey ? (
                  <>
                    <button
                      type="button"
                      className={voiceMuted || voiceDeafened ? "voiceButton iconOnly active" : "voiceButton iconOnly"}
                      onClick={() => void handleToggleMute()}
                      disabled={voiceDeafened || currentUserForceMuted || currentUserForceDeafened}
                      aria-label={muteButtonLabel}
                      title={muteButtonLabel}
                    >
                      <span className="voiceButtonIcon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" role="presentation">
                          <path
                            d="M12 3a3 3 0 0 0-3 3v5a3 3 0 1 0 6 0V6a3 3 0 0 0-3-3Z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M5.5 11a6.5 6.5 0 0 0 13 0"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                          <path
                            d="M12 17.5V21"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                          <path
                            d="M8.5 21h7"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                          {(voiceMuted || voiceDeafened) && (
                            <path
                              d="M4 4l16 16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          )}
                        </svg>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={voiceDeafened ? "voiceButton iconOnly active" : "voiceButton iconOnly"}
                      onClick={() => void handleToggleDeafen()}
                      disabled={currentUserForceDeafened}
                      aria-label={deafenButtonLabel}
                      title={deafenButtonLabel}
                    >
                      <span className="voiceButtonIcon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" role="presentation">
                          <path
                            d="M4 13a8 8 0 0 1 16 0"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                          <rect
                            x="2.5"
                            y="12"
                            width="4.5"
                            height="8"
                            rx="2"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          />
                          <rect
                            x="17"
                            y="12"
                            width="4.5"
                            height="8"
                            rx="2"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          />
                          {voiceDeafened && (
                            <path
                              d="M4 4l16 16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          )}
                        </svg>
                      </span>
                    </button>
                    {(isScreenSharing || isElectronRuntime) && (
                      <div className="screenShareHeaderControls">
                        {isScreenSharing && (
                          <label className="screenShareControl toggle">
                            <input
                              type="checkbox"
                              checked={screenShareIncludeSystemAudio}
                              onChange={(e) => setScreenShareIncludeSystemAudio(e.target.checked)}
                              disabled={screenShareBusy || isScreenSharing}
                            />
                            <span>System Audio</span>
                          </label>
                        )}
                        {isElectronRuntime && (
                          <>
                            <label className="screenShareControl source">
                              <span>Source</span>
                              <select
                                value={selectedDesktopSourceId}
                                onChange={(e) => setSelectedDesktopSourceId(e.target.value)}
                                disabled={screenShareBusy || isScreenSharing}
                                aria-label="Screen share source"
                              >
                                <option value="auto">Auto pick</option>
                                {desktopSourceOptions.map((source) => (
                                  <option key={source.id} value={source.id}>
                                    {source.kind === "screen" ? "Screen" : "Window"}: {source.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <button
                              type="button"
                              className="voiceButton compact"
                              onClick={() => void refreshDesktopSourceOptions()}
                              disabled={screenShareBusy || isScreenSharing}
                            >
                              Refresh Sources
                            </button>
                          </>
                        )}
                      </div>
                    )}
                    <button
                      type="button"
                      className={isScreenSharing ? "voiceButton iconOnly screenShareActive" : "voiceButton iconOnly"}
                      onClick={() => void (isScreenSharing ? handleStopScreenShare() : handleStartScreenShare())}
                      disabled={screenShareBusy}
                      aria-label={shareScreenButtonLabel}
                      title={shareScreenButtonLabel}
                    >
                      <span className="voiceButtonIcon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" role="presentation">
                          <rect
                            x="3"
                            y="4"
                            width="18"
                            height="12"
                            rx="2"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          />
                          <path
                            d="M12 8v4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                          <path
                            d="m10.5 9.5 1.5-1.5 1.5 1.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M12 16v4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                          <path
                            d="M8.5 20h7"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                        </svg>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="voiceButton iconOnly danger"
                      onClick={() => void handleLeaveVoice()}
                      aria-label="Leave voice"
                      title="Leave voice"
                    >
                      <span className="voiceButtonIcon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" role="presentation">
                          <path
                            d="M10 4H5a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 5 20h5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M14 8.5 19 12l-5 3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M19 12H9"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                        </svg>
                      </span>
                    </button>
                  </>
                ) : (
                  <button type="button" className="voiceButton" onClick={() => void handleJoinVoice()}>
                    {viewMode === "dm" ? "Start Call" : "Join Voice"}
                  </button>
                ))}
              {shouldShowQuickThemeControl && quickThemeTarget && (
                <div className="quickThemeControl">
                  <button
                    type="button"
                    className={showQuickThemeEditor ? "voiceButton iconOnly active" : "voiceButton iconOnly"}
                    onClick={() => {
                      setShowQuickThemeEditor((prev) => !prev);
                      setQuickThemeError("");
                    }}
                    aria-label={`Customize theme for ${quickThemeTarget.label}`}
                    title={`Customize theme for ${quickThemeTarget.label}`}
                  >
                    <span className="voiceButtonIcon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" role="presentation">
                        <path
                          d="M9.9 3.2h4.2l.6 2a7.3 7.3 0 0 1 1.6.9l2-.8 3 3-1 2a7.3 7.3 0 0 1 .8 1.6l2 .6v4.2l-2 .6a7.3 7.3 0 0 1-.9 1.6l.8 2-3 3-2-.8a7.3 7.3 0 0 1-1.6.8l-.6 2H9.9l-.6-2a7.3 7.3 0 0 1-1.6-.8l-2 .8-3-3 .8-2a7.3 7.3 0 0 1-.8-1.6l-2-.6v-4.2l2-.6a7.3 7.3 0 0 1 .8-1.6l-.8-2 3-3 2 .8a7.3 7.3 0 0 1 1.6-.9l.6-2Z"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinejoin="round"
                        />
                        <circle
                          cx="12"
                          cy="12"
                          r="3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        />
                      </svg>
                    </span>
                  </button>
                  {showQuickThemeEditor && (
                    <div
                      className="quickThemePopover"
                      role="dialog"
                      aria-label={`Theme settings for ${quickThemeTarget.label}`}
                    >
                      <p className="quickThemeTitle">{quickThemeTarget.label}</p>
                      <p className="quickThemeMeta">
                        {quickThemeHasOverride
                          ? "Custom colors are active for this chat."
                          : quickThemeTarget.kind === "dm"
                            ? "Using your default DM colors."
                            : "Using your default Glytch text colors."}
                      </p>
                      <div className="quickThemeModeRow" role="tablist" aria-label="Background type">
                        <button
                          type="button"
                          className={quickThemeModeDraft === "gradient" ? "voiceButton compact active" : "voiceButton compact"}
                          onClick={() => setQuickThemeModeDraft("gradient")}
                          disabled={quickThemeBusy || quickThemeImageUploadBusy}
                        >
                          Color
                        </button>
                        <button
                          type="button"
                          className={quickThemeModeDraft === "image" ? "voiceButton compact active" : "voiceButton compact"}
                          onClick={() => setQuickThemeModeDraft("image")}
                          disabled={quickThemeBusy || quickThemeImageUploadBusy}
                        >
                          Image
                        </button>
                      </div>
                      {quickThemeModeDraft === "image" ? (
                        <div className="quickThemeImageStack">
                          <label>
                            Image URL
                            <input
                              type="url"
                              value={quickThemeImageDraft}
                              onChange={(e) => setQuickThemeImageDraft(e.target.value)}
                              placeholder="https://..."
                              disabled={quickThemeBusy || quickThemeImageUploadBusy}
                            />
                          </label>
                          <label className="quickThemeUploadButton">
                            {quickThemeImageUploadBusy ? "Uploading..." : "Upload Image"}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleQuickThemeImageUpload}
                              disabled={quickThemeBusy || quickThemeImageUploadBusy}
                            />
                          </label>
                          {quickThemeImageDraft && (
                            <div className="quickThemeImagePreview">
                              <img src={quickThemeImageDraft} alt="Theme preview" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="quickThemeColorGrid">
                          <label>
                            Start
                            <input
                              type="color"
                              value={quickThemeFromDraft}
                              onChange={(e) => setQuickThemeFromDraft(e.target.value)}
                              disabled={quickThemeBusy}
                            />
                          </label>
                          <label>
                            End
                            <input
                              type="color"
                              value={quickThemeToDraft}
                              onChange={(e) => setQuickThemeToDraft(e.target.value)}
                              disabled={quickThemeBusy}
                            />
                          </label>
                        </div>
                      )}
                      {quickThemeError && <p className="quickThemeError">{quickThemeError}</p>}
                      <div className="quickThemeActions">
                        <button
                          type="button"
                          className="voiceButton compact"
                          onClick={() => void handleSaveQuickThemeOverride()}
                          disabled={quickThemeBusy || quickThemeImageUploadBusy}
                        >
                          {quickThemeBusy ? "Saving..." : "Save"}
                        </button>
                        <button
                          type="button"
                          className="voiceButton compact"
                          onClick={() => void handleClearQuickThemeOverride()}
                          disabled={quickThemeBusy || quickThemeImageUploadBusy || !quickThemeHasOverride}
                        >
                          Restore Default
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </header>

        {viewMode === "settings" ? (
          <section className="settingsPage" aria-label="Profile settings">
            <div className="settingsTabs">
              <button
                className={settingsTab === "edit" ? "tab active" : "tab"}
                type="button"
                onClick={() => setSettingsTab("edit")}
              >
                Edit Profile
              </button>
              <button
                className={settingsTab === "preview" ? "tab active" : "tab"}
                type="button"
                onClick={() => setSettingsTab("preview")}
              >
                Preview Page
              </button>
              <button
                className={settingsTab === "theme" ? "tab active" : "tab"}
                type="button"
                onClick={() => setSettingsTab("theme")}
              >
                Theme
              </button>
              <button
                className={settingsTab === "showcases" ? "tab active" : "tab"}
                type="button"
                onClick={() => setSettingsTab("showcases")}
              >
                Showcases
              </button>
              <button
                className={settingsTab === "notifications" ? "tab active" : "tab"}
                type="button"
                onClick={() => setSettingsTab("notifications")}
              >
                Notifications
              </button>
            </div>

            {profileSaveError && <p className="chatError">{profileSaveError}</p>}

            {settingsTab === "edit" ? (
              <form className="settingsForm" onSubmit={handleSaveProfile}>
                <label>
                  Profile Picture
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfileImageUpload("avatar")}
                  />
                </label>
                {avatarUploadBusy && <p className="smallMuted">Uploading avatar...</p>}
                {profileForm.avatarUrl && (
                  <img className="settingsThumb avatar" src={profileForm.avatarUrl} alt="Avatar preview" />
                )}
                {profileForm.avatarUrl && (
                  <button
                    type="button"
                    className="clearButton"
                    onClick={() => setProfileForm((prev) => ({ ...prev, avatarUrl: "" }))}
                  >
                    Remove avatar
                  </button>
                )}

                <label>
                  Banner Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfileImageUpload("banner")}
                  />
                </label>
                {bannerUploadBusy && <p className="smallMuted">Uploading banner...</p>}
                {profileForm.bannerUrl && (
                  <img className="settingsThumb banner" src={profileForm.bannerUrl} alt="Banner preview" />
                )}
                {profileForm.bannerUrl && (
                  <button
                    type="button"
                    className="clearButton"
                    onClick={() => setProfileForm((prev) => ({ ...prev, bannerUrl: "" }))}
                  >
                    Remove banner
                  </button>
                )}

                <label>
                  Bio
                  <textarea
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))}
                    rows={4}
                    placeholder="Tell people about your profile page"
                  />
                </label>

                <div className="colorGrid">
                  <label>
                    Accent
                    <input
                      type="color"
                      value={profileForm.accentColor}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, accentColor: e.target.value }))}
                    />
                  </label>
                  <label>
                    Background Start
                    <input
                      type="color"
                      value={profileForm.backgroundFrom}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, backgroundFrom: e.target.value }))}
                    />
                  </label>
                  <label>
                    Background End
                    <input
                      type="color"
                      value={profileForm.backgroundTo}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, backgroundTo: e.target.value }))}
                    />
                  </label>
                </div>

                <label>
                  Card Style
                  <select
                    value={profileForm.cardStyle}
                    onChange={(e) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        cardStyle: e.target.value === "solid" ? "solid" : "glass",
                      }))
                    }
                  >
                    <option value="glass">Glass</option>
                    <option value="solid">Solid</option>
                  </select>
                </label>

                <button type="submit" disabled={profileSaveBusy}>
                  {profileSaveBusy ? "Saving..." : "Save Profile"}
                </button>
              </form>
            ) : settingsTab === "theme" ? (
              <form className="settingsForm" onSubmit={handleSaveThemeSettings}>
                <p className="sectionLabel">App Theme</p>
                <label>
                  Color Mode
                  <select
                    value={profileForm.appThemeMode}
                    onChange={(e) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        appThemeMode: normalizeAppThemeMode(e.target.value),
                      }))
                    }
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </label>
                <label>
                  Theme Preset
                  <select
                    value={profileForm.appTheme}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, appTheme: normalizeAppTheme(e.target.value) }))}
                  >
                    <option value="default">Default</option>
                    <option value="ocean">Ocean</option>
                    <option value="sunset">Sunset</option>
                    <option value="mint">Mint</option>
                  </select>
                </label>

                <p className="smallMuted">
                  DM and channel backgrounds are now edited in-chat from the header gear icon.
                </p>

                <button type="submit" disabled={profileSaveBusy}>
                  {profileSaveBusy ? "Saving..." : "Save Theme Settings"}
                </button>
              </form>
            ) : settingsTab === "showcases" ? (
              <form className="settingsForm" onSubmit={handleSaveShowcaseSettings}>
                <p className="sectionLabel">Profile Showcases</p>
                <p className="smallMuted">
                  Build a custom profile layout with modules you can reorder.
                </p>
                <div className="showcaseToolbar">
                  <p className="showcaseCountPill">
                    {profileForm.showcases.length}/{SHOWCASE_MAX_MODULES} modules
                  </p>
                  <button
                    type="button"
                    className="clearButton showcaseStarterButton"
                    onClick={handleAddShowcaseStarterLayout}
                    disabled={showcaseLimitReached}
                    title="Add a ready-made showcase stack"
                  >
                    Add Starter Layout
                  </button>
                </div>
                <div className="showcaseAddRow">
                  {(["text", "links", "stats", "gallery"] as ShowcaseKind[]).map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      className={`showcaseAddButton ${kind}`}
                      onClick={() => handleAddShowcase(kind)}
                      disabled={showcaseLimitReached}
                    >
                      <span className="showcaseAddButtonTitle">Add {showcaseKindLabel(kind)}</span>
                      <span className="showcaseAddButtonHint">{showcaseKindHint(kind)}</span>
                    </button>
                  ))}
                </div>
                {showcaseLimitReached && (
                  <p className="smallMuted">Maximum reached. Remove a module or duplicate after cleanup.</p>
                )}

                {profileForm.showcases.length === 0 ? (
                  <p className="smallMuted">No showcases yet. Add one to get started.</p>
                ) : (
                  <div className="showcaseEditorList">
                    {profileForm.showcases.map((showcase) => (
                      <section
                        key={showcase.id}
                        className={
                          draggingShowcaseId === showcase.id
                            ? "showcaseEditorCard dragging"
                            : showcaseDropTargetId === showcase.id
                              ? "showcaseEditorCard dragTarget"
                              : "showcaseEditorCard"
                        }
                        onDragEnter={(e) => {
                          e.preventDefault();
                          if (!draggingShowcaseId || draggingShowcaseId === showcase.id) return;
                          setShowcaseDropTargetId(showcase.id);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (e.dataTransfer) {
                            e.dataTransfer.dropEffect = "move";
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const draggedId = draggingShowcaseId || e.dataTransfer.getData("text/plain");
                          if (!draggedId) return;
                          handleDropShowcase(draggedId, showcase.id);
                          setDraggingShowcaseId(null);
                          setShowcaseDropTargetId(null);
                        }}
                      >
                        <div className="showcaseEditorHeader">
                          <div className="showcaseEditorHeaderMain">
                            <p className={`showcaseKindPill ${showcase.kind}`}>{showcaseKindLabel(showcase.kind)}</p>
                            <p className="showcaseKindHint">{showcaseKindHint(showcase.kind)}</p>
                          </div>
                          <div className="showcaseEditorActions">
                            <span
                              className="showcaseDragHandle"
                              role="button"
                              tabIndex={0}
                              draggable
                              aria-label="Drag to reorder showcase"
                              title="Drag to reorder"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                }
                              }}
                              onDragStart={(e) => {
                                setDraggingShowcaseId(showcase.id);
                                setShowcaseDropTargetId(showcase.id);
                                if (e.dataTransfer) {
                                  e.dataTransfer.effectAllowed = "move";
                                  e.dataTransfer.setData("text/plain", showcase.id);
                                  const showcaseCard = e.currentTarget.closest(".showcaseEditorCard");
                                  if (showcaseCard) {
                                    const cardRect = showcaseCard.getBoundingClientRect();
                                    const offsetX = Math.max(0, e.clientX - cardRect.left);
                                    const offsetY = Math.max(0, e.clientY - cardRect.top);
                                    e.dataTransfer.setDragImage(showcaseCard, offsetX, offsetY);
                                  }
                                }
                              }}
                              onDragEnd={() => {
                                setDraggingShowcaseId(null);
                                setShowcaseDropTargetId(null);
                              }}
                            >
                              ⋮⋮
                            </span>
                            <button
                              type="button"
                              className="clearButton"
                              onClick={() => handleDuplicateShowcase(showcase.id)}
                              disabled={showcaseLimitReached}
                            >
                              Duplicate
                            </button>
                            <button
                              type="button"
                              className="clearButton"
                              onClick={() => handleRemoveShowcase(showcase.id)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <label>
                          Title
                          <input
                            value={showcase.title}
                            onChange={(e) => handleUpdateShowcase(showcase.id, { title: e.target.value })}
                            placeholder="Showcase title"
                            maxLength={SHOWCASE_MAX_TITLE_LENGTH}
                          />
                        </label>
                        <label>
                          Visibility
                          <select
                            value={showcase.visibility}
                            onChange={(e) =>
                              handleUpdateShowcase(showcase.id, {
                                visibility: normalizeShowcaseVisibility(e.target.value),
                              })
                            }
                          >
                            <option value="public">Public</option>
                            <option value="friends">Friends only</option>
                            <option value="private">Only me</option>
                          </select>
                        </label>
                        <p className="showcaseEditorMeta">
                          {showcaseVisibilityLabel(showcase.visibility)} · {showcaseSummary(showcase)}
                        </p>
                        {showcase.kind === "text" ? (
                          <label>
                            Content
                            <textarea
                              rows={4}
                              value={showcase.text}
                              onChange={(e) => handleUpdateShowcase(showcase.id, { text: e.target.value })}
                              placeholder="Write your featured section"
                              maxLength={SHOWCASE_MAX_TEXT_LENGTH}
                            />
                          </label>
                        ) : showcase.kind === "links" ? (
                          <label>
                            Links (one per line: `Label|https://url` or just URL)
                            <textarea
                              rows={4}
                              value={showcase.entries.join("\n")}
                              onChange={(e) =>
                                handleUpdateShowcase(showcase.id, { entries: parseShowcaseEntriesDraft(e.target.value) })
                              }
                              placeholder="Portfolio|https://example.com"
                            />
                          </label>
                        ) : showcase.kind === "stats" ? (
                          <label>
                            Stats (one per line: `Label: Value`)
                            <textarea
                              rows={4}
                              value={showcase.entries.join("\n")}
                              onChange={(e) =>
                                handleUpdateShowcase(showcase.id, { entries: parseShowcaseEntriesDraft(e.target.value) })
                              }
                              placeholder="Wins: 120"
                            />
                          </label>
                        ) : (
                          <label>
                            Image URLs (one per line)
                            <textarea
                              rows={4}
                              value={showcase.entries.join("\n")}
                              onChange={(e) =>
                                handleUpdateShowcase(showcase.id, { entries: parseShowcaseEntriesDraft(e.target.value) })
                              }
                              placeholder="https://..."
                            />
                          </label>
                        )}
                        <div className="showcaseEditorPreview">
                          <p className="sectionLabel">Live Preview</p>
                          <section className="profileShowcaseCard compact">
                            <div className="profileShowcaseHeadRow">
                              <p className="profileShowcaseTitle">{showcase.title || "Showcase"}</p>
                              <span className={`profileShowcaseKindTag ${showcase.kind}`}>
                                {showcaseKindLabel(showcase.kind)}
                              </span>
                            </div>
                            {renderProfileShowcaseContent(showcase)}
                          </section>
                        </div>
                      </section>
                    ))}
                  </div>
                )}

                <button type="submit" disabled={profileSaveBusy}>
                  {profileSaveBusy ? "Saving..." : "Save Showcases"}
                </button>
              </form>
            ) : settingsTab === "notifications" ? (
              <form className="settingsForm" onSubmit={handleSaveNotificationSettings}>
                <p className="sectionLabel">Notification Preferences</p>
                <label className="permissionToggle settingsToggle">
                  <input
                    type="checkbox"
                    checked={profileForm.notificationsEnabled}
                    onChange={(e) =>
                      setProfileForm((prev) => {
                        const enabled = e.target.checked;
                        return {
                          ...prev,
                          notificationsEnabled: enabled,
                          notifyDmMessages: enabled ? prev.notifyDmMessages : false,
                          notifyDmCalls: enabled ? prev.notifyDmCalls : false,
                        };
                      })
                    }
                  />
                  <span>Enable desktop notifications</span>
                </label>

                <label className="permissionToggle settingsToggle">
                  <input
                    type="checkbox"
                    checked={profileForm.notifyDmMessages}
                    disabled={!profileForm.notificationsEnabled}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, notifyDmMessages: e.target.checked }))}
                  />
                  <span>Notify for new direct messages</span>
                </label>

                <label className="permissionToggle settingsToggle">
                  <input
                    type="checkbox"
                    checked={profileForm.notifyDmCalls}
                    disabled={!profileForm.notificationsEnabled}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, notifyDmCalls: e.target.checked }))}
                  />
                  <span>Notify for incoming DM calls</span>
                </label>

                <p className="smallMuted">
                  Notifications use your browser/Electron desktop permission. You can change this later in system settings.
                </p>

                <button type="submit" disabled={profileSaveBusy}>
                  {profileSaveBusy ? "Saving..." : "Save Notification Settings"}
                </button>
              </form>
            ) : (
              <div
                className={`profilePreviewCard ${profileForm.cardStyle}`}
                style={{
                  background: `linear-gradient(150deg, ${profileForm.backgroundFrom}, ${profileForm.backgroundTo})`,
                  borderColor: profileForm.accentColor,
                }}
              >
                <div
                  className="profileBanner"
                  style={
                    profileForm.bannerUrl
                      ? { backgroundImage: `url(${profileForm.bannerUrl})`, backgroundSize: "cover" }
                      : undefined
                  }
                />
                <div
                  className="profileAvatarLarge withPresence"
                  style={{ borderColor: profileForm.accentColor }}
                  title={`Status: ${currentUserPresenceLabel}`}
                >
                  {profileForm.avatarUrl ? (
                    <img src={profileForm.avatarUrl} alt="Avatar" />
                  ) : (
                    <span>{initialsFromName(displayName)}</span>
                  )}
                  <span className={`profilePresenceDot ${currentUserPresenceStatus}`} aria-hidden="true" />
                </div>
                <h2>{displayName}</h2>
                <p className={`profilePresenceText ${currentUserPresenceStatus}`}>{currentUserPresenceLabel}</p>
                <p>{profileForm.bio || "No bio yet. Edit your profile to personalize this page."}</p>
                <p className="sectionLabel">Showcases</p>
                {renderProfileShowcaseList(previewShowcases)}
              </div>
            )}

            {onLogout && (
              <div className="settingsAccountActions">
                <button className="logoutButton" type="button" onClick={onLogout}>
                  Log out
                </button>
              </div>
            )}
          </section>
        ) : viewMode === "glytch-settings" ? (
          <section className="settingsPage" aria-label="Glytch settings">
            <div className="settingsTabs">
              <button
                className={glytchSettingsTab === "profile" ? "tab active" : "tab"}
                type="button"
                onClick={() => setGlytchSettingsTab("profile")}
              >
                Profile
              </button>
              <button
                className={glytchSettingsTab === "roles" ? "tab active" : "tab"}
                type="button"
                onClick={() => setGlytchSettingsTab("roles")}
              >
                Roles
              </button>
              <button
                className={glytchSettingsTab === "moderation" ? "tab active" : "tab"}
                type="button"
                onClick={() => setGlytchSettingsTab("moderation")}
              >
                Moderation
              </button>
              <button
                className={glytchSettingsTab === "channels" ? "tab active" : "tab"}
                type="button"
                onClick={() => setGlytchSettingsTab("channels")}
              >
                Channels
              </button>
            </div>

            {glytchSettingsTab === "profile" ? (
              <section className="requestSection">
                <p className="sectionLabel">Glytch Profile</p>
                {glytchProfileError && <p className="chatError">{glytchProfileError}</p>}
                {glytchIconError && <p className="chatError">{glytchIconError}</p>}
                {glytchDeleteError && <p className="chatError">{glytchDeleteError}</p>}
                {activeGlytch ? (
                  <>
                    <p className="inviteCode">Invite code: {activeGlytch.invite_code}</p>
                    <div className="glytchIconEditor">
                      <span className="glytchIconPreview" aria-hidden="true">
                        {activeGlytch.icon_url ? (
                          <img src={activeGlytch.icon_url} alt="" />
                        ) : (
                          <span>{initialsFromName(activeGlytch.name)}</span>
                        )}
                      </span>
                      {canEditGlytchProfileInActiveGlytch ? (
                        <label className="uploadButton">
                          {glytchIconBusy ? "Uploading..." : "Upload Glytch Icon"}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            onChange={handleGlytchIconUpload}
                            disabled={glytchIconBusy}
                          />
                        </label>
                      ) : (
                        <p className="smallMuted">You do not have permission to change the icon.</p>
                      )}
                    </div>

                    {canEditGlytchProfileInActiveGlytch ? (
                      <>
                        <form className="stackedForm" onSubmit={handleSaveGlytchProfile}>
                          <input
                            value={glytchProfileNameDraft}
                            onChange={(e) => setGlytchProfileNameDraft(e.target.value)}
                            placeholder="Glytch name"
                            aria-label="Glytch name"
                          />
                          <textarea
                            value={glytchProfileBioDraft}
                            onChange={(e) => setGlytchProfileBioDraft(e.target.value)}
                            placeholder="Glytch bio"
                            aria-label="Glytch bio"
                            rows={4}
                          />
                          <button type="submit" disabled={glytchProfileBusy}>
                            {glytchProfileBusy ? "Saving..." : "Save Glytch Profile"}
                          </button>
                        </form>

                        {isActiveGlytchOwner && (
                          <form className="stackedForm dangerZone" onSubmit={handleDeleteGlytch}>
                            <p className="sectionLabel">Danger Zone</p>
                            <p className="smallMuted">
                              Type <strong>{activeGlytch.name}</strong> to permanently delete this Glytch.
                              This removes channels, messages, members, and roles.
                            </p>
                            <input
                              value={glytchDeleteConfirmName}
                              onChange={(e) => setGlytchDeleteConfirmName(e.target.value)}
                              placeholder={`Type ${activeGlytch.name} to confirm`}
                              aria-label="Type glytch name to confirm delete"
                            />
                            <button
                              type="submit"
                              className="dangerButton"
                              disabled={glytchDeleteBusy || !canConfirmDeleteActiveGlytch}
                            >
                              {glytchDeleteBusy ? "Deleting..." : "Delete Glytch"}
                            </button>
                          </form>
                        )}
                      </>
                    ) : (
                      <p className="smallMuted">{activeGlytch.bio || "No Glytch bio yet."}</p>
                    )}
                  </>
                ) : (
                  <p className="smallMuted">Select a Glytch first.</p>
                )}
              </section>
            ) : glytchSettingsTab === "roles" ? (
              <section className="requestSection">
                <p className="sectionLabel">Role Settings</p>
                {roleError && <p className="chatError">{roleError}</p>}

                {canManageRolesInActiveGlytch ? (
                  <>
                    <div className="subModeSwitch">
                      <button
                        className={roleSettingsMode === "new-role" ? "channelItem active" : "channelItem"}
                        type="button"
                        onClick={() => setRoleSettingsMode("new-role")}
                      >
                        New Role
                      </button>
                      <button
                        className={roleSettingsMode === "permissions" ? "channelItem active" : "channelItem"}
                        type="button"
                        onClick={() => setRoleSettingsMode("permissions")}
                      >
                        Permissions
                      </button>
                    </div>

                    {roleSettingsMode === "new-role" ? (
                      <>
                        <form className="stackedForm" onSubmit={handleCreateRole}>
                          <input
                            value={roleNameDraft}
                            onChange={(e) => setRoleNameDraft(e.target.value)}
                            placeholder="New role name"
                            aria-label="Role name"
                          />
                          <input
                            type="color"
                            value={roleColorDraft}
                            onChange={(e) => setRoleColorDraft(e.target.value)}
                            aria-label="Role color"
                          />
                          <button type="submit">Create Role</button>
                        </form>

                        <form className="stackedForm" onSubmit={handleAssignRole}>
                          <select
                            value={selectedMemberId}
                            onChange={(e) => setSelectedMemberId(e.target.value)}
                            aria-label="Member"
                          >
                            {glytchMembersUi.map((member) => (
                              <option key={member.userId} value={member.userId}>
                                {member.userId === activeGlytchOwnerId ? `👑 ${member.name}` : member.name}
                              </option>
                            ))}
                          </select>
                          <select
                            value={selectedRoleId ?? ""}
                            onChange={(e) => {
                              const parsed = Number(e.target.value);
                              setSelectedRoleId(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
                            }}
                            aria-label="Role"
                          >
                            {glytchRoles.map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.name}
                              </option>
                            ))}
                          </select>
                          <button type="submit">Assign Role</button>
                        </form>

                        {glytchMembersUi.map((member) => (
                          <p key={member.userId} className="smallMuted">
                            {member.name}
                            {member.userId === activeGlytchOwnerId && (
                              <span className="ownerCrown" aria-label="Glytch owner" title="Glytch owner">
                                👑
                              </span>
                            )}
                            :{" "}
                            {member.roles.length > 0 ? (
                              <span className="memberRoleInlineList">
                                {member.roles.map((roleName) => (
                                  <span
                                    key={`${member.userId}:${roleName}`}
                                    className="roleColorBadge"
                                    style={roleColorVars(roleColorByName.get(roleName) || null)}
                                  >
                                    {roleName}
                                  </span>
                                ))}
                              </span>
                            ) : (
                              "No roles"
                            )}
                          </p>
                        ))}
                      </>
                    ) : (
                      <>
                        <div className="stackedForm">
                          <p className="sectionLabel">Role Hierarchy</p>
                          <p className="smallMuted">
                            Drag roles to change hierarchy. Members are grouped by their highest role in this order.
                          </p>
                          <p className="smallMuted">Owner is pinned to the top.</p>
                          <div className="roleHierarchyList">
                            {hierarchyRoles.map((role) => {
                              const isOwnerPinned = role.is_system && role.name === "Owner";
                              const isDragging = draggingRoleId === role.id;
                              const isDropTarget =
                                roleHierarchyDropTargetId === role.id && draggingRoleId !== null && draggingRoleId !== role.id;
                              return (
                                <div
                                  key={role.id}
                                  className={`roleHierarchyRow${isDragging ? " dragging" : ""}${isDropTarget ? " dropTarget" : ""}${isOwnerPinned ? " locked" : ""}`}
                                  draggable={!isOwnerPinned && !roleHierarchyBusy}
                                  onDragStart={(e) => {
                                    if (isOwnerPinned || roleHierarchyBusy) return;
                                    e.dataTransfer.effectAllowed = "move";
                                    setDraggingRoleId(role.id);
                                    setRoleHierarchyDropTargetId(role.id);
                                  }}
                                  onDragOver={(e) => {
                                    if (roleHierarchyBusy || draggingRoleId === null) return;
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = "move";
                                    if (!isOwnerPinned) {
                                      setRoleHierarchyDropTargetId(role.id);
                                    }
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    if (roleHierarchyBusy || draggingRoleId === null) return;
                                    void handleRoleHierarchyDrop(role.id);
                                  }}
                                  onDragEnd={() => {
                                    setDraggingRoleId(null);
                                    setRoleHierarchyDropTargetId(null);
                                  }}
                                >
                                  <span className="roleHierarchyHandle" aria-hidden="true">
                                    {isOwnerPinned ? "★" : "⋮⋮"}
                                  </span>
                                  <span className="roleHierarchyName" style={roleColorVars(role.color)}>
                                    {role.name}
                                  </span>
                                  <span className="smallMuted">
                                    {isOwnerPinned ? "Pinned" : roleHierarchyBusy ? "Saving..." : "Drag"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="stackedForm">
                          <p className="sectionLabel">Permissions</p>
                          <p className="smallMuted">Select a role and toggle what it can do in this Glytch.</p>
                          <select
                            value={selectedPermissionRoleId ?? ""}
                            onChange={(e) => {
                              const parsed = Number(e.target.value);
                              setSelectedPermissionRoleId(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
                            }}
                            aria-label="Role to edit permissions"
                          >
                            {glytchRoles.map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.name}
                              </option>
                            ))}
                          </select>

                          {selectedPermissionRole ? (
                            <>
                              {ROLE_PERMISSION_OPTIONS.map((permissionOption) => {
                                const toggleBusyKey = `${selectedPermissionRole.id}:${permissionOption.key}`;
                                const isBusy = rolePermissionBusyKey === toggleBusyKey;
                                const isDisabled = selectedPermissionRole.is_system && selectedPermissionRole.name === "Owner";
                                return (
                                  <label key={permissionOption.key} className="permissionToggle">
                                    <input
                                      type="checkbox"
                                      checked={rolePermissionValue(selectedPermissionRole, permissionOption.key)}
                                      onChange={() => void handleToggleRolePermission(selectedPermissionRole, permissionOption.key)}
                                      disabled={isBusy || isDisabled}
                                    />
                                    <span>{permissionOption.label}</span>
                                  </label>
                                );
                              })}
                              {selectedPermissionRole.is_system && selectedPermissionRole.name === "Owner" && (
                                <p className="smallMuted">Owner permissions are always enabled.</p>
                              )}
                              <button
                                type="button"
                                className="dangerButton"
                                onClick={() => void handleDeleteRole()}
                                disabled={selectedPermissionRole.is_system || roleDeleteBusyId === selectedPermissionRole.id}
                              >
                                {roleDeleteBusyId === selectedPermissionRole.id ? "Deleting..." : "Delete Role"}
                              </button>
                              {selectedPermissionRole.is_system && (
                                <p className="smallMuted">System roles cannot be deleted.</p>
                              )}
                            </>
                          ) : (
                            <p className="smallMuted">Select a role to edit permissions.</p>
                          )}
                        </div>

                        <form className="stackedForm" onSubmit={handleSaveChannelPermissions}>
                          <p className="sectionLabel">Per-Channel Access</p>
                          <p className="smallMuted">
                            Applies only to members with this role. Owners always have full access.
                          </p>
                          <select
                            value={selectedPermissionRoleId ?? ""}
                            onChange={(e) => {
                              const parsed = Number(e.target.value);
                              setSelectedPermissionRoleId(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
                            }}
                            aria-label="Role for channel permissions"
                          >
                            {glytchRoles.map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.name}
                              </option>
                            ))}
                          </select>
                          <select
                            value={selectedPermissionChannelId ?? ""}
                            onChange={(e) => {
                              const parsed = Number(e.target.value);
                              setSelectedPermissionChannelId(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
                            }}
                            aria-label="Channel for role permissions"
                          >
                            {channels.map((channel) => (
                              <option key={channel.id} value={channel.id}>
                                {channel.kind === "voice" ? "🔊" : "#"} {channel.name}
                              </option>
                            ))}
                          </select>

                          <label className="permissionToggle">
                            <input
                              type="checkbox"
                              checked={channelPermissionCanView}
                              onChange={(e) => setChannelPermissionCanView(e.target.checked)}
                            />
                            <span>Can view channel</span>
                          </label>
                          <label className="permissionToggle">
                            <input
                              type="checkbox"
                              checked={channelPermissionCanSend}
                              onChange={(e) => setChannelPermissionCanSend(e.target.checked)}
                            />
                            <span>Can send messages (text)</span>
                          </label>
                          <label className="permissionToggle">
                            <input
                              type="checkbox"
                              checked={channelPermissionCanJoinVoice}
                              onChange={(e) => setChannelPermissionCanJoinVoice(e.target.checked)}
                            />
                            <span>Can join voice (voice)</span>
                          </label>
                          <button type="submit">Save Channel Access</button>
                        </form>
                      </>
                    )}
                  </>
                ) : (
                  <p className="smallMuted">You do not have permission to manage roles.</p>
                )}
              </section>
            ) : glytchSettingsTab === "moderation" ? (
              <section className="requestSection">
                <p className="sectionLabel">Member Moderation</p>
                {roleError && <p className="chatError">{roleError}</p>}
                {canBanMembersInActiveGlytch ? (
                  <>
                    <form className="stackedForm" onSubmit={handleBanMember}>
                      <p className="smallMuted">Ban removes a member and blocks rejoining. Kick removes them without banning so they can rejoin with an invite.</p>
                      <select
                        value={selectedBanMemberId}
                        onChange={(e) => setSelectedBanMemberId(e.target.value)}
                        aria-label="Member to ban"
                        disabled={bannableGlytchMembers.length === 0}
                      >
                        {bannableGlytchMembers.length === 0 ? (
                          <option value="">No members available to ban</option>
                        ) : (
                          bannableGlytchMembers.map((member) => (
                            <option key={member.userId} value={member.userId}>
                              {member.name}
                            </option>
                          ))
                        )}
                      </select>
                      <input
                        value={banReasonDraft}
                        onChange={(e) => setBanReasonDraft(e.target.value)}
                        placeholder="Reason (optional)"
                        aria-label="Ban reason"
                      />
                      <div className="moderationActionRow">
                        <button
                          type="submit"
                          disabled={
                            bannableGlytchMembers.length === 0 ||
                            !selectedBanMemberId ||
                            banActionBusyKey === `ban:${selectedBanMemberId}` ||
                            banActionBusyKey === `kick:${selectedBanMemberId}`
                          }
                        >
                          {banActionBusyKey === `ban:${selectedBanMemberId}` ? "Banning..." : "Ban Member"}
                        </button>
                        <button
                          type="button"
                          className="ghostButton"
                          onClick={() => void handleKickMember()}
                          disabled={
                            bannableGlytchMembers.length === 0 ||
                            !selectedBanMemberId ||
                            banActionBusyKey === `ban:${selectedBanMemberId}` ||
                            banActionBusyKey === `kick:${selectedBanMemberId}`
                          }
                        >
                          {banActionBusyKey === `kick:${selectedBanMemberId}` ? "Kicking..." : "Kick Member"}
                        </button>
                      </div>
                    </form>

                    <div className="stackedForm">
                      <p className="sectionLabel">Banned Members</p>
                      {glytchBansUi.length === 0 ? (
                        <p className="smallMuted">No banned members.</p>
                      ) : (
                        glytchBansUi.map((ban) => (
                          <div key={ban.userId} className="roleAccessRow">
                            <span className="friendAvatar" aria-hidden="true">
                              {ban.avatarUrl ? <img src={ban.avatarUrl} alt="" /> : <span>{initialsFromName(ban.name)}</span>}
                            </span>
                            <span>
                              {ban.name}
                              <span className="smallMuted"> · Banned by {ban.bannedByName}</span>
                              {ban.reason ? <span className="smallMuted"> · Reason: {ban.reason}</span> : null}
                            </span>
                            <button
                              type="button"
                              onClick={() => void handleUnbanMember(ban.userId)}
                              disabled={banActionBusyKey === `unban:${ban.userId}`}
                            >
                              {banActionBusyKey === `unban:${ban.userId}` ? "Unbanning..." : "Unban"}
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  <p className="smallMuted">You do not have permission to manage bans.</p>
                )}
              </section>
            ) : (
              <section className="requestSection">
                <p className="sectionLabel">Channel Settings</p>
                {glytchError && <p className="chatError">{glytchError}</p>}
                {roleError && <p className="chatError">{roleError}</p>}

                {canCreateChannelsInActiveGlytch && (
                  <>
                    <form className="stackedForm" onSubmit={handleCreateCategory}>
                      <p className="sectionLabel">Create Category</p>
                      <input
                        value={categoryNameDraft}
                        onChange={(e) => setCategoryNameDraft(e.target.value)}
                        placeholder="Category name"
                        aria-label="Category name"
                      />
                      <button type="submit">Create Category</button>
                    </form>

                    <button className="channelItem" type="button" onClick={() => setShowChannelCreate((prev) => !prev)}>
                      {showChannelCreate ? "Cancel New Channel" : "New Channel"}
                    </button>
                    {showChannelCreate && (
                      <form className="stackedForm" onSubmit={handleCreateChannel}>
                        <input
                          value={channelNameDraft}
                          onChange={(e) => setChannelNameDraft(e.target.value)}
                          placeholder="channel-name"
                          aria-label="Channel name"
                        />
                        <select
                          value={channelTypeDraft}
                          onChange={(e) => {
                            const nextType = e.target.value === "voice" ? "voice" : "text";
                            setChannelTypeDraft(nextType);
                            if (nextType === "text") {
                              setChannelVoiceUserLimitDraft("");
                            } else {
                              setChannelTextPostModeDraft("all");
                            }
                          }}
                          aria-label="Channel type"
                        >
                          <option value="text">Text Channel</option>
                          <option value="voice">Voice Channel</option>
                        </select>
                        {channelTypeDraft === "text" && (
                          <select
                            value={channelTextPostModeDraft}
                            onChange={(e) => setChannelTextPostModeDraft(normalizeTextPostMode(e.target.value))}
                            aria-label="Text channel message mode"
                          >
                            <option value="all">Allow all messages</option>
                            <option value="images_only">Images/GIFs only</option>
                            <option value="text_only">Text only</option>
                          </select>
                        )}
                        {channelTypeDraft === "voice" && (
                          <input
                            type="number"
                            min={1}
                            max={99}
                            value={channelVoiceUserLimitDraft}
                            onChange={(e) => setChannelVoiceUserLimitDraft(e.target.value)}
                            placeholder="Max users (optional)"
                            aria-label="Voice max users"
                          />
                        )}
                        <select
                          value={channelCategoryIdDraft}
                          onChange={(e) => setChannelCategoryIdDraft(e.target.value)}
                          aria-label="Channel category"
                        >
                          <option value="">No category</option>
                          {channelCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                        <button type="submit">Create Channel</button>
                      </form>
                    )}
                  </>
                )}

                {canManageChannelsInActiveGlytch && channels.length > 0 && (
                  <form className="stackedForm" onSubmit={handleSaveChannelSettings}>
                    <p className="sectionLabel">Edit Channel Settings</p>
                    <select
                      value={selectedChannelSettingsChannelId ?? ""}
                      onChange={(e) => {
                        const parsed = Number(e.target.value);
                        setSelectedChannelSettingsChannelId(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
                      }}
                      aria-label="Channel to edit"
                    >
                      {channels.map((channel) => (
                        <option key={channel.id} value={channel.id}>
                          {channel.kind === "voice" ? "🔊" : "#"} {channel.name}
                        </option>
                      ))}
                    </select>
                    {(channels.find((channel) => channel.id === selectedChannelSettingsChannelId)?.kind || "text") === "text" ? (
                      <select
                        value={channelSettingsTextPostMode}
                        onChange={(e) => setChannelSettingsTextPostMode(normalizeTextPostMode(e.target.value))}
                        aria-label="Text channel message mode"
                      >
                        <option value="all">Allow all messages</option>
                        <option value="images_only">Images/GIFs only</option>
                        <option value="text_only">Text only</option>
                      </select>
                    ) : (
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={channelSettingsVoiceUserLimit}
                        onChange={(e) => setChannelSettingsVoiceUserLimit(e.target.value)}
                        placeholder="Max users (blank = unlimited)"
                        aria-label="Voice max users"
                      />
                    )}
                    <button type="submit">Save Channel Settings</button>
                  </form>
                )}

                {!canCreateChannelsInActiveGlytch && !canManageChannelsInActiveGlytch && (
                  <p className="smallMuted">You do not have permission to create or manage channels.</p>
                )}
              </section>
            )}
          </section>
        ) : shouldHideGlytchMessageArea ? (
          <section className="glytchSelectionState" aria-label="Choose a Glytch">
            <p className="chatInfo">Choose a Glytch from the left panel to open its channels.</p>
          </section>
        ) : (
          <div
            ref={chatLayoutRef}
            className={viewMode === "glytch" ? "chatLayout withMembersPanel" : "chatLayout"}
            style={chatLayoutStyle}
          >
            <div className="chatStreamColumn">
              {shouldShowScreenSharePanel && (
                <article className="voicePanel screenSharePanel" aria-label="Screen share">
                  <p className="sectionLabel">Screen Share</p>
                  <div className="screenShareGrid">
                    {isScreenSharing && localScreenStream && (
                      <figure
                        className="screenShareTile self"
                        role="button"
                        tabIndex={0}
                        onClick={(e) => openVideoFullscreen(e.currentTarget)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openVideoFullscreen(e.currentTarget);
                          }
                        }}
                        title="Open shared screen fullscreen"
                      >
                        <button
                          type="button"
                          className="screenShareExitFullscreenButton"
                          onClick={(e) => {
                            e.stopPropagation();
                            closeVideoFullscreen();
                          }}
                        >
                          Exit Fullscreen
                        </button>
                        <video
                          ref={(videoEl) => attachVideoStream(videoEl, localScreenStream)}
                          autoPlay
                          playsInline
                          muted
                        />
                        <figcaption>{localScreenShareCaption}</figcaption>
                      </figure>
                    )}
                    {remoteScreenShares.map((share) => (
                      <figure
                        key={share.userId}
                        className="screenShareTile"
                        role="button"
                        tabIndex={0}
                        onClick={(e) => openVideoFullscreen(e.currentTarget)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openVideoFullscreen(e.currentTarget);
                          }
                        }}
                        title="Open shared screen fullscreen"
                      >
                        <button
                          type="button"
                          className="screenShareExitFullscreenButton"
                          onClick={(e) => {
                            e.stopPropagation();
                            closeVideoFullscreen();
                          }}
                        >
                          Exit Fullscreen
                        </button>
                        <video
                          ref={(videoEl) => attachVideoStream(videoEl, share.stream)}
                          autoPlay
                          playsInline
                        />
                        <figcaption>{share.name}</figcaption>
                      </figure>
                    ))}
                  </div>
                </article>
              )}
              {voiceRoomKey && (
                <article className="voicePanel dmVoicePanelTop" aria-label="Voice participants">
                  <p className="sectionLabel">Voice Chat</p>
                  {voiceParticipants.length === 0 ? (
                    <p className="smallMuted">No one is in voice right now.</p>
                  ) : viewMode === "dm" ? (
                    <div className="voiceParticipants avatarOnly">
                      {voiceParticipants.map((participant) => {
                        const participantIsMe = participant.userId === currentUserId;
                        const participantIsSpeaking = speakingUserIds.includes(participant.userId);
                        const participantIsDeafened = participantIsMe ? voiceDeafened : participant.deafened;
                        const participantIsMuted = participantIsMe ? effectiveVoiceMuted : participant.muted;
                        const participantIsPresenting = presentingUserIds.has(participant.userId);
                        const participantPresenceStatus = resolvePresenceForUser(participant.userId);
                        const participantPresenceTitle = `Status: ${presenceStatusLabel(participantPresenceStatus)}`;
                        const avatarClass = participantIsDeafened
                          ? "friendAvatar withPresence voiceAvatarOnly voiceStateAvatar voiceDeafenedAvatar"
                          : participantIsMuted
                            ? "friendAvatar withPresence voiceAvatarOnly voiceStateAvatar voiceMutedAvatar"
                            : participantIsSpeaking
                              ? "friendAvatar withPresence voiceAvatarOnly voiceSpeakingAvatar"
                              : "friendAvatar withPresence voiceAvatarOnly";
                        return (
                          <button
                            key={participant.userId}
                            type="button"
                            className="voiceAvatarOnlyButton"
                            onClick={() => void openProfileViewer(participant.userId)}
                            aria-label={`View ${participant.name} profile`}
                          >
                            <span className={avatarClass} title={participantPresenceTitle}>
                              {participant.avatarUrl ? (
                                <img src={participant.avatarUrl} alt={`${participant.name} avatar`} />
                              ) : (
                                <span>{initialsFromName(participant.name)}</span>
                              )}
                              {participantIsPresenting && (
                                <span className="voiceShareBadge" aria-label="Sharing screen" title="Sharing screen">
                                  <svg viewBox="0 0 24 24" role="presentation">
                                    <rect
                                      x="3"
                                      y="4"
                                      width="18"
                                      height="12"
                                      rx="2"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.8"
                                    />
                                    <path
                                      d="M8.5 20h7"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.8"
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                </span>
                              )}
                              {participantIsDeafened && (
                                <span className="voiceStatusBadge deafened" aria-label="Deafened" title="Deafened">
                                  <svg viewBox="0 0 24 24" role="presentation">
                                    <path
                                      d="M4 13a8 8 0 0 1 16 0"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.8"
                                      strokeLinecap="round"
                                    />
                                    <rect
                                      x="2.5"
                                      y="12"
                                      width="4.5"
                                      height="8"
                                      rx="2"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.8"
                                    />
                                    <rect
                                      x="17"
                                      y="12"
                                      width="4.5"
                                      height="8"
                                      rx="2"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.8"
                                    />
                                    <path
                                      d="M4 4l16 16"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                </span>
                              )}
                              {!participantIsDeafened && participantIsMuted && (
                                <span className="voiceStatusBadge muted" aria-label="Muted" title="Muted">
                                  <svg viewBox="0 0 24 24" role="presentation">
                                    <path
                                      d="M12 3a3 3 0 0 0-3 3v5a3 3 0 1 0 6 0V6a3 3 0 0 0-3-3Z"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.8"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                    <path
                                      d="M4 4l16 16"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                </span>
                              )}
                              <span className={`presenceDot ${participantPresenceStatus}`} aria-hidden="true" />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="voiceParticipants">
                      {voiceParticipants.map((participant) => {
                        const participantIsMe = participant.userId === currentUserId;
                        const participantIsSpeaking = speakingUserIds.includes(participant.userId);
                        const showSpeakingRing = participantIsSpeaking;
                        const participantIsDeafened = participantIsMe ? voiceDeafened : participant.deafened;
                        const participantIsMuted = participantIsMe ? effectiveVoiceMuted : participant.muted;
                        const participantIsPresenting = presentingUserIds.has(participant.userId);
                        const isRemoteParticipant = participant.userId !== currentUserId;
                        const canForceMuteOrDeafenParticipant =
                          canModerateCurrentVoiceRoom && isRemoteParticipant && canModerateVoiceMuteDeafenInActiveGlytch;
                        const canKickParticipant =
                          canModerateCurrentVoiceRoom && isRemoteParticipant && canModerateVoiceKickInActiveGlytch;
                        const canModerateParticipant = canForceMuteOrDeafenParticipant || canKickParticipant;
                        const volumePercent = Math.round(clampVoiceVolume(remoteUserVolumes[participant.userId] ?? 1) * 100);
                        const participantPresenceStatus = resolvePresenceForUser(participant.userId);
                        const participantPresenceTitle = `Status: ${presenceStatusLabel(participantPresenceStatus)}`;
                        const avatarClass = participantIsDeafened
                          ? "friendAvatar withPresence voiceStateAvatar voiceDeafenedAvatar"
                          : participantIsMuted
                            ? "friendAvatar withPresence voiceStateAvatar voiceMutedAvatar"
                            : showSpeakingRing
                              ? "friendAvatar withPresence voiceSpeakingAvatar"
                              : "friendAvatar withPresence";
                        return (
                          <div
                            key={participant.userId}
                            className={participantIsSpeaking ? "voiceParticipant speaking" : "voiceParticipant"}
                          >
                            <span className={avatarClass} title={participantPresenceTitle}>
                              {participant.avatarUrl ? (
                                <img src={participant.avatarUrl} alt={`${participant.name} avatar`} />
                              ) : (
                                <span>{initialsFromName(participant.name)}</span>
                              )}
                              {participantIsPresenting && (
                                <span className="voiceShareBadge" aria-label="Sharing screen" title="Sharing screen">
                                  <svg viewBox="0 0 24 24" role="presentation">
                                    <rect
                                      x="3"
                                      y="4"
                                      width="18"
                                      height="12"
                                      rx="2"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.8"
                                    />
                                    <path
                                      d="M8.5 20h7"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.8"
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                </span>
                              )}
                              {participantIsDeafened && (
                                <span className="voiceStatusBadge deafened" aria-label="Deafened" title="Deafened">
                                  <svg viewBox="0 0 24 24" role="presentation">
                                    <path
                                      d="M4 13a8 8 0 0 1 16 0"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.8"
                                      strokeLinecap="round"
                                    />
                                    <rect
                                      x="2.5"
                                      y="12"
                                      width="4.5"
                                      height="8"
                                      rx="2"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.8"
                                    />
                                    <rect
                                      x="17"
                                      y="12"
                                      width="4.5"
                                      height="8"
                                      rx="2"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.8"
                                    />
                                    <path
                                      d="M4 4l16 16"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                </span>
                              )}
                              {!participantIsDeafened && participantIsMuted && (
                                <span className="voiceStatusBadge muted" aria-label="Muted" title="Muted">
                                  <svg viewBox="0 0 24 24" role="presentation">
                                    <path
                                      d="M12 3a3 3 0 0 0-3 3v5a3 3 0 1 0 6 0V6a3 3 0 0 0-3-3Z"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.8"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                    <path
                                      d="M4 4l16 16"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                </span>
                              )}
                              <span className={`presenceDot ${participantPresenceStatus}`} aria-hidden="true" />
                            </span>
                            <span className="voiceParticipantName">
                              {participant.name}
                              {participant.userId === activeGlytchOwnerId && (
                                <span className="ownerCrown" aria-label="Glytch owner" title="Glytch owner">
                                  👑
                                </span>
                              )}
                            </span>
                            <div className="voiceParticipantControls">
                              {participantIsSpeaking && <span className="talkingTag">Talking</span>}
                              {participantIsDeafened ? (
                                <span className="mutedTag">
                                  {participant.moderatorForcedDeafened ? "Force Deafened" : "Deafened"}
                                </span>
                              ) : (
                                participantIsMuted && (
                                  <span className="mutedTag">
                                    {participant.moderatorForcedMuted ? "Force Muted" : "Muted"}
                                  </span>
                                )
                              )}
                              {isRemoteParticipant && (
                                <label className="voiceVolumeControl">
                                  <span className="voiceVolumeLabel">Volume</span>
                                  <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    step={5}
                                    value={volumePercent}
                                    onChange={(e) => handleSetRemoteUserVolume(participant.userId, Number(e.target.value) / 100)}
                                  />
                                  <span className="voiceVolumeValue">{volumePercent}%</span>
                                </label>
                              )}
                              {canModerateParticipant && (
                                <div className="voiceModerationControls">
                                  {canForceMuteOrDeafenParticipant && (
                                    <>
                                      <button
                                        type="button"
                                        className="voiceModerationButton"
                                        onClick={() => void handleModerateVoiceParticipant(participant, "toggleMute")}
                                        disabled={
                                          participant.moderatorForcedDeafened ||
                                          voiceModerationBusyKey === `toggleMute:${participant.userId}`
                                        }
                                      >
                                        {participant.moderatorForcedMuted ? "Unforce Mute" : "Force Mute"}
                                      </button>
                                      <button
                                        type="button"
                                        className="voiceModerationButton"
                                        onClick={() => void handleModerateVoiceParticipant(participant, "toggleDeafen")}
                                        disabled={voiceModerationBusyKey === `toggleDeafen:${participant.userId}`}
                                      >
                                        {participant.moderatorForcedDeafened ? "Unforce Deafen" : "Force Deafen"}
                                      </button>
                                    </>
                                  )}
                                  {canKickParticipant && (
                                    <button
                                      type="button"
                                      className="voiceModerationButton danger"
                                      onClick={() => void handleModerateVoiceParticipant(participant, "kick")}
                                      disabled={voiceModerationBusyKey === `kick:${participant.userId}`}
                                    >
                                      Kick
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </article>
              )}
              <section
                ref={messageDisplayRef}
                className={isCurrentMessageBackgroundForcedDefault ? "messagedisplay forceDefaultBackground" : "messagedisplay"}
                style={messageDisplayStyle}
                aria-label="Messages"
              >
                {voiceError && <p className="chatError">{voiceError}</p>}
                {viewMode === "dm" && !activeConversationId && (
                  <p className="chatInfo">Add friends and accept requests to start a private DM.</p>
                )}
                {viewMode === "glytch" && !activeChannelId && (
                  <p className="chatInfo">Choose a Glytch to see its channels and start chatting.</p>
                )}
                {viewMode === "glytch" && activeChannel?.kind === "voice" && (
                  <p className="chatInfo">This is a voice channel. Join voice to talk.</p>
                )}
                {viewMode === "glytch" && activeChannel?.kind === "text" && activeChannel.text_post_mode === "images_only" && (
                  <p className="chatInfo">This channel is set to images-only. Send images or GIFs.</p>
                )}
                {viewMode === "glytch" && activeChannel?.kind === "text" && activeChannel.text_post_mode === "text_only" && (
                  <p className="chatInfo">This channel is set to text-only. Images and GIFs are disabled.</p>
                )}
                {chatError && <p className="chatError">{chatError}</p>}

                {renderedMessageRows}

                {(viewMode === "dm"
                  ? !!activeConversationId
                  : !!activeChannelId && activeChannel?.kind !== "voice") &&
                  !loadingMessages &&
                  messages.length === 0 &&
                  !chatError && <p className="chatInfo">No messages yet. Send the first one.</p>}

                <div ref={messageEndRef} />
              </section>

              {(viewMode === "dm" || activeChannel?.kind !== "voice") && (
                <>
                  {composerAttachment && (
                    <div className="composerAttachmentPreview">
                      <img src={composerAttachment.previewUrl} alt="Attachment preview" />
                      <div className="composerAttachmentMeta">
                        <span>{composerAttachment.file.name}</span>
                        <small>{composerAttachment.attachmentType === "gif" ? "GIF" : "Image"}</small>
                      </div>
                      <button type="button" onClick={removeComposerAttachment} disabled={messageMediaBusy}>
                        Remove
                      </button>
                    </div>
                  )}

                  {selectedGif && (
                    <div className="composerAttachmentPreview">
                      <img src={selectedGif.previewUrl} alt="Selected GIF preview" />
                      <div className="composerAttachmentMeta">
                        <span>{selectedGif.description || "Selected GIF"}</span>
                        <small>GIF</small>
                      </div>
                      <button type="button" onClick={removeSelectedGif} disabled={messageMediaBusy}>
                        Remove
                      </button>
                    </div>
                  )}

                  {showEmojiPicker && (
                    <div className="emojiPicker" role="listbox" aria-label="Emoji picker">
                      {QUICK_EMOJIS.map((emoji) => (
                        <button key={emoji} type="button" onClick={() => handleInsertEmoji(emoji)} aria-label={`Insert ${emoji}`}>
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {showGifPicker && (
                    <div className="gifPicker" aria-label="GIF picker">
                      <div className="gifPickerTopBar">
                        <input
                          value={gifQueryDraft}
                          onChange={(e) => setGifQueryDraft(e.target.value)}
                          placeholder="Search GIFs"
                          aria-label="Search GIFs"
                          disabled={!canAttachMediaInCurrentView || messageMediaBusy}
                        />
                      </div>
                      {gifLoading ? (
                        <p className="smallMuted">Loading GIFs...</p>
                      ) : gifError ? (
                        <p className="chatError">{gifError}</p>
                      ) : gifResults.length === 0 ? (
                        <p className="smallMuted">No GIFs found.</p>
                      ) : (
                        <div className="gifGrid">
                          {gifResults.map((gif) => (
                            <button
                              key={gif.id}
                              type="button"
                              className="gifTile"
                              onClick={() => handleSelectGif(gif)}
                              aria-label={gif.description || "Select GIF"}
                            >
                              <img src={gif.previewUrl || gif.url} alt={gif.description || "GIF"} loading="lazy" />
                            </button>
                          ))}
                        </div>
                      )}
                      <p className="gifAttribution">
                        Powered by{" "}
                        <a href="https://giphy.com/" target="_blank" rel="noreferrer">
                          GIPHY
                        </a>
                      </p>
                    </div>
                  )}

                  <form className="messageSubmitArea" onSubmit={sendMessage}>
                    <label className="composerIconButton" aria-label="Attach image or GIF">
                      📎
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={handleComposerAttachmentChange}
                        disabled={!canAttachMediaInCurrentView || messageMediaBusy}
                      />
                    </label>
                    <button
                      type="button"
                      className="composerIconButton"
                      onClick={() => {
                        setShowEmojiPicker((prev) => !prev);
                        setShowGifPicker(false);
                      }}
                      disabled={!canComposeInCurrentView || messageMediaBusy}
                      aria-label="Open emoji picker"
                    >
                      😊
                    </button>
                    <button
                      type="button"
                      className={showGifPicker ? "composerIconButton active" : "composerIconButton"}
                      onClick={() => {
                        setShowGifPicker((prev) => !prev);
                        setShowEmojiPicker(false);
                      }}
                      disabled={!canAttachMediaInCurrentView || messageMediaBusy}
                      aria-label="Open GIF picker"
                    >
                      GIF
                    </button>
                    <input
                      ref={messageInputRef}
                      onChange={(e) => {
                        const nextHasDraftText = e.target.value.trim().length > 0;
                        setHasDraftText((prev) => (prev === nextHasDraftText ? prev : nextHasDraftText));
                      }}
                      placeholder={
                        viewMode === "dm"
                          ? activeConversationId
                            ? "Write a direct message"
                            : "Select a DM first"
                          : activeChannelId
                            ? activeChannel?.text_post_mode === "images_only"
                              ? "Images-only channel. Attach an image or GIF."
                              : activeChannel?.text_post_mode === "text_only"
                                ? "Text-only channel. Send text messages only."
                              : "Write a Glytch message"
                            : "Select a channel first"
                      }
                      aria-label="Message"
                      disabled={!canComposeInCurrentView || messageMediaBusy}
                    />
                    <button type="submit" disabled={!canSend}>
                      {messageMediaBusy ? "Uploading..." : "Send"}
                    </button>
                  </form>
                </>
              )}
            </div>

            {viewMode === "glytch" && (
              <div
                className={isMembersPanelResizing ? "membersPanelResizeHandle active" : "membersPanelResizeHandle"}
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize members panel"
                onPointerDown={handleMembersPanelResizeStart}
              />
            )}

            {viewMode === "glytch" && (
              <aside className="membersPanel" aria-label="Glytch members">
                <p className="sectionLabel">
                  Members {activeGlytchId ? `(${onlineGlytchMembersCount} online)` : ""}
                </p>
                {!activeGlytchId ? (
                  <p className="smallMuted">Select a Glytch to see members.</p>
                ) : glytchMembersUi.length === 0 ? (
                  <p className="smallMuted">No members found.</p>
                ) : (
                  <>
                    {groupedGlytchMembers.map((group) => (
                      <div key={group.key} className="membersRoleGroup">
                        <p className="membersRoleTitle" style={roleColorVars(group.color)}>
                          {group.label} ({group.members.length})
                        </p>
                        {group.members.map((member) => {
                          const status = resolvePresenceForUser(member.userId);
                          const statusLabel = presenceStatusLabel(status);
                          const statusTitle = `Status: ${statusLabel}`;
                          const isPresenting = presentingUserIds.has(member.userId);
                          const memberProfile = member.userId === currentUserId ? currentProfile : knownProfiles[member.userId];
                          const memberDisplayName = memberProfile?.display_name || member.name;
                          const memberUsername = memberProfile?.username || member.name;
                          const memberBio = memberProfile?.bio?.trim() || "No bio set.";
                          return (
                            <div key={member.userId} className="glytchMemberRow memberHoverCardAnchor">
                              <button
                                className="channelItem friendItem glytchMemberMain"
                                type="button"
                                onClick={() => void openProfileViewer(member.userId)}
                              >
                                <span className="friendAvatar withPresence" title={statusTitle}>
                                  {member.avatarUrl ? (
                                    <img src={member.avatarUrl} alt={`${member.name} avatar`} />
                                  ) : (
                                    <span>{initialsFromName(member.name)}</span>
                                  )}
                                  <span className={`presenceDot ${status}`} aria-hidden="true" />
                                </span>
                                <span className="glytchMemberMeta">
                                  <span className="glytchMemberNameRow">
                                    <span>{member.name}</span>
                                    {member.userId === activeGlytchOwnerId && (
                                      <span className="ownerCrown" aria-label="Glytch owner" title="Glytch owner">
                                        👑
                                      </span>
                                    )}
                                    {isPresenting && <span className="presentingBadge">Presenting</span>}
                                  </span>
                                </span>
                              </button>
                              <span className={`glytchMemberStatus ${status}`}>{statusLabel}</span>
                              <div className="memberHoverCard" role="tooltip">
                                <div className="memberHoverHeader">
                                  <span className="friendAvatar" aria-hidden="true">
                                    {member.avatarUrl ? (
                                      <img src={member.avatarUrl} alt="" />
                                    ) : (
                                      <span>{initialsFromName(member.name)}</span>
                                    )}
                                  </span>
                                  <div className="memberHoverMeta">
                                    <p className="memberHoverName">
                                      {memberDisplayName}
                                      {member.userId === activeGlytchOwnerId && (
                                        <span className="ownerCrown" aria-label="Glytch owner" title="Glytch owner">
                                          👑
                                        </span>
                                      )}
                                    </p>
                                    <p className="memberHoverUsername">@{memberUsername}</p>
                                    <p className={`memberHoverPresence ${status}`}>{statusLabel}</p>
                                  </div>
                                </div>
                                <p className="memberHoverBio">{memberBio}</p>
                                <p className="sectionLabel">Roles in This Glytch</p>
                                {member.roles.length > 0 ? (
                                  <span className="glytchMemberRoleList">
                                    {member.roles.map((roleName) => (
                                      <span
                                        key={`${member.userId}:hover:${roleName}`}
                                        className="roleColorBadge"
                                        style={roleColorVars(roleColorByName.get(roleName) || null)}
                                      >
                                        {roleName}
                                      </span>
                                    ))}
                                  </span>
                                ) : (
                                  <p className="smallMuted">No roles.</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </>
                )}
              </aside>
            )}
          </div>
        )}
      </main>

      {viewedProfile && (
        <div className="profileModalBackdrop" onClick={() => setViewedProfile(null)}>
          <section className="profileModal" onClick={(e) => e.stopPropagation()} aria-label="User profile">
            <button className="profileModalClose" type="button" onClick={() => setViewedProfile(null)}>
              Close
            </button>
            <div
              className={`profilePreviewCard ${viewedCardStyle}`}
              style={{
                background: `linear-gradient(150deg, ${viewedFrom}, ${viewedTo})`,
                borderColor: viewedAccent,
              }}
            >
              <div
                className="profileBanner"
                style={
                  viewedProfile.banner_url
                    ? { backgroundImage: `url(${viewedProfile.banner_url})`, backgroundSize: "cover" }
                    : undefined
                }
              />
              <div
                className="profileAvatarLarge withPresence"
                style={{ borderColor: viewedAccent }}
                title={`Status: ${viewedPresenceLabel}`}
              >
                {viewedProfile.avatar_url ? (
                  <img src={viewedProfile.avatar_url} alt={`${viewedDisplayName} avatar`} />
                ) : (
                  <span>{initialsFromName(viewedDisplayName)}</span>
                )}
                <span className={`profilePresenceDot ${viewedPresenceStatus}`} aria-hidden="true" />
              </div>
              <h2>{viewedDisplayName}</h2>
              <p className={`profilePresenceText ${viewedPresenceStatus}`}>{viewedPresenceLabel}</p>
              <p>{viewedProfile.bio || "No bio yet."}</p>
              <p className="sectionLabel">Showcases</p>
              {renderProfileShowcaseList(viewedShowcases)}
            </div>
            <div className="profileModalActions">
              {memberFriendActionError && <p className="chatError">{memberFriendActionError}</p>}
              {viewedCanAddFriend ? (
                <button
                  type="button"
                  className="ghostButton"
                  disabled={viewedActionBusy}
                  onClick={() => viewedProfileUserId && void handleSendFriendRequestToMember(viewedProfileUserId)}
                >
                  {viewedActionBusy && memberFriendActionType === "add" ? "Sending..." : "Add Friend"}
                </button>
              ) : viewedCanUnfriend ? (
                <button
                  type="button"
                  className="ghostButton"
                  disabled={viewedActionBusy}
                  onClick={() => viewedProfileUserId && void handleUnfriendUser(viewedProfileUserId)}
                >
                  {viewedActionBusy && memberFriendActionType === "remove" ? "Unfriending..." : "Unfriend"}
                </button>
              ) : (
                <p className="smallMuted">{viewedRelationshipLabel}</p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
