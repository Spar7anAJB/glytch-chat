import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ChangeEvent,
  CSSProperties,
  FormEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import {
  addDmMessageReaction,
  addGroupChatMembers,
  addGroupChatMessageReaction,
  addGlytchMessageReaction,
  acceptFriendRequest,
  banGlytchUser,
  createProfileComment,
  createDmMessage,
  createGroupChat,
  createGroupChatMessage,
  deleteDmMessage,
  deleteGlytch,
  deleteDmMessageReaction,
  deleteGroupChatMessageReaction,
  deleteGlytchMessageReaction,
  deleteProfileComment,
  deleteGlytchRole,
  createGlytch,
  createGlytchChannel,
  createGlytchChannelCategory,
  createGlytchMessage,
  fetchDmMessages,
  fetchGroupChatMessages,
  fetchLatestGroupChatMessages,
  fetchLatestDmMessages,
  fetchLatestGlytchMessages,
  fetchGlytchMessages,
  fetchProfilesByIds,
  findProfileByUsername,
  getGlytchBotSettings,
  joinPublicGlytch,
  getMyProfile,
  forceVoiceParticipantState,
  joinGlytchByCode,
  JoinGlytchBannedError,
  kickGlytchMember,
  kickVoiceParticipant,
  listDmConversations,
  listDmConversationUserStates,
  listGroupChatMembers,
  listGroupChatMessageReactions,
  listGroupChats,
  listProfileComments,
  listUnreadGroupChatCounts,
  listFriendRequests,
  listGlytchBans,
  listUnreadDmMessages,
  listGlytchChannels,
  listGlytchChannelCategories,
  listGlytchChannelRolePermissions,
  listGlytchMemberRoles,
  listGlytchMessageReactions,
  listGlytchMembers,
  listGlytchUnbanRequests,
  listGlytchRoles,
  listGlytches,
  listDmMessageReactions,
  listVoiceParticipants,
  getLatestVoiceSignalId,
  listVoiceSignals,
  joinVoiceRoom,
  leaveVoiceRoom,
  respondToFriendRequest,
  resolveMessageAttachmentUrl,
  markDmConversationRead,
  hideDmConversation,
  markGroupChatRead,
  assignGlytchRole,
  createGlytchRole,
  setGlytchProfile,
  setRoleChannelPermissions,
  setGlytchChannelSettings,
  setGlytchChannelTheme,
  setGlytchIcon,
  setDmConversationTheme,
  setDmConversationPinned,
  sendVoiceSignal,
  setVoiceState,
  searchGifLibrary,
  searchPublicGlytches,
  requestLivekitKrispToken,
  sendFriendRequest,
  ingestRemoteMessageAsset,
  reviewGlytchUnbanRequest,
  submitGlytchUnbanRequest,
  updateGlytchRolePermissions,
  updateGlytchRolePriority,
  updateGlytchBotSettings,
  updateMyPresence,
  updateMyProfileCustomization,
  unbanGlytchUser,
  unfriendUser,
  updateDmMessage,
  updateGroupChatMessage,
  updateGlytchMessage,
  uploadGlytchIcon,
  uploadMessageAsset,
  uploadProfileAsset,
  type DmConversation,
  type DmMessage,
  type DmMessageReaction,
  type FriendRequest,
  type GroupChatMember,
  type GroupChatMessageReaction,
  type Glytch,
  type GlytchChannel,
  type GlytchChannelCategory,
  type GlytchMember,
  type GlytchChannelRolePermission,
  type GlytchMessageReaction,
  type GlytchMemberRole,
  type GlytchBotSettings,
  type GlytchUnbanRequest,
  type GlytchBan,
  type GlytchRole,
  type MessageAttachmentType,
  type Profile,
  type ProfileComment,
  type PublicGlytchDirectoryEntry,
  type UserPresenceStatus,
  type GifResult,
  type VoiceParticipant,
  type VoiceSignal,
} from "./supabaseApi";
import { normalizeBackendApiBaseUrl } from "./lib/apiBase";
import { glytchesIconAssetUrl, logoAssetUrl, settingsIconAssetUrl } from "./lib/assets";
import { RnnoiseWorkletNode, loadRnnoise } from "@sapphi-red/web-noise-suppressor";
import rnnoiseWorkletPath from "@sapphi-red/web-noise-suppressor/rnnoiseWorklet.js?url";
import rnnoiseWasmPath from "@sapphi-red/web-noise-suppressor/rnnoise.wasm?url";
import rnnoiseSimdWasmPath from "@sapphi-red/web-noise-suppressor/rnnoise_simd.wasm?url";

type ChatDashboardProps = {
  currentUserId: string;
  currentUserName?: string;
  accessToken: string;
  onLogout?: () => void;
};

type ViewMode = "dm" | "group" | "glytch" | "glytch-settings" | "settings" | "patch-notes";
type GlytchActionMode = "none" | "create" | "join";
type DmPanelMode = "dms" | "friends";
type UnifiedSidebarView = "dms" | "glytches" | "groups" | "patch-notes";
type SettingsSection = "profile" | "system";
type SettingsTab =
  | "edit"
  | "theme"
  | "showcases"
  | "preview"
  | "notifications"
  | "privacy"
  | "accessibility"
  | "mic"
  | "updates";
type AppFontPreset = "cyber" | "clean" | "display" | "compact" | "modern" | "mono" | "serif";
type AvatarDecoration = "none" | "sparkle" | "crown" | "heart" | "bolt" | "moon" | "leaf" | "star";
type ProfileShowcaseLayout = "grid" | "stack";
type ProfileShowcaseCardStyle = "gradient" | "glass" | "solid";
type ProfileCommentsVisibility = "public" | "friends" | "private" | "off";
type GlytchSettingsTab = "profile" | "roles" | "moderation" | "bot" | "channels";
type RoleSettingsMode = "new-role" | "permissions";
type GlytchDirectoryTab = "my" | "discover";
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
  isPinned: boolean;
};

type DmInAppBanner = {
  conversationId: number;
  friendName: string;
  friendAvatarUrl: string;
  preview: string;
};

type AppGlyphKind = "glytch" | "settings" | "friends" | "group" | "discover" | "patch";
type AppGlyphSize = "small" | "medium" | "large";

type GroupChatWithMembers = {
  groupChatId: number;
  name: string;
  createdBy: string;
  createdAt: string;
  members: GroupChatMember[];
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
  editedAt: Date | null;
  reactions: UiMessageReaction[];
};

type UiMessageReaction = {
  emoji: string;
  count: number;
  reactedByMe: boolean;
};

type MessageContextMenuState = {
  messageId: number;
  x: number;
  y: number;
  canDelete: boolean;
  canEdit: boolean;
  canReply: boolean;
};

type DmSidebarContextMenuState = {
  conversationId: number;
  x: number;
  y: number;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
};

type DmNavContextMenuState = {
  x: number;
  y: number;
};

type ComposerReplyTarget = {
  messageId: number;
  senderName: string;
  preview: string;
};

type DmReplyMessagePayload = {
  replyToMessageId: number;
  replyToSenderName: string;
  replyPreview: string;
  body: string;
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
  displayName: string;
  username: string;
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
  appFontPreset: AppFontPreset;
  appTextColor: string;
  profileNameColor: string;
  profileBodyColor: string;
  showcaseAccentColor: string;
  showcaseLayout: ProfileShowcaseLayout;
  showcaseCardStyle: ProfileShowcaseCardStyle;
  profileCommentsVisibility: ProfileCommentsVisibility;
  avatarDecoration: AvatarDecoration;
  avatarDecorationColor: string;
  avatarDecorationBackground: string;
  dmBackgroundFrom: string;
  dmBackgroundTo: string;
  glytchBackgroundFrom: string;
  glytchBackgroundTo: string;
  dmBackgroundByConversation: Record<string, BackgroundGradient>;
  groupBackgroundByChat: Record<string, BackgroundGradient>;
  glytchBackgroundByChannel: Record<string, BackgroundGradient>;
  showcases: ProfileShowcase[];
  notificationsEnabled: boolean;
  notifyDmMessages: boolean;
  notifyDmCalls: boolean;
  notifyGlytchMessages: boolean;
  notifyFriendRequests: boolean;
  notifyFriendRequestAccepted: boolean;
  notifyInAppDmBanners: boolean;
  gameActivitySharingEnabled: boolean;
  thirdPartyIntegrationsEnabled: boolean;
  mutedDmConversationIds: number[];
  accessibilityReduceMotion: boolean;
  accessibilityHighContrast: boolean;
  accessibilityTextScale: number;
  accessibilityDyslexiaFont: boolean;
  accessibilityUnderlineLinks: boolean;
};

type ProfileCommentWithAuthor = {
  id: number;
  profileUserId: string;
  authorUserId: string;
  content: string;
  createdAt: string;
  authorName: string;
  authorAvatarUrl: string;
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

type UiGlytchUnbanRequest = {
  requestId: number;
  userId: string;
  name: string;
  avatarUrl: string;
  message: string | null;
  requestedAt: string;
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
type AppThemePreset = "default" | "legacy" | "neon" | "simplistic" | "ocean" | "sunset" | "mint";
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
const SHOWCASE_MAX_MODULES = 6;
const SHOWCASE_MAX_ENTRIES = 32;
const MAX_RENDERED_MESSAGES = 120;
const PROFILE_COMMENT_MAX_LENGTH = 400;
const SOUNDBOARD_MAX_CLIPS = 6;
const SOUNDBOARD_MAX_CLIP_BYTES = 2 * 1024 * 1024;
const SOUNDBOARD_STORAGE_KEY = "glytch.soundboard.clips.v1";
const DESKTOP_AUTO_UPDATE_WINDOWS_STORAGE_KEY = "glytch.desktopAutoUpdateWindows.v1";
const VOICE_MIC_SETTINGS_STORAGE_KEY = "glytch.voice.mic.settings.v1";
const LEGACY_DEFAULT_DM_CHAT_BACKGROUND: BackgroundGradient = {
  from: "#122341",
  to: "#0a162b",
  mode: "gradient",
};
const DEFAULT_DM_CHAT_BACKGROUND: BackgroundGradient = {
  from: "#152a4f",
  to: "#0c1a33",
  mode: "gradient",
};
const DEFAULT_GLYTCH_CHAT_BACKGROUND: BackgroundGradient = {
  from: "#152b4b",
  to: "#0c1a31",
  mode: "gradient",
};
const SHOWCASE_MAX_TITLE_LENGTH = 60;
const SHOWCASE_MAX_TEXT_LENGTH = 1000;
const GLYTCH_MAX_MEMBERS_MIN = 2;
const GLYTCH_MAX_MEMBERS_MAX = 5000;
const ACCESSIBILITY_TEXT_SCALE_MIN = 85;
const ACCESSIBILITY_TEXT_SCALE_MAX = 135;
const ACCESSIBILITY_TEXT_SCALE_DEFAULT = 100;
const BANNER_CROP_PREVIEW_WIDTH = 360;
const BANNER_CROP_PREVIEW_HEIGHT = 120;
const BANNER_OUTPUT_WIDTH = 1500;
const BANNER_OUTPUT_HEIGHT = 500;
const DEFAULT_PROFILE_NAME_COLOR = "#f3f4ff";
const DEFAULT_PROFILE_BODY_COLOR = "#e5def2";
const DEFAULT_SHOWCASE_ACCENT_COLOR = "#78dcff";
const DEFAULT_AVATAR_DECORATION_COLOR = "#ffffff";
const DEFAULT_AVATAR_DECORATION_BG = "#4e8cff";
const PRESENCE_HEARTBEAT_MS = 45_000;
const PRESENCE_AWAY_IDLE_MS = 5 * 60_000;
const PRESENCE_STALE_MS = 120_000;
const REMOTE_SCREEN_SHARE_PROMOTE_DELAY_MS = 900;
const REMOTE_SCREEN_SHARE_MUTE_GRACE_MS = 2500;
const REMOTE_SCREEN_SHARE_ENDED_GRACE_MS = 800;
const QUICK_EMOJIS = [
  "😀",
  "😁",
  "😂",
  "🤣",
  "😅",
  "😊",
  "🙂",
  "😉",
  "😍",
  "🥰",
  "😘",
  "😎",
  "🤩",
  "🥳",
  "😇",
  "🤔",
  "🙃",
  "😴",
  "😭",
  "😡",
  "🤯",
  "🤗",
  "🙌",
  "👏",
  "👍",
  "👎",
  "👌",
  "🙏",
  "💪",
  "🫶",
  "👀",
  "🔥",
  "✨",
  "💯",
  "🎉",
  "🎊",
  "❤️",
  "🧡",
  "💛",
  "💚",
  "💙",
  "💜",
  "🖤",
  "🤍",
  "💖",
  "⭐",
  "🌈",
  "🎮",
  "🚀",
  "🍕",
  "☕",
  "🎵",
  "📸",
];
const REACTION_EMOJIS = [
  "👍",
  "👎",
  "❤️",
  "🧡",
  "💛",
  "💚",
  "💙",
  "💜",
  "😂",
  "🤣",
  "😅",
  "😊",
  "😍",
  "😘",
  "😮",
  "😢",
  "😭",
  "😡",
  "🤯",
  "🤔",
  "🙌",
  "👏",
  "🔥",
  "✨",
  "🎉",
  "💯",
  "👌",
  "🙏",
  "👀",
  "🤝",
  "😎",
  "🥳",
  "🙂",
  "😉",
  "😁",
  "🤗",
  "😴",
  "🫶",
  "💪",
  "✅",
  "❌",
  "🚀",
  "🎮",
  "🍕",
  "☕",
  "🎵",
  "📸",
  "⭐",
  "🌈",
  "💖",
];
const GLYTCH_INVITE_MESSAGE_PREFIX = "[[GLYTCH_INVITE]]";
const DM_REPLY_MESSAGE_PREFIX = "[[DM_REPLY]]";
const MISSING_SELF_PARTICIPANT_MAX_MISSES = 8;
const RNNOISE_ENABLED = String(import.meta.env.VITE_RNNOISE_ENABLED || "true").toLowerCase() !== "false";
const LIVEKIT_KRISP_ENABLED = String(import.meta.env.VITE_LIVEKIT_KRISP_ENABLED || "false").toLowerCase() === "true";
const VOICE_MIC_INPUT_GAIN_MIN = 70;
const VOICE_MIC_INPUT_GAIN_MAX = 100;
const VOICE_MIC_INPUT_GAIN_DEFAULT = 100;
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
      bg: "#0b0f1a",
      panel: "#1a1f2e",
      panelBorder: "#3b82f6",
      text: "#f3f4f6",
      muted: "#9ca3af",
      accent: "#8b5cf6",
      accentStrong: "#ec4899",
      card: "#1a1f2e",
      cardBorder: "#3b82f6",
      bubbleBot: "#1a1f2e",
      bubbleMe: "#8b5cf6",
      hot: "#ec4899",
      orange: "#22d3ee",
      warn: "#21283a",
      violet: "#8b5cf6",
    },
    legacy: {
      bg: "#2f404d",
      panel: "#39515f",
      panelBorder: "#3d898d",
      text: "#e2dddf",
      muted: "#b0acb0",
      accent: "#85ebd9",
      accentStrong: "#3d898d",
      card: "#344a57",
      cardBorder: "#3d898d",
      bubbleBot: "#39515f",
      bubbleMe: "#3d898d",
      hot: "#85ebd9",
      orange: "#85ebd9",
      warn: "#2a3944",
      violet: "#36515b",
    },
    neon: {
      bg: "#120458",
      panel: "#1b0a66",
      panelBorder: "#7a04eb",
      text: "#fdf0ff",
      muted: "#d09be9",
      accent: "#ff00a0",
      accentStrong: "#fe75fe",
      card: "#220b72",
      cardBorder: "#7a04eb",
      bubbleBot: "#21096f",
      bubbleMe: "#7a04eb",
      hot: "#ff124f",
      orange: "#ff00a0",
      warn: "#2a0b7c",
      violet: "#7a04eb",
    },
    simplistic: {
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
      bg: "#f3f4f6",
      panel: "#e9ecf6",
      panelBorder: "#9ca3af",
      text: "#1a1f2e",
      muted: "#6c7280",
      accent: "#8b5cf6",
      accentStrong: "#ec4899",
      card: "#e1e6f4",
      cardBorder: "#9ca3af",
      bubbleBot: "#e6ebf9",
      bubbleMe: "#d9e5ff",
      hot: "#ec4899",
      orange: "#22d3ee",
      warn: "#d7deef",
      violet: "#e0d7ff",
    },
    legacy: {
      bg: "#eef4ff",
      panel: "#deebff",
      panelBorder: "#9dc8b8",
      text: "#1f3b33",
      muted: "#5d7d70",
      accent: "#3d898d",
      accentStrong: "#85ebd9",
      card: "#d4e3fb",
      cardBorder: "#8dbfae",
      bubbleBot: "#dce9ff",
      bubbleMe: "#c4e8da",
      hot: "#3d898d",
      orange: "#3d898d",
      warn: "#cbe3d7",
      violet: "#bcdacb",
    },
    neon: {
      bg: "#fff0ff",
      panel: "#ffe3ff",
      panelBorder: "#caa0f3",
      text: "#2a0c58",
      muted: "#7b54a1",
      accent: "#ff00a0",
      accentStrong: "#7a04eb",
      card: "#ffd3ff",
      cardBorder: "#b78dea",
      bubbleBot: "#ffd8ff",
      bubbleMe: "#f3b3ff",
      hot: "#ff124f",
      orange: "#7a04eb",
      warn: "#f1c6ff",
      violet: "#eab5ff",
    },
    simplistic: {
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

const APP_FONT_PRESET_LABELS: Record<AppFontPreset, string> = {
  cyber: "Cyber",
  clean: "Clean",
  display: "Display",
  compact: "Compact",
  modern: "Modern",
  mono: "Mono",
  serif: "Serif",
};

const APP_FONT_PRESET_STYLES: Record<AppFontPreset, { ui: string; display: string }> = {
  cyber: {
    ui: '"Orbitron", "Manrope", "Avenir Next", "Segoe UI", sans-serif',
    display: '"Orbitron", "Sora", "Manrope", "Avenir Next", sans-serif',
  },
  clean: {
    ui: '"Manrope", "Avenir Next", "Segoe UI", sans-serif',
    display: '"Manrope", "Sora", "Avenir Next", sans-serif',
  },
  display: {
    ui: '"Sora", "Manrope", "Avenir Next", sans-serif',
    display: '"Sora", "Orbitron", "Manrope", sans-serif',
  },
  compact: {
    ui: '"Rajdhani", "Orbitron", "Manrope", sans-serif',
    display: '"Rajdhani", "Sora", "Orbitron", sans-serif',
  },
  modern: {
    ui: '"Poppins", "Manrope", "Avenir Next", sans-serif',
    display: '"Poppins", "Sora", "Manrope", sans-serif',
  },
  mono: {
    ui: '"Space Mono", "SFMono-Regular", "Menlo", monospace',
    display: '"Space Mono", "Orbitron", "Manrope", monospace',
  },
  serif: {
    ui: '"Merriweather", "Georgia", serif',
    display: '"Merriweather", "Sora", serif',
  },
};

const AVATAR_DECORATION_LABELS: Record<AvatarDecoration, string> = {
  none: "None",
  sparkle: "Sparkle",
  crown: "Crown",
  heart: "Heart",
  bolt: "Bolt",
  moon: "Moon",
  leaf: "Leaf",
  star: "Star",
};

const AVATAR_DECORATION_GLYPHS: Record<Exclude<AvatarDecoration, "none">, string> = {
  sparkle: "✦",
  crown: "♕",
  heart: "♥",
  bolt: "⚡",
  moon: "☾",
  leaf: "❧",
  star: "★",
};
const AVATAR_DECORATION_HINTS: Record<AvatarDecoration, string> = {
  none: "No animation",
  sparkle: "Twinkling stars",
  crown: "Royal glow",
  heart: "Pulse aura",
  bolt: "Electric flicker",
  moon: "Orbiting moon",
  leaf: "Floating leaves",
  star: "Breathing halo",
};
const PROFILE_SETTINGS_TABS: SettingsTab[] = ["edit", "showcases", "preview"];
const SYSTEM_SETTINGS_TABS: SettingsTab[] = ["theme", "notifications", "privacy", "accessibility", "mic", "updates"];

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
  latency?: number | ConstrainDouble;
  voiceIsolation?: ConstrainBoolean;
  echoCancellationType?: string;
  googAutoGainControl?: boolean;
  googEchoCancellation?: boolean;
  googEchoCancellation2?: boolean;
  googDAEchoCancellation?: boolean;
  googExperimentalEchoCancellation?: boolean;
  googHighpassFilter?: boolean;
  googNoiseSuppression?: boolean;
  googNoiseSuppression2?: boolean;
  googAudioMirroring?: boolean;
  googAudioNetworkAdaptor?: boolean;
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

type SoundboardClip = {
  id: string;
  name: string;
  dataUrl: string;
};

type LivekitAudioTrackAdapter = {
  mediaStreamTrack: MediaStreamTrack;
  setProcessor: (processor: unknown) => Promise<void>;
  stopProcessor: (keepElement?: boolean) => Promise<void>;
};

type LivekitKrispProcessorAdapter = {
  onPublish: (room: unknown) => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<boolean | undefined>;
  isEnabled: () => boolean;
};

type LivekitKrispSessionCredentials = {
  url: string;
  token: string;
  expiresAtMs: number;
  roomKey: string;
};

type VoiceSuppressionProfile = "balanced" | "strong" | "ultra";

type VoiceMicSettings = {
  inputDeviceId: string;
  suppressionProfile: VoiceSuppressionProfile;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  voiceIsolation: boolean;
  inputGainPercent: number;
};

const DEFAULT_VOICE_MIC_SETTINGS: VoiceMicSettings = {
  inputDeviceId: "default",
  suppressionProfile: "strong",
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: false,
  voiceIsolation: true,
  inputGainPercent: VOICE_MIC_INPUT_GAIN_DEFAULT,
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatMessageTimestamp(date: Date): string {
  const ageMs = Date.now() - date.getTime();
  if (ageMs > 24 * 60 * 60 * 1000) {
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return formatTime(date);
}

function formatMessageDateDivider(date: Date): string {
  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function messageDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getFriendId(conversation: DmConversation, me: string) {
  return conversation.user_a === me ? conversation.user_b : conversation.user_a;
}

function sortDmsByPinned(items: DmWithFriend[], latestMessageIds: Record<number, number> = {}): DmWithFriend[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      if (a.item.isPinned !== b.item.isPinned) {
        return a.item.isPinned ? -1 : 1;
      }
      const aLatest = latestMessageIds[a.item.conversationId] || 0;
      const bLatest = latestMessageIds[b.item.conversationId] || 0;
      if (aLatest !== bLatest) {
        return bLatest - aLatest;
      }
      return a.index - b.index;
    })
    .map((entry) => entry.item);
}

function initialsFromName(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function normalizeUsernameLookupInput(rawUsername: string) {
  const normalized = rawUsername.trim().toLowerCase().replace(/^@+/, "");
  if (!normalized) return "";
  const hashIndex = normalized.lastIndexOf("#");
  if (hashIndex > 0) {
    const base = normalized.slice(0, hashIndex).replace(/[^a-z0-9]/g, "");
    const suffix = normalized.slice(hashIndex + 1).replace(/[^a-z0-9]/g, "");
    if (base && suffix.length === 6) {
      return `${base}${suffix}`;
    }
  }
  return normalized.replace(/[^a-z0-9]/g, "");
}

function ensureUsernameWithIdSuffixRaw(username: string, userId: string) {
  const normalizedUsername = normalizeUsernameLookupInput(username);
  if (!normalizedUsername) return "";
  if (normalizedUsername.length >= 9) return normalizedUsername;

  const normalizedUserId = userId.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const suffixSource = normalizedUserId.length > 0 ? normalizedUserId : "000000";
  const suffix = suffixSource.slice(-6).padStart(6, "0").slice(0, 6);
  return `${normalizedUsername}${suffix}`;
}

function formatUsernameWithId(username: string, userId: string) {
  const rawUsername = ensureUsernameWithIdSuffixRaw(username, userId);
  if (!rawUsername || rawUsername.length <= 6) return rawUsername;
  const base = rawUsername.slice(0, -6);
  const suffix = rawUsername.slice(-6);
  return `${base}#${suffix}`;
}

function formatGlytchNameWithId(name: string, id: number) {
  return `${name}#${id}`;
}

function normalizeTextPostMode(raw: unknown): TextPostMode {
  if (raw === "images_only" || raw === "text_only") {
    return raw;
  }
  return "all";
}

function normalizeVideoShareKind(raw: unknown): LocalVideoShareKind | null {
  if (raw === "camera" || raw === "screen") {
    return raw;
  }
  return null;
}

function inferVideoShareKindFromTrack(track: MediaStreamTrack): LocalVideoShareKind | null {
  if (typeof track.getSettings !== "function") {
    return null;
  }
  const settings = track.getSettings() as MediaTrackSettings & { displaySurface?: string };
  const displaySurface = settings.displaySurface;
  if (displaySurface === "monitor" || displaySurface === "window" || displaySurface === "browser") {
    return "screen";
  }
  return "camera";
}

function normalizeAppTheme(raw: unknown): AppThemePreset {
  // Map legacy "classic" values to the 0.1 palette so old profiles remain valid.
  if (raw === "classic") {
    return "legacy";
  }
  if (raw === "default" || raw === "legacy" || raw === "neon" || raw === "simplistic" || raw === "ocean" || raw === "sunset" || raw === "mint") {
    return raw;
  }
  return "simplistic";
}

function normalizeAppThemeMode(raw: unknown): AppThemeMode {
  if (raw === "light") {
    return "light";
  }
  return "dark";
}

function normalizeAppFontPreset(raw: unknown): AppFontPreset {
  if (raw === "clean" || raw === "display" || raw === "compact" || raw === "modern" || raw === "mono" || raw === "serif") {
    return raw;
  }
  return "cyber";
}

function normalizeAvatarDecoration(raw: unknown): AvatarDecoration {
  if (raw === "sparkle" || raw === "crown" || raw === "heart" || raw === "bolt" || raw === "moon" || raw === "leaf" || raw === "star") {
    return raw;
  }
  return "none";
}

function normalizeProfileShowcaseLayout(raw: unknown): ProfileShowcaseLayout {
  if (raw === "stack") {
    return "stack";
  }
  return "grid";
}

function normalizeProfileShowcaseCardStyle(raw: unknown): ProfileShowcaseCardStyle {
  if (raw === "glass" || raw === "solid") {
    return raw;
  }
  return "gradient";
}

function normalizeProfileCommentsVisibility(raw: unknown): ProfileCommentsVisibility {
  if (raw === "friends" || raw === "private" || raw === "off") {
    return raw;
  }
  return "public";
}

function normalizeAccessibilityTextScale(raw: unknown): number {
  const parsed = typeof raw === "number" ? raw : Number.parseInt(String(raw || ""), 10);
  if (!Number.isFinite(parsed)) return ACCESSIBILITY_TEXT_SCALE_DEFAULT;
  return Math.max(ACCESSIBILITY_TEXT_SCALE_MIN, Math.min(ACCESSIBILITY_TEXT_SCALE_MAX, Math.trunc(parsed)));
}

function parseMutedDmConversationIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(
    new Set(
      raw
        .map((entry) => (typeof entry === "number" ? entry : Number.parseInt(String(entry || ""), 10)))
        .filter((entry) => Number.isFinite(entry) && entry > 0)
        .map((entry) => Math.trunc(entry)),
    ),
  );
}

function parseHexColor(raw: string): { r: number; g: number; b: number } | null {
  const normalized = raw.trim();
  const match = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return null;
  const hex = match[1].length === 3
    ? match[1]
        .split("")
        .map((char) => char + char)
        .join("")
    : match[1];
  const int = Number.parseInt(hex, 16);
  if (!Number.isFinite(int)) return null;
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function srgbToLinear(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(color: { r: number; g: number; b: number }): number {
  return 0.2126 * srgbToLinear(color.r) + 0.7152 * srgbToLinear(color.g) + 0.0722 * srgbToLinear(color.b);
}

function contrastRatio(colorA: { r: number; g: number; b: number }, colorB: { r: number; g: number; b: number }): number {
  const luminanceA = relativeLuminance(colorA);
  const luminanceB = relativeLuminance(colorB);
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

function minContrastRatioAgainstSurfaces(textColorHex: string, surfaceHexes: string[]): number | null {
  const parsedTextColor = parseHexColor(textColorHex);
  if (!parsedTextColor) return null;
  let minContrast: number | null = null;
  for (const surfaceHex of surfaceHexes) {
    const parsedSurfaceColor = parseHexColor(surfaceHex);
    if (!parsedSurfaceColor) continue;
    const ratio = contrastRatio(parsedTextColor, parsedSurfaceColor);
    minContrast = minContrast === null ? ratio : Math.min(minContrast, ratio);
  }
  return minContrast;
}

function ensureReadableTextColor(
  candidateHex: string,
  fallbackHex: string,
  surfaceHexes: string[],
  minimumContrast: number,
): string {
  const candidateContrast = minContrastRatioAgainstSurfaces(candidateHex, surfaceHexes);
  if (candidateContrast !== null && candidateContrast >= minimumContrast) {
    return candidateHex;
  }
  return fallbackHex;
}

function clampBannerCropOffsets(
  naturalSize: { width: number; height: number } | null,
  zoom: number,
  offsetX: number,
  offsetY: number,
): { x: number; y: number } {
  if (!naturalSize || naturalSize.width <= 0 || naturalSize.height <= 0) {
    return { x: 0, y: 0 };
  }
  const baseScale = Math.max(
    BANNER_CROP_PREVIEW_WIDTH / naturalSize.width,
    BANNER_CROP_PREVIEW_HEIGHT / naturalSize.height,
  );
  const totalScale = baseScale * Math.max(1, zoom);
  const renderedWidth = naturalSize.width * totalScale;
  const renderedHeight = naturalSize.height * totalScale;
  const maxX = Math.max(0, (renderedWidth - BANNER_CROP_PREVIEW_WIDTH) / 2);
  const maxY = Math.max(0, (renderedHeight - BANNER_CROP_PREVIEW_HEIGHT) / 2);
  return {
    x: Math.max(-maxX, Math.min(maxX, offsetX)),
    y: Math.max(-maxY, Math.min(maxY, offsetY)),
  };
}

function computeBannerCropSourceRect(
  naturalSize: { width: number; height: number },
  zoom: number,
  offsetX: number,
  offsetY: number,
): { sx: number; sy: number; sw: number; sh: number } {
  const baseScale = Math.max(
    BANNER_CROP_PREVIEW_WIDTH / naturalSize.width,
    BANNER_CROP_PREVIEW_HEIGHT / naturalSize.height,
  );
  const totalScale = baseScale * Math.max(1, zoom);
  const renderedWidth = naturalSize.width * totalScale;
  const renderedHeight = naturalSize.height * totalScale;
  const sw = BANNER_CROP_PREVIEW_WIDTH / totalScale;
  const sh = BANNER_CROP_PREVIEW_HEIGHT / totalScale;
  const sx = ((renderedWidth - BANNER_CROP_PREVIEW_WIDTH) / 2 - offsetX) / totalScale;
  const sy = ((renderedHeight - BANNER_CROP_PREVIEW_HEIGHT) / 2 - offsetY) / totalScale;
  const clampedSx = Math.max(0, Math.min(Math.max(0, naturalSize.width - sw), sx));
  const clampedSy = Math.max(0, Math.min(Math.max(0, naturalSize.height - sh), sy));
  return {
    sx: clampedSx,
    sy: clampedSy,
    sw: Math.max(1, Math.min(sw, naturalSize.width)),
    sh: Math.max(1, Math.min(sh, naturalSize.height)),
  };
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

function parseShowcaseStatProgress(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const percentMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*%$/);
  if (percentMatch) {
    const parsed = Number.parseFloat(percentMatch[1]);
    if (!Number.isFinite(parsed)) return null;
    return Math.max(0, Math.min(100, parsed));
  }

  if (!/^-?\d+(?:\.\d+)?$/.test(trimmed)) return null;
  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return null;
  return parsed;
}

function extractShowcaseLinkHost(href: string): string | null {
  try {
    const url = new URL(href);
    return url.hostname.replace(/^www\./i, "") || null;
  } catch {
    return null;
  }
}

function renderAvatarDecoration(
  decoration: AvatarDecoration,
  options: {
    color: string;
    background: string;
    size?: "normal" | "small";
  },
) {
  if (decoration === "none") return null;

  const style = {
    "--avatar-decor-color": options.color,
    "--avatar-decor-bg": options.background,
  } as CSSProperties;
  const sizeClass = options.size === "small" ? "small" : "";

  if (decoration === "sparkle") {
    return (
      <span className={`avatarDecorationLayer sparkle ${sizeClass}`.trim()} style={style} aria-hidden="true">
        <span className="sparkle s1">✦</span>
        <span className="sparkle s2">✦</span>
        <span className="sparkle s3">✦</span>
      </span>
    );
  }

  const glyph = AVATAR_DECORATION_GLYPHS[decoration] || "✦";
  return (
    <span className={`avatarDecorationLayer ${decoration} ${sizeClass}`.trim()} style={style} aria-hidden="true">
      {decoration === "crown" && <span className="avatarDecorationAura crownAura" />}
      {decoration === "heart" && <span className="avatarDecorationPulse heartPulse" />}
      {decoration === "bolt" && <span className="avatarDecorationTrail boltTrail" />}
      {decoration === "moon" && <span className="avatarDecorationOrbit moonOrbit" />}
      {decoration === "leaf" && (
        <>
          <span className="avatarDecorationFloat leafFloat l1">❧</span>
          <span className="avatarDecorationFloat leafFloat l2">❧</span>
        </>
      )}
      {decoration === "star" && <span className="avatarDecorationHalo starHalo" />}
      <span className="avatarDecorationGlyph">{glyph}</span>
    </span>
  );
}

function AppGlyphIcon({ kind, size = "small", className = "" }: { kind: AppGlyphKind; size?: AppGlyphSize; className?: string }) {
  const imageAssetUrl = kind === "glytch" ? glytchesIconAssetUrl : kind === "settings" ? settingsIconAssetUrl : null;
  let symbol: ReactNode = null;
  if (kind === "glytch") {
    symbol = (
      <>
        <path d="M6.7 6.7h10.7l-2.3 2.3H10v6h5.8v-2.1h-3l2-2h4v6H6.7z" />
        <path className="glyphTrail" d="M3.7 8.4h2.9M3.3 11h2.5M16.7 14.4h3.2M16 16.9h2.7" />
      </>
    );
  } else if (kind === "friends") {
    symbol = (
      <>
        <circle cx="9" cy="9" r="2.2" />
        <circle cx="14.4" cy="10" r="2" />
        <path d="M5.2 16.6c.8-2.2 2.3-3.4 3.9-3.4h2.2c1.6 0 3.1 1.2 3.9 3.4" />
        <path className="glyphTrail" d="M16.9 6.2v3.1M15.3 7.8h3.2" />
      </>
    );
  } else if (kind === "group") {
    symbol = (
      <>
        <path d="M6.1 7.2h8.6a2.2 2.2 0 0 1 2.2 2.2v3.8a2.2 2.2 0 0 1-2.2 2.2h-4.4l-2.8 2v-2H6.1A2.2 2.2 0 0 1 4 13.2V9.4a2.2 2.2 0 0 1 2.1-2.2Z" />
        <path className="glyphTrail" d="M13.1 5.1h5a1.8 1.8 0 0 1 1.8 1.8v3.2" />
      </>
    );
  } else if (kind === "discover") {
    symbol = (
      <>
        <circle cx="12" cy="12" r="7.2" />
        <path className="glyphFill" d="M14.9 9.1 10 10.8 8.3 15.7l4.9-1.8z" />
        <circle cx="12" cy="12" r="1.2" />
      </>
    );
  } else if (kind === "patch") {
    symbol = (
      <>
        <path d="M7 4.8h7l3 3v11a1.4 1.4 0 0 1-1.4 1.4H8.4A1.4 1.4 0 0 1 7 18.8V4.8Z" />
        <path d="M10 10h4.8M10 13h4.8M10 16h3.2" />
        <circle className="glyphBadge" cx="17.4" cy="17.2" r="3.2" />
        <path className="glyphBadgeCheck" d="m15.9 17.2 1.1 1.1 2.1-2.2" />
      </>
    );
  }

  if (imageAssetUrl) {
    return (
      <span
        className={["appGlyphIcon", `appGlyph-${size}`, className].filter(Boolean).join(" ")}
        data-kind={kind}
        aria-hidden="true"
      >
        <img src={imageAssetUrl} alt="" />
      </span>
    );
  }

  return (
    <span
      className={["appGlyphIcon", `appGlyph-${size}`, className].filter(Boolean).join(" ")}
      data-kind={kind}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" role="presentation">
        {symbol}
      </svg>
    </span>
  );
}

function normalizeBlockedWordsDraft(raw: string): string[] {
  return Array.from(new Set(
    raw
      .split(/[\n,]/)
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 0),
  )).slice(0, 200);
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
      background: "none",
      backgroundColor: background.from,
      backgroundImage: `url("${sanitizedUrl}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    };
  }

  return {
    backgroundColor: "transparent",
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

function buildMessageReactionMap(
  rows: Array<DmMessageReaction | GroupChatMessageReaction | GlytchMessageReaction>,
  currentUserId: string,
) {
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
      const editedAt = message.editedAt ? message.editedAt.getTime() : 0;
      return `${message.id}|${message.attachmentType || ""}|${readAt}|${editedAt}|${message.text}|${reactions}`;
    })
    .join("~");
}

function clampVoiceVolume(volume: number): number {
  if (!Number.isFinite(volume)) return 1;
  return Math.max(0, Math.min(2, volume));
}

function resolveRemoteVoiceOutputGain(volume: number): number {
  const normalized = clampVoiceVolume(volume);
  if (normalized <= 0) return 0;
  // Requested scaling:
  // 100% slider -> ~800% output gain
  // 200% slider -> ~1000% output gain
  if (normalized <= 1) {
    return normalized * 8;
  }
  return Math.min(10, 8 + (normalized - 1) * 2);
}

function normalizeVoiceSuppressionProfile(raw: unknown): VoiceSuppressionProfile {
  if (raw === "balanced" || raw === "strong" || raw === "ultra") return raw;
  return DEFAULT_VOICE_MIC_SETTINGS.suppressionProfile;
}

function normalizeMicInputGainPercent(raw: unknown): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return VOICE_MIC_INPUT_GAIN_DEFAULT;
  return Math.max(VOICE_MIC_INPUT_GAIN_MIN, Math.min(VOICE_MIC_INPUT_GAIN_MAX, Math.round(parsed)));
}

function normalizeMicInputDeviceId(raw: unknown): string {
  if (typeof raw !== "string") return "default";
  const trimmed = raw.trim();
  return trimmed || "default";
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

function serializeDmReplyMessage(payload: DmReplyMessagePayload): string {
  return `${DM_REPLY_MESSAGE_PREFIX}${JSON.stringify(payload)}`;
}

function parseLegacyDmReplyMessage(content: string): DmReplyMessagePayload | null {
  if (!content.startsWith("Reply to ")) return null;
  const firstNewlineIndex = content.indexOf("\n");
  const header = firstNewlineIndex >= 0 ? content.slice(0, firstNewlineIndex) : content;
  const body = firstNewlineIndex >= 0 ? content.slice(firstNewlineIndex + 1).trim() : "";
  const separatorIndex = header.indexOf(": ");
  if (separatorIndex <= "Reply to ".length) return null;

  const replyToSenderName = header.slice("Reply to ".length, separatorIndex).trim();
  const replyPreview = header.slice(separatorIndex + 2).trim();
  if (!replyToSenderName || !replyPreview) return null;

  return {
    replyToMessageId: 0,
    replyToSenderName,
    replyPreview,
    body,
  };
}

function parseDmReplyMessage(content: string): DmReplyMessagePayload | null {
  if (content.startsWith(DM_REPLY_MESSAGE_PREFIX)) {
    const jsonPart = content.slice(DM_REPLY_MESSAGE_PREFIX.length).trim();
    if (!jsonPart) return null;
    try {
      const parsed = JSON.parse(jsonPart) as Partial<DmReplyMessagePayload>;
      if (
        typeof parsed.replyToSenderName !== "string" ||
        parsed.replyToSenderName.trim().length === 0 ||
        typeof parsed.replyPreview !== "string" ||
        parsed.replyPreview.trim().length === 0 ||
        typeof parsed.body !== "string"
      ) {
        return null;
      }
      return {
        replyToMessageId:
          typeof parsed.replyToMessageId === "number" && Number.isFinite(parsed.replyToMessageId) && parsed.replyToMessageId > 0
            ? Math.trunc(parsed.replyToMessageId)
            : 0,
        replyToSenderName: parsed.replyToSenderName.trim(),
        replyPreview: parsed.replyPreview.trim(),
        body: parsed.body.trim(),
      };
    } catch {
      return null;
    }
  }

  return parseLegacyDmReplyMessage(content);
}

function buildReplyPreviewFromMessage(message: UiMessage): string {
  const rawText = (message.text || "").trim();
  const replyPayload = parseDmReplyMessage(rawText);
  let preview = replyPayload?.body || rawText;

  if (rawText.startsWith(GLYTCH_INVITE_MESSAGE_PREFIX)) {
    preview = "Glytch invite";
  }

  if (!preview) {
    if (message.attachmentType === "gif") preview = "[GIF]";
    else if (message.attachmentType === "image") preview = "[Image]";
    else preview = "[Message]";
  }

  const normalized = preview.replace(/\s+/g, " ").trim();
  if (normalized.length > 96) {
    return `${normalized.slice(0, 93)}...`;
  }
  return normalized;
}

function dmMessagePreviewText(message: Pick<DmMessage, "content" | "attachment_url">): string {
  const invite = parseGlytchInviteMessage(message.content || "");
  if (invite) {
    return `${invite.inviterName} invited you to join ${invite.glytchName}.`;
  }
  const reply = parseDmReplyMessage(message.content || "");
  if (reply) {
    return reply.body || `Reply to ${reply.replyToSenderName}: ${reply.replyPreview}`;
  }
  return message.content?.trim() || (message.attachment_url ? "Sent an image." : "Open DMs to read the latest message.");
}

function buildVoiceAudioConstraints(settings: VoiceMicSettings): VoiceAudioConstraints {
  const selectedDeviceId = normalizeMicInputDeviceId(settings.inputDeviceId);
  const isStrong = settings.suppressionProfile === "strong" || settings.suppressionProfile === "ultra";
  const isUltra = settings.suppressionProfile === "ultra";
  // Keep AGC off to avoid lifting output loudness while suppressing noise.
  const effectiveAutoGainControl = false;
  return {
    // Request stronger AEC/NS paths on Chromium while preserving standards fallbacks.
    deviceId: selectedDeviceId === "default" ? undefined : { ideal: selectedDeviceId },
    echoCancellation: settings.echoCancellation,
    echoCancellationType: "system",
    noiseSuppression: settings.noiseSuppression,
    autoGainControl: effectiveAutoGainControl,
    voiceIsolation: settings.voiceIsolation ? { ideal: true } : false,
    googAutoGainControl: effectiveAutoGainControl,
    googEchoCancellation: settings.echoCancellation,
    googEchoCancellation2: settings.echoCancellation && isStrong,
    googDAEchoCancellation: settings.echoCancellation && isUltra,
    googExperimentalEchoCancellation: settings.echoCancellation && isStrong,
    googHighpassFilter: true,
    googNoiseSuppression: settings.noiseSuppression,
    googNoiseSuppression2: settings.noiseSuppression && isStrong,
    googTypingNoiseDetection: false,
    googAudioMirroring: false,
    channelCount: { ideal: 1, max: 1 },
    sampleRate: { ideal: 48000 },
    sampleSize: { ideal: 16 },
    latency: { ideal: isUltra ? 0.006 : 0.01, max: isUltra ? 0.03 : 0.05 },
  };
}

function buildStrictVoiceAudioConstraints(settings: VoiceMicSettings): VoiceAudioConstraints {
  const selectedDeviceId = normalizeMicInputDeviceId(settings.inputDeviceId);
  const effectiveAutoGainControl = false;
  return {
    deviceId: selectedDeviceId === "default" ? undefined : { exact: selectedDeviceId },
    echoCancellation: { exact: settings.echoCancellation },
    noiseSuppression: { exact: settings.noiseSuppression },
    autoGainControl: { exact: effectiveAutoGainControl },
    echoCancellationType: "system",
    voiceIsolation: settings.voiceIsolation ? { ideal: true } : false,
    channelCount: { ideal: 1, max: 1 },
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
  const notifyGlytchMessages = typeof theme.notifyGlytchMessages === "boolean" ? theme.notifyGlytchMessages : true;
  const notifyFriendRequests = typeof theme.notifyFriendRequests === "boolean" ? theme.notifyFriendRequests : true;
  const notifyFriendRequestAccepted =
    typeof theme.notifyFriendRequestAccepted === "boolean" ? theme.notifyFriendRequestAccepted : true;
  const notifyInAppDmBanners =
    typeof theme.notifyInAppDmBanners === "boolean" ? theme.notifyInAppDmBanners : true;
  const gameActivitySharingEnabled =
    typeof theme.gameActivitySharingEnabled === "boolean" ? theme.gameActivitySharingEnabled : true;
  const thirdPartyIntegrationsEnabled =
    typeof theme.thirdPartyIntegrationsEnabled === "boolean" ? theme.thirdPartyIntegrationsEnabled : true;
  const mutedDmConversationIds = parseMutedDmConversationIds(theme.mutedDmConversationIds);
  const accessibilityReduceMotion = Boolean(theme.accessibilityReduceMotion);
  const accessibilityHighContrast = Boolean(theme.accessibilityHighContrast);
  const accessibilityTextScale = normalizeAccessibilityTextScale(theme.accessibilityTextScale);
  const accessibilityDyslexiaFont = Boolean(theme.accessibilityDyslexiaFont);
  const accessibilityUnderlineLinks = Boolean(theme.accessibilityUnderlineLinks);
  const dmBackgroundByConversation = normalizeBackgroundGradientMap(theme.dmBackgroundByConversation);
  const groupBackgroundByChat = normalizeBackgroundGradientMap(theme.groupBackgroundByChat);
  const glytchBackgroundByChannel = normalizeBackgroundGradientMap(theme.glytchBackgroundByChannel);
  const showcases = normalizeProfileShowcases(theme.showcases);
  const legacyThemeValue = typeof theme.appTheme === "string" ? theme.appTheme : "";
  const isLegacyLightPreset = legacyThemeValue === "light";
  const appThemeMode = isLegacyLightPreset ? "light" : normalizeAppThemeMode(theme.appThemeMode);
  const appTheme = isLegacyLightPreset ? "simplistic" : normalizeAppTheme(legacyThemeValue);
  const appThemePalette = APP_THEME_PALETTES[appThemeMode]?.[appTheme] || APP_THEME_PALETTES.dark.simplistic;
  const appFontPreset = normalizeAppFontPreset(theme.appFontPreset);
  const appTextColor = typeof theme.appTextColor === "string" ? theme.appTextColor : appThemePalette.text;
  const profileNameColor = typeof theme.profileNameColor === "string" ? theme.profileNameColor : DEFAULT_PROFILE_NAME_COLOR;
  const profileBodyColor = typeof theme.profileBodyColor === "string" ? theme.profileBodyColor : DEFAULT_PROFILE_BODY_COLOR;
  const showcaseAccentColor =
    typeof theme.showcaseAccentColor === "string" ? theme.showcaseAccentColor : DEFAULT_SHOWCASE_ACCENT_COLOR;
  const showcaseLayout = normalizeProfileShowcaseLayout(theme.showcaseLayout);
  const showcaseCardStyle = normalizeProfileShowcaseCardStyle(theme.showcaseCardStyle);
  const profileCommentsVisibility = normalizeProfileCommentsVisibility(theme.profileCommentsVisibility);
  const avatarDecoration = normalizeAvatarDecoration(theme.avatarDecoration);
  const avatarDecorationColor =
    typeof theme.avatarDecorationColor === "string" ? theme.avatarDecorationColor : DEFAULT_AVATAR_DECORATION_COLOR;
  const avatarDecorationBackground =
    typeof theme.avatarDecorationBackground === "string" ? theme.avatarDecorationBackground : DEFAULT_AVATAR_DECORATION_BG;
  const dmBackgroundFromRaw =
    typeof theme.dmBackgroundFrom === "string" ? theme.dmBackgroundFrom : DEFAULT_DM_CHAT_BACKGROUND.from;
  const dmBackgroundToRaw =
    typeof theme.dmBackgroundTo === "string" ? theme.dmBackgroundTo : DEFAULT_DM_CHAT_BACKGROUND.to;
  const normalizedDmBackgroundFrom = dmBackgroundFromRaw.trim().toLowerCase();
  const normalizedDmBackgroundTo = dmBackgroundToRaw.trim().toLowerCase();
  const isLegacyDefaultDmBackground =
    (normalizedDmBackgroundFrom === LEGACY_DEFAULT_DM_CHAT_BACKGROUND.from &&
      normalizedDmBackgroundTo === LEGACY_DEFAULT_DM_CHAT_BACKGROUND.to) ||
    (normalizedDmBackgroundFrom === LEGACY_DEFAULT_DM_CHAT_BACKGROUND.to &&
      normalizedDmBackgroundTo === LEGACY_DEFAULT_DM_CHAT_BACKGROUND.from);
  const dmBackgroundFrom = isLegacyDefaultDmBackground ? DEFAULT_DM_CHAT_BACKGROUND.from : dmBackgroundFromRaw;
  const dmBackgroundTo = isLegacyDefaultDmBackground ? DEFAULT_DM_CHAT_BACKGROUND.to : dmBackgroundToRaw;
  const profilePresenceStatus = normalizePresenceStatus(profile?.presence_status);
  const initialPresenceStatus = profilePresenceStatus === "away" ? "active" : profilePresenceStatus;
  return {
    displayName: profile?.display_name?.trim() || profile?.username || "User",
    username: profile?.username || "",
    avatarUrl: profile?.avatar_url || "",
    bannerUrl: profile?.banner_url || "",
    bio: profile?.bio || "",
    presenceStatus: initialPresenceStatus,
    speakingRingColor: typeof theme.speakingRingColor === "string" ? theme.speakingRingColor : "#63b7ff",
    accentColor: typeof theme.accentColor === "string" ? theme.accentColor : "#4e8cff",
    backgroundFrom: typeof theme.backgroundFrom === "string" ? theme.backgroundFrom : "#101b2f",
    backgroundTo: typeof theme.backgroundTo === "string" ? theme.backgroundTo : "#0a111f",
    cardStyle: theme.cardStyle === "solid" ? "solid" : "glass",
    appThemeMode,
    appTheme,
    appFontPreset,
    appTextColor,
    profileNameColor,
    profileBodyColor,
    showcaseAccentColor,
    showcaseLayout,
    showcaseCardStyle,
    profileCommentsVisibility,
    avatarDecoration,
    avatarDecorationColor,
    avatarDecorationBackground,
    dmBackgroundFrom,
    dmBackgroundTo,
    glytchBackgroundFrom:
      typeof theme.glytchBackgroundFrom === "string" ? theme.glytchBackgroundFrom : DEFAULT_GLYTCH_CHAT_BACKGROUND.from,
    glytchBackgroundTo:
      typeof theme.glytchBackgroundTo === "string" ? theme.glytchBackgroundTo : DEFAULT_GLYTCH_CHAT_BACKGROUND.to,
    dmBackgroundByConversation,
    groupBackgroundByChat,
    glytchBackgroundByChannel,
    showcases,
    notificationsEnabled,
    notifyDmMessages,
    notifyDmCalls,
    notifyGlytchMessages,
    notifyFriendRequests,
    notifyFriendRequestAccepted,
    notifyInAppDmBanners,
    gameActivitySharingEnabled,
    thirdPartyIntegrationsEnabled,
    mutedDmConversationIds,
    accessibilityReduceMotion,
    accessibilityHighContrast,
    accessibilityTextScale,
    accessibilityDyslexiaFont,
    accessibilityUnderlineLinks,
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
    appFontPreset: form.appFontPreset,
    appTextColor: form.appTextColor,
    profileNameColor: form.profileNameColor,
    profileBodyColor: form.profileBodyColor,
    showcaseAccentColor: form.showcaseAccentColor,
    showcaseLayout: form.showcaseLayout,
    showcaseCardStyle: form.showcaseCardStyle,
    profileCommentsVisibility: form.profileCommentsVisibility,
    avatarDecoration: form.avatarDecoration,
    avatarDecorationColor: form.avatarDecorationColor,
    avatarDecorationBackground: form.avatarDecorationBackground,
    dmBackgroundFrom: form.dmBackgroundFrom,
    dmBackgroundTo: form.dmBackgroundTo,
    glytchBackgroundFrom: form.glytchBackgroundFrom,
    glytchBackgroundTo: form.glytchBackgroundTo,
    dmBackgroundByConversation: form.dmBackgroundByConversation,
    groupBackgroundByChat: form.groupBackgroundByChat,
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
    notifyGlytchMessages: form.notifyGlytchMessages,
    notifyFriendRequests: form.notifyFriendRequests,
    notifyFriendRequestAccepted: form.notifyFriendRequestAccepted,
    notifyInAppDmBanners: form.notifyInAppDmBanners,
    gameActivitySharingEnabled: form.gameActivitySharingEnabled,
    thirdPartyIntegrationsEnabled: form.thirdPartyIntegrationsEnabled,
    mutedDmConversationIds: form.mutedDmConversationIds,
    accessibilityReduceMotion: form.accessibilityReduceMotion,
    accessibilityHighContrast: form.accessibilityHighContrast,
    accessibilityTextScale: form.accessibilityTextScale,
    accessibilityDyslexiaFont: form.accessibilityDyslexiaFont,
    accessibilityUnderlineLinks: form.accessibilityUnderlineLinks,
  };
}

const GIF_STILL_CACHE = new Map<string, string | null>();
const GIF_STILL_PENDING = new Map<string, Promise<string | null>>();

async function decodeGifStillFrame(src: string): Promise<string | null> {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  if (typeof window.fetch !== "function" || typeof window.createImageBitmap !== "function") return null;

  const response = await fetch(src, { credentials: "omit" });
  if (!response.ok) return null;
  const blob = await response.blob();
  const bitmap = await window.createImageBitmap(blob);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(bitmap, 0, 0);
    return canvas.toDataURL("image/png");
  } finally {
    bitmap.close();
  }
}

function loadGifStillFrame(src: string): Promise<string | null> {
  if (GIF_STILL_CACHE.has(src)) {
    return Promise.resolve(GIF_STILL_CACHE.get(src) || null);
  }
  const pending = GIF_STILL_PENDING.get(src);
  if (pending) return pending;

  const nextPromise = decodeGifStillFrame(src)
    .catch(() => null)
    .then((stillSrc) => {
      GIF_STILL_CACHE.set(src, stillSrc);
      GIF_STILL_PENDING.delete(src);
      return stillSrc;
    });
  GIF_STILL_PENDING.set(src, nextPromise);
  return nextPromise;
}

type HoverGifImageProps = {
  src: string;
  alt: string;
  className: string;
  onError?: () => void;
};

type DesktopUpdatePlatform = "windows" | "mac" | "linux";

type DesktopUpdatePayload = {
  platform: DesktopUpdatePlatform;
  version: string;
  downloadPath: string;
  downloadUrl: string;
  fileName: string;
  sizeBytes: number;
  source: string;
  publishedAt: string | null;
  sha256: string | null;
};

function HoverGifImage({ src, alt, className, onError }: HoverGifImageProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [stillSrc, setStillSrc] = useState<string | null>(() => (GIF_STILL_CACHE.has(src) ? GIF_STILL_CACHE.get(src) || null : null));
  const [stillResolved, setStillResolved] = useState<boolean>(() => GIF_STILL_CACHE.has(src));

  useEffect(() => {
    let cancelled = false;
    setIsHovering(false);
    if (GIF_STILL_CACHE.has(src)) {
      setStillSrc(GIF_STILL_CACHE.get(src) || null);
      setStillResolved(true);
      return;
    }

    setStillSrc(null);
    setStillResolved(false);
    void loadGifStillFrame(src).then((nextStill) => {
      if (cancelled) return;
      setStillSrc(nextStill);
      setStillResolved(true);
    });

    return () => {
      cancelled = true;
    };
  }, [src]);

  const displaySrc = isHovering ? src : stillSrc;

  return (
    <span
      className={`messageGifShell${isHovering ? " playing" : ""}`}
      onPointerEnter={() => setIsHovering(true)}
      onPointerLeave={() => setIsHovering(false)}
      onPointerCancel={() => setIsHovering(false)}
    >
      {displaySrc ? (
        <img src={displaySrc} alt={alt} className={className} loading="lazy" draggable={false} onError={onError} />
      ) : (
        <span className="messageMedia messageMediaGifPlaceholder">{stillResolved ? "GIF" : "Loading GIF..."}</span>
      )}
    </span>
  );
}

function normalizeDesktopUpdatePlatform(platform: string | undefined): DesktopUpdatePlatform | null {
  if (!platform) return null;
  if (platform === "win32") return "windows";
  if (platform === "darwin") return "mac";
  if (platform === "linux") return "linux";
  return null;
}

function isElectronUserAgent(): boolean {
  if (typeof navigator === "undefined") return false;
  return /electron\/\d+/i.test(navigator.userAgent || "");
}

function inferDesktopPlatformFromNavigator(): DesktopUpdatePlatform | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";

  if (/win/i.test(platform) || /windows nt/i.test(ua)) return "windows";
  if (/mac/i.test(platform) || /mac os x|macintosh/i.test(ua)) return "mac";
  if (/linux/i.test(platform) || /linux/i.test(ua)) return "linux";
  return null;
}

function parseVersionParts(version: string): number[] {
  const clean = version.trim().replace(/^v/i, "");
  if (!clean) return [0];
  const segments = clean.split(".");
  return segments.map((segment) => {
    const match = segment.match(/^(\d+)/);
    if (!match || !match[1]) return 0;
    const parsed = Number.parseInt(match[1], 10);
    return Number.isFinite(parsed) ? parsed : 0;
  });
}

function compareSemanticVersions(a: string, b: string): number {
  const aParts = parseVersionParts(a);
  const bParts = parseVersionParts(b);
  const maxLength = Math.max(aParts.length, bParts.length);
  for (let index = 0; index < maxLength; index += 1) {
    const aValue = aParts[index] ?? 0;
    const bValue = bParts[index] ?? 0;
    if (aValue > bValue) return 1;
    if (aValue < bValue) return -1;
  }
  return 0;
}

const BUILD_APP_VERSION = typeof __APP_VERSION__ === "string" && __APP_VERSION__.trim() ? __APP_VERSION__.trim() : "0.0.0";

function normalizeInstalledAppVersion(rawVersion: string | null | undefined): string {
  const normalized = typeof rawVersion === "string" ? rawVersion.trim() : "";
  if (!normalized || normalized === "0.0.0") {
    return BUILD_APP_VERSION;
  }
  return normalized;
}

function formatLocalDateTime(rawIso: string | null): string {
  if (!rawIso) return "Unknown";
  const parsed = new Date(rawIso);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return parsed.toLocaleString();
}

type PatchNoteEntry = {
  version: string;
  date: string;
  bugFixes: string[];
  newFeatures: string[];
  knownIssues: string[];
};

const PATCH_NOTES: PatchNoteEntry[] = [
  {
    version: "0.2.0",
    date: "2026-02-20",
    bugFixes: [
      "Fixed unified Group Chats flow so new group creation is available from both the left panel and the group grid page.",
      "Fixed Identity username display for legacy short usernames by showing a consistent 6-character suffix fallback.",
      "Fixed Switch Glytch action to open the My Glytches grid instead of jumping to Discover.",
      "Fixed top-right call button visibility so it only appears while inside an active DM or voice channel context.",
      "Fixed Friends panel clutter by removing the redundant Back to DMs action in unified sidebar mode.",
      "Improved GIF picker resilience by continuing to load GIF results even before a chat target is selected.",
    ],
    newFeatures: [
      "Added a dedicated Create Group Chat form directly on the Group directory screen.",
      "Added a unified sidebar Create Group Chat flow with multi-friend selection.",
      "Upgraded online-friends layout to a controlled grid with a maximum of three cards per row.",
      "Updated patch notes to the 0.2.0 release format with expanded known-issues tracking.",
    ],
    knownIssues: [
      "Live GIF provider results still depend on backend environment variables; if GIPHY/Tenor keys are missing, fallback GIFs are shown.",
      "If the username migration SQL has not been fully applied, legacy account usernames in storage may still need backend migration to match the new format everywhere.",
    ],
  },
  {
    version: "0.1.5",
    date: "2026-02-18",
    bugFixes: [
      "Upgraded Max voice AI with deeper speech-vs-noise classification using periodicity, spectral flatness, and centroid validation.",
      "Added adaptive per-frequency noise profile learning so suppression better matches each room and fan profile over time.",
      "Strengthened keyboard click rejection with transient holdoff and confidence decay to prevent accidental gate opening.",
    ],
    newFeatures: [
      "New multi-stage speech confidence model combines voice-band SNR, speech signature strength, and non-speech penalties before opening mic audio.",
      "Max mode now keeps a relaxed intermediate gate for soft trailing words while still aggressively muting non-voice background.",
    ],
    knownIssues: [
      "Extremely loud nearby speech sources (TV/speakers close to the mic) can still occasionally be classified as voice.",
    ],
  },
  {
    version: "0.1.4",
    date: "2026-02-18",
    bugFixes: [
      "Improved Max suppression with keyboard-click transient rejection so short mechanical key spikes are less likely to open the mic.",
      "Added fan-like noise rejection logic in Max mode to reduce steady PC fan leakage during silence.",
      "Tightened voice gating decisions with speech-confidence tracking to better separate voice from non-voice bursts.",
    ],
    newFeatures: [
      "Introduced an upgraded voice-only AI suppression path in Max mode focused on speech isolation and enhancement.",
      "Expanded Max mode audio shaping with stronger low-end rumble control before enhancement/compression.",
    ],
    knownIssues: [
      "Very loud nearby voices (for example TV or speakers near the mic) may still trigger opening in some rooms.",
    ],
  },
  {
    version: "0.1.3",
    date: "2026-02-18",
    bugFixes: [
      "Fixed DM image/GIF rendering when signed media URLs fail by adding resilient media URL fallback handling.",
      "Improved backend message-media responses to include direct media URLs for better attachment resolution.",
      "Added GIF send fallback so GIF messages still send even if remote ingest fails for a provider URL.",
      "Tuned Max voice suppression with stronger voice-band gating to cut more background echo/leakage.",
    ],
    newFeatures: [
      "Patch notes updated for media reliability and suppression improvements in this release.",
    ],
    knownIssues: [
      "Best echo performance still requires headphones when possible on speaker setups.",
    ],
  },
  {
    version: "0.1.1",
    date: "2026-02-18",
    bugFixes: [
      "Windows desktop media improvements for screen share and webcam fallback behavior.",
      "Voice stability hardening to reduce random disconnects and false kick states.",
      "DM voice UX upgrades: per-user volume control and message date separators.",
      "Desktop notification behavior now only alerts when the app is not focused.",
      "Profile banner rendering now preserves full banner framing instead of clipping.",
    ],
    newFeatures: [
      "In-app desktop updater flow for Windows with version visibility in system settings.",
      "Patch notes view directly in the app navigation.",
      "Custom user soundboard support (up to 6 uploaded clips).",
      "Desktop uninstall shortcut in system settings.",
    ],
    knownIssues: [
      "Soundboard playback currently plays locally and is not yet mixed into outgoing voice for other participants.",
      "Installer/app icon asset pipeline still needs dedicated .ico/.icns files for full native icon coverage.",
    ],
  },
];

function loadSoundboardFromStorage(): SoundboardClip[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SOUNDBOARD_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => entry && typeof entry === "object")
      .map((entry) => ({
        id: typeof entry.id === "string" ? entry.id : String(Date.now()),
        name: typeof entry.name === "string" ? entry.name : "Sound",
        dataUrl: typeof entry.dataUrl === "string" ? entry.dataUrl : "",
      }))
      .filter((entry) => entry.dataUrl.startsWith("data:audio/"))
      .slice(0, SOUNDBOARD_MAX_CLIPS);
  } catch {
    return [];
  }
}

function persistSoundboardToStorage(clips: SoundboardClip[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SOUNDBOARD_STORAGE_KEY, JSON.stringify(clips.slice(0, SOUNDBOARD_MAX_CLIPS)));
  } catch {
    // Ignore localStorage quota failures.
  }
}

function loadDesktopAutoUpdateWindowsFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(DESKTOP_AUTO_UPDATE_WINDOWS_STORAGE_KEY);
    return raw === "1";
  } catch {
    return false;
  }
}

function persistDesktopAutoUpdateWindowsToStorage(enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DESKTOP_AUTO_UPDATE_WINDOWS_STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // Ignore localStorage quota failures.
  }
}

function loadVoiceMicSettingsFromStorage(): VoiceMicSettings {
  if (typeof window === "undefined") return { ...DEFAULT_VOICE_MIC_SETTINGS };
  try {
    const raw = window.localStorage.getItem(VOICE_MIC_SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_VOICE_MIC_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<VoiceMicSettings> | null;
    const source = parsed && typeof parsed === "object" ? parsed : {};
    return {
      inputDeviceId: normalizeMicInputDeviceId(source.inputDeviceId),
      suppressionProfile: normalizeVoiceSuppressionProfile(source.suppressionProfile),
      echoCancellation:
        typeof source.echoCancellation === "boolean" ? source.echoCancellation : DEFAULT_VOICE_MIC_SETTINGS.echoCancellation,
      noiseSuppression:
        typeof source.noiseSuppression === "boolean" ? source.noiseSuppression : DEFAULT_VOICE_MIC_SETTINGS.noiseSuppression,
      autoGainControl: false,
      voiceIsolation: typeof source.voiceIsolation === "boolean" ? source.voiceIsolation : DEFAULT_VOICE_MIC_SETTINGS.voiceIsolation,
      inputGainPercent: normalizeMicInputGainPercent(source.inputGainPercent),
    };
  } catch {
    return { ...DEFAULT_VOICE_MIC_SETTINGS };
  }
}

function persistVoiceMicSettingsToStorage(settings: VoiceMicSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VOICE_MIC_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore localStorage quota failures.
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Could not read audio file."));
    };
    reader.onerror = () => {
      reject(new Error("Could not read audio file."));
    };
    reader.readAsDataURL(file);
  });
}

function isPermissionDeniedMediaError(error: unknown): boolean {
  if (!(error instanceof DOMException)) return false;
  return error.name === "NotAllowedError" || error.name === "PermissionDeniedError" || error.name === "SecurityError";
}

export default function ChatDashboard({
  currentUserId,
  currentUserName = "User",
  accessToken,
  onLogout,
}: ChatDashboardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("dm");
  const [dmPanelMode, setDmPanelMode] = useState<DmPanelMode>("dms");
  const [unifiedSidebarView, setUnifiedSidebarView] = useState<UnifiedSidebarView>("dms");
  const [unifiedSidebarSearchDraft, setUnifiedSidebarSearchDraft] = useState("");
  const [dmMessageSearchDraft, setDmMessageSearchDraft] = useState("");
  const [dmInAppBanner, setDmInAppBanner] = useState<DmInAppBanner | null>(null);

  const [friendUsername, setFriendUsername] = useState("");
  const [dmError, setDmError] = useState("");
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [dms, setDms] = useState<DmWithFriend[]>([]);
  const [dmSearchDraft, setDmSearchDraft] = useState("");
  const [dmLatestMessageIds, setDmLatestMessageIds] = useState<Record<number, number>>({});
  const [unreadDmCounts, setUnreadDmCounts] = useState<Record<number, number>>({});
  const [dmNavContextMenu, setDmNavContextMenu] = useState<DmNavContextMenuState | null>(null);
  const [dmSidebarContextMenu, setDmSidebarContextMenu] = useState<DmSidebarContextMenuState | null>(null);
  const [dmSidebarActionBusyKey, setDmSidebarActionBusyKey] = useState<string | null>(null);
  const [groupChats, setGroupChats] = useState<GroupChatWithMembers[]>([]);
  const [unreadGroupCounts, setUnreadGroupCounts] = useState<Record<number, number>>({});
  const [groupError, setGroupError] = useState("");
  const [groupNameDraft, setGroupNameDraft] = useState("");
  const [groupCreateMemberIds, setGroupCreateMemberIds] = useState<string[]>([]);
  const [groupCreateBusy, setGroupCreateBusy] = useState(false);
  const [groupAddMemberId, setGroupAddMemberId] = useState("");
  const [groupAddMemberBusy, setGroupAddMemberBusy] = useState(false);
  const [knownProfiles, setKnownProfiles] = useState<Record<string, Profile>>({});
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const activeConversationIdRef = useRef<number | null>(null);
  const [activeGroupChatId, setActiveGroupChatId] = useState<number | null>(null);
  const activeGroupChatIdRef = useRef<number | null>(null);
  const [viewedProfile, setViewedProfile] = useState<Profile | null>(null);
  const [viewedProfileComments, setViewedProfileComments] = useState<ProfileCommentWithAuthor[]>([]);
  const [viewedProfileCommentsLoading, setViewedProfileCommentsLoading] = useState(false);
  const [viewedProfileCommentsError, setViewedProfileCommentsError] = useState("");
  const [viewedProfileCommentDraft, setViewedProfileCommentDraft] = useState("");
  const [viewedProfileCommentBusy, setViewedProfileCommentBusy] = useState(false);
  const [viewedProfileCommentDeleteId, setViewedProfileCommentDeleteId] = useState<number | null>(null);

  const [glytchNameDraft, setGlytchNameDraft] = useState("");
  const [glytchCreateVisibilityDraft, setGlytchCreateVisibilityDraft] = useState<"private" | "public">("private");
  const [glytchCreateMaxMembersDraft, setGlytchCreateMaxMembersDraft] = useState("");
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
  const [glytchDirectoryTab, setGlytchDirectoryTab] = useState<GlytchDirectoryTab>("discover");
  const [glytchSidebarSearchDraft, setGlytchSidebarSearchDraft] = useState("");
  const [publicGlytchSearchDraft, setPublicGlytchSearchDraft] = useState("");
  const [publicGlytchResults, setPublicGlytchResults] = useState<PublicGlytchDirectoryEntry[]>([]);
  const [publicGlytchSearchBusy, setPublicGlytchSearchBusy] = useState(false);
  const [publicGlytchSearchError, setPublicGlytchSearchError] = useState("");
  const [publicGlytchJoinBusyId, setPublicGlytchJoinBusyId] = useState<number | null>(null);
  const [selectedDiscoverGlytchId, setSelectedDiscoverGlytchId] = useState<number | null>(null);
  const [showGlytchInvitePanel, setShowGlytchInvitePanel] = useState(false);
  const [glytchInviteSearch, setGlytchInviteSearch] = useState("");
  const [glytchInviteBusyConversationId, setGlytchInviteBusyConversationId] = useState<number | null>(null);
  const [glytchInviteNotice, setGlytchInviteNotice] = useState("");
  const [glytchInviteError, setGlytchInviteError] = useState("");
  const [glytchError, setGlytchError] = useState("");
  const [joinBannedGlytchId, setJoinBannedGlytchId] = useState<number | null>(null);
  const [joinUnbanRequestDraft, setJoinUnbanRequestDraft] = useState("");
  const [joinUnbanRequestBusy, setJoinUnbanRequestBusy] = useState(false);
  const [joinUnbanRequestNotice, setJoinUnbanRequestNotice] = useState("");
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
  const [glytchUnbanRequestsUi, setGlytchUnbanRequestsUi] = useState<UiGlytchUnbanRequest[]>([]);
  const [glytchBotSettings, setGlytchBotSettings] = useState<GlytchBotSettings | null>(null);
  const [glytchBotBlockedWordsDraft, setGlytchBotBlockedWordsDraft] = useState("");
  const [glytchBotWebhookDraft, setGlytchBotWebhookDraft] = useState("");
  const [glytchBotSettingsBusy, setGlytchBotSettingsBusy] = useState(false);
  const [glytchBotSettingsError, setGlytchBotSettingsError] = useState("");
  const [glytchBotSettingsNotice, setGlytchBotSettingsNotice] = useState("");
  const [selectedBanMemberId, setSelectedBanMemberId] = useState<string>("");
  const [banReasonDraft, setBanReasonDraft] = useState("");
  const [banActionBusyKey, setBanActionBusyKey] = useState<string | null>(null);
  const [unbanRequestActionBusyKey, setUnbanRequestActionBusyKey] = useState<string | null>(null);
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
  const [glytchProfileVisibilityDraft, setGlytchProfileVisibilityDraft] = useState<"private" | "public">("private");
  const [glytchProfileMaxMembersDraft, setGlytchProfileMaxMembersDraft] = useState("");
  const [glytchProfileBusy, setGlytchProfileBusy] = useState(false);
  const [glytchProfileError, setGlytchProfileError] = useState("");
  const [glytchDeleteConfirmName, setGlytchDeleteConfirmName] = useState("");
  const [glytchDeleteBusy, setGlytchDeleteBusy] = useState(false);
  const [glytchDeleteError, setGlytchDeleteError] = useState("");
  const [glytchSettingsTab, setGlytchSettingsTab] = useState<GlytchSettingsTab>("profile");
  const [rolesLoadedForGlytchId, setRolesLoadedForGlytchId] = useState<number | null>(null);

  const [settingsSection, setSettingsSection] = useState<SettingsSection>("profile");
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("edit");
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileForm>(buildProfileForm(null));
  const [desktopAppVersion, setDesktopAppVersion] = useState("");
  const [desktopLatestVersion, setDesktopLatestVersion] = useState("");
  const [desktopUpdateDownloadUrl, setDesktopUpdateDownloadUrl] = useState("");
  const [desktopUpdatePublishedAt, setDesktopUpdatePublishedAt] = useState<string | null>(null);
  const [desktopUpdateLastCheckedAt, setDesktopUpdateLastCheckedAt] = useState<string | null>(null);
  const [desktopUpdateBusy, setDesktopUpdateBusy] = useState(false);
  const [desktopUpdateInstallBusy, setDesktopUpdateInstallBusy] = useState(false);
  const [desktopUninstallBusy, setDesktopUninstallBusy] = useState(false);
  const [desktopUpdateNotice, setDesktopUpdateNotice] = useState("");
  const [desktopUpdateError, setDesktopUpdateError] = useState("");
  const [desktopAutoUpdateWindowsEnabled, setDesktopAutoUpdateWindowsEnabled] = useState(() =>
    loadDesktopAutoUpdateWindowsFromStorage(),
  );
  const [voiceMicSettings, setVoiceMicSettings] = useState<VoiceMicSettings>(() => loadVoiceMicSettingsFromStorage());
  const [voiceInputDevices, setVoiceInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedPatchNoteVersion, setSelectedPatchNoteVersion] = useState(PATCH_NOTES[0]?.version || "");
  const [isUserIdle, setIsUserIdle] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState("");
  const [profileSaveBusy, setProfileSaveBusy] = useState(false);
  const [avatarUploadBusy, setAvatarUploadBusy] = useState(false);
  const [bannerUploadBusy, setBannerUploadBusy] = useState(false);
  const [bannerCropSourceUrl, setBannerCropSourceUrl] = useState("");
  const [bannerCropSourceType, setBannerCropSourceType] = useState("image/webp");
  const [bannerCropZoom, setBannerCropZoom] = useState(1);
  const [bannerCropOffsetX, setBannerCropOffsetX] = useState(0);
  const [bannerCropOffsetY, setBannerCropOffsetY] = useState(0);
  const [bannerCropNaturalSize, setBannerCropNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [bannerCropDragging, setBannerCropDragging] = useState(false);
  const bannerCropPointerRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);

  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [dismissedDmMessageIds, setDismissedDmMessageIds] = useState<Record<number, true>>({});
  const [messageContextMenu, setMessageContextMenu] = useState<MessageContextMenuState | null>(null);
  const [messageContextMenuReactionsExpanded, setMessageContextMenuReactionsExpanded] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editingMessageDraft, setEditingMessageDraft] = useState("");
  const [messageEditBusy, setMessageEditBusy] = useState(false);
  const [composerReplyTarget, setComposerReplyTarget] = useState<ComposerReplyTarget | null>(null);
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
  const [soundboardClips, setSoundboardClips] = useState<SoundboardClip[]>(() => loadSoundboardFromStorage());
  const [soundboardBusy, setSoundboardBusy] = useState(false);
  const [soundboardPlayingId, setSoundboardPlayingId] = useState<string | null>(null);
  const [soundboardError, setSoundboardError] = useState("");
  const [soundboardPopoverOpen, setSoundboardPopoverOpen] = useState(false);
  const [showScrollToLatestButton, setShowScrollToLatestButton] = useState(false);
  const [windowsPrivacyOpenBusy, setWindowsPrivacyOpenBusy] = useState<"camera" | "microphone" | "screen" | null>(null);
  const [remoteVideoShareKinds, setRemoteVideoShareKinds] = useState<Record<string, LocalVideoShareKind | null>>({});
  const [dmIncomingCallCounts, setDmIncomingCallCounts] = useState<Record<number, number>>({});
  const [screenShareBusy, setScreenShareBusy] = useState(false);
  const screenShareIncludeSystemAudio = true;
  const [screenShareAudioMuted, setScreenShareAudioMuted] = useState(false);
  const [desktopSourceOptions, setDesktopSourceOptions] = useState<DesktopSourceOption[]>([]);
  const [selectedDesktopSourceId, setSelectedDesktopSourceId] = useState("auto");
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);
  const [localCameraStream, setLocalCameraStream] = useState<MediaStream | null>(null);
  const [remoteScreenShareUserIds, setRemoteScreenShareUserIds] = useState<string[]>([]);
  const [visibleScreenShareRoomKey, setVisibleScreenShareRoomKey] = useState<string | null>(null);
  const [cameraAutoOpenedRoomKey, setCameraAutoOpenedRoomKey] = useState<string | null>(null);
  const [activeScreenSharePresenterId, setActiveScreenSharePresenterId] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState("");
  const [voiceModerationBusyKey, setVoiceModerationBusyKey] = useState<string | null>(null);
  const [micTestRunning, setMicTestRunning] = useState(false);
  const [micTestBusy, setMicTestBusy] = useState(false);
  const [micTestRecording, setMicTestRecording] = useState(false);
  const [micTestMonitorEnabled, setMicTestMonitorEnabled] = useState(false);
  const [micTestLevel, setMicTestLevel] = useState(0);
  const [micTestError, setMicTestError] = useState("");
  const [micTestSampleUrl, setMicTestSampleUrl] = useState("");
  const [joinInviteBusyMessageId, setJoinInviteBusyMessageId] = useState<number | null>(null);
  const [showQuickThemeEditor, setShowQuickThemeEditor] = useState(false);
  const [quickThemeModeDraft, setQuickThemeModeDraft] = useState<"gradient" | "image">("gradient");
  const [quickThemeFromDraft, setQuickThemeFromDraft] = useState(DEFAULT_DM_CHAT_BACKGROUND.from);
  const [quickThemeToDraft, setQuickThemeToDraft] = useState(DEFAULT_DM_CHAT_BACKGROUND.to);
  const [quickThemeImageDraft, setQuickThemeImageDraft] = useState("");
  const [quickThemeImageUploadBusy, setQuickThemeImageUploadBusy] = useState(false);
  const [quickThemeBusy, setQuickThemeBusy] = useState(false);
  const [quickThemeError, setQuickThemeError] = useState("");
  const [forcedDefaultDmConversationIds, setForcedDefaultDmConversationIds] = useState<Record<number, true>>({});
  const [forcedDefaultGlytchChannelIds, setForcedDefaultGlytchChannelIds] = useState<Record<number, true>>({});
  const [draggingShowcaseId, setDraggingShowcaseId] = useState<string | null>(null);
  const [showcaseDropTargetId, setShowcaseDropTargetId] = useState<string | null>(null);
  const [showcaseGalleryUploadBusyId, setShowcaseGalleryUploadBusyId] = useState<string | null>(null);
  const lastPresenceInteractionAtRef = useRef(Date.now());
  const isUserIdleRef = useRef(false);
  const dmMessagesPollingInFlightRef = useRef(false);
  const groupMessagesPollingInFlightRef = useRef(false);
  const glytchMessagesPollingInFlightRef = useRef(false);
  const glytchNotificationPollingInFlightRef = useRef(false);
  const voiceSignalsPollingInFlightRef = useRef(false);
  const messageDisplayRef = useRef<HTMLElement | null>(null);
  const chatStreamColumnRef = useRef<HTMLDivElement | null>(null);
  const dmSidebarListRef = useRef<HTMLElement | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const messageInputRef = useRef<HTMLInputElement | null>(null);
  const profileBioInputRef = useRef<HTMLTextAreaElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localScreenTrackRef = useRef<MediaStreamTrack | null>(null);
  const localScreenStreamRef = useRef<MediaStream | null>(null);
  const localCameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const localCameraStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const peerDisconnectTimeoutsRef = useRef<Map<string, number>>(new Map());
  const desktopTrackSendersRef = useRef<Map<string, RTCRtpSender[]>>(new Map());
  const cameraTrackSendersRef = useRef<Map<string, RTCRtpSender[]>>(new Map());
  const activeNegotiationPeerIdsRef = useRef<Set<string>>(new Set());
  const queuedNegotiationPeerIdsRef = useRef<Set<string>>(new Set());
  const cameraFallbackInFlightRef = useRef(false);
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const remoteScreenStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const remoteScreenShareOwnerByIdRef = useRef<Map<string, string>>(new Map());
  const remoteScreenShareKindByIdRef = useRef<Map<string, LocalVideoShareKind>>(new Map());
  const remoteScreenAudioStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const remoteScreenAudioElsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const remoteScreenStreamIdsRef = useRef<Map<string, Set<string>>>(new Map());
  const remoteScreenPromoteTimeoutsRef = useRef<Map<string, number>>(new Map());
  const remoteScreenDemoteTimeoutsRef = useRef<Map<string, number>>(new Map());
  const remoteAudioElsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const remoteUserVolumesRef = useRef<Record<string, number>>({});
  const voiceDeafenedRef = useRef(false);
  const screenShareAudioMutedRef = useRef(false);
  const remoteOutputAudioContextRef = useRef<AudioContext | null>(null);
  const remoteVoiceAudioSourceNodesRef = useRef<Map<string, MediaElementAudioSourceNode>>(new Map());
  const remoteVoiceGainNodesRef = useRef<Map<string, GainNode>>(new Map());
  const remoteScreenAudioSourceNodesRef = useRef<Map<string, MediaElementAudioSourceNode>>(new Map());
  const remoteScreenGainNodesRef = useRef<Map<string, GainNode>>(new Map());
  const speakingAnalyserCleanupRef = useRef<Map<string, () => void>>(new Map());
  const livekitAudioTrackRef = useRef<LivekitAudioTrackAdapter | null>(null);
  const livekitProcessorRef = useRef<LivekitKrispProcessorAdapter | null>(null);
  const livekitAudioContextRef = useRef<AudioContext | null>(null);
  const livekitInputStreamRef = useRef<MediaStream | null>(null);
  const livekitUnavailableLoggedRef = useRef(false);
  const livekitKrispCredentialsRef = useRef<LivekitKrispSessionCredentials | null>(null);
  const rnnoiseNodesRef = useRef<RnnoiseWorkletNode[]>([]);
  const rnnoiseAudioContextRef = useRef<AudioContext | null>(null);
  const rnnoiseSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rnnoiseDestinationNodeRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const rnnoiseInputStreamRef = useRef<MediaStream | null>(null);
  const rnnoiseWasmBinaryRef = useRef<ArrayBuffer | null>(null);
  const rnnoiseUnavailableLoggedRef = useRef(false);
  const voiceEnhancementAudioContextRef = useRef<AudioContext | null>(null);
  const voiceEnhancementSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const voiceEnhancementDestinationNodeRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const voiceEnhancementInputStreamRef = useRef<MediaStream | null>(null);
  const voiceEnhancementOutputGainNodeRef = useRef<GainNode | null>(null);
  const voiceEnhancementLoudnessGuardGainRef = useRef<GainNode | null>(null);
  const voiceEnhancementGateIntervalRef = useRef<number | null>(null);
  const voiceEnhancementAnalyserRef = useRef<AnalyserNode | null>(null);
  const voiceEnhancementFrequencyAnalyserRef = useRef<AnalyserNode | null>(null);
  const voiceEnhancementInputLevelAnalyserRef = useRef<AnalyserNode | null>(null);
  const voiceEnhancementOutputLevelAnalyserRef = useRef<AnalyserNode | null>(null);
  const micTestStreamRef = useRef<MediaStream | null>(null);
  const micTestMonitorAudioRef = useRef<HTMLAudioElement | null>(null);
  const micTestMeterAudioContextRef = useRef<AudioContext | null>(null);
  const micTestMeterSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micTestMeterAnalyserRef = useRef<AnalyserNode | null>(null);
  const micTestMeterRafRef = useRef(0);
  const micTestRecorderRef = useRef<MediaRecorder | null>(null);
  const micTestRecordTimeoutRef = useRef<number | null>(null);
  const signalSinceIdRef = useRef(0);
  const previousVoiceParticipantIdsRef = useRef<string[]>([]);
  const missingSelfParticipantCountRef = useRef(0);
  const soundContextRef = useRef<AudioContext | null>(null);
  const notificationSoundLastPlayedAtRef = useRef(0);
  const incomingCallRingLastPlayedAtRef = useRef(0);
  const dmInAppBannerTimeoutRef = useRef<number | null>(null);
  const publishedCurrentGameRef = useRef<string | null>(null);
  const messageAttachmentRetryCountsRef = useRef<Record<number, number>>({});
  const notificationPermissionRequestedRef = useRef(false);
  const dmLatestMessageIdsRef = useRef<Record<number, number>>({});
  const dmNotificationLatestMessageIdsRef = useRef<Record<number, number>>({});
  const dmMessageNotificationSeededRef = useRef(false);
  const groupLatestMessageIdsRef = useRef<Record<number, number>>({});
  const groupMessageNotificationSeededRef = useRef(false);
  const glytchLatestMessageIdsRef = useRef<Record<number, number>>({});
  const glytchMessageNotificationSeededRef = useRef(false);
  const dmCallParticipantCountsRef = useRef<Record<number, number>>({});
  const dmCallNotificationSeededRef = useRef(false);
  const friendRequestStatusByIdRef = useRef<Record<number, FriendRequest["status"]>>({});
  const friendRequestNotificationSeededRef = useRef(false);
  const dmConversationToMarkReadRef = useRef<number | null>(null);
  const groupChatToMarkReadRef = useRef<number | null>(null);
  const dmLastLoadedConversationIdRef = useRef<number | null>(null);
  const dmLastLoadedMessageIdRef = useRef(0);
  const groupLastLoadedChatIdRef = useRef<number | null>(null);
  const groupLastLoadedMessageIdRef = useRef(0);
  const glytchLastLoadedChannelIdRef = useRef<number | null>(null);
  const glytchLastLoadedMessageIdRef = useRef(0);
  const desktopUpdateAutoCheckRef = useRef(false);
  const desktopAutoInstallAttemptRef = useRef("");
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
  const sortedDms = useMemo(() => sortDmsByPinned(dms, dmLatestMessageIds), [dmLatestMessageIds, dms]);
  const unifiedSidebarSearchQuery = unifiedSidebarSearchDraft.trim().toLowerCase();
  const dmMessageSearchQuery = dmMessageSearchDraft.trim().toLowerCase();
  const filteredDms = useMemo(() => {
    const query = dmSearchDraft.trim().toLowerCase();
    if (!query) return sortedDms;
    return sortedDms.filter((dm) => dm.friendName.toLowerCase().includes(query));
  }, [dmSearchDraft, sortedDms]);
  const filteredUnifiedSidebarGlytches = useMemo(() => {
    if (!unifiedSidebarSearchQuery) return glytches;
    return glytches.filter((glytch) => {
      const bio = (glytch.bio || "").toLowerCase();
      return (
        glytch.name.toLowerCase().includes(unifiedSidebarSearchQuery) ||
        bio.includes(unifiedSidebarSearchQuery) ||
        String(glytch.id).includes(unifiedSidebarSearchQuery)
      );
    });
  }, [glytches, unifiedSidebarSearchQuery]);
  const filteredUnifiedSidebarGroups = useMemo(() => {
    if (!unifiedSidebarSearchQuery) return groupChats;
    return groupChats.filter((chat) => chat.name.toLowerCase().includes(unifiedSidebarSearchQuery));
  }, [groupChats, unifiedSidebarSearchQuery]);
  const activeGroupChat = useMemo(
    () => groupChats.find((chat) => chat.groupChatId === activeGroupChatId) || null,
    [groupChats, activeGroupChatId],
  );

  const activeGlytch = useMemo(
    () => glytches.find((item) => item.id === activeGlytchId) || null,
    [glytches, activeGlytchId],
  );
  const mutedDmConversationIdSet = useMemo(
    () => new Set(profileForm.mutedDmConversationIds.filter((id) => Number.isFinite(id) && id > 0)),
    [profileForm.mutedDmConversationIds],
  );
  const filteredSidebarGlytches = useMemo(() => {
    const rawQuery = glytchSidebarSearchDraft.trim();
    if (!rawQuery) return glytches;
    const hashIndex = rawQuery.lastIndexOf("#");
    const hasHashSuffix = hashIndex >= 0;
    const namePart = (hasHashSuffix ? rawQuery.slice(0, hashIndex) : rawQuery).trim().toLowerCase();
    const rawIdPart = hasHashSuffix ? rawQuery.slice(hashIndex + 1) : "";
    const isNumericOnlyQuery = !hasHashSuffix && /^[0-9]+$/.test(rawQuery);
    const normalizedNameQuery = isNumericOnlyQuery ? "" : namePart;
    const normalizedIdQuery = (hasHashSuffix ? rawIdPart : isNumericOnlyQuery ? rawQuery : "").replace(/\D/g, "");
    return glytches.filter((glytch) => {
      const bio = (glytch.bio || "").toLowerCase();
      const matchesName =
        normalizedNameQuery.length === 0 ||
        glytch.name.toLowerCase().includes(normalizedNameQuery) ||
        bio.includes(normalizedNameQuery);
      const matchesId = normalizedIdQuery.length === 0 || String(glytch.id) === normalizedIdQuery;
      return matchesName && matchesId;
    });
  }, [glytchSidebarSearchDraft, glytches]);
  const selectedDiscoverGlytch = useMemo(
    () => publicGlytchResults.find((glytch) => glytch.id === selectedDiscoverGlytchId) || publicGlytchResults[0] || null,
    [publicGlytchResults, selectedDiscoverGlytchId],
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
    if (viewMode === "group" && activeGroupChatId) {
      return {
        kind: "group" as const,
        key: String(activeGroupChatId),
        label: activeGroupChat?.name || "Group Chat",
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
  }, [
    viewMode,
    activeConversationId,
    activeDm?.friendName,
    activeGroupChatId,
    activeGroupChat?.name,
    activeChannel?.kind,
    activeChannel?.name,
    activeChannelId,
  ]);
  const quickThemeTargetOverride = useMemo(() => {
    if (!quickThemeTarget) return null;
    const targetId = Number.parseInt(quickThemeTarget.key, 10);
    if (quickThemeTarget.kind === "dm") {
      if (Number.isFinite(targetId) && targetId > 0 && forcedDefaultDmConversationIds[targetId]) {
        return null;
      }
      return activeDm?.sharedBackground || null;
    }
    if (quickThemeTarget.kind === "group") {
      return profileForm.groupBackgroundByChat[quickThemeTarget.key] || null;
    }
    if (Number.isFinite(targetId) && targetId > 0 && forcedDefaultGlytchChannelIds[targetId]) {
      return null;
    }
    return activeChannelSharedBackground;
  }, [
    quickThemeTarget,
    activeDm?.sharedBackground,
    profileForm.groupBackgroundByChat,
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
    quickThemeTarget &&
      (quickThemeTarget.kind === "dm" || quickThemeTarget.kind === "group" || canManageChannelsInActiveGlytch),
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
  const shouldShowGroupChatMessageArea = useMemo(
    () => viewMode === "group" && Boolean(activeGroupChatId),
    [viewMode, activeGroupChatId],
  );
  const shouldShowVoiceControls =
    (viewMode === "dm" && (Boolean(activeConversationId) || Boolean(voiceRoomKey))) ||
    (viewMode === "glytch" && activeChannel?.kind === "voice");
  const canOpenActiveGlytchSettings =
    viewMode === "glytch" &&
    Boolean(activeGlytch) &&
    (isActiveGlytchOwner || (isActiveGlytchRoleAccessResolved && canAccessGlytchSettingsInActiveGlytch));
  const shouldRenderHeaderActions = shouldShowVoiceControls || shouldShowQuickThemeControl || canOpenActiveGlytchSettings;
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

  useEffect(() => {
    if (publicGlytchResults.length === 0) {
      setSelectedDiscoverGlytchId(null);
      return;
    }
    if (!selectedDiscoverGlytchId || !publicGlytchResults.some((row) => row.id === selectedDiscoverGlytchId)) {
      setSelectedDiscoverGlytchId(publicGlytchResults[0].id);
    }
  }, [publicGlytchResults, selectedDiscoverGlytchId]);

  useEffect(() => {
    setDmMessageSearchDraft("");
  }, [activeConversationId]);

  useEffect(() => {
    if (viewMode === "dm" && activeConversationId && dmInAppBanner?.conversationId === activeConversationId) {
      setDmInAppBanner(null);
      if (dmInAppBannerTimeoutRef.current !== null) {
        window.clearTimeout(dmInAppBannerTimeoutRef.current);
        dmInAppBannerTimeoutRef.current = null;
      }
    }
  }, [activeConversationId, dmInAppBanner, viewMode]);

  useEffect(() => {
    if (profileForm.notifyInAppDmBanners) return;
    if (dmInAppBannerTimeoutRef.current !== null) {
      window.clearTimeout(dmInAppBannerTimeoutRef.current);
      dmInAppBannerTimeoutRef.current = null;
    }
    setDmInAppBanner(null);
  }, [profileForm.notifyInAppDmBanners]);

  useEffect(() => {
    return () => {
      if (bannerCropSourceUrl) {
        URL.revokeObjectURL(bannerCropSourceUrl);
      }
    };
  }, [bannerCropSourceUrl]);

  useEffect(() => {
    const allowedTabs = settingsSection === "profile" ? PROFILE_SETTINGS_TABS : SYSTEM_SETTINGS_TABS;
    if (!allowedTabs.includes(settingsTab)) {
      setSettingsTab(allowedTabs[0]);
    }
  }, [settingsSection, settingsTab]);

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

  const playNotificationSound = useCallback(async () => {
    const nowMs = Date.now();
    if (nowMs - notificationSoundLastPlayedAtRef.current < 450) {
      return;
    }
    notificationSoundLastPlayedAtRef.current = nowMs;

    try {
      let audioCtx = soundContextRef.current;
      if (!audioCtx) {
        audioCtx = new AudioContext();
        soundContextRef.current = audioCtx;
      }
      if (audioCtx.state !== "running") {
        await audioCtx.resume();
      }
      if (audioCtx.state !== "running") return;

      const masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.0001;
      masterGain.connect(audioCtx.destination);

      const low = audioCtx.createOscillator();
      const high = audioCtx.createOscillator();
      low.type = "sine";
      high.type = "triangle";
      const now = audioCtx.currentTime;
      low.frequency.setValueAtTime(880, now);
      high.frequency.setValueAtTime(1320, now + 0.08);
      low.connect(masterGain);
      high.connect(masterGain);

      masterGain.gain.exponentialRampToValueAtTime(0.045, now + 0.015);
      masterGain.gain.exponentialRampToValueAtTime(0.02, now + 0.09);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

      low.start(now);
      low.stop(now + 0.16);
      high.start(now + 0.08);
      high.stop(now + 0.24);
    } catch {
      // Ignore autoplay-policy and audio device failures.
    }
  }, []);

  const playIncomingCallRing = useCallback(async () => {
    const nowMs = Date.now();
    if (nowMs - incomingCallRingLastPlayedAtRef.current < 2600) {
      return;
    }
    incomingCallRingLastPlayedAtRef.current = nowMs;

    try {
      let audioCtx = soundContextRef.current;
      if (!audioCtx) {
        audioCtx = new AudioContext();
        soundContextRef.current = audioCtx;
      }
      if (audioCtx.state !== "running") {
        await audioCtx.resume();
      }
      if (audioCtx.state !== "running") return;

      const schedulePulse = (offsetSeconds: number, baseFrequency: number) => {
        const gain = audioCtx.createGain();
        gain.gain.value = 0.0001;
        gain.connect(audioCtx.destination);

        const low = audioCtx.createOscillator();
        const high = audioCtx.createOscillator();
        low.type = "sine";
        high.type = "triangle";

        const startAt = audioCtx.currentTime + offsetSeconds;
        low.frequency.setValueAtTime(baseFrequency, startAt);
        high.frequency.setValueAtTime(baseFrequency * 1.5, startAt + 0.02);
        low.connect(gain);
        high.connect(gain);

        gain.gain.exponentialRampToValueAtTime(0.05, startAt + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.025, startAt + 0.18);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.36);

        low.start(startAt);
        low.stop(startAt + 0.3);
        high.start(startAt + 0.05);
        high.stop(startAt + 0.36);
      };

      schedulePulse(0, 620);
      schedulePulse(0.52, 660);
      schedulePulse(1.04, 620);
      schedulePulse(1.56, 660);
    } catch {
      // Ignore autoplay-policy and audio device failures.
    }
  }, []);

  const triggerDesktopNotification = useCallback(
    async ({
      title,
      body,
      tag,
      icon,
      playSound = true,
      onClick,
    }: {
      title: string;
      body: string;
      tag: string;
      icon?: string;
      playSound?: boolean;
      onClick?: () => void;
    }) => {
      if (
        typeof window !== "undefined" &&
        window.electronAPI?.isElectron &&
        typeof document !== "undefined" &&
        document.visibilityState === "visible" &&
        typeof document.hasFocus === "function" &&
        document.hasFocus()
      ) {
        return;
      }

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
        if (playSound) {
          void playNotificationSound();
        }
      } catch {
        // Ignore notification failures (blocked APIs, invalid icon URLs, etc.)
      }
    },
    [ensureNotificationPermission, playNotificationSound],
  );

  const showDmInAppBanner = useCallback((payload: DmInAppBanner) => {
    if (typeof window === "undefined") return;
    if (!profileForm.notifyInAppDmBanners) return;
    if (dmInAppBannerTimeoutRef.current !== null) {
      window.clearTimeout(dmInAppBannerTimeoutRef.current);
      dmInAppBannerTimeoutRef.current = null;
    }
    setDmInAppBanner(payload);
    dmInAppBannerTimeoutRef.current = window.setTimeout(() => {
      setDmInAppBanner((current) => (current?.conversationId === payload.conversationId ? null : current));
      dmInAppBannerTimeoutRef.current = null;
    }, 5000);
  }, [profileForm.notifyInAppDmBanners]);

  useEffect(() => {
    return () => {
      if (dmInAppBannerTimeoutRef.current !== null) {
        window.clearTimeout(dmInAppBannerTimeoutRef.current);
        dmInAppBannerTimeoutRef.current = null;
      }
    };
  }, []);

  const handleMessageAttachmentLoadError = useCallback(
    async (messageId: number, attachmentUrl: string | null | undefined) => {
      const normalizedUrl = typeof attachmentUrl === "string" ? attachmentUrl.trim() : "";
      if (!normalizedUrl) return;
      const previousRetries = messageAttachmentRetryCountsRef.current[messageId] || 0;
      if (previousRetries >= 1) return;
      messageAttachmentRetryCountsRef.current[messageId] = previousRetries + 1;

      try {
        const refreshedUrl = await resolveMessageAttachmentUrl(accessToken, normalizedUrl);
        if (!refreshedUrl || refreshedUrl === normalizedUrl) return;
        setMessages((prev) =>
          prev.map((msg) => (msg.id === messageId && msg.attachmentUrl === normalizedUrl ? { ...msg, attachmentUrl: refreshedUrl } : msg)),
        );
      } catch {
        // Keep rendering stable when media URL refresh fails.
      }
    },
    [accessToken],
  );

  const ensureSoundContext = async () => {
    if (!soundContextRef.current) {
      soundContextRef.current = new AudioContext();
    }
    if (soundContextRef.current.state !== "running") {
      await soundContextRef.current.resume();
    }
  };

  const disposeLivekitVoicePipeline = useCallback(async () => {
    const audioTrack = livekitAudioTrackRef.current;
    const processor = livekitProcessorRef.current;
    const audioContext = livekitAudioContextRef.current;
    const inputStream = livekitInputStreamRef.current;

    livekitAudioTrackRef.current = null;
    livekitProcessorRef.current = null;
    livekitAudioContextRef.current = null;
    livekitInputStreamRef.current = null;

    try {
      await processor?.setEnabled(false);
    } catch {
      // Ignore disable failures.
    }
    try {
      await audioTrack?.stopProcessor(false);
    } catch {
      // Ignore processor shutdown failures.
    }
    try {
      await audioContext?.close();
    } catch {
      // Ignore AudioContext close failures.
    }
    inputStream?.getTracks().forEach((track) => {
      track.stop();
    });
  }, []);

  const logLivekitFallbackReason = useCallback((reason: string, details?: unknown) => {
    if (livekitUnavailableLoggedRef.current) return;
    livekitUnavailableLoggedRef.current = true;
    if (details !== undefined) {
      console.warn(`[voice] LiveKit enhanced suppression unavailable: ${reason}`, details);
      return;
    }
    console.warn(`[voice] LiveKit enhanced suppression unavailable: ${reason}`);
  }, []);

  const resolveLivekitKrispCredentials = useCallback(
    async (roomKey: string): Promise<LivekitKrispSessionCredentials | null> => {
      const cached = livekitKrispCredentialsRef.current;
      const nowMs = Date.now();
      if (cached && cached.roomKey === roomKey && cached.expiresAtMs - nowMs > 30_000) {
        return cached;
      }

      try {
        const payload = await requestLivekitKrispToken(accessToken, roomKey);
        const parsedExpiresAt = Number.parseInt(String(Date.parse(payload.expiresAt)), 10);
        const expiresAtMs = Number.isFinite(parsedExpiresAt)
          ? parsedExpiresAt
          : nowMs + Math.max(60, payload.ttlSeconds || 300) * 1000;
        const nextCredentials: LivekitKrispSessionCredentials = {
          url: payload.url,
          token: payload.token,
          expiresAtMs,
          roomKey: payload.room || roomKey,
        };
        livekitKrispCredentialsRef.current = nextCredentials;
        return nextCredentials;
      } catch (err) {
        logLivekitFallbackReason("token mint request failed; backend LiveKit auth may be unavailable.", err);
        return null;
      }
    },
    [accessToken, logLivekitFallbackReason],
  );

  const buildLivekitNoiseSuppressedStream = useCallback(
    async (inputStream: MediaStream, roomKey: string): Promise<MediaStream | null> => {
      if (!LIVEKIT_KRISP_ENABLED) {
        return null;
      }
      if (!window.electronAPI?.isElectron) {
        logLivekitFallbackReason("desktop runtime is required.");
        return null;
      }

      const credentials = await resolveLivekitKrispCredentials(roomKey);
      if (!credentials?.url || !credentials.token) {
        return null;
      }

      const [inputTrack] = inputStream.getAudioTracks();
      if (!inputTrack) {
        logLivekitFallbackReason("microphone capture does not include an audio track.");
        return null;
      }

      await disposeLivekitVoicePipeline();

      try {
        const [livekitModule, krispModule] = await Promise.all([import("livekit-client"), import("@livekit/krisp-noise-filter")]);
        if (!krispModule.isKrispNoiseFilterSupported()) {
          logLivekitFallbackReason("Krisp processor is not supported on this runtime.");
          return null;
        }
        const audioContext = new AudioContext({ latencyHint: "interactive", sampleRate: 48000 });
        const localAudioTrack = new livekitModule.LocalAudioTrack(
          inputTrack,
          inputTrack.getConstraints ? inputTrack.getConstraints() : undefined,
          true,
          audioContext,
        ) as LivekitAudioTrackAdapter;
        const processor = krispModule.KrispNoiseFilter({ quality: "medium", useBVC: false }) as LivekitKrispProcessorAdapter;
        await localAudioTrack.setProcessor(processor);
        const publishContext = {
          engine: {
            clientOptions: {
              url: credentials.url,
              token: credentials.token,
            },
          },
        };
        await processor.onPublish(publishContext);
        await processor.setEnabled(true);
        if (!processor.isEnabled()) {
          throw new Error("processor reported disabled state after enable request.");
        }

        const processedTrack = localAudioTrack.mediaStreamTrack;
        if (!processedTrack || processedTrack.kind !== "audio" || processedTrack.readyState === "ended") {
          throw new Error("processor did not provide a live audio track.");
        }

        livekitAudioTrackRef.current = localAudioTrack;
        livekitProcessorRef.current = processor;
        livekitAudioContextRef.current = audioContext;
        livekitInputStreamRef.current = inputStream;
        return new MediaStream([processedTrack]);
      } catch (err) {
        await disposeLivekitVoicePipeline();
        logLivekitFallbackReason("startup failed; falling back to RNNoise/native suppression.", err);
        return null;
      }
    },
    [disposeLivekitVoicePipeline, logLivekitFallbackReason, resolveLivekitKrispCredentials],
  );

  const disposeRnnoiseVoicePipeline = useCallback(async () => {
    const rnnoiseNodes = rnnoiseNodesRef.current;
    const audioContext = rnnoiseAudioContextRef.current;
    const sourceNode = rnnoiseSourceNodeRef.current;
    const destinationNode = rnnoiseDestinationNodeRef.current;
    const inputStream = rnnoiseInputStreamRef.current;

    rnnoiseNodesRef.current = [];
    rnnoiseAudioContextRef.current = null;
    rnnoiseSourceNodeRef.current = null;
    rnnoiseDestinationNodeRef.current = null;
    rnnoiseInputStreamRef.current = null;

    try {
      sourceNode?.disconnect();
    } catch {
      // Ignore disconnect failures.
    }
    for (const node of rnnoiseNodes) {
      try {
        node.disconnect();
      } catch {
        // Ignore disconnect failures.
      }
    }
    try {
      destinationNode?.disconnect();
    } catch {
      // Ignore disconnect failures.
    }
    for (const node of rnnoiseNodes) {
      try {
        node.destroy();
      } catch {
        // Ignore RNNoise destroy failures.
      }
    }
    try {
      await audioContext?.close();
    } catch {
      // Ignore AudioContext close failures.
    }

    inputStream?.getTracks().forEach((track) => {
      track.stop();
    });
  }, []);

  const logRnnoiseFallbackReason = useCallback((reason: string, details?: unknown) => {
    if (rnnoiseUnavailableLoggedRef.current) return;
    rnnoiseUnavailableLoggedRef.current = true;
    if (details !== undefined) {
      console.warn(`[voice] RNNoise unavailable: ${reason}`, details);
      return;
    }
    console.warn(`[voice] RNNoise unavailable: ${reason}`);
  }, []);

  const buildRnnoiseNoiseSuppressedStream = useCallback(
    async (inputStream: MediaStream, settings?: VoiceMicSettings): Promise<MediaStream | null> => {
      if (!RNNOISE_ENABLED) {
        logRnnoiseFallbackReason("disabled by VITE_RNNOISE_ENABLED.");
        return null;
      }
      if (!window.electronAPI?.isElectron) {
        logRnnoiseFallbackReason("desktop runtime is required.");
        return null;
      }
      if (typeof AudioWorkletNode === "undefined") {
        logRnnoiseFallbackReason("AudioWorklet is not supported on this runtime.");
        return null;
      }

      await disposeRnnoiseVoicePipeline();

      try {
        let wasmBinary = rnnoiseWasmBinaryRef.current;
        if (!wasmBinary) {
          wasmBinary = await loadRnnoise({
            url: rnnoiseWasmPath,
            simdUrl: rnnoiseSimdWasmPath,
          });
          rnnoiseWasmBinaryRef.current = wasmBinary;
        }

        const audioContext = new AudioContext({ latencyHint: "interactive", sampleRate: 48000 });
        await audioContext.audioWorklet.addModule(rnnoiseWorkletPath);

        const sourceNode = audioContext.createMediaStreamSource(inputStream);
        const destinationNode = audioContext.createMediaStreamDestination();
        const inputChannelCount = Math.max(
          1,
          Math.min(2, Number(inputStream.getAudioTracks()[0]?.getSettings()?.channelCount || 1)),
        );
        const passes = settings?.suppressionProfile === "ultra" ? 2 : 1;
        const rnnoiseNodes: RnnoiseWorkletNode[] = [];
        let previousNode: AudioNode = sourceNode;
        for (let pass = 0; pass < passes; pass += 1) {
          const rnnoiseNode = new RnnoiseWorkletNode(audioContext, {
            maxChannels: inputChannelCount,
            wasmBinary: wasmBinary.slice(0),
          });
          previousNode.connect(rnnoiseNode);
          previousNode = rnnoiseNode;
          rnnoiseNodes.push(rnnoiseNode);
        }
        previousNode.connect(destinationNode);

        if (audioContext.state !== "running") {
          await audioContext.resume().catch(() => undefined);
        }

        rnnoiseNodesRef.current = rnnoiseNodes;
        rnnoiseAudioContextRef.current = audioContext;
        rnnoiseSourceNodeRef.current = sourceNode;
        rnnoiseDestinationNodeRef.current = destinationNode;
        rnnoiseInputStreamRef.current = inputStream;
        return destinationNode.stream;
      } catch (err) {
        await disposeRnnoiseVoicePipeline();
        logRnnoiseFallbackReason("startup failed; falling back to next suppression layer.", err);
        return null;
      }
    },
    [disposeRnnoiseVoicePipeline, logRnnoiseFallbackReason],
  );

  const disposeVoiceEnhancementPipeline = useCallback(async () => {
    const audioContext = voiceEnhancementAudioContextRef.current;
    const sourceNode = voiceEnhancementSourceNodeRef.current;
    const destinationNode = voiceEnhancementDestinationNodeRef.current;
    const inputStream = voiceEnhancementInputStreamRef.current;
    const outputGainNode = voiceEnhancementOutputGainNodeRef.current;
    const loudnessGuardGainNode = voiceEnhancementLoudnessGuardGainRef.current;
    const analyserNode = voiceEnhancementAnalyserRef.current;
    const frequencyAnalyserNode = voiceEnhancementFrequencyAnalyserRef.current;
    const inputLevelAnalyserNode = voiceEnhancementInputLevelAnalyserRef.current;
    const outputLevelAnalyserNode = voiceEnhancementOutputLevelAnalyserRef.current;
    const gateIntervalId = voiceEnhancementGateIntervalRef.current;

    voiceEnhancementAudioContextRef.current = null;
    voiceEnhancementSourceNodeRef.current = null;
    voiceEnhancementDestinationNodeRef.current = null;
    voiceEnhancementInputStreamRef.current = null;
    voiceEnhancementOutputGainNodeRef.current = null;
    voiceEnhancementLoudnessGuardGainRef.current = null;
    voiceEnhancementAnalyserRef.current = null;
    voiceEnhancementFrequencyAnalyserRef.current = null;
    voiceEnhancementInputLevelAnalyserRef.current = null;
    voiceEnhancementOutputLevelAnalyserRef.current = null;
    voiceEnhancementGateIntervalRef.current = null;

    if (typeof gateIntervalId === "number") {
      window.clearInterval(gateIntervalId);
    }

    try {
      sourceNode?.disconnect();
    } catch {
      // Ignore disconnect failures.
    }
    try {
      destinationNode?.disconnect();
    } catch {
      // Ignore disconnect failures.
    }
    try {
      outputGainNode?.disconnect();
    } catch {
      // Ignore disconnect failures.
    }
    try {
      loudnessGuardGainNode?.disconnect();
    } catch {
      // Ignore disconnect failures.
    }
    try {
      analyserNode?.disconnect();
    } catch {
      // Ignore disconnect failures.
    }
    try {
      frequencyAnalyserNode?.disconnect();
    } catch {
      // Ignore disconnect failures.
    }
    try {
      inputLevelAnalyserNode?.disconnect();
    } catch {
      // Ignore disconnect failures.
    }
    try {
      outputLevelAnalyserNode?.disconnect();
    } catch {
      // Ignore disconnect failures.
    }
    try {
      await audioContext?.close();
    } catch {
      // Ignore AudioContext close failures.
    }

    inputStream?.getTracks().forEach((track) => {
      track.stop();
    });
  }, []);

  const buildVoiceEnhancementStream = useCallback(
    async (inputStream: MediaStream, settings: VoiceMicSettings): Promise<MediaStream | null> => {
      const [inputTrack] = inputStream.getAudioTracks();
      if (!inputTrack) return null;

      await disposeVoiceEnhancementPipeline();

      try {
        const audioContext = new AudioContext({ latencyHint: "interactive", sampleRate: 48000 });
        const sourceNode = audioContext.createMediaStreamSource(inputStream);
        const highpassNode = audioContext.createBiquadFilter();
        const lowShelfNode = audioContext.createBiquadFilter();
        const lowpassNode = audioContext.createBiquadFilter();
        const presenceNode = audioContext.createBiquadFilter();
        const deEssNode = audioContext.createBiquadFilter();
        const compressorNode = audioContext.createDynamicsCompressor();
        const limiterNode = audioContext.createDynamicsCompressor();
        const gateGainNode = audioContext.createGain();
        const gateAnalyser = audioContext.createAnalyser();
        const gateFrequencyAnalyser = audioContext.createAnalyser();
        const inputLevelAnalyserNode = audioContext.createAnalyser();
        const outputLevelAnalyserNode = audioContext.createAnalyser();
        const outputGainNode = audioContext.createGain();
        const loudnessGuardGainNode = audioContext.createGain();
        const destinationNode = audioContext.createMediaStreamDestination();

        const profile = settings.suppressionProfile;
        const profileIsBalanced = profile === "balanced";
        const profileIsUltra = profile === "ultra";

        highpassNode.type = "highpass";
        highpassNode.frequency.value = profileIsBalanced ? 80 : profileIsUltra ? 115 : 96;
        highpassNode.Q.value = 0.75;

        lowShelfNode.type = "lowshelf";
        lowShelfNode.frequency.value = profileIsBalanced ? 145 : profileIsUltra ? 185 : 165;
        lowShelfNode.gain.value = profileIsBalanced ? -1.8 : profileIsUltra ? -5.2 : -3.5;

        lowpassNode.type = "lowpass";
        lowpassNode.frequency.value = profileIsBalanced ? 11200 : profileIsUltra ? 7600 : 9000;
        lowpassNode.Q.value = 0.72;

        presenceNode.type = "peaking";
        presenceNode.frequency.value = 2550;
        presenceNode.Q.value = 1.05;
        presenceNode.gain.value = profileIsBalanced ? 0.75 : profileIsUltra ? 1.5 : 1.1;

        deEssNode.type = "highshelf";
        deEssNode.frequency.value = 6400;
        deEssNode.gain.value = profileIsBalanced ? -0.8 : profileIsUltra ? -2.5 : -1.7;

        compressorNode.threshold.value = profileIsBalanced ? -14 : profileIsUltra ? -18 : -16;
        compressorNode.knee.value = 18;
        compressorNode.ratio.value = profileIsBalanced ? 1.45 : profileIsUltra ? 1.8 : 1.6;
        compressorNode.attack.value = 0.003;
        compressorNode.release.value = profileIsUltra ? 0.16 : 0.14;

        limiterNode.threshold.value = -7;
        limiterNode.knee.value = 0;
        limiterNode.ratio.value = 20;
        limiterNode.attack.value = 0.001;
        limiterNode.release.value = 0.12;

        gateAnalyser.fftSize = 1024;
        gateAnalyser.smoothingTimeConstant = 0.88;
        gateFrequencyAnalyser.fftSize = 2048;
        gateFrequencyAnalyser.smoothingTimeConstant = 0.72;
        inputLevelAnalyserNode.fftSize = 1024;
        inputLevelAnalyserNode.smoothingTimeConstant = 0.86;
        outputLevelAnalyserNode.fftSize = 1024;
        outputLevelAnalyserNode.smoothingTimeConstant = 0.86;
        gateGainNode.gain.value = 1;

        outputGainNode.gain.value = Math.min(1, normalizeMicInputGainPercent(settings.inputGainPercent) / 100);
        loudnessGuardGainNode.gain.value = 1;

        sourceNode.connect(highpassNode);
        sourceNode.connect(inputLevelAnalyserNode);
        highpassNode.connect(lowShelfNode);
        lowShelfNode.connect(lowpassNode);
        lowpassNode.connect(presenceNode);
        presenceNode.connect(deEssNode);
        deEssNode.connect(compressorNode);
        compressorNode.connect(limiterNode);
        limiterNode.connect(gateGainNode);
        limiterNode.connect(gateAnalyser);
        limiterNode.connect(gateFrequencyAnalyser);
        gateGainNode.connect(outputGainNode);
        outputGainNode.connect(outputLevelAnalyserNode);
        outputGainNode.connect(loudnessGuardGainNode);
        loudnessGuardGainNode.connect(destinationNode);

        // Multi-feature voice AI gate: learns room noise and opens only on persistent speech signatures.
        const gateData = new Uint8Array(gateAnalyser.fftSize);
        const gateFreqData = new Uint8Array(gateFrequencyAnalyser.frequencyBinCount);
        const inputLevelData = new Uint8Array(inputLevelAnalyserNode.fftSize);
        const outputLevelData = new Uint8Array(outputLevelAnalyserNode.fftSize);
        const previousGateFreqData = new Uint8Array(gateFrequencyAnalyser.frequencyBinCount);
        const currentSpectrumPower = new Float32Array(gateFrequencyAnalyser.frequencyBinCount);
        const adaptiveNoiseProfile = new Float32Array(gateFrequencyAnalyser.frequencyBinCount);
        let noiseProfileInitialized = false;
        let smoothedRms = 0;
        let smoothedInputRms = 0;
        let smoothedOutputRms = 0;
        let loudnessGuard = 1;
        let smoothedVoiceRatio = profileIsUltra ? 0.42 : profileIsBalanced ? 0.36 : 0.39;
        let smoothedSpeechSignature = profileIsUltra ? 0.14 : profileIsBalanced ? 0.09 : 0.11;
        let smoothedZeroCrossingRate = 0.08;
        let smoothedSpectralFlux = 0;
        let smoothedCrestFactor = 2.8;
        let smoothedSpectralFlatness = profileIsUltra ? 0.36 : 0.42;
        let smoothedSpectralCentroidHz = profileIsUltra ? 1850 : 2100;
        let smoothedPeriodicity = 0;
        let speechConfidence = 0;
        let speechEvidenceSmoothed = 0;
        let ambientFloor = profileIsUltra ? 0.0075 : profileIsBalanced ? 0.0095 : 0.0085;
        let ambientVoiceRatio = profileIsUltra ? 0.24 : profileIsBalanced ? 0.3 : 0.27;
        let ambientSpeechSignature = profileIsUltra ? 0.1 : profileIsBalanced ? 0.07 : 0.085;
        let gateOpen = false;
        let gateHoldUntil = 0;
        let clickRejectUntil = 0;
        const calibrationEndsAt = Date.now() + (profileIsUltra ? 2800 : 2000);
        const minimumOpenThreshold = profileIsUltra ? 0.016 : profileIsBalanced ? 0.022 : 0.019;
        const minimumCloseThreshold = minimumOpenThreshold * 0.56;
        const floorOpenMultiplier = profileIsUltra ? 2.55 : profileIsBalanced ? 1.95 : 2.2;
        const floorCloseMultiplier = profileIsUltra ? 1.75 : profileIsBalanced ? 1.34 : 1.58;
        const closedGain = profileIsUltra ? 0.006 : profileIsBalanced ? 0.085 : 0.03;
        const holdMs = profileIsUltra ? 460 : profileIsBalanced ? 300 : 360;
        const voiceRatioMargin = profileIsUltra ? 0.14 : profileIsBalanced ? 0.085 : 0.12;
        const speechSignatureMargin = profileIsUltra ? 0.095 : profileIsBalanced ? 0.06 : 0.08;
        const baseVoiceRatioThreshold = profileIsUltra ? 0.46 : profileIsBalanced ? 0.4 : 0.44;
        const baseSpeechSignatureThreshold = profileIsUltra ? 0.17 : profileIsBalanced ? 0.1 : 0.145;
        const zeroCrossingMin = profileIsUltra ? 0.018 : 0.012;
        const zeroCrossingMax = profileIsUltra ? 0.19 : 0.24;
        const crestClickThreshold = profileIsUltra ? 4.3 : 4.75;
        const fluxClickThreshold = profileIsUltra ? 0.1 : 0.125;
        const clickRejectMs = profileIsUltra ? 240 : 170;
        const speechConfidenceOpenThreshold = profileIsUltra ? 0.56 : 0.48;
        const speechConfidenceCloseThreshold = profileIsUltra ? 0.2 : 0.14;
        const speechEvidenceOpenThreshold = profileIsUltra ? 0.46 : 0.39;
        const speechEvidenceCloseThreshold = profileIsUltra ? 0.2 : 0.16;
        const noiseProfileCalibrationAlpha = 0.9;
        const noiseProfileLearnAlpha = profileIsUltra ? 0.968 : 0.954;
        const minLoudnessGuard = profileIsUltra ? 0.62 : profileIsBalanced ? 0.72 : 0.67;
        const nyquist = audioContext.sampleRate / 2;
        const binFromHz = (hz: number) =>
          Math.max(0, Math.min(gateFreqData.length - 1, Math.round((hz / nyquist) * (gateFreqData.length - 1))));
        const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
        const scoreRange = (value: number, low: number, high: number) => {
          if (high <= low) return value >= high ? 1 : 0;
          return clamp01((value - low) / (high - low));
        };
        const analysisBandStart = binFromHz(80);
        const analysisBandEnd = binFromHz(11000);
        const voiceBandStart = binFromHz(220);
        const voiceBandEnd = binFromHz(4100);
        const rumbleBandStart = binFromHz(55);
        const rumbleBandEnd = binFromHz(190);
        const highNoiseBandStart = binFromHz(5200);
        const highNoiseBandEnd = binFromHz(11000);
        const computeBandEnergy = (startBin: number, endBin: number) => {
          let energy = 0;
          const start = Math.max(0, Math.min(gateFreqData.length - 1, startBin));
          const end = Math.max(start, Math.min(gateFreqData.length - 1, endBin));
          for (let i = start; i <= end; i += 1) {
            energy += currentSpectrumPower[i];
          }
          return energy;
        };
        const computeBandSnr = (startBin: number, endBin: number) => {
          let signal = 0;
          let noise = 0;
          const start = Math.max(0, Math.min(gateFreqData.length - 1, startBin));
          const end = Math.max(start, Math.min(gateFreqData.length - 1, endBin));
          for (let i = start; i <= end; i += 1) {
            signal += currentSpectrumPower[i];
            noise += adaptiveNoiseProfile[i];
          }
          return (signal + 1e-7) / (noise + 1e-7);
        };
        const estimatePeriodicity = () => {
          const minLag = Math.floor(audioContext.sampleRate / 330);
          const maxLag = Math.min(gateData.length - 8, Math.ceil(audioContext.sampleRate / 85));
          let bestCorrelation = 0;
          for (let lag = minLag; lag <= maxLag; lag += 4) {
            let correlation = 0;
            let energyA = 0;
            let energyB = 0;
            for (let i = 0; i + lag < gateData.length; i += 2) {
              const sampleA = (gateData[i] - 128) / 128;
              const sampleB = (gateData[i + lag] - 128) / 128;
              correlation += sampleA * sampleB;
              energyA += sampleA * sampleA;
              energyB += sampleB * sampleB;
            }
            const normalized = correlation / Math.sqrt(energyA * energyB + 1e-8);
            if (normalized > bestCorrelation) {
              bestCorrelation = normalized;
            }
          }
          return clamp01(bestCorrelation);
        };
        const computeRmsFromWaveData = (waveData: Uint8Array) => {
          let sumSquares = 0;
          for (let i = 0; i < waveData.length; i += 1) {
            const sample = (waveData[i] - 128) / 128;
            sumSquares += sample * sample;
          }
          return Math.sqrt(sumSquares / waveData.length);
        };

        const updateGate = () => {
          gateAnalyser.getByteTimeDomainData(gateData);
          gateFrequencyAnalyser.getByteFrequencyData(gateFreqData);
          inputLevelAnalyserNode.getByteTimeDomainData(inputLevelData);
          outputLevelAnalyserNode.getByteTimeDomainData(outputLevelData);
          const inputRms = computeRmsFromWaveData(inputLevelData);
          const outputRms = computeRmsFromWaveData(outputLevelData);
          smoothedInputRms = smoothedInputRms * 0.84 + inputRms * 0.16;
          smoothedOutputRms = smoothedOutputRms * 0.84 + outputRms * 0.16;

          let rms = 0;
          let peakAbs = 0;
          let zeroCrossings = 0;
          let previousSign = 0;
          for (let i = 0; i < gateData.length; i += 1) {
            const normalized = (gateData[i] - 128) / 128;
            const absNormalized = Math.abs(normalized);
            rms += normalized * normalized;
            if (absNormalized > peakAbs) peakAbs = absNormalized;
            const sign = normalized > 0.02 ? 1 : normalized < -0.02 ? -1 : 0;
            if (i > 0 && sign !== 0 && previousSign !== 0 && sign !== previousSign) {
              zeroCrossings += 1;
            }
            if (sign !== 0) {
              previousSign = sign;
            }
          }
          rms = Math.sqrt(rms / gateData.length);
          const crestFactor = peakAbs / Math.max(1e-5, rms);
          const zeroCrossingRate = zeroCrossings / gateData.length;

          let spectralFlux = 0;
          let fluxBins = 0;
          let flatnessLogSum = 0;
          let flatnessLinearSum = 0;
          let centroidNumerator = 0;
          for (let i = analysisBandStart; i <= analysisBandEnd; i += 1) {
            const normalized = gateFreqData[i] / 255;
            const power = normalized * normalized;
            currentSpectrumPower[i] = power;
            spectralFlux += Math.abs(gateFreqData[i] - previousGateFreqData[i]) / 255;
            previousGateFreqData[i] = gateFreqData[i];
            flatnessLogSum += Math.log(power + 1e-8);
            flatnessLinearSum += power;
            const hz = (i / (gateFreqData.length - 1)) * nyquist;
            centroidNumerator += hz * power;
            fluxBins += 1;
          }
          spectralFlux = fluxBins > 0 ? spectralFlux / fluxBins : 0;
          const spectralFlatness =
            fluxBins > 0
              ? Math.exp(flatnessLogSum / fluxBins) / Math.max(1e-8, flatnessLinearSum / fluxBins)
              : 1;
          const spectralCentroidHz = centroidNumerator / Math.max(1e-8, flatnessLinearSum);

          if (!noiseProfileInitialized) {
            for (let i = analysisBandStart; i <= analysisBandEnd; i += 1) {
              adaptiveNoiseProfile[i] = currentSpectrumPower[i];
            }
            noiseProfileInitialized = true;
          }

          const totalEnergy = computeBandEnergy(analysisBandStart, analysisBandEnd) + 1e-7;
          const voiceEnergy = computeBandEnergy(voiceBandStart, voiceBandEnd);
          const rumbleEnergy = computeBandEnergy(rumbleBandStart, rumbleBandEnd);
          const highNoiseEnergy = computeBandEnergy(highNoiseBandStart, highNoiseBandEnd);
          const voiceRatio = voiceEnergy / totalEnergy;
          const rumbleRatio = rumbleEnergy / totalEnergy;
          const highNoiseRatio = highNoiseEnergy / totalEnergy;
          const speechSignature = Math.max(0, voiceRatio - rumbleRatio * 0.9 - highNoiseRatio * 0.72);
          const periodicity = estimatePeriodicity();

          smoothedRms = smoothedRms * 0.84 + rms * 0.16;
          smoothedVoiceRatio = smoothedVoiceRatio * 0.8 + voiceRatio * 0.2;
          smoothedSpeechSignature = smoothedSpeechSignature * 0.82 + speechSignature * 0.18;
          smoothedZeroCrossingRate = smoothedZeroCrossingRate * 0.78 + zeroCrossingRate * 0.22;
          smoothedSpectralFlux = smoothedSpectralFlux * 0.68 + spectralFlux * 0.32;
          smoothedCrestFactor = smoothedCrestFactor * 0.74 + crestFactor * 0.26;
          smoothedSpectralFlatness = smoothedSpectralFlatness * 0.74 + spectralFlatness * 0.26;
          smoothedSpectralCentroidHz = smoothedSpectralCentroidHz * 0.72 + spectralCentroidHz * 0.28;
          smoothedPeriodicity = smoothedPeriodicity * 0.76 + periodicity * 0.24;

          const nowMs = Date.now();
          if (!gateOpen) {
            if (nowMs < calibrationEndsAt) {
              ambientFloor = ambientFloor * 0.9 + smoothedRms * 0.1;
              ambientVoiceRatio = ambientVoiceRatio * 0.9 + smoothedVoiceRatio * 0.1;
              ambientSpeechSignature = ambientSpeechSignature * 0.9 + smoothedSpeechSignature * 0.1;
            } else {
              if (smoothedRms < ambientFloor * 1.4) {
                ambientFloor = ambientFloor * 0.97 + smoothedRms * 0.03;
              }
              if (smoothedVoiceRatio < ambientVoiceRatio * 1.16) {
                ambientVoiceRatio = ambientVoiceRatio * 0.96 + smoothedVoiceRatio * 0.04;
              }
              if (smoothedSpeechSignature < ambientSpeechSignature * 1.2) {
                ambientSpeechSignature = ambientSpeechSignature * 0.95 + smoothedSpeechSignature * 0.05;
              }
            }
          }

          const dynamicOpenThreshold = Math.max(minimumOpenThreshold, ambientFloor * floorOpenMultiplier);
          const dynamicCloseCandidate = Math.max(minimumCloseThreshold, ambientFloor * floorCloseMultiplier);
          const dynamicCloseThreshold = Math.min(dynamicOpenThreshold * 0.82, dynamicCloseCandidate);
          const dynamicVoiceRatioThreshold = Math.min(
            0.86,
            Math.max(baseVoiceRatioThreshold, ambientVoiceRatio + voiceRatioMargin),
          );
          const dynamicVoiceRatioCloseThreshold = Math.max(
            0.24,
            dynamicVoiceRatioThreshold - (profileIsUltra ? 0.11 : 0.09),
          );
          const dynamicSpeechSignatureThreshold = Math.min(
            0.55,
            Math.max(baseSpeechSignatureThreshold, ambientSpeechSignature + speechSignatureMargin),
          );
          const dynamicSpeechSignatureCloseThreshold = Math.max(0.04, dynamicSpeechSignatureThreshold - 0.06);

          const clickLikeTransient =
            smoothedCrestFactor >= crestClickThreshold &&
            smoothedSpectralFlux >= fluxClickThreshold &&
            smoothedSpeechSignature < dynamicSpeechSignatureThreshold * 0.94;
          if (clickLikeTransient) {
            clickRejectUntil = nowMs + clickRejectMs;
          }
          const clickRejectActive = nowMs < clickRejectUntil;

          const voiceSnr = computeBandSnr(voiceBandStart, voiceBandEnd);
          const rumbleSnr = computeBandSnr(rumbleBandStart, rumbleBandEnd);
          const highNoiseSnr = computeBandSnr(highNoiseBandStart, highNoiseBandEnd);
          const shouldLearnNoiseProfile =
            !gateOpen ||
            nowMs < calibrationEndsAt ||
            speechConfidence < speechConfidenceOpenThreshold * 0.42;
          if (shouldLearnNoiseProfile) {
            const alpha = nowMs < calibrationEndsAt ? noiseProfileCalibrationAlpha : noiseProfileLearnAlpha;
            for (let i = analysisBandStart; i <= analysisBandEnd; i += 1) {
              adaptiveNoiseProfile[i] = adaptiveNoiseProfile[i] * alpha + currentSpectrumPower[i] * (1 - alpha);
            }
          }

          const hasVoiceBandFocus = smoothedVoiceRatio >= dynamicVoiceRatioThreshold;
          const hasSpeechSignature = smoothedSpeechSignature >= dynamicSpeechSignatureThreshold;
          const hasVoiceLikeZeroCrossing =
            smoothedZeroCrossingRate >= zeroCrossingMin && smoothedZeroCrossingRate <= zeroCrossingMax;
          const periodicityScore = scoreRange(smoothedPeriodicity, 0.1, 0.62);
          const voiceSnrScore = scoreRange(voiceSnr, 1.15, 3.05);
          const signatureScore = scoreRange(
            smoothedSpeechSignature,
            dynamicSpeechSignatureThreshold * 0.72,
            dynamicSpeechSignatureThreshold * 1.7,
          );
          const voiceRatioScore = scoreRange(
            smoothedVoiceRatio,
            dynamicVoiceRatioThreshold * 0.84,
            Math.min(0.92, dynamicVoiceRatioThreshold * 1.4),
          );
          const flatnessPenalty = scoreRange(
            smoothedSpectralFlatness,
            profileIsUltra ? 0.58 : 0.64,
            profileIsUltra ? 0.9 : 0.93,
          );
          const centroidPenalty =
            scoreRange(Math.abs(smoothedSpectralCentroidHz - 2200), 1700, profileIsUltra ? 4600 : 5200) *
            (1 - periodicityScore * 0.32);
          const fanLikeNoise =
            rumbleRatio > 0.28 &&
            highNoiseRatio < 0.22 &&
            smoothedSpectralFlux < (profileIsUltra ? 0.088 : 0.1) &&
            smoothedPeriodicity < 0.25 &&
            smoothedSpeechSignature < dynamicSpeechSignatureThreshold * 0.74;
          const spectralNoiseLike =
            smoothedSpectralFlatness > (profileIsUltra ? 0.79 : 0.84) &&
            smoothedPeriodicity < (profileIsUltra ? 0.21 : 0.18);
          const speechEvidenceRaw =
            0.31 * voiceSnrScore +
            0.21 * signatureScore +
            0.16 * periodicityScore +
            0.13 * voiceRatioScore +
            0.1 * (hasVoiceLikeZeroCrossing ? 1 : 0) +
            0.09 * (hasVoiceBandFocus ? 1 : 0) -
            0.2 * flatnessPenalty -
            0.11 * centroidPenalty -
            0.1 * scoreRange(rumbleSnr, 1.55, 3.2) * scoreRange(rumbleRatio, 0.22, 0.5) -
            0.08 * scoreRange(highNoiseSnr, 1.5, 3.1) * scoreRange(highNoiseRatio, 0.22, 0.5) -
            (clickRejectActive ? 0.22 : 0) -
            (fanLikeNoise ? 0.24 : 0) -
            (spectralNoiseLike ? 0.16 : 0);
          const speechEvidence = clamp01(speechEvidenceRaw);
          speechEvidenceSmoothed = speechEvidenceSmoothed * 0.72 + speechEvidence * 0.28;

          const baseVoiceDetected =
            hasVoiceBandFocus &&
            hasSpeechSignature &&
            hasVoiceLikeZeroCrossing &&
            speechEvidenceSmoothed >= speechEvidenceOpenThreshold &&
            !clickRejectActive &&
            !fanLikeNoise &&
            !spectralNoiseLike;

          if (baseVoiceDetected) {
            speechConfidence = Math.min(1, speechConfidence + 0.06 + speechEvidenceSmoothed * (profileIsUltra ? 0.2 : 0.17));
          } else {
            speechConfidence = Math.max(
              0,
              speechConfidence -
                (profileIsUltra ? 0.108 : 0.094) -
                (clickRejectActive ? 0.03 : 0) -
                (fanLikeNoise ? 0.026 : 0),
            );
          }

          const voiceDetected =
            baseVoiceDetected &&
            speechConfidence >= speechConfidenceOpenThreshold &&
            speechEvidenceSmoothed >= speechEvidenceOpenThreshold;
          const loudVoiceOverride =
            smoothedRms >= dynamicOpenThreshold * 1.68 &&
            speechEvidenceSmoothed >= speechEvidenceOpenThreshold * 0.96 &&
            smoothedVoiceRatio >= dynamicVoiceRatioCloseThreshold &&
            smoothedSpeechSignature >= dynamicSpeechSignatureCloseThreshold &&
            !clickRejectActive &&
            !fanLikeNoise;

          if ((smoothedRms >= dynamicOpenThreshold && voiceDetected) || loudVoiceOverride) {
            gateOpen = true;
            gateHoldUntil = nowMs + holdMs;
          } else if (gateOpen && nowMs > gateHoldUntil) {
            const voiceSignatureDropped =
              smoothedVoiceRatio <= dynamicVoiceRatioCloseThreshold ||
              smoothedSpeechSignature <= dynamicSpeechSignatureCloseThreshold ||
              smoothedZeroCrossingRate <= zeroCrossingMin * 0.62 ||
              smoothedZeroCrossingRate >= zeroCrossingMax * 1.28 ||
              speechConfidence <= speechConfidenceCloseThreshold ||
              speechEvidenceSmoothed <= speechEvidenceCloseThreshold ||
              clickRejectActive ||
              fanLikeNoise ||
              spectralNoiseLike;
            if (smoothedRms <= dynamicCloseThreshold || voiceSignatureDropped) {
              gateOpen = false;
            }
          }

          const relaxedClosedGain = Math.min(0.1, closedGain * 2.2);
          const targetGain = gateOpen
            ? 1
            : speechConfidence > speechConfidenceCloseThreshold && speechEvidenceSmoothed > speechEvidenceCloseThreshold
              ? relaxedClosedGain
              : closedGain;
          try {
            gateGainNode.gain.setTargetAtTime(targetGain, audioContext.currentTime, gateOpen ? 0.008 : 0.058);
          } catch {
            gateGainNode.gain.value = targetGain;
          }

          // Hard guard: voice AI can attenuate, but never increase perceived loudness over dry mic.
          let targetLoudnessGuard = loudnessGuard;
          if (smoothedInputRms > 0.002) {
            const allowedOutputRms = smoothedInputRms * 1.02 + 0.00035;
            const outputBoostRatio = smoothedOutputRms / Math.max(1e-5, allowedOutputRms);
            if (outputBoostRatio > 1) {
              targetLoudnessGuard = Math.max(minLoudnessGuard, 1 / outputBoostRatio);
            } else {
              targetLoudnessGuard = Math.min(1, loudnessGuard + (gateOpen ? 0.012 : 0.006));
            }
          } else {
            targetLoudnessGuard = Math.min(1, loudnessGuard + 0.01);
          }
          loudnessGuard = loudnessGuard * 0.78 + targetLoudnessGuard * 0.22;
          try {
            loudnessGuardGainNode.gain.setTargetAtTime(loudnessGuard, audioContext.currentTime, 0.038);
          } catch {
            loudnessGuardGainNode.gain.value = loudnessGuard;
          }
        };

        updateGate();
        voiceEnhancementGateIntervalRef.current = window.setInterval(updateGate, 34);

        if (audioContext.state !== "running") {
          await audioContext.resume().catch(() => undefined);
        }

        voiceEnhancementAudioContextRef.current = audioContext;
        voiceEnhancementSourceNodeRef.current = sourceNode;
        voiceEnhancementDestinationNodeRef.current = destinationNode;
        voiceEnhancementInputStreamRef.current = inputStream;
        voiceEnhancementOutputGainNodeRef.current = outputGainNode;
        voiceEnhancementLoudnessGuardGainRef.current = loudnessGuardGainNode;
        voiceEnhancementAnalyserRef.current = gateAnalyser;
        voiceEnhancementFrequencyAnalyserRef.current = gateFrequencyAnalyser;
        voiceEnhancementInputLevelAnalyserRef.current = inputLevelAnalyserNode;
        voiceEnhancementOutputLevelAnalyserRef.current = outputLevelAnalyserNode;

        return destinationNode.stream;
      } catch {
        await disposeVoiceEnhancementPipeline();
        return null;
      }
    },
    [disposeVoiceEnhancementPipeline],
  );

  const requestVoiceMicrophoneStream = useCallback(async (): Promise<MediaStream> => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Microphone capture is not supported in this runtime.");
    }

    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: buildStrictVoiceAudioConstraints(voiceMicSettings),
        video: false,
      });
    } catch {
      try {
        return await navigator.mediaDevices.getUserMedia({
          audio: buildVoiceAudioConstraints(voiceMicSettings),
          video: false,
        });
      } catch {
        const selectedDeviceId = normalizeMicInputDeviceId(voiceMicSettings.inputDeviceId);
        return await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: selectedDeviceId === "default" ? undefined : { ideal: selectedDeviceId },
            echoCancellation: voiceMicSettings.echoCancellation,
            noiseSuppression: voiceMicSettings.noiseSuppression,
            autoGainControl: false,
            channelCount: 1,
          },
          video: false,
        });
      }
    }
  }, [voiceMicSettings]);

  const applyLocalVoiceMute = useCallback((muted: boolean) => {
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
    livekitInputStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
    rnnoiseInputStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
    voiceEnhancementInputStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }, []);

  const disconnectRemoteAudioOutputNode = useCallback((userId: string, kind: "voice" | "screen" | "all" = "all") => {
    const disconnectNodePair = (
      sourceMap: Map<string, MediaElementAudioSourceNode>,
      gainMap: Map<string, GainNode>,
      targetUserId: string,
    ) => {
      const sourceNode = sourceMap.get(targetUserId);
      const gainNode = gainMap.get(targetUserId);
      if (sourceNode) {
        try {
          sourceNode.disconnect();
        } catch {
          // Ignore stale source-node disconnect failures.
        }
        sourceMap.delete(targetUserId);
      }
      if (gainNode) {
        try {
          gainNode.disconnect();
        } catch {
          // Ignore stale gain-node disconnect failures.
        }
        gainMap.delete(targetUserId);
      }
    };

    if (kind === "all" || kind === "voice") {
      disconnectNodePair(remoteVoiceAudioSourceNodesRef.current, remoteVoiceGainNodesRef.current, userId);
    }
    if (kind === "all" || kind === "screen") {
      disconnectNodePair(remoteScreenAudioSourceNodesRef.current, remoteScreenGainNodesRef.current, userId);
    }
  }, []);

  const ensureRemoteAudioGainNode = useCallback(
    (userId: string, audioEl: HTMLAudioElement, kind: "voice" | "screen"): GainNode | null => {
      const sourceMap = kind === "voice" ? remoteVoiceAudioSourceNodesRef.current : remoteScreenAudioSourceNodesRef.current;
      const gainMap = kind === "voice" ? remoteVoiceGainNodesRef.current : remoteScreenGainNodesRef.current;
      const existingSourceNode = sourceMap.get(userId);
      const existingGainNode = gainMap.get(userId);

      if (existingSourceNode && existingGainNode) {
        if (existingSourceNode.mediaElement === audioEl) {
          return existingGainNode;
        }
        disconnectRemoteAudioOutputNode(userId, kind);
      }

      try {
        let outputAudioContext = remoteOutputAudioContextRef.current;
        if (!outputAudioContext) {
          outputAudioContext = new AudioContext({ latencyHint: "interactive" });
          remoteOutputAudioContextRef.current = outputAudioContext;
        }
        if (outputAudioContext.state !== "running") {
          void outputAudioContext.resume().catch(() => undefined);
        }
        if (outputAudioContext.state === "closed") {
          return null;
        }

        const sourceNode = outputAudioContext.createMediaElementSource(audioEl);
        const gainNode = outputAudioContext.createGain();
        sourceNode.connect(gainNode);
        gainNode.connect(outputAudioContext.destination);
        sourceMap.set(userId, sourceNode);
        gainMap.set(userId, gainNode);
        return gainNode;
      } catch {
        return null;
      }
    },
    [disconnectRemoteAudioOutputNode],
  );

  const applyRemoteAudioOutput = useCallback(
    (targetUserId?: string) => {
      const requestedVolumes = remoteUserVolumesRef.current;
      const isVoiceDeafened = voiceDeafenedRef.current;
      const isScreenAudioMuted = screenShareAudioMutedRef.current;

      const applyToVoiceAudio = (userId: string, audioEl: HTMLAudioElement) => {
        const requestedVolume = clampVoiceVolume(requestedVolumes[userId] ?? 1);
        const effectiveOutputGain = resolveRemoteVoiceOutputGain(requestedVolume);
        const gainNode = ensureRemoteAudioGainNode(userId, audioEl, "voice");
        audioEl.muted = false;
        audioEl.volume = 1;
        if (gainNode) {
          gainNode.gain.value = isVoiceDeafened ? 0 : effectiveOutputGain;
          return;
        }
        audioEl.muted = isVoiceDeafened;
        audioEl.volume = Math.min(1, effectiveOutputGain);
      };
      const applyToScreenShareAudio = (userId: string, audioEl: HTMLAudioElement) => {
        const requestedVolume = clampVoiceVolume(requestedVolumes[userId] ?? 1);
        const effectiveOutputGain = resolveRemoteVoiceOutputGain(requestedVolume);
        const gainNode = ensureRemoteAudioGainNode(userId, audioEl, "screen");
        audioEl.muted = false;
        audioEl.volume = 1;
        if (gainNode) {
          gainNode.gain.value = isVoiceDeafened || isScreenAudioMuted ? 0 : effectiveOutputGain;
          return;
        }
        audioEl.muted = isVoiceDeafened || isScreenAudioMuted;
        audioEl.volume = Math.min(1, effectiveOutputGain);
      };

      if (targetUserId) {
        const voiceAudioEl = remoteAudioElsRef.current.get(targetUserId);
        if (voiceAudioEl) {
          applyToVoiceAudio(targetUserId, voiceAudioEl);
        }
        const screenAudioEl = remoteScreenAudioElsRef.current.get(targetUserId);
        if (screenAudioEl) {
          applyToScreenShareAudio(targetUserId, screenAudioEl);
        }
        return;
      }

      remoteAudioElsRef.current.forEach((audioEl, userId) => {
        applyToVoiceAudio(userId, audioEl);
      });
      remoteScreenAudioElsRef.current.forEach((audioEl, userId) => {
        applyToScreenShareAudio(userId, audioEl);
      });
    },
    [ensureRemoteAudioGainNode],
  );

  const handleSetRemoteUserVolume = useCallback(
    (userId: string, volume: number) => {
      const nextVolume = clampVoiceVolume(volume);
      const effectiveOutputGain = resolveRemoteVoiceOutputGain(nextVolume);
      remoteUserVolumesRef.current = {
        ...remoteUserVolumesRef.current,
        [userId]: nextVolume,
      };
      setRemoteUserVolumes((prev) => ({
        ...prev,
        [userId]: nextVolume,
      }));

      const voiceGainNode = remoteVoiceGainNodesRef.current.get(userId);
      if (voiceGainNode) {
        voiceGainNode.gain.value = voiceDeafenedRef.current ? 0 : effectiveOutputGain;
      }
      const screenGainNode = remoteScreenGainNodesRef.current.get(userId);
      if (screenGainNode) {
        screenGainNode.gain.value = voiceDeafenedRef.current || screenShareAudioMutedRef.current ? 0 : effectiveOutputGain;
      }

      const voiceAudioEl = remoteAudioElsRef.current.get(userId);
      if (voiceAudioEl) {
        voiceAudioEl.muted = false;
        voiceAudioEl.volume = voiceGainNode ? 1 : Math.min(1, effectiveOutputGain);
      }
      const screenAudioEl = remoteScreenAudioElsRef.current.get(userId);
      if (screenAudioEl) {
        screenAudioEl.muted = false;
        screenAudioEl.volume = screenGainNode ? 1 : Math.min(1, effectiveOutputGain);
      }
    },
    [],
  );

  useEffect(() => {
    persistSoundboardToStorage(soundboardClips);
  }, [soundboardClips]);

  const handleUploadSoundboardClip = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;

      if (soundboardClips.length >= SOUNDBOARD_MAX_CLIPS) {
        setSoundboardError(`Soundboard is full (max ${SOUNDBOARD_MAX_CLIPS} sounds).`);
        return;
      }
      if (!file.type.startsWith("audio/")) {
        setSoundboardError("Only audio files are supported.");
        return;
      }
      if (file.size > SOUNDBOARD_MAX_CLIP_BYTES) {
        setSoundboardError("Sound must be 2MB or smaller.");
        return;
      }

      setSoundboardBusy(true);
      setSoundboardError("");
      try {
        const dataUrl = await fileToDataUrl(file);
        const clipName = file.name.replace(/\.[^.]+$/, "").trim() || "Sound";
        setSoundboardClips((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            name: clipName.slice(0, 42),
            dataUrl,
          },
        ]);
      } catch (err) {
        setSoundboardError(err instanceof Error ? err.message : "Could not upload sound.");
      } finally {
        setSoundboardBusy(false);
      }
    },
    [soundboardClips.length],
  );

  const handleRemoveSoundboardClip = useCallback((clipId: string) => {
    setSoundboardClips((prev) => prev.filter((clip) => clip.id !== clipId));
    setSoundboardError("");
  }, []);

  const handlePlaySoundboardClip = useCallback(
    async (clip: SoundboardClip) => {
      if (!voiceRoomKey) {
        setSoundboardError("Join voice before using soundboard clips.");
        return;
      }

      try {
        setSoundboardError("");
        setSoundboardPlayingId(clip.id);
        const audio = new Audio(clip.dataUrl);
        audio.volume = 1;
        audio.onended = () => {
          setSoundboardPlayingId((prev) => (prev === clip.id ? null : prev));
        };
        await audio.play();
      } catch (err) {
        setSoundboardPlayingId((prev) => (prev === clip.id ? null : prev));
        setSoundboardError(err instanceof Error ? err.message : "Could not play sound.");
      }
    },
    [voiceRoomKey],
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
    remoteUserVolumesRef.current = remoteUserVolumes;
  }, [remoteUserVolumes]);

  useEffect(() => {
    voiceDeafenedRef.current = voiceDeafened;
  }, [voiceDeafened]);

  useEffect(() => {
    screenShareAudioMutedRef.current = screenShareAudioMuted;
  }, [screenShareAudioMuted]);

  useEffect(() => {
    applyRemoteAudioOutput();
  }, [applyRemoteAudioOutput, remoteUserVolumes, screenShareAudioMuted, voiceDeafened]);

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
  const totalUnreadDmCount = useMemo(
    () => Object.values(unreadDmCounts).reduce((sum, count) => sum + Math.max(0, Number(count) || 0), 0),
    [unreadDmCounts],
  );
  const totalIncomingDmCallCount = useMemo(
    () => Object.values(dmIncomingCallCounts).reduce((sum, count) => sum + (count > 0 ? 1 : 0), 0),
    [dmIncomingCallCounts],
  );
  const totalIncomingDmCallCountForNav = voiceRoomKey ? 0 : totalIncomingDmCallCount;
  const totalDmAlertCount = totalUnreadDmCount > 0 ? totalUnreadDmCount : totalIncomingDmCallCountForNav;
  const totalDmAlertLabel = totalDmAlertCount > 99 ? "99+" : String(totalDmAlertCount);
  const incomingRequestUserIds = useMemo(() => new Set(pendingIncoming.map((req) => req.sender_id)), [pendingIncoming]);
  const outgoingRequestUserIds = useMemo(() => new Set(pendingOutgoing.map((req) => req.receiver_id)), [pendingOutgoing]);
  const normalizedGlytchInviteSearch = glytchInviteSearch.trim().toLowerCase();
  const filteredGlytchInviteDms = useMemo(() => {
    if (!normalizedGlytchInviteSearch) return dms;
    return dms.filter((dm) => dm.friendName.toLowerCase().includes(normalizedGlytchInviteSearch));
  }, [dms, normalizedGlytchInviteSearch]);
  const activeGroupMemberIdSet = useMemo(
    () => new Set((activeGroupChat?.members || []).map((member) => member.user_id)),
    [activeGroupChat?.members],
  );
  const availableFriendsForActiveGroup = useMemo(
    () => dms.filter((dm) => !activeGroupMemberIdSet.has(dm.friendUserId)),
    [activeGroupMemberIdSet, dms],
  );

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
  const filteredUnifiedDmRows = useMemo(() => {
    if (!unifiedSidebarSearchQuery) return filteredDms;
    return filteredDms.filter((dm) => dm.friendName.toLowerCase().includes(unifiedSidebarSearchQuery));
  }, [filteredDms, unifiedSidebarSearchQuery]);
  const onlineDmRows = useMemo(
    () =>
      sortedDms.filter((dm) => {
        const status = resolvePresenceForUser(dm.friendUserId);
        return status === "active" || status === "away";
      }),
    [resolvePresenceForUser, sortedDms],
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
  const displayName = (currentProfile?.display_name || currentProfile?.username || currentUserName || "User").trim() || "User";
  const rawSettingsUsername = (profileForm.username || currentProfile?.username || currentUserName || "").trim().toLowerCase();
  const settingsUsername = formatUsernameWithId(rawSettingsUsername, currentUserId);
  const resizeProfileBioInput = useCallback(() => {
    const textarea = profileBioInputRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const clampedHeight = Math.max(92, Math.min(220, textarea.scrollHeight));
    textarea.style.height = `${clampedHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > clampedHeight ? "auto" : "hidden";
  }, []);
  useEffect(() => {
    resizeProfileBioInput();
  }, [profileForm.bio, resizeProfileBioInput, settingsSection, settingsTab]);
  const dmMessageNotificationsEnabled = profileForm.notificationsEnabled && profileForm.notifyDmMessages;
  const dmCallNotificationsEnabled = profileForm.notificationsEnabled && profileForm.notifyDmCalls;
  const glytchMessageNotificationsEnabled = profileForm.notificationsEnabled && profileForm.notifyGlytchMessages;
  const friendRequestNotificationsEnabled = profileForm.notificationsEnabled && profileForm.notifyFriendRequests;
  const friendRequestAcceptedNotificationsEnabled =
    profileForm.notificationsEnabled && profileForm.notifyFriendRequestAccepted;
  const thirdPartyIntegrationsEnabled = profileForm.thirdPartyIntegrationsEnabled;
  const isElectronRuntime =
    typeof window !== "undefined" && Boolean(window.electronAPI?.isElectron || isElectronUserAgent());
  const electronDesktopPlatform =
    typeof window === "undefined"
      ? null
      : normalizeDesktopUpdatePlatform(window.electronAPI?.platform) || inferDesktopPlatformFromNavigator();
  const isWindowsElectronRuntime = isElectronRuntime && electronDesktopPlatform === "windows";
  const hasInAppInstallerUpdateBridge = typeof window !== "undefined" && Boolean(window.electronAPI?.downloadAndInstallUpdate);
  const supportsWindowsAutoInstall = isWindowsElectronRuntime && hasInAppInstallerUpdateBridge;
  const supportsDesktopUpdateAction =
    isElectronRuntime && (electronDesktopPlatform === "windows" || electronDesktopPlatform === "mac");
  const desktopUpdateActionLabel = hasInAppInstallerUpdateBridge ? "Install Update" : "Download Update";
  const selectedPatchNoteEntry =
    PATCH_NOTES.find((entry) => entry.version === selectedPatchNoteVersion) || PATCH_NOTES[0] || null;
  const isDesktopUpdateAvailable =
    desktopLatestVersion.length > 0 &&
    desktopUpdateDownloadUrl.length > 0 &&
    compareSemanticVersions(desktopLatestVersion, desktopAppVersion || "0.0.0") > 0;

  useEffect(() => {
    publishedCurrentGameRef.current = currentProfile?.current_game?.trim() || null;
  }, [currentProfile?.current_game]);

  useEffect(() => {
    if (!isElectronRuntime || !window.electronAPI?.detectActiveGame) return;
    let cancelled = false;
    let polling = false;

    const publishCurrentGame = async (nextGameName: string | null) => {
      try {
        const updated = await updateMyProfileCustomization(accessToken, currentUserId, {
          current_game: nextGameName,
          current_game_updated_at: new Date().toISOString(),
        });
        if (cancelled) return;
        const nextProfile = updated[0] || null;
        if (nextProfile) {
          setCurrentProfile(nextProfile);
          setKnownProfiles((prev) => ({ ...prev, [nextProfile.user_id]: nextProfile }));
          setViewedProfile((prev) => (prev?.user_id === nextProfile.user_id ? nextProfile : prev));
        }
      } catch {
        // Keep activity detection silent if OS process inspection is unavailable.
      }
    };

    const pollGameActivity = async () => {
      if (polling || cancelled) return;
      polling = true;
      try {
        let detectedGameName: string | null = null;
        if (profileForm.gameActivitySharingEnabled) {
          const result = await window.electronAPI!.detectActiveGame!();
          if (result?.ok && typeof result.gameName === "string" && result.gameName.trim()) {
            detectedGameName = result.gameName.trim().slice(0, 96);
          }
        }

        if (detectedGameName === publishedCurrentGameRef.current) return;
        publishedCurrentGameRef.current = detectedGameName;
        await publishCurrentGame(detectedGameName);
      } finally {
        polling = false;
      }
    };

    void pollGameActivity();
    const intervalId = window.setInterval(() => {
      void pollGameActivity();
    }, 12_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [accessToken, currentUserId, isElectronRuntime, profileForm.gameActivitySharingEnabled]);

  const checkForDesktopAppUpdate = useCallback(async () => {
    if (!isElectronRuntime) return;
    if (!electronDesktopPlatform) {
      setDesktopUpdateError("Desktop update checks are not supported on this platform.");
      return;
    }

    const apiBase = normalizeBackendApiBaseUrl(import.meta.env.VITE_API_URL as string | undefined);
    if (!apiBase) {
      setDesktopUpdateError("Update checks require VITE_API_URL to point to your backend.");
      return;
    }

    setDesktopUpdateBusy(true);
    setDesktopUpdateError("");
    setDesktopUpdateNotice("");

    try {
      let installedVersion = normalizeInstalledAppVersion(desktopAppVersion);
      if ((!desktopAppVersion || desktopAppVersion === "0.0.0") && window.electronAPI?.getAppVersion) {
        const resolvedVersion = normalizeInstalledAppVersion(await window.electronAPI.getAppVersion());
        installedVersion = resolvedVersion;
        setDesktopAppVersion(resolvedVersion);
      }

      const response = await fetch(`${apiBase}/api/updates/${electronDesktopPlatform}/latest`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });
      const payload = (await response.json().catch(() => ({}))) as Partial<DesktopUpdatePayload> & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Could not check for desktop updates.");
      }

      const latestVersion = typeof payload.version === "string" ? payload.version.trim() : "";
      const downloadUrl = typeof payload.downloadUrl === "string" ? payload.downloadUrl : "";
      const publishedAt = typeof payload.publishedAt === "string" ? payload.publishedAt : null;
      if (!latestVersion || !downloadUrl) {
        throw new Error("Updater response is missing version or download URL.");
      }

      setDesktopLatestVersion(latestVersion);
      setDesktopUpdateDownloadUrl(downloadUrl);
      setDesktopUpdatePublishedAt(publishedAt);
      setDesktopUpdateNotice(
        compareSemanticVersions(latestVersion, installedVersion) > 0
          ? `Update ${latestVersion} is available.`
          : `You are up to date (v${installedVersion || latestVersion}).`,
      );
      if (compareSemanticVersions(latestVersion, installedVersion) <= 0) {
        desktopAutoInstallAttemptRef.current = "";
      }
    } catch (err) {
      setDesktopUpdateError(err instanceof Error ? err.message : "Could not check for desktop updates.");
    } finally {
      setDesktopUpdateLastCheckedAt(new Date().toISOString());
      setDesktopUpdateBusy(false);
    }
  }, [desktopAppVersion, electronDesktopPlatform, isElectronRuntime]);

  const handleInstallDesktopUpdate = useCallback(async () => {
    if (!desktopUpdateDownloadUrl) {
      setDesktopUpdateError("No update download URL is available yet.");
      return;
    }
    if (!electronDesktopPlatform) {
      setDesktopUpdateError("Desktop update actions are not supported on this platform.");
      return;
    }

    setDesktopUpdateInstallBusy(true);
    setDesktopUpdateError("");
    setDesktopUpdateNotice(
      electronDesktopPlatform === "windows" ? "Downloading update installer..." : "Opening update download...",
    );
    try {
      if (electronDesktopPlatform === "windows") {
        if (window.electronAPI?.downloadAndInstallUpdate) {
          await window.electronAPI.downloadAndInstallUpdate(desktopUpdateDownloadUrl);
          setDesktopUpdateNotice("Installer launched. Glytch Chat will close so the update can be applied.");
        } else if (typeof window !== "undefined") {
          window.open(desktopUpdateDownloadUrl, "_blank", "noopener,noreferrer");
          setDesktopUpdateNotice("Opened update download. Run the installer to update Glytch Chat.");
        }
      } else if (electronDesktopPlatform === "mac") {
        if (window.electronAPI?.downloadAndInstallUpdate) {
          await window.electronAPI.downloadAndInstallUpdate(desktopUpdateDownloadUrl);
          setDesktopUpdateNotice("Update installer started. Glytch Chat will close and reopen when done.");
        } else if (typeof window !== "undefined") {
          window.open(desktopUpdateDownloadUrl, "_blank", "noopener,noreferrer");
          setDesktopUpdateNotice("Opened update download. Install the latest DMG to update Glytch Chat.");
        }
      } else {
        throw new Error("Desktop update actions are not supported on this platform.");
      }
    } catch (err) {
      setDesktopUpdateError(err instanceof Error ? err.message : "Could not start update.");
    } finally {
      setDesktopUpdateInstallBusy(false);
    }
  }, [desktopUpdateDownloadUrl, electronDesktopPlatform]);

  const handleOpenDesktopUninstall = useCallback(async () => {
    if (!isElectronRuntime || !window.electronAPI?.openUninstall) {
      setDesktopUpdateError("Desktop uninstall shortcuts are only available in Electron builds.");
      return;
    }

    setDesktopUninstallBusy(true);
    setDesktopUpdateError("");
    setDesktopUpdateNotice("");
    try {
      const result = await window.electronAPI.openUninstall();
      setDesktopUpdateNotice(
        result?.launched
          ? "Uninstaller launched."
          : "Could not find the uninstaller executable. Opened Apps & Features instead.",
      );
    } catch (err) {
      setDesktopUpdateError(err instanceof Error ? err.message : "Could not open uninstall options.");
    } finally {
      setDesktopUninstallBusy(false);
    }
  }, [isElectronRuntime]);

  const openWindowsPrivacySettings = useCallback(
    async (kind: "camera" | "microphone" | "screen") => {
      if (!isWindowsElectronRuntime || !window.electronAPI?.openWindowsPrivacySettings) return;
      setWindowsPrivacyOpenBusy(kind);
      try {
        await window.electronAPI.openWindowsPrivacySettings(kind);
      } finally {
        setWindowsPrivacyOpenBusy((prev) => (prev === kind ? null : prev));
      }
    },
    [isWindowsElectronRuntime],
  );

  const ensureWindowsMediaStatus = useCallback(
    async (kind: "camera" | "microphone"): Promise<boolean> => {
      if (!isWindowsElectronRuntime || !window.electronAPI?.getMediaPermissionStatus) return true;
      try {
        const result = await window.electronAPI.getMediaPermissionStatus(kind);
        const normalized = (result?.status || "").toLowerCase();
        if (normalized === "denied" || normalized === "restricted") {
          setVoiceError(
            kind === "camera"
              ? "Windows camera permission is blocked for Glytch Chat. Enable camera access in Windows privacy settings."
              : "Windows microphone permission is blocked for Glytch Chat. Enable microphone access in Windows privacy settings.",
          );
          return false;
        }
      } catch {
        // If status detection fails, continue and let getUserMedia provide the canonical error.
      }
      return true;
    },
    [isWindowsElectronRuntime],
  );

  const refreshVoiceInputDevices = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const nextInputs = devices.filter((device) => device.kind === "audioinput");
      setVoiceInputDevices(nextInputs);
      setVoiceMicSettings((prev) => {
        const selectedId = normalizeMicInputDeviceId(prev.inputDeviceId);
        if (selectedId === "default") return prev;
        const exists = nextInputs.some((device) => device.deviceId === selectedId);
        if (exists) return prev;
        return { ...prev, inputDeviceId: "default" };
      });
    } catch {
      // Ignore device-listing failures.
    }
  }, []);

  useEffect(() => {
    if (!isElectronRuntime || !window.electronAPI?.getAppVersion) return;
    let mounted = true;
    void window.electronAPI
      .getAppVersion()
      .then((version) => {
        if (!mounted) return;
        setDesktopAppVersion(normalizeInstalledAppVersion(version));
      })
      .catch(() => {
        if (!mounted) return;
        setDesktopAppVersion(normalizeInstalledAppVersion(""));
      });

    return () => {
      mounted = false;
    };
  }, [isElectronRuntime]);

  useEffect(() => {
    persistDesktopAutoUpdateWindowsToStorage(desktopAutoUpdateWindowsEnabled);
  }, [desktopAutoUpdateWindowsEnabled]);

  useEffect(() => {
    persistVoiceMicSettingsToStorage(voiceMicSettings);
  }, [voiceMicSettings]);

  useEffect(() => {
    const gainNode = voiceEnhancementOutputGainNodeRef.current;
    if (!gainNode) return;
    const gainValue = Math.min(1, normalizeMicInputGainPercent(voiceMicSettings.inputGainPercent) / 100);
    try {
      gainNode.gain.setTargetAtTime(gainValue, gainNode.context.currentTime, 0.05);
    } catch {
      gainNode.gain.value = gainValue;
    }
  }, [voiceMicSettings.inputGainPercent]);

  useEffect(() => {
    void refreshVoiceInputDevices();
    if (typeof navigator === "undefined" || !navigator.mediaDevices) return;
    const onDeviceChange = () => {
      void refreshVoiceInputDevices();
    };
    navigator.mediaDevices.addEventListener?.("devicechange", onDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener?.("devicechange", onDeviceChange);
    };
  }, [refreshVoiceInputDevices]);

  useEffect(() => {
    if (!micTestRunning || !micTestStreamRef.current) return;
    if (!micTestMonitorEnabled) {
      if (micTestMonitorAudioRef.current) {
        micTestMonitorAudioRef.current.pause();
        micTestMonitorAudioRef.current.srcObject = null;
        micTestMonitorAudioRef.current = null;
      }
      return;
    }

    if (!micTestMonitorAudioRef.current) {
      const monitorAudio = new Audio();
      monitorAudio.autoplay = true;
      monitorAudio.muted = false;
      monitorAudio.volume = 0.85;
      monitorAudio.srcObject = micTestStreamRef.current;
      micTestMonitorAudioRef.current = monitorAudio;
      void monitorAudio.play().catch(() => undefined);
      return;
    }

    micTestMonitorAudioRef.current.srcObject = micTestStreamRef.current;
    void micTestMonitorAudioRef.current.play().catch(() => undefined);
  }, [micTestMonitorEnabled, micTestRunning]);

  useEffect(() => {
    return () => {
      if (micTestSampleUrl.startsWith("blob:")) {
        URL.revokeObjectURL(micTestSampleUrl);
      }
    };
  }, [micTestSampleUrl]);

  useEffect(() => {
    if (!desktopAutoUpdateWindowsEnabled) {
      desktopAutoInstallAttemptRef.current = "";
    }
  }, [desktopAutoUpdateWindowsEnabled]);

  useEffect(() => {
    if (!isElectronRuntime) return;
    if (electronDesktopPlatform !== "windows" && electronDesktopPlatform !== "mac") return;
    if (!desktopAppVersion) return;
    if (desktopUpdateAutoCheckRef.current) return;
    desktopUpdateAutoCheckRef.current = true;
    void checkForDesktopAppUpdate();
  }, [checkForDesktopAppUpdate, desktopAppVersion, electronDesktopPlatform, isElectronRuntime]);

  useEffect(() => {
    if (!supportsWindowsAutoInstall) return;
    if (!desktopAutoUpdateWindowsEnabled) return;
    if (!isDesktopUpdateAvailable) return;
    if (desktopUpdateBusy || desktopUpdateInstallBusy) return;
    if (!desktopLatestVersion || !desktopUpdateDownloadUrl) return;

    const attemptKey = `${desktopLatestVersion}|${desktopUpdateDownloadUrl}`;
    if (desktopAutoInstallAttemptRef.current === attemptKey) return;
    desktopAutoInstallAttemptRef.current = attemptKey;

    setDesktopUpdateNotice(`Update ${desktopLatestVersion} found. Starting automatic install...`);
    void handleInstallDesktopUpdate();
  }, [
    supportsWindowsAutoInstall,
    desktopAutoUpdateWindowsEnabled,
    isDesktopUpdateAvailable,
    desktopUpdateBusy,
    desktopUpdateInstallBusy,
    desktopLatestVersion,
    desktopUpdateDownloadUrl,
    handleInstallDesktopUpdate,
  ]);

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
  const isDesktopSharing = Boolean(localScreenStream);
  const isCameraSharing = Boolean(localCameraStream);
  const isScreenSharing = isDesktopSharing || isCameraSharing;
  const remoteScreenShares = useMemo(
    () =>
      remoteScreenShareUserIds
        .map((shareId) => {
          const stream = remoteScreenStreamsRef.current.get(shareId);
          if (!stream) return null;
          const hasLiveVideoTrack = stream.getVideoTracks().some((track) => track.readyState !== "ended");
          if (!hasLiveVideoTrack) return null;
          const userId = remoteScreenShareOwnerByIdRef.current.get(shareId) || shareId.split(":")[0] || "";
          if (!userId) return null;
          const shareKind = remoteScreenShareKindByIdRef.current.get(shareId) || "screen";
          const profile = userId === currentUserId ? currentProfile : knownProfiles[userId];
          return {
            shareId,
            userId,
            shareKind,
            stream,
            name: profile?.display_name || profile?.username || (userId === currentUserId ? displayName : "User"),
          };
        })
        .filter((entry): entry is { shareId: string; userId: string; shareKind: LocalVideoShareKind; stream: MediaStream; name: string } => Boolean(entry)),
    [remoteScreenShareUserIds, knownProfiles, currentProfile, currentUserId, displayName],
  );
  const hasRemoteScreenShares = remoteScreenShares.length > 0;
  const isAnyScreenShareActive = isScreenSharing || hasRemoteScreenShares;
  const isRemoteScreenShareViewVisible =
    Boolean(voiceRoomKey && !isScreenSharing && hasRemoteScreenShares && visibleScreenShareRoomKey === voiceRoomKey);
  const presentingUserIds = useMemo(() => {
    const ids = new Set(remoteScreenShares.map((share) => share.userId));
    if (isScreenSharing) {
      ids.add(currentUserId);
    }
    return ids;
  }, [remoteScreenShares, isScreenSharing, currentUserId]);
  const shouldShowScreenSharePanel = Boolean(
    voiceRoomKey &&
      (isScreenSharing || (hasRemoteScreenShares && isRemoteScreenShareViewVisible)),
  );
  const canDismissRemoteScreenShareView = Boolean(
    voiceRoomKey && !isScreenSharing && hasRemoteScreenShares && isRemoteScreenShareViewVisible,
  );
  const canRestoreRemoteScreenShareView = Boolean(
    voiceRoomKey && !isScreenSharing && hasRemoteScreenShares && !isRemoteScreenShareViewVisible,
  );
  const selectedDesktopSourceLabel = useMemo(() => {
    if (selectedDesktopSourceId === "auto") return "Display";
    return desktopSourceOptions.find((source) => source.id === selectedDesktopSourceId)?.name || "Display";
  }, [desktopSourceOptions, selectedDesktopSourceId]);
  const localScreenShareCaption = useMemo(
    () => (selectedDesktopSourceId === "auto" ? "You (sharing)" : `You (${selectedDesktopSourceLabel})`),
    [selectedDesktopSourceId, selectedDesktopSourceLabel],
  );
  const screenSharePresenters = useMemo(
    () => [
      ...(isDesktopSharing && localScreenStream
        ? [
            {
              presenterId: `self:${currentUserId}:screen`,
              userId: currentUserId,
              stream: localScreenStream,
              name: displayName,
              caption: localScreenShareCaption,
              shareKind: "screen" as LocalVideoShareKind,
              isSelf: true,
            },
          ]
        : []),
      ...(isCameraSharing && localCameraStream
        ? [
            {
              presenterId: `self:${currentUserId}:camera`,
              userId: currentUserId,
              stream: localCameraStream,
              name: displayName,
              caption: "You (webcam)",
              shareKind: "camera" as LocalVideoShareKind,
              isSelf: true,
            },
          ]
        : []),
      ...remoteScreenShares.map((share) => {
        const shareKind = share.shareKind;
        return {
          presenterId: share.shareId,
          userId: share.userId,
          stream: share.stream,
          name: share.name,
          caption: shareKind === "camera" ? `${share.name} (webcam)` : share.name,
          shareKind,
          isSelf: false,
        };
      }),
    ],
    [
      currentUserId,
      displayName,
      isDesktopSharing,
      isCameraSharing,
      localScreenShareCaption,
      localScreenStream,
      localCameraStream,
      remoteScreenShares,
    ],
  );
  const hasRemoteCameraShares = useMemo(
    () => screenSharePresenters.some((presenter) => !presenter.isSelf && presenter.shareKind === "camera"),
    [screenSharePresenters],
  );
  const hasRemoteDesktopShares = useMemo(
    () => screenSharePresenters.some((presenter) => !presenter.isSelf && presenter.shareKind === "screen"),
    [screenSharePresenters],
  );
  const activeScreenSharePresenter = useMemo(
    () => {
      if (screenSharePresenters.length === 0) return null;
      if (!activeScreenSharePresenterId) return screenSharePresenters[0];
      return (
        screenSharePresenters.find((presenter) => presenter.presenterId === activeScreenSharePresenterId) ||
        screenSharePresenters[0]
      );
    },
    [activeScreenSharePresenterId, screenSharePresenters],
  );
  const mediaPanelHeading = useMemo(() => {
    if (activeScreenSharePresenter?.shareKind === "camera") return "Webcam";
    return "Screen Share";
  }, [activeScreenSharePresenter]);
  const restoreRemoteMediaViewLabel = useMemo(() => {
    if (hasRemoteCameraShares && !hasRemoteDesktopShares) {
      return "View webcam";
    }
    return "View screen share";
  }, [hasRemoteCameraShares, hasRemoteDesktopShares]);
  const dismissRemoteMediaViewLabel = useMemo(() => {
    if (hasRemoteCameraShares && !hasRemoteDesktopShares) {
      return "Leave webcam view";
    }
    return "Hide screen share";
  }, [hasRemoteCameraShares, hasRemoteDesktopShares]);
  const getLocalPrimaryVideoShareKind = useCallback((): LocalVideoShareKind | null => {
    if (localScreenStreamRef.current) return "screen";
    if (localCameraStreamRef.current) return "camera";
    return null;
  }, []);
  const hasRemoteShareForUser = useCallback((userId: string, excludeShareId?: string) => {
    for (const [shareId, ownerUserId] of remoteScreenShareOwnerByIdRef.current.entries()) {
      if (ownerUserId !== userId) continue;
      if (excludeShareId && shareId === excludeShareId) continue;
      if (!remoteScreenStreamsRef.current.has(shareId)) continue;
      return true;
    }
    return false;
  }, []);

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

  useEffect(() => {
    if (!voiceRoomKey) {
      setVisibleScreenShareRoomKey(null);
      setCameraAutoOpenedRoomKey(null);
      return;
    }
    if (!hasRemoteScreenShares) {
      setVisibleScreenShareRoomKey((prev) => (prev === voiceRoomKey ? null : prev));
      setCameraAutoOpenedRoomKey((prev) => (prev === voiceRoomKey ? null : prev));
    }
  }, [hasRemoteScreenShares, voiceRoomKey]);

  useEffect(() => {
    if (!voiceRoomKey) return;
    if (!hasRemoteCameraShares) {
      setCameraAutoOpenedRoomKey((prev) => (prev === voiceRoomKey ? null : prev));
      return;
    }
    if (cameraAutoOpenedRoomKey === voiceRoomKey) return;
    if (isScreenSharing) return;

    setVisibleScreenShareRoomKey(voiceRoomKey);
    setCameraAutoOpenedRoomKey(voiceRoomKey);
  }, [cameraAutoOpenedRoomKey, hasRemoteCameraShares, isScreenSharing, voiceRoomKey]);

  useEffect(() => {
    if (screenSharePresenters.length === 0) {
      setActiveScreenSharePresenterId(null);
      return;
    }
    setActiveScreenSharePresenterId((prev) => {
      if (prev && screenSharePresenters.some((presenter) => presenter.presenterId === prev)) {
        return prev;
      }
      return screenSharePresenters[0].presenterId;
    });
  }, [screenSharePresenters]);

  const handleDismissRemoteScreenShareView = useCallback(() => {
    if (!voiceRoomKey || isScreenSharing || !hasRemoteScreenShares) return;
    closeVideoFullscreen();
    setVisibleScreenShareRoomKey((prev) => (prev === voiceRoomKey ? null : prev));
  }, [closeVideoFullscreen, hasRemoteScreenShares, isScreenSharing, voiceRoomKey]);

  const handleRestoreRemoteScreenShareView = useCallback(() => {
    if (!voiceRoomKey || isScreenSharing || !hasRemoteScreenShares) return;
    setVisibleScreenShareRoomKey(voiceRoomKey);
  }, [hasRemoteScreenShares, isScreenSharing, voiceRoomKey]);

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
    setShowScrollToLatestButton(false);
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
    setMessageContextMenu(null);
    setDmNavContextMenu(null);
    setDmSidebarContextMenu(null);
    setComposerReplyTarget(null);
    setDismissedDmMessageIds({});
    setGifQueryDraft("");
    setGifResults([]);
    setGifError("");
    setComposerAttachment(null);
    setSelectedGif(null);
    setShowScrollToLatestButton(false);
    setSoundboardPopoverOpen(false);
  }, [viewMode, activeConversationId, activeGroupChatId, activeChannelId]);

  useEffect(() => {
    if (voiceRoomKey) return;
    setSoundboardPopoverOpen(false);
  }, [voiceRoomKey]);

  useEffect(() => {
    const container = messageDisplayRef.current;
    if (!container) return;

    const syncButtonVisibility = () => {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      setShowScrollToLatestButton(distanceFromBottom > 72);
    };

    syncButtonVisibility();
    container.addEventListener("scroll", syncButtonVisibility, { passive: true });
    return () => {
      container.removeEventListener("scroll", syncButtonVisibility);
    };
  }, [activeConversationId, activeGroupChatId, activeChannelId, messages.length, viewMode]);

  useEffect(() => {
    if (!messageContextMenu) return;

    const handlePointerDown = () => {
      setMessageContextMenu(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMessageContextMenu(null);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handlePointerDown);
    window.addEventListener("scroll", handlePointerDown, true);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handlePointerDown);
      window.removeEventListener("scroll", handlePointerDown, true);
    };
  }, [messageContextMenu]);

  useEffect(() => {
    if (viewMode === "dm" && dmPanelMode === "dms") return;
    setDmNavContextMenu(null);
    setDmSidebarContextMenu(null);
  }, [dmPanelMode, viewMode]);

  useEffect(() => {
    if (!dmNavContextMenu) return;

    const handlePointerDown = () => {
      setDmNavContextMenu(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDmNavContextMenu(null);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handlePointerDown);
    window.addEventListener("scroll", handlePointerDown, true);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handlePointerDown);
      window.removeEventListener("scroll", handlePointerDown, true);
    };
  }, [dmNavContextMenu]);

  useEffect(() => {
    if (!dmSidebarContextMenu) return;

    const handlePointerDown = () => {
      setDmSidebarContextMenu(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDmSidebarContextMenu(null);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handlePointerDown);
    window.addEventListener("scroll", handlePointerDown, true);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handlePointerDown);
      window.removeEventListener("scroll", handlePointerDown, true);
    };
  }, [dmSidebarContextMenu]);

  useEffect(() => {
    if (messageContextMenu) return;
    setMessageContextMenuReactionsExpanded(false);
  }, [messageContextMenu]);

  useEffect(() => {
    setEditingMessageId(null);
    setEditingMessageDraft("");
  }, [activeChannelId, activeConversationId, activeGroupChatId, viewMode]);

  const openDmMessageContextMenuAt = useCallback((
    anchorSource: HTMLElement,
    messageId: number,
    sender: UiMessage["sender"],
    clickPoint?: { x: number; y: number },
  ) => {
    const canOpenInCurrentView =
      viewMode === "dm" || viewMode === "group" || (viewMode === "glytch" && activeChannel?.kind !== "voice");
    if (!canOpenInCurrentView) return;

    if (!Number.isFinite(messageId) || messageId <= 0) return;

    const messageBody =
      anchorSource.querySelector<HTMLElement>("[data-dm-message-body='true']") || anchorSource;
    const menuContainer = chatStreamColumnRef.current;
    if (!menuContainer) return;

    const menuWidth = 220;
    const canDelete = sender === "me" && viewMode === "dm";
    const canEdit = sender === "me";
    const canReply = viewMode === "dm";
    const menuHeight = 74 + (canReply ? 34 : 0) + (canEdit ? 34 : 0) + (canDelete ? 34 : 0);
    const anchorRect = messageBody.getBoundingClientRect();
    const containerRect = menuContainer.getBoundingClientRect();
    const rowElement = messageBody.closest(".messageRow");
    const prefersRightAlignment = Boolean(rowElement?.classList.contains("fromMe"));
    let desiredViewportX = prefersRightAlignment ? anchorRect.right - menuWidth : anchorRect.left;
    let desiredViewportY: number;

    if (clickPoint) {
      const spaceRight = containerRect.right - clickPoint.x;
      const spaceBottom = containerRect.bottom - clickPoint.y;
      desiredViewportX = spaceRight >= menuWidth + 8 ? clickPoint.x + 4 : clickPoint.x - menuWidth - 4;
      desiredViewportY = spaceBottom >= menuHeight + 8 ? clickPoint.y + 4 : clickPoint.y - menuHeight - 4;
    } else {
      const aboveY = anchorRect.top - menuHeight - 8;
      const belowY = anchorRect.bottom + 8;
      desiredViewportY = aboveY >= containerRect.top + 8 ? aboveY : belowY;
    }

    const desiredLocalX = desiredViewportX - containerRect.left;
    const desiredLocalY = desiredViewportY - containerRect.top;
    const safeX = Math.max(8, Math.min(desiredLocalX, Math.max(8, containerRect.width - menuWidth - 8)));
    const safeY = Math.max(8, Math.min(desiredLocalY, Math.max(8, containerRect.height - menuHeight - 8)));

    setReactionPickerMessageId(null);
    setDmSidebarContextMenu(null);
    setMessageContextMenuReactionsExpanded(false);
    setMessageContextMenu({
      messageId,
      x: safeX,
      y: safeY,
      canDelete,
      canEdit,
      canReply,
    });
  }, [activeChannel?.kind, viewMode]);

  useEffect(() => {
    if (!showGifPicker) return;
    if (!thirdPartyIntegrationsEnabled) {
      setGifLoading(false);
      setGifResults([]);
      setGifError("Third-party integrations are disabled in settings.");
      return;
    }

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
  }, [
    showGifPicker,
    accessToken,
    gifQueryDraft,
    thirdPartyIntegrationsEnabled,
  ]);

  useEffect(() => {
    if (thirdPartyIntegrationsEnabled) return;
    setShowGifPicker(false);
    setGifLoading(false);
    setGifResults([]);
    if (selectedGif) {
      setSelectedGif(null);
    }
  }, [thirdPartyIntegrationsEnabled, selectedGif]);

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
    const [profiles, unreadRows, conversationUserStateRows, latestDmRows] = await Promise.all([
      fetchProfilesByIds(
        accessToken,
        Array.from(new Set([...friendIds, ...requestUserIds])),
      ),
      listUnreadDmMessages(accessToken, currentUserId, conversationIds),
      listDmConversationUserStates(accessToken, currentUserId, conversationIds),
      fetchLatestDmMessages(accessToken, conversationIds),
    ]);
    const profileMap = new Map<string, Profile>(profiles.map((p) => [p.user_id, p]));
    const stateMap = new Map<number, { isPinned: boolean }>(
      conversationUserStateRows.map((row) => [
        row.conversation_id,
        {
          isPinned: Boolean(row.is_pinned),
        },
      ]),
    );
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
        friendName: profile?.display_name || profile?.username || "User",
        friendAvatarUrl: profile?.avatar_url || "",
        sharedBackground: isForcedDefault ? null : normalizeBackgroundGradient(conv.dm_theme),
        isPinned: stateMap.get(conv.id)?.isPinned || false,
      };
    });

    const nextLatestByConversation: Record<number, number> = {};
    latestDmRows.forEach((row) => {
      const existing = nextLatestByConversation[row.conversation_id] || 0;
      if (row.id > existing) {
        nextLatestByConversation[row.conversation_id] = row.id;
      }
    });
    dmLatestMessageIdsRef.current = nextLatestByConversation;
    setDmLatestMessageIds((prev) => {
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(nextLatestByConversation);
      if (prevKeys.length !== nextKeys.length) {
        return nextLatestByConversation;
      }
      for (const key of nextKeys) {
        const parsedKey = Number.parseInt(key, 10);
        if ((prev[parsedKey] || 0) !== (nextLatestByConversation[parsedKey] || 0)) {
          return nextLatestByConversation;
        }
      }
      return prev;
    });

    const sortedDms = sortDmsByPinned(nextDms, nextLatestByConversation);
    setDms(sortedDms);
    const nextUnreadCounts: Record<number, number> = {};
    unreadRows.forEach((row) => {
      nextUnreadCounts[row.conversation_id] = (nextUnreadCounts[row.conversation_id] || 0) + 1;
    });
    setUnreadDmCounts(nextUnreadCounts);

    const currentConversationId = activeConversationIdRef.current;
    if (sortedDms.length > 0 && currentConversationId !== null && !sortedDms.some((dm) => dm.conversationId === currentConversationId)) {
      setActiveConversationId(null);
    }
    if (sortedDms.length === 0) {
      setActiveConversationId(null);
      setUnreadDmCounts({});
    }
  }, [accessToken, currentUserId, forcedDefaultDmConversationIds]);

  const loadGroupSidebarData = useCallback(async () => {
    const chats = await listGroupChats(accessToken);
    if (chats.length === 0) {
      setGroupChats([]);
      setUnreadGroupCounts({});
      setActiveGroupChatId(null);
      return;
    }

    const memberSnapshots = await Promise.all(
      chats.map(async (chat) => ({
        groupChatId: chat.id,
        members: await listGroupChatMembers(accessToken, chat.id),
      })),
    );
    const membersByChatId = new Map<number, GroupChatMember[]>(
      memberSnapshots.map((snapshot) => [snapshot.groupChatId, snapshot.members]),
    );
    const profileIds = Array.from(new Set(
      memberSnapshots.flatMap((snapshot) =>
        snapshot.members.flatMap((member) => [
          member.user_id,
          ...(typeof member.added_by === "string" && member.added_by ? [member.added_by] : []),
        ]),
      ),
    ));
    const profiles = profileIds.length > 0 ? await fetchProfilesByIds(accessToken, profileIds) : [];
    if (profiles.length > 0) {
      setKnownProfiles((prev) => ({
        ...prev,
        ...Object.fromEntries(profiles.map((profile) => [profile.user_id, profile])),
      }));
    }

    const unreadRows = await listUnreadGroupChatCounts(
      accessToken,
      chats.map((chat) => chat.id),
    );
    const nextUnreadGroupCounts: Record<number, number> = {};
    unreadRows.forEach((row) => {
      nextUnreadGroupCounts[row.group_chat_id] = Math.max(0, row.unread_count || 0);
    });

    const nextGroupChats: GroupChatWithMembers[] = chats.map((chat) => ({
      groupChatId: chat.id,
      name: chat.name || "Group Chat",
      createdBy: chat.created_by,
      createdAt: chat.created_at,
      members: membersByChatId.get(chat.id) || [],
    }));

    setGroupChats(nextGroupChats);
    setUnreadGroupCounts(nextUnreadGroupCounts);

    const currentGroupChatId = activeGroupChatIdRef.current;
    if (!nextGroupChats.some((chat) => chat.groupChatId === currentGroupChatId)) {
      setActiveGroupChatId(nextGroupChats[0]?.groupChatId ?? null);
    }
  }, [accessToken]);

  const flushDmConversationReadOnLeave = useCallback((conversationId: number) => {
    if (!Number.isFinite(conversationId) || conversationId <= 0) return;
    void markDmConversationRead(accessToken, conversationId)
      .then((result) => {
        setUnreadDmCounts((prev) => {
          if (!prev[conversationId]) return prev;
          return { ...prev, [conversationId]: 0 };
        });
        if (result.deleted_empty_conversation) {
          void loadDmSidebarData();
        }
      })
      .catch(() => undefined);
  }, [accessToken, loadDmSidebarData]);

  const flushGroupChatReadOnLeave = useCallback((groupChatId: number) => {
    if (!Number.isFinite(groupChatId) || groupChatId <= 0) return;
    void markGroupChatRead(accessToken, groupChatId)
      .then(() => {
        setUnreadGroupCounts((prev) => {
          if (!prev[groupChatId]) return prev;
          return { ...prev, [groupChatId]: 0 };
        });
      })
      .catch(() => undefined);
  }, [accessToken]);

  const handleOpenDmConversation = useCallback(
    (conversationId: number, unreadCount: number) => {
      if (!Number.isFinite(conversationId) || conversationId <= 0) return;
      setDmSidebarContextMenu(null);
      setActiveConversationId(conversationId);
      setUnreadDmCounts((prev) => {
        if (unreadCount <= 0 && !prev[conversationId]) return prev;
        return { ...prev, [conversationId]: 0 };
      });
      flushDmConversationReadOnLeave(conversationId);
    },
    [flushDmConversationReadOnLeave],
  );

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

  const loadGlytchBotSettingsData = useCallback(async (glytchId: number) => {
    try {
      const settings = await getGlytchBotSettings(accessToken, glytchId);
      setGlytchBotSettings(settings);
      setGlytchBotBlockedWordsDraft((settings.blocked_words || []).join(", "));
      setGlytchBotWebhookDraft(settings.third_party_bot_webhook_url || "");
      setGlytchBotSettingsError("");
    } catch (err) {
      setGlytchBotSettingsError(err instanceof Error ? err.message : "Could not load Glytch bot settings.");
    }
  }, [accessToken]);

  const loadGlytchRoleData = useCallback(async (glytchId: number) => {
    const [roles, members, memberRoles, perChannelPermissions, bans, unbanRequests] = await Promise.all([
      listGlytchRoles(accessToken, glytchId),
      listGlytchMembers(accessToken, glytchId),
      listGlytchMemberRoles(accessToken, glytchId),
      listGlytchChannelRolePermissions(accessToken, glytchId),
      listGlytchBans(accessToken, glytchId),
      listGlytchUnbanRequests(accessToken, glytchId, "pending"),
    ]);

    setGlytchRoles(roles);
    setGlytchMemberRolesRows(memberRoles);
    setChannelRolePermissions(perChannelPermissions);

    const profileIds = Array.from(new Set([
      ...members.map((member) => member.user_id),
      ...bans.map((ban) => ban.user_id),
      ...bans.map((ban) => ban.banned_by),
      ...unbanRequests.map((request) => request.user_id),
      ...unbanRequests
        .map((request) => request.reviewed_by)
        .filter((reviewedBy): reviewedBy is string => typeof reviewedBy === "string" && reviewedBy.length > 0),
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
        name: profile?.display_name || profile?.username || "User",
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
        name: bannedProfile?.display_name || bannedProfile?.username || "User",
        avatarUrl: bannedProfile?.avatar_url || "",
        reason: ban.reason || null,
        bannedByName: bannerProfile?.display_name || bannerProfile?.username || "Moderator",
        bannedAt: ban.banned_at,
      };
    });
    setGlytchBansUi(uiBans);

    const uiUnbanRequests: UiGlytchUnbanRequest[] = unbanRequests.map((request: GlytchUnbanRequest) => {
      const requestedByProfile = profileMap.get(request.user_id);
      return {
        requestId: request.id,
        userId: request.user_id,
        name: requestedByProfile?.display_name || requestedByProfile?.username || "User",
        avatarUrl: requestedByProfile?.avatar_url || "",
        message: request.message || null,
        requestedAt: request.requested_at,
      };
    });
    setGlytchUnbanRequestsUi(uiUnbanRequests);

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
        DEFAULT_DM_CHAT_BACKGROUND;
      setQuickThemeModeDraft(background.mode === "image" && background.imageUrl ? "image" : "gradient");
      setQuickThemeFromDraft(background.from);
      setQuickThemeToDraft(background.to);
      setQuickThemeImageDraft(background.imageUrl || "");
      setQuickThemeError("");
      return;
    }
    if (quickThemeTarget.kind === "group") {
      const background = profileForm.groupBackgroundByChat[quickThemeTarget.key] || DEFAULT_DM_CHAT_BACKGROUND;
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
    profileForm.groupBackgroundByChat,
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
    if (!activeGroupChat) {
      setGroupAddMemberId("");
      return;
    }
    if (availableFriendsForActiveGroup.length === 0) {
      setGroupAddMemberId("");
      return;
    }
    if (!availableFriendsForActiveGroup.some((dm) => dm.friendUserId === groupAddMemberId)) {
      setGroupAddMemberId(availableFriendsForActiveGroup[0].friendUserId);
    }
  }, [activeGroupChat, availableFriendsForActiveGroup, groupAddMemberId]);

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
    activeGroupChatIdRef.current = activeGroupChatId;
  }, [activeGroupChatId]);

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
      setGlytchBansUi([]);
      setGlytchUnbanRequestsUi([]);
      setGlytchBotSettings(null);
      setGlytchBotBlockedWordsDraft("");
      setGlytchBotWebhookDraft("");
      setGlytchBotSettingsError("");
      setGlytchBotSettingsNotice("");
      setGlytchBotSettingsBusy(false);
      setUnbanRequestActionBusyKey(null);
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
    setGlytchBotSettingsNotice("");
    setGlytchBotSettingsError("");
    void loadGlytchBotSettingsData(activeGlytchId);
  }, [activeGlytchId, loadGlytchBotSettingsData]);

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
      setGlytchProfileVisibilityDraft("private");
      setGlytchProfileMaxMembersDraft("");
      setGlytchDeleteConfirmName("");
      setGlytchDeleteError("");
      return;
    }
    setGlytchProfileNameDraft(activeGlytch.name || "");
    setGlytchProfileBioDraft(activeGlytch.bio || "");
    setGlytchProfileVisibilityDraft(activeGlytch.is_public ? "public" : "private");
    setGlytchProfileMaxMembersDraft(
      typeof activeGlytch.max_members === "number" && Number.isFinite(activeGlytch.max_members)
        ? String(Math.trunc(activeGlytch.max_members))
        : "",
    );
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
    let mounted = true;

    const load = async () => {
      try {
        await loadGroupSidebarData();
      } catch (err) {
        if (!mounted) return;
        setGroupError(err instanceof Error ? err.message : "Could not load group chats.");
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
  }, [isElectronRuntime, loadGroupSidebarData, shouldPauseBackgroundPolling]);

  useEffect(() => {
    if (dms.length === 0) {
      dmLatestMessageIdsRef.current = {};
      dmNotificationLatestMessageIdsRef.current = {};
      setDmLatestMessageIds({});
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

        const previousByConversation = dmNotificationLatestMessageIdsRef.current;
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
          if (mutedDmConversationIdSet.has(dm.conversationId)) continue;

          const viewingThisDm =
            viewMode === "dm" && activeConversationId === dm.conversationId && isAppVisibleAndFocused();
          if (viewingThisDm) continue;

          showDmInAppBanner({
            conversationId: dm.conversationId,
            friendName: dm.friendName,
            friendAvatarUrl: dm.friendAvatarUrl,
            preview: dmMessagePreviewText(latest),
          });

          if (!dmMessageNotificationsEnabled) continue;

          void triggerDesktopNotification({
            title: `New message from ${dm.friendName}`,
            body: dmMessagePreviewText(latest),
            tag: `dm-message-${dm.conversationId}`,
            icon: dm.friendAvatarUrl || undefined,
            onClick: () => {
              setUnifiedSidebarView("dms");
              setViewMode("dm");
              setDmPanelMode("dms");
              setActiveConversationId(dm.conversationId);
            },
          });
        }

        dmNotificationLatestMessageIdsRef.current = nextByConversation;
        dmLatestMessageIdsRef.current = nextByConversation;
        setDmLatestMessageIds((prev) => {
          const prevKeys = Object.keys(prev);
          const nextKeys = Object.keys(nextByConversation);
          if (prevKeys.length !== nextKeys.length) {
            return nextByConversation;
          }
          for (const key of nextKeys) {
            const parsedKey = Number.parseInt(key, 10);
            if ((prev[parsedKey] || 0) !== (nextByConversation[parsedKey] || 0)) {
              return nextByConversation;
            }
          }
          return prev;
        });
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
    mutedDmConversationIdSet,
    shouldPauseBackgroundPolling,
    showDmInAppBanner,
    triggerDesktopNotification,
    viewMode,
  ]);

  useEffect(() => {
    if (groupChats.length === 0) {
      groupLatestMessageIdsRef.current = {};
      groupMessageNotificationSeededRef.current = false;
      return;
    }

    let mounted = true;

    const pollLatestGroupMessages = async () => {
      try {
        const rows = await fetchLatestGroupChatMessages(
          accessToken,
          groupChats.map((groupChat) => groupChat.groupChatId),
        );
        if (!mounted) return;

        const latestByGroup = new Map<number, (typeof rows)[number]>();
        rows.forEach((row) => {
          if (!latestByGroup.has(row.group_chat_id)) {
            latestByGroup.set(row.group_chat_id, row);
          }
        });

        const previousByGroup = groupLatestMessageIdsRef.current;
        const nextByGroup: Record<number, number> = {};

        for (const groupChat of groupChats) {
          const previousId = previousByGroup[groupChat.groupChatId] ?? 0;
          nextByGroup[groupChat.groupChatId] = previousId;

          const latest = latestByGroup.get(groupChat.groupChatId);
          if (!latest) continue;

          nextByGroup[groupChat.groupChatId] = latest.id;
          const hasNewIncomingMessage =
            groupMessageNotificationSeededRef.current &&
            latest.sender_id !== currentUserId &&
            latest.id > previousId;
          if (!hasNewIncomingMessage) continue;
          if (!dmMessageNotificationsEnabled) continue;

          const viewingThisGroupChat =
            viewMode === "group" && activeGroupChatId === groupChat.groupChatId && isAppVisibleAndFocused();
          if (viewingThisGroupChat) continue;

          const senderProfile = knownProfiles[latest.sender_id];
          const senderName = senderProfile?.display_name || senderProfile?.username || "Someone";

          void triggerDesktopNotification({
            title: `Group · ${groupChat.name}`,
            body: `${senderName}: ${dmMessagePreviewText(latest)}`,
            tag: `group-message-${groupChat.groupChatId}`,
            icon: senderProfile?.avatar_url || undefined,
            onClick: () => {
              setUnifiedSidebarView("groups");
              setViewMode("group");
              setActiveGroupChatId(groupChat.groupChatId);
            },
          });
        }

        groupLatestMessageIdsRef.current = nextByGroup;
        if (!groupMessageNotificationSeededRef.current) {
          groupMessageNotificationSeededRef.current = true;
        }
      } catch {
        // Keep notification polling silent to avoid interrupting chat usage.
      }
    };

    void pollLatestGroupMessages();
    const interval = window.setInterval(() => {
      if (shouldPauseBackgroundPolling()) return;
      void pollLatestGroupMessages();
    }, isElectronRuntime ? 8_000 : 4_000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [
    accessToken,
    activeGroupChatId,
    currentUserId,
    dmMessageNotificationsEnabled,
    groupChats,
    isAppVisibleAndFocused,
    isElectronRuntime,
    knownProfiles,
    shouldPauseBackgroundPolling,
    triggerDesktopNotification,
    viewMode,
  ]);

  useEffect(() => {
    if (glytches.length === 0) {
      glytchLatestMessageIdsRef.current = {};
      glytchMessageNotificationSeededRef.current = false;
      return;
    }

    let mounted = true;

    const pollLatestGlytchMessages = async () => {
      if (glytchNotificationPollingInFlightRef.current) return;
      glytchNotificationPollingInFlightRef.current = true;
      try {
        const snapshots = await Promise.all(
          glytches.map(async (glytch) => ({
            glytch,
            channels: await listGlytchChannels(accessToken, glytch.id),
          })),
        );
        if (!mounted) return;

        const textChannelIds: number[] = [];
        const channelMetaById = new Map<number, { glytchId: number; glytchName: string; channelName: string }>();
        snapshots.forEach(({ glytch, channels: channelRows }) => {
          channelRows.forEach((channel) => {
            if (channel.kind !== "text") return;
            textChannelIds.push(channel.id);
            channelMetaById.set(channel.id, {
              glytchId: glytch.id,
              glytchName: glytch.name,
              channelName: channel.name,
            });
          });
        });

        if (textChannelIds.length === 0) {
          glytchLatestMessageIdsRef.current = {};
          if (!glytchMessageNotificationSeededRef.current) {
            glytchMessageNotificationSeededRef.current = true;
          }
          return;
        }

        const rows = await fetchLatestGlytchMessages(accessToken, textChannelIds);
        if (!mounted) return;

        const latestByChannel = new Map<number, (typeof rows)[number]>();
        rows.forEach((row) => {
          if (!latestByChannel.has(row.glytch_channel_id)) {
            latestByChannel.set(row.glytch_channel_id, row);
          }
        });

        const previousByChannel = glytchLatestMessageIdsRef.current;
        const nextByChannel: Record<number, number> = {};

        for (const channelId of textChannelIds) {
          const previousId = previousByChannel[channelId] ?? 0;
          nextByChannel[channelId] = previousId;

          const latest = latestByChannel.get(channelId);
          if (!latest) continue;

          nextByChannel[channelId] = latest.id;
          const hasNewIncomingMessage =
            glytchMessageNotificationSeededRef.current &&
            latest.sender_id !== currentUserId &&
            latest.id > previousId;
          if (!hasNewIncomingMessage) continue;
          if (!glytchMessageNotificationsEnabled) continue;

          const viewingThisChannel = viewMode === "glytch" && activeChannelId === channelId && isAppVisibleAndFocused();
          if (viewingThisChannel) continue;

          const channelMeta = channelMetaById.get(channelId);
          if (!channelMeta) continue;
          const senderProfile = knownProfiles[latest.sender_id];
          const senderName = senderProfile?.display_name || senderProfile?.username || "Someone";

          void triggerDesktopNotification({
            title: `${channelMeta.glytchName} · #${channelMeta.channelName}`,
            body: `${senderName}: ${dmMessagePreviewText({ content: latest.content, attachment_url: latest.attachment_url })}`,
            tag: `glytch-message-${channelId}`,
            icon: senderProfile?.avatar_url || undefined,
            onClick: () => {
              setUnifiedSidebarView("glytches");
              setViewMode("glytch");
              setShowGlytchDirectory(false);
              setActiveGlytchId(channelMeta.glytchId);
              setActiveChannelId(channelId);
            },
          });
        }

        glytchLatestMessageIdsRef.current = nextByChannel;
        if (!glytchMessageNotificationSeededRef.current) {
          glytchMessageNotificationSeededRef.current = true;
        }
      } catch {
        // Keep notification polling silent to avoid interrupting chat usage.
      } finally {
        glytchNotificationPollingInFlightRef.current = false;
      }
    };

    void pollLatestGlytchMessages();
    const interval = window.setInterval(() => {
      if (shouldPauseBackgroundPolling()) return;
      void pollLatestGlytchMessages();
    }, isElectronRuntime ? 12_000 : 6_000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
      glytchNotificationPollingInFlightRef.current = false;
    };
  }, [
    accessToken,
    activeChannelId,
    currentUserId,
    glytchMessageNotificationsEnabled,
    glytches,
    isElectronRuntime,
    isAppVisibleAndFocused,
    knownProfiles,
    shouldPauseBackgroundPolling,
    triggerDesktopNotification,
    viewMode,
  ]);

  useEffect(() => {
    const previousById = friendRequestStatusByIdRef.current;
    const nextById: Record<number, FriendRequest["status"]> = {};

    requests.forEach((req) => {
      nextById[req.id] = req.status;
      if (!friendRequestNotificationSeededRef.current) return;

      const previousStatus = previousById[req.id];
      if (req.receiver_id === currentUserId && req.status === "pending" && previousStatus !== "pending") {
        if (!friendRequestNotificationsEnabled) return;
        const viewingFriendsPanel = viewMode === "dm" && dmPanelMode === "friends" && isAppVisibleAndFocused();
        if (viewingFriendsPanel) return;
        const senderName = req.sender_profile?.display_name || req.sender_profile?.username || "Someone";
        void triggerDesktopNotification({
          title: "New friend request",
          body: `${senderName} sent you a friend request.`,
          tag: `friend-request-${req.id}`,
          icon: req.sender_profile?.avatar_url || undefined,
          onClick: () => {
            setViewMode("dm");
            setDmPanelMode("friends");
          },
        });
        return;
      }

      if (
        req.sender_id === currentUserId &&
        req.status === "accepted" &&
        previousStatus &&
        previousStatus !== "accepted"
      ) {
        if (!friendRequestAcceptedNotificationsEnabled) return;
        const receiverName = req.receiver_profile?.display_name || req.receiver_profile?.username || "Your friend";
        const receiverDm = dms.find((dm) => dm.friendUserId === req.receiver_id) || null;
        void triggerDesktopNotification({
          title: "Friend request accepted",
          body: `${receiverName} accepted your friend request.`,
          tag: `friend-accepted-${req.id}`,
          icon: req.receiver_profile?.avatar_url || undefined,
          onClick: () => {
            setViewMode("dm");
            setDmPanelMode("dms");
            if (receiverDm) {
              setActiveConversationId(receiverDm.conversationId);
            }
          },
        });
      }
    });

    friendRequestStatusByIdRef.current = nextById;
    if (!friendRequestNotificationSeededRef.current) {
      friendRequestNotificationSeededRef.current = true;
    }
  }, [
    currentUserId,
    dmPanelMode,
    dms,
    friendRequestAcceptedNotificationsEnabled,
    friendRequestNotificationsEnabled,
    isAppVisibleAndFocused,
    requests,
    triggerDesktopNotification,
    viewMode,
  ]);

  useEffect(() => {
    if (dms.length === 0) {
      dmCallParticipantCountsRef.current = {};
      dmCallNotificationSeededRef.current = false;
      setDmIncomingCallCounts({});
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
          const isDmMuted = mutedDmConversationIdSet.has(dm.conversationId);
          const previousCount = previousCounts[dm.conversationId] ?? 0;
          const otherParticipantCount = participants.filter((row) => row.user_id !== currentUserId).length;
          nextCounts[dm.conversationId] = otherParticipantCount;

          const hasIncomingCallNow = otherParticipantCount > 0;
          const callJustStarted = previousCount === 0 && hasIncomingCallNow;
          const participantCountIncreased = otherParticipantCount > previousCount;
          const shouldNotifyIncomingCall =
            dmCallNotificationSeededRef.current && callJustStarted && voiceRoomKey !== roomKey;
          const shouldNotifyJoinedActiveDmVoice =
            dmCallNotificationSeededRef.current && participantCountIncreased && voiceRoomKey === roomKey;

          if (shouldNotifyIncomingCall && dmCallNotificationsEnabled && !isDmMuted) {
            void playIncomingCallRing();
            void triggerDesktopNotification({
              title: `Incoming call from ${dm.friendName}`,
              body: "Open this DM and join voice to answer.",
              tag: `dm-call-${dm.conversationId}`,
              icon: dm.friendAvatarUrl || undefined,
              playSound: false,
              onClick: () => {
                setViewMode("dm");
                setDmPanelMode("dms");
                setActiveConversationId(dm.conversationId);
              },
            });
          }

          if (shouldNotifyJoinedActiveDmVoice && dmCallNotificationsEnabled && !isDmMuted) {
            void playNotificationSound();
            void triggerDesktopNotification({
              title: `${dm.friendName} joined the call`,
              body: "Your DM voice call now has participants.",
              tag: `dm-call-joined-${dm.conversationId}-${otherParticipantCount}`,
              icon: dm.friendAvatarUrl || undefined,
              playSound: false,
              onClick: () => {
                setViewMode("dm");
                setDmPanelMode("dms");
                setActiveConversationId(dm.conversationId);
              },
            });
          }
        }

        dmCallParticipantCountsRef.current = nextCounts;
        setDmIncomingCallCounts((prev) => {
          const prevKeys = Object.keys(prev);
          const nextKeys = Object.keys(nextCounts);
          if (prevKeys.length === nextKeys.length && prevKeys.every((key) => prev[Number(key)] === nextCounts[Number(key)])) {
            return prev;
          }
          return nextCounts;
        });
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
    mutedDmConversationIdSet,
    playIncomingCallRing,
    playNotificationSound,
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
    if (!isInGlytchView || !showGlytchDirectory || glytchDirectoryTab !== "discover") {
      setPublicGlytchSearchBusy(false);
      setPublicGlytchSearchError("");
      return;
    }

    let mounted = true;
    const timeout = window.setTimeout(() => {
      setPublicGlytchSearchBusy(true);
      setPublicGlytchSearchError("");
      void searchPublicGlytches(accessToken, publicGlytchSearchDraft, 40)
        .then((rows) => {
          if (!mounted) return;
          setPublicGlytchResults(rows);
        })
        .catch((err) => {
          if (!mounted) return;
          setPublicGlytchResults([]);
          setPublicGlytchSearchError(err instanceof Error ? err.message : "Could not search public Glytches.");
        })
        .finally(() => {
          if (!mounted) return;
          setPublicGlytchSearchBusy(false);
        });
    }, 180);

    return () => {
      mounted = false;
      window.clearTimeout(timeout);
    };
  }, [accessToken, glytchDirectoryTab, isInGlytchView, publicGlytchSearchDraft, showGlytchDirectory]);

  useEffect(() => {
    if (viewMode !== "dm") {
      dmLastLoadedConversationIdRef.current = null;
      dmLastLoadedMessageIdRef.current = 0;
    }
    if (viewMode !== "group") {
      groupLastLoadedChatIdRef.current = null;
      groupLastLoadedMessageIdRef.current = 0;
    }
    if (viewMode !== "glytch") {
      glytchLastLoadedChannelIdRef.current = null;
      glytchLastLoadedMessageIdRef.current = 0;
    }
  }, [viewMode]);

  useEffect(() => {
    const previousConversationId = dmConversationToMarkReadRef.current;
    const nextConversationId = viewMode === "dm" ? activeConversationId : null;

    if (previousConversationId && previousConversationId !== nextConversationId) {
      flushDmConversationReadOnLeave(previousConversationId);
    }

    dmConversationToMarkReadRef.current = nextConversationId;
  }, [activeConversationId, flushDmConversationReadOnLeave, viewMode]);

  useEffect(() => {
    const previousGroupChatId = groupChatToMarkReadRef.current;
    const nextGroupChatId = viewMode === "group" ? activeGroupChatId : null;

    if (previousGroupChatId && previousGroupChatId !== nextGroupChatId) {
      flushGroupChatReadOnLeave(previousGroupChatId);
    }

    groupChatToMarkReadRef.current = nextGroupChatId;
  }, [activeGroupChatId, flushGroupChatReadOnLeave, viewMode]);

  useEffect(() => {
    const nextContextKey =
      viewMode === "dm"
        ? activeConversationId
          ? `dm:${activeConversationId}`
          : null
        : viewMode === "group"
          ? activeGroupChatId
            ? `group:${activeGroupChatId}`
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
  }, [activeChannel?.kind, activeChannelId, activeConversationId, activeGroupChatId, viewMode]);

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
            senderName: row.sender_id === currentUserId ? displayName : activeDm?.friendName || "Friend",
            senderAvatarUrl: row.sender_id === currentUserId ? currentProfile?.avatar_url || "" : activeDm?.friendAvatarUrl || "",
            readAt: row.read_by_receiver_at ? new Date(row.read_by_receiver_at) : null,
            editedAt: row.edited_at ? new Date(row.edited_at) : null,
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
    displayName,
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
    if (viewMode !== "group") return;
    if (!activeGroupChatId) {
      setMessages([]);
      groupLastLoadedChatIdRef.current = null;
      groupLastLoadedMessageIdRef.current = 0;
      return;
    }

    let mounted = true;

    const loadMessages = async () => {
      if (groupMessagesPollingInFlightRef.current) return;
      groupMessagesPollingInFlightRef.current = true;
      const groupChatId = activeGroupChatId;
      const isGroupChatSwitch = groupLastLoadedChatIdRef.current !== groupChatId;
      let shouldAutoScrollAfterLoad = false;
      let scrollBehavior: ScrollBehavior = "smooth";
      if (isGroupChatSwitch) {
        setLoadingMessages(true);
      }
      try {
        const rows = await fetchGroupChatMessages(accessToken, groupChatId);
        if (!mounted) return;

        const senderIds = Array.from(new Set(rows.map((row) => row.sender_id)));
        const [profiles, reactionRows] = await Promise.all([
          fetchProfilesByIds(accessToken, senderIds),
          listGroupChatMessageReactions(
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
                ? displayName
                : profileMap.get(row.sender_id)?.display_name || profileMap.get(row.sender_id)?.username || "Member",
            senderAvatarUrl:
              row.sender_id === currentUserId
                ? currentProfile?.avatar_url || ""
                : profileMap.get(row.sender_id)?.avatar_url || "",
            readAt: null,
            editedAt: row.edited_at ? new Date(row.edited_at) : null,
            reactions: reactionMap.get(row.id) || [],
          })),
        );
        if (!mounted) return;

        const previousLatestMessageId = isGroupChatSwitch ? 0 : groupLastLoadedMessageIdRef.current;
        const nextLatestMessageId = normalized[normalized.length - 1]?.id ?? 0;
        const hasNewerMessages = nextLatestMessageId > previousLatestMessageId;
        const contextKey = `group:${groupChatId}`;
        shouldAutoScrollAfterLoad = isGroupChatSwitch || (hasNewerMessages && isMessageListNearBottom());
        scrollBehavior = isGroupChatSwitch ? "auto" : "smooth";
        groupLastLoadedChatIdRef.current = groupChatId;
        groupLastLoadedMessageIdRef.current = nextLatestMessageId;
        const nextSnapshotKey = buildMessageSnapshotKey(normalized);
        const previousSnapshotKey = messageSnapshotKeyByContextRef.current[contextKey] || "";
        const hasMessageSnapshotChanged = nextSnapshotKey !== previousSnapshotKey;
        messageSnapshotKeyByContextRef.current[contextKey] = nextSnapshotKey;

        if (isGroupChatSwitch || hasMessageSnapshotChanged) {
          setMessages(normalized);
        }
        setChatError("");
      } catch (err) {
        if (!mounted) return;
        setChatError(err instanceof Error ? err.message : "Could not load messages.");
      } finally {
        if (mounted) {
          if (isGroupChatSwitch) {
            setLoadingMessages(false);
          }
          if (shouldAutoScrollAfterLoad) {
            scrollMessageListToBottom(scrollBehavior);
          }
        }
        groupMessagesPollingInFlightRef.current = false;
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
    activeGroupChatId,
    currentUserId,
    displayName,
    currentProfile?.avatar_url,
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
                ? displayName
                : profileMap.get(row.sender_id)?.display_name || profileMap.get(row.sender_id)?.username || "Member",
            senderAvatarUrl:
              row.sender_id === currentUserId
                ? currentProfile?.avatar_url || ""
                : profileMap.get(row.sender_id)?.avatar_url || "",
            readAt: null,
            editedAt: row.edited_at ? new Date(row.edited_at) : null,
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
    displayName,
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
          missingSelfParticipantCountRef.current += 1;
          if (missingSelfParticipantCountRef.current >= MISSING_SELF_PARTICIPANT_MAX_MISSES) {
            await stopVoiceSession(false);
            if (!mounted) return;
            setVoiceError("You were removed from this voice channel.");
            return;
          }
        } else {
          missingSelfParticipantCountRef.current = 0;
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
            name: profile?.display_name || profile?.username || (row.user_id === currentUserId ? displayName : "User"),
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
            const existingPc = peerConnectionsRef.current.get(userId);
            if (!existingPc && currentUserId < userId) {
              await getOrCreatePeerConnection(userId, true);
              continue;
            }
            if (!existingPc) continue;
            const shouldResetPeer =
              existingPc.connectionState === "disconnected" ||
              existingPc.connectionState === "failed" ||
              existingPc.iceConnectionState === "disconnected" ||
              existingPc.iceConnectionState === "failed";
            if (shouldResetPeer) {
              closePeerConnection(userId);
              if (currentUserId < userId) {
                await getOrCreatePeerConnection(userId, true);
              }
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
              name: profile?.display_name || profile?.username || (row.user_id === currentUserId ? displayName : "User"),
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
      if (voiceSignalsPollingInFlightRef.current) return;
      voiceSignalsPollingInFlightRef.current = true;
      try {
        const rows = await listVoiceSignals(accessToken, voiceRoomKey, currentUserId, signalSinceIdRef.current);
        if (!mounted || rows.length === 0) return;

        for (const signal of rows as VoiceSignal[]) {
          signalSinceIdRef.current = Math.max(signalSinceIdRef.current, signal.id);

          if (signal.sender_id === currentUserId) continue;
          const payload =
            signal.payload && typeof signal.payload === "object" ? (signal.payload as Record<string, unknown>) : {};
          if (Object.prototype.hasOwnProperty.call(payload, "videoShareKind")) {
            const nextShareKind = normalizeVideoShareKind(payload.videoShareKind);
            setRemoteVideoShareKinds((prev) => {
              const previousShareKind = prev[signal.sender_id] || null;
              if (previousShareKind === nextShareKind) return prev;
              if (!nextShareKind) {
                if (!(signal.sender_id in prev)) return prev;
                const next = { ...prev };
                delete next[signal.sender_id];
                return next;
              }
              return {
                ...prev,
                [signal.sender_id]: nextShareKind,
              };
            });
          }

          if (signal.kind === "offer") {
            let pc = await getOrCreatePeerConnection(signal.sender_id, false);
            const sdp = payload.sdp as RTCSessionDescriptionInit | undefined;
            if (!sdp) continue;
            if (pc.signalingState !== "stable") {
              try {
                await pc.setLocalDescription({ type: "rollback" });
              } catch {
                // Ignore rollback failures and retry with a clean connection below if needed.
              }
            }
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            } catch (err) {
              const message = err instanceof Error ? err.message.toLowerCase() : "";
              const shouldResetPeer =
                message.includes("wrong state") ||
                message.includes("failed to set remote offer") ||
                message.includes("cannot set remote offer");
              if (!shouldResetPeer) {
                throw err;
              }
              closePeerConnection(signal.sender_id);
              pc = await getOrCreatePeerConnection(signal.sender_id, false);
              await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            }
            if (pc.signalingState !== "have-remote-offer") {
              continue;
            }
            await flushPendingCandidates(signal.sender_id, pc);
            const answer = await pc.createAnswer();
            if (pc.signalingState !== "have-remote-offer") {
              continue;
            }
            try {
              await pc.setLocalDescription(answer);
            } catch (err) {
              const message = err instanceof Error ? err.message.toLowerCase() : "";
              if (message.includes("wrong state") || message.includes("called in wrong state")) {
                continue;
              }
              throw err;
            }
            await sendVoiceSignal(accessToken, voiceRoomKey, currentUserId, signal.sender_id, "answer", {
              sdp: pc.localDescription || answer,
              videoShareKind: getLocalPrimaryVideoShareKind(),
            });
            continue;
          }

          if (signal.kind === "answer") {
            const pc = await getOrCreatePeerConnection(signal.sender_id, false);
            const sdp = payload.sdp as RTCSessionDescriptionInit | undefined;
            if (!sdp) continue;
            // Ignore late/duplicate answers after negotiation has already settled.
            if (pc.signalingState !== "have-local-offer") {
              continue;
            }
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(sdp));
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
            const candidate = payload.candidate as RTCIceCandidateInit | undefined;
            if (!candidate) continue;
            if (!pc.remoteDescription) {
              const queued = pendingCandidatesRef.current.get(signal.sender_id) || [];
              queued.push(candidate);
              pendingCandidatesRef.current.set(signal.sender_id, queued);
              continue;
            }
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch {
              // Ignore stale candidates during reconnect races.
            }
          }
        }
      } catch (err) {
        if (!mounted) return;
        setVoiceError(err instanceof Error ? err.message : "Could not sync voice.");
      } finally {
        voiceSignalsPollingInFlightRef.current = false;
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
    if (!selectedVoiceRoomKey) return;
    if (selectedVoiceRoomKey === voiceRoomKey) return;
    void stopVoiceSession(true);
  }, [selectedVoiceRoomKey, voiceRoomKey]);
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    previousVoiceParticipantIdsRef.current = [];
    missingSelfParticipantCountRef.current = 0;
  }, [presenceRoomKey]);

  // Intentional mount/unmount cleanup effect.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    return () => {
      if (soundContextRef.current) {
        void soundContextRef.current.close();
        soundContextRef.current = null;
      }
      void stopMicTest();
      void stopVoiceSession(true);
    };
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps */

  const handleAddFriend = async (e: FormEvent) => {
    e.preventDefault();
    const username = normalizeUsernameLookupInput(friendUsername);
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

  const handleToggleGroupCreateMember = (userId: string, checked: boolean) => {
    setGroupCreateMemberIds((prev) => {
      if (checked) {
        if (prev.includes(userId)) return prev;
        return [...prev, userId];
      }
      return prev.filter((id) => id !== userId);
    });
  };

  const handleCreateGroupChat = async (e: FormEvent) => {
    e.preventDefault();
    const name = groupNameDraft.trim();
    if (!name) {
      setGroupError("Enter a group chat name.");
      return;
    }

    setGroupCreateBusy(true);
    setGroupError("");
    try {
      const created = await createGroupChat(accessToken, name, groupCreateMemberIds);
      setGroupNameDraft("");
      setGroupCreateMemberIds([]);
      await loadGroupSidebarData();
      setActiveGroupChatId(created.group_chat_id);
      setViewMode("group");
    } catch (err) {
      setGroupError(err instanceof Error ? err.message : "Could not create group chat.");
    } finally {
      setGroupCreateBusy(false);
    }
  };

  const handleAddMemberToActiveGroup = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeGroupChatId) {
      setGroupError("Select a group chat first.");
      return;
    }
    if (!groupAddMemberId) {
      setGroupError("Select a friend to add.");
      return;
    }

    setGroupAddMemberBusy(true);
    setGroupError("");
    try {
      await addGroupChatMembers(accessToken, activeGroupChatId, [groupAddMemberId]);
      setGroupAddMemberId("");
      await loadGroupSidebarData();
    } catch (err) {
      setGroupError(err instanceof Error ? err.message : "Could not add member.");
    } finally {
      setGroupAddMemberBusy(false);
    }
  };

  const handleCreateGlytch = async (e: FormEvent) => {
    e.preventDefault();
    const name = glytchNameDraft.trim();
    if (!name) {
      setGlytchError("Enter a Glytch name.");
      return;
    }

    const maxMembersDraft = glytchCreateMaxMembersDraft.trim();
    let maxMembers: number | null = null;
    if (maxMembersDraft) {
      const parsed = Number.parseInt(maxMembersDraft, 10);
      if (!Number.isFinite(parsed) || parsed < GLYTCH_MAX_MEMBERS_MIN || parsed > GLYTCH_MAX_MEMBERS_MAX) {
        setGlytchError(`Max users must be between ${GLYTCH_MAX_MEMBERS_MIN} and ${GLYTCH_MAX_MEMBERS_MAX}.`);
        return;
      }
      maxMembers = Math.trunc(parsed);
    }

    try {
      const created = await createGlytch(accessToken, name, {
        isPublic: glytchCreateVisibilityDraft === "public",
        maxMembers,
      });
      setGlytchNameDraft("");
      setGlytchCreateVisibilityDraft("private");
      setGlytchCreateMaxMembersDraft("");
      setGlytchError("");
      setJoinBannedGlytchId(null);
      setJoinUnbanRequestDraft("");
      setJoinUnbanRequestNotice("");
      await loadGlytchSidebarData();
      setViewMode("glytch");
      setActiveGlytchId(created.glytch_id);
      setActiveChannelId(created.channel_id);
      setGlytchDirectoryTab("discover");
      setGlytchActionMode("none");
      setShowGlytchDirectory(false);
    } catch (err) {
      setGlytchError(err instanceof Error ? err.message : "Could not create Glytch.");
    }
  };

  const openJoinUnbanRequestFlow = useCallback((glytchId: number | null, inviteCode?: string) => {
    setViewMode("glytch");
    setShowGlytchDirectory(true);
    setGlytchDirectoryTab("discover");
    setGlytchActionMode("join");
    if (typeof inviteCode === "string") {
      setInviteCodeDraft(inviteCode.trim().toLowerCase());
    }
    setJoinBannedGlytchId(glytchId);
    setJoinUnbanRequestDraft("");
    setJoinUnbanRequestNotice("");
    setGlytchError("You are banned from this Glytch. Submit an unban request for review.");
  }, []);

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
      setJoinBannedGlytchId(null);
      setJoinUnbanRequestDraft("");
      setJoinUnbanRequestNotice("");
      await loadGlytchSidebarData();
      setViewMode("glytch");
      setActiveGlytchId(joined.glytch_id);
      setGlytchDirectoryTab("discover");
      setGlytchActionMode("none");
      setShowGlytchDirectory(false);
    } catch (err) {
      if (err instanceof JoinGlytchBannedError) {
        openJoinUnbanRequestFlow(err.glytchId);
        return;
      }
      setJoinBannedGlytchId(null);
      setJoinUnbanRequestNotice("");
      setGlytchError(err instanceof Error ? err.message : "Could not join Glytch.");
    }
  };

  const handleJoinPublicGlytch = useCallback(async (glytch: PublicGlytchDirectoryEntry) => {
    setPublicGlytchJoinBusyId(glytch.id);
    setPublicGlytchSearchError("");
    setGlytchError("");
    setJoinBannedGlytchId(null);
    setJoinUnbanRequestNotice("");
    try {
      const joined = await joinPublicGlytch(accessToken, glytch.id);
      await loadGlytchSidebarData();
      setViewMode("glytch");
      setActiveGlytchId(joined.glytch_id);
      setGlytchDirectoryTab("discover");
      setShowGlytchDirectory(false);
      setGlytchActionMode("none");
    } catch (err) {
      if (err instanceof JoinGlytchBannedError) {
        openJoinUnbanRequestFlow(err.glytchId ?? glytch.id);
        return;
      }
      setPublicGlytchSearchError(err instanceof Error ? err.message : "Could not join public Glytch.");
    } finally {
      setPublicGlytchJoinBusyId((prev) => (prev === glytch.id ? null : prev));
    }
  }, [accessToken, loadGlytchSidebarData, openJoinUnbanRequestFlow]);

  const handleSubmitJoinUnbanRequest = async (e: FormEvent) => {
    e.preventDefault();
    if (!joinBannedGlytchId) {
      setGlytchError("Join a banned Glytch first.");
      return;
    }

    setJoinUnbanRequestBusy(true);
    setGlytchError("");
    setJoinUnbanRequestNotice("");
    try {
      await submitGlytchUnbanRequest(accessToken, joinBannedGlytchId, joinUnbanRequestDraft.trim() || null);
      setJoinUnbanRequestDraft("");
      setJoinUnbanRequestNotice("Unban request submitted. Glytch moderators can now review it.");
    } catch (err) {
      setGlytchError(err instanceof Error ? err.message : "Could not submit unban request.");
    } finally {
      setJoinUnbanRequestBusy(false);
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
      (currentProfile?.display_name || currentProfile?.username || currentUserName || "User").trim() || "User";

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
      setDismissedDmMessageIds((prev) => ({ ...prev, [messageId]: true }));
      await deleteDmMessage(accessToken, messageId).catch(() => undefined);
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    } catch (err) {
      if (err instanceof JoinGlytchBannedError) {
        openJoinUnbanRequestFlow(err.glytchId ?? invite.glytchId, invite.inviteCode);
        return;
      }
      setChatError(err instanceof Error ? err.message : "Could not join Glytch.");
    } finally {
      setJoinInviteBusyMessageId((prev) => (prev === messageId ? null : prev));
    }
  }, [accessToken, glytches, loadGlytchSidebarData, openJoinUnbanRequestFlow]);

  const handleRejectInviteFromDmMessage = useCallback(async (messageId: number) => {
    try {
      setJoinInviteBusyMessageId(messageId);
      setChatError("");
      setDismissedDmMessageIds((prev) => ({ ...prev, [messageId]: true }));
      await deleteDmMessage(accessToken, messageId).catch(() => undefined);
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Could not reject invite.");
    } finally {
      setJoinInviteBusyMessageId((prev) => (prev === messageId ? null : prev));
    }
  }, [accessToken]);

  const handleDeleteDmMessageFromContextMenu = useCallback(async () => {
    if (!messageContextMenu) return;

    const { messageId } = messageContextMenu;
    setMessageContextMenu(null);
    setChatError("");
    try {
      await deleteDmMessage(accessToken, messageId);
      setMessages((prev) => prev.filter((message) => message.id !== messageId));
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Could not delete message.");
    }
  }, [accessToken, messageContextMenu]);

  const handleReplyToDmMessageFromContextMenu = useCallback(() => {
    if (!messageContextMenu) return;

    const target = messages.find((message) => message.id === messageContextMenu.messageId);
    setMessageContextMenu(null);
    if (!target) return;

    setComposerReplyTarget({
      messageId: target.id,
      senderName: target.senderName,
      preview: buildReplyPreviewFromMessage(target),
    });
    requestAnimationFrame(() => {
      messageInputRef.current?.focus();
    });
  }, [messageContextMenu, messages]);

  const handleStartEditingMessageFromContextMenu = useCallback(() => {
    if (!messageContextMenu || !messageContextMenu.canEdit) return;

    const target = messages.find((message) => message.id === messageContextMenu.messageId);
    setMessageContextMenu(null);
    if (!target || target.sender !== "me") return;

    if (viewMode === "dm" && parseGlytchInviteMessage(target.text || "")) {
      setChatError("Invite messages cannot be edited.");
      return;
    }

    const replyPayload = viewMode === "dm" ? parseDmReplyMessage(target.text || "") : null;
    const initialDraft = replyPayload ? replyPayload.body : target.text;
    setEditingMessageId(target.id);
    setEditingMessageDraft(initialDraft || "");
  }, [messageContextMenu, messages, viewMode]);

  const handleCancelMessageEdit = useCallback(() => {
    if (messageEditBusy) return;
    setEditingMessageId(null);
    setEditingMessageDraft("");
  }, [messageEditBusy]);

  const handleSaveMessageEdit = useCallback(async () => {
    if (!editingMessageId || messageEditBusy) return;
    const trimmed = editingMessageDraft.trim();
    if (!trimmed) {
      setChatError("Edited message cannot be empty.");
      return;
    }

    const target = messages.find((message) => message.id === editingMessageId);
    if (!target || target.sender !== "me") {
      setEditingMessageId(null);
      setEditingMessageDraft("");
      return;
    }

    setMessageEditBusy(true);
    setChatError("");

    try {
      let editedText = trimmed;
      if (viewMode === "dm") {
        const existingReplyPayload = parseDmReplyMessage(target.text || "");
        if (existingReplyPayload) {
          editedText = serializeDmReplyMessage({
            replyToMessageId: existingReplyPayload.replyToMessageId,
            replyToSenderName: existingReplyPayload.replyToSenderName,
            replyPreview: existingReplyPayload.replyPreview,
            body: trimmed,
          });
        }
      }

      let editedAt = new Date();
      if (viewMode === "dm") {
        if (!activeConversationId) return;
        const updated = await updateDmMessage(accessToken, editingMessageId, editedText);
        if (updated[0]?.edited_at) {
          editedAt = new Date(updated[0].edited_at);
        }
      } else if (viewMode === "group") {
        if (!activeGroupChatId) return;
        const updated = await updateGroupChatMessage(accessToken, editingMessageId, editedText);
        if (updated[0]?.edited_at) {
          editedAt = new Date(updated[0].edited_at);
        }
      } else if (viewMode === "glytch") {
        if (!activeChannelId || activeChannel?.kind === "voice") return;
        const updated = await updateGlytchMessage(accessToken, editingMessageId, editedText);
        if (updated[0]?.edited_at) {
          editedAt = new Date(updated[0].edited_at);
        }
      } else {
        return;
      }

      setMessages((prev) =>
        prev.map((message) =>
          message.id === editingMessageId
            ? {
                ...message,
                text: editedText,
                editedAt,
              }
            : message,
        ),
      );
      setEditingMessageId(null);
      setEditingMessageDraft("");
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Could not edit message.");
    } finally {
      setMessageEditBusy(false);
    }
  }, [
    accessToken,
    activeChannel?.kind,
    activeChannelId,
    activeConversationId,
    activeGroupChatId,
    editingMessageDraft,
    editingMessageId,
    messageEditBusy,
    messages,
    viewMode,
  ]);

  const openDmNavContextMenu = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const menuWidth = 184;
    const menuHeight = 56;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const safeX = Math.max(8, Math.min(event.clientX + 4, viewportWidth - menuWidth - 8));
    const safeY = Math.max(8, Math.min(event.clientY + 4, viewportHeight - menuHeight - 8));

    setMessageContextMenu(null);
    setDmSidebarContextMenu(null);
    setDmNavContextMenu({ x: safeX, y: safeY });
  }, []);

  const handleMarkAllDmsSeenFromNavContextMenu = useCallback(async () => {
    const conversationIdsToMark = dms
      .map((dm) => dm.conversationId)
      .filter((conversationId) => (unreadDmCounts[conversationId] || 0) > 0);

    setDmNavContextMenu(null);
    if (conversationIdsToMark.length === 0) return;

    const busyKey = "seen-all";
    setDmSidebarActionBusyKey(busyKey);
    setDmError("");

    try {
      const settled = await Promise.allSettled(
        conversationIdsToMark.map((conversationId) => markDmConversationRead(accessToken, conversationId)),
      );
      const hadFailures = settled.some((result) => result.status === "rejected");
      const deletedEmptyConversation = settled.some(
        (result) => result.status === "fulfilled" && result.value.deleted_empty_conversation,
      );

      setUnreadDmCounts((prev) => {
        let didChange = false;
        const next = { ...prev };
        conversationIdsToMark.forEach((conversationId) => {
          if ((next[conversationId] || 0) === 0) return;
          next[conversationId] = 0;
          didChange = true;
        });
        return didChange ? next : prev;
      });

      if (deletedEmptyConversation) {
        await loadDmSidebarData();
      }

      if (hadFailures) {
        setDmError("Some DMs could not be marked as seen.");
      }
    } catch (err) {
      setDmError(err instanceof Error ? err.message : "Could not mark all DMs as seen.");
    } finally {
      setDmSidebarActionBusyKey((prev) => (prev === busyKey ? null : prev));
    }
  }, [accessToken, dms, loadDmSidebarData, unreadDmCounts]);

  const openDmSidebarContextMenu = useCallback((
    event: ReactMouseEvent<HTMLElement>,
    conversationId: number,
    unreadCount: number,
    isPinned: boolean,
    isMuted: boolean,
  ) => {
    if (viewMode !== "dm" || dmPanelMode !== "dms") return;
    if (!Number.isFinite(conversationId) || conversationId <= 0) return;
    const menuContainer = dmSidebarListRef.current;
    if (!menuContainer) return;

    event.preventDefault();
    event.stopPropagation();

    const menuWidth = 176;
    const menuHeight = 154;
    const menuContainerRect = menuContainer.getBoundingClientRect();
    const viewportHost = menuContainer.closest(".sideContentBody");
    const viewportRect =
      viewportHost instanceof HTMLElement ? viewportHost.getBoundingClientRect() : menuContainerRect;

    const desiredLocalX = event.clientX - menuContainerRect.left + 4;
    const desiredLocalY = event.clientY - menuContainerRect.top + 4;

    const minLocalX = Math.max(8, viewportRect.left - menuContainerRect.left + 8);
    const minLocalY = Math.max(8, viewportRect.top - menuContainerRect.top + 8);
    const maxLocalX = Math.max(minLocalX, viewportRect.right - menuContainerRect.left - menuWidth - 8);
    const maxLocalY = Math.max(minLocalY, viewportRect.bottom - menuContainerRect.top - menuHeight - 8);

    const safeX = Math.max(minLocalX, Math.min(desiredLocalX, maxLocalX));
    const safeY = Math.max(minLocalY, Math.min(desiredLocalY, maxLocalY));

    setMessageContextMenu(null);
    setDmNavContextMenu(null);
    setDmSidebarContextMenu({
      conversationId,
      x: safeX,
      y: safeY,
      unreadCount: Math.max(0, unreadCount),
      isPinned,
      isMuted,
    });
  }, [dmPanelMode, viewMode]);

  const handleMarkDmSeenFromSidebarContextMenu = useCallback(async () => {
    if (!dmSidebarContextMenu) return;
    const { conversationId } = dmSidebarContextMenu;
    const busyKey = `seen:${conversationId}`;

    setDmSidebarContextMenu(null);
    setDmSidebarActionBusyKey(busyKey);
    setDmError("");

    try {
      const result = await markDmConversationRead(accessToken, conversationId);
      setUnreadDmCounts((prev) => {
        if (!prev[conversationId]) return prev;
        return { ...prev, [conversationId]: 0 };
      });
      if (result.deleted_empty_conversation) {
        await loadDmSidebarData();
      }
    } catch (err) {
      setDmError(err instanceof Error ? err.message : "Could not mark DM as seen.");
    } finally {
      setDmSidebarActionBusyKey((prev) => (prev === busyKey ? null : prev));
    }
  }, [accessToken, dmSidebarContextMenu, loadDmSidebarData]);

  const handleTogglePinDmFromSidebarContextMenu = useCallback(async () => {
    if (!dmSidebarContextMenu) return;
    const { conversationId, isPinned } = dmSidebarContextMenu;
    const nextPinned = !isPinned;
    const busyKey = `pin:${conversationId}`;

    setDmSidebarContextMenu(null);
    setDmSidebarActionBusyKey(busyKey);
    setDmError("");

    try {
      await setDmConversationPinned(accessToken, conversationId, nextPinned);
      setDms((prev) =>
        sortDmsByPinned(
          prev.map((dm) =>
            dm.conversationId === conversationId
              ? {
                  ...dm,
                  isPinned: nextPinned,
                }
              : dm,
          ),
          dmLatestMessageIds,
        ),
      );
    } catch (err) {
      setDmError(err instanceof Error ? err.message : "Could not update DM pin.");
    } finally {
      setDmSidebarActionBusyKey((prev) => (prev === busyKey ? null : prev));
    }
  }, [accessToken, dmLatestMessageIds, dmSidebarContextMenu]);

  const handleToggleMuteDmFromSidebarContextMenu = useCallback(async () => {
    if (!dmSidebarContextMenu) return;
    const { conversationId, isMuted } = dmSidebarContextMenu;
    const nextMuted = !isMuted;
    const busyKey = `mute:${conversationId}`;

    setDmSidebarContextMenu(null);
    setDmSidebarActionBusyKey(busyKey);
    setDmError("");

    const nextMutedDmConversationIds = nextMuted
      ? Array.from(new Set([...profileForm.mutedDmConversationIds, conversationId]))
      : profileForm.mutedDmConversationIds.filter((id) => id !== conversationId);

    try {
      const updated = await updateMyProfileCustomization(accessToken, currentUserId, {
        profile_theme: buildProfileThemePayload({
          ...profileForm,
          mutedDmConversationIds: nextMutedDmConversationIds,
        }),
      });
      const nextProfile = updated[0] || null;
      if (nextProfile) {
        setCurrentProfile(nextProfile);
        setKnownProfiles((prev) => ({ ...prev, [nextProfile.user_id]: nextProfile }));
        setViewedProfile((prev) => (prev?.user_id === nextProfile.user_id ? nextProfile : prev));
      }
      setProfileForm((prev) => ({
        ...prev,
        mutedDmConversationIds: nextMutedDmConversationIds,
      }));
    } catch (err) {
      setDmError(err instanceof Error ? err.message : "Could not update DM mute state.");
    } finally {
      setDmSidebarActionBusyKey((prev) => (prev === busyKey ? null : prev));
    }
  }, [accessToken, currentUserId, dmSidebarContextMenu, profileForm]);

  const handleDeleteDmFromSidebarContextMenu = useCallback(async () => {
    if (!dmSidebarContextMenu) return;
    const { conversationId } = dmSidebarContextMenu;
    const busyKey = `delete:${conversationId}`;

    setDmSidebarContextMenu(null);
    setDmSidebarActionBusyKey(busyKey);
    setDmError("");

    try {
      await hideDmConversation(accessToken, conversationId);

      const nextLatestMessageIds = { ...dmLatestMessageIdsRef.current };
      delete nextLatestMessageIds[conversationId];
      const nextDms = sortDmsByPinned(
        dms.filter((dm) => dm.conversationId !== conversationId),
        nextLatestMessageIds,
      );
      setDms(nextDms);
      setDmLatestMessageIds(nextLatestMessageIds);
      setUnreadDmCounts((prev) => {
        if (!(conversationId in prev)) return prev;
        const next = { ...prev };
        delete next[conversationId];
        return next;
      });

      dmLatestMessageIdsRef.current = nextLatestMessageIds;

      const nextCallCounts = { ...dmCallParticipantCountsRef.current };
      delete nextCallCounts[conversationId];
      dmCallParticipantCountsRef.current = nextCallCounts;
      setDmIncomingCallCounts((prev) => {
        if (!(conversationId in prev)) return prev;
        const next = { ...prev };
        delete next[conversationId];
        return next;
      });

      if (activeConversationIdRef.current === conversationId) {
        setActiveConversationId(nextDms[0]?.conversationId ?? null);
      }
    } catch (err) {
      setDmError(err instanceof Error ? err.message : "Could not delete DM.");
    } finally {
      setDmSidebarActionBusyKey((prev) => (prev === busyKey ? null : prev));
    }
  }, [accessToken, dmSidebarContextMenu, dms]);

  const handleDmMessageContextMenuCapture = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    const canOpenInCurrentView =
      viewMode === "dm" || viewMode === "group" || (viewMode === "glytch" && activeChannel?.kind !== "voice");
    if (!canOpenInCurrentView) return;
    const rawTarget = event.target;
    const targetElement =
      rawTarget instanceof Element
        ? rawTarget
        : rawTarget instanceof Node
          ? rawTarget.parentElement
          : null;
    const messageRow = targetElement?.closest<HTMLElement>("[data-dm-message-row='true']") || null;
    if (!messageRow) return;

    const messageId = Number.parseInt(messageRow.dataset.messageId || "", 10);
    if (!Number.isFinite(messageId) || messageId <= 0) return;
    const sender = messageRow.dataset.sender === "me" ? "me" : "other";
    event.preventDefault();
    openDmMessageContextMenuAt(messageRow, messageId, sender, { x: event.clientX, y: event.clientY });
  }, [activeChannel?.kind, openDmMessageContextMenuAt, viewMode]);

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

  const handleSaveGlytchBotSettings = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeGlytchId) {
      setGlytchBotSettingsError("Select a Glytch first.");
      return;
    }
    if (!canBanMembersInActiveGlytch) {
      setGlytchBotSettingsError("You do not have permission to configure the Glytch bot.");
      return;
    }
    if (!glytchBotSettings) {
      setGlytchBotSettingsError("Glytch bot settings are not loaded yet.");
      return;
    }

    const blockedWords = normalizeBlockedWordsDraft(glytchBotBlockedWordsDraft);
    const webhookUrl = glytchBotWebhookDraft.trim();
    if (glytchBotSettings.third_party_bots_enabled && webhookUrl && !/^https?:\/\//i.test(webhookUrl)) {
      setGlytchBotSettingsError("Third-party bot webhook URL must start with http:// or https://");
      return;
    }
    setGlytchBotSettingsBusy(true);
    setGlytchBotSettingsError("");
    setGlytchBotSettingsNotice("");
    try {
      const updated = await updateGlytchBotSettings(accessToken, activeGlytchId, {
        enabled: glytchBotSettings.enabled,
        block_external_links: glytchBotSettings.block_external_links,
        block_invite_links: glytchBotSettings.block_invite_links,
        block_blocked_words: glytchBotSettings.block_blocked_words,
        blocked_words: blockedWords,
        dm_on_kick_or_ban: glytchBotSettings.dm_on_kick_or_ban,
        dm_on_message_block: glytchBotSettings.dm_on_message_block,
        third_party_bots_enabled: glytchBotSettings.third_party_bots_enabled,
        third_party_bot_webhook_url: glytchBotSettings.third_party_bots_enabled ? webhookUrl || null : null,
      });
      setGlytchBotSettings(updated);
      setGlytchBotBlockedWordsDraft((updated.blocked_words || []).join(", "));
      setGlytchBotWebhookDraft(updated.third_party_bot_webhook_url || "");
      setGlytchBotSettingsNotice("Glytch bot settings saved.");
    } catch (err) {
      setGlytchBotSettingsError(err instanceof Error ? err.message : "Could not save Glytch bot settings.");
    } finally {
      setGlytchBotSettingsBusy(false);
    }
  };

  const handleReviewUnbanRequest = async (requestId: number, status: "approved" | "rejected") => {
    if (!activeGlytchId) {
      setRoleError("Select a Glytch first.");
      return;
    }
    if (!canBanMembersInActiveGlytch) {
      setRoleError("You do not have permission to review unban requests.");
      return;
    }

    const busyKey = `${status}:${requestId}`;
    setUnbanRequestActionBusyKey(busyKey);
    setRoleError("");
    try {
      await reviewGlytchUnbanRequest(accessToken, requestId, status, null);
      await loadGlytchRoleData(activeGlytchId);
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : "Could not review unban request.");
    } finally {
      setUnbanRequestActionBusyKey((prev) => (prev === busyKey ? null : prev));
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
      const nextDisplayName = profileForm.displayName.trim() || profileForm.username || "User";
      const updated = await updateMyProfileCustomization(accessToken, currentUserId, {
        display_name: nextDisplayName,
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

      if (
        profileForm.notificationsEnabled &&
        (
          profileForm.notifyDmMessages ||
          profileForm.notifyDmCalls ||
          profileForm.notifyGlytchMessages ||
          profileForm.notifyFriendRequests ||
          profileForm.notifyFriendRequestAccepted
        )
      ) {
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

  const handleSavePrivacySettings = async (e: FormEvent) => {
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
      setProfileSaveError(err instanceof Error ? err.message : "Could not save privacy settings.");
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

  const handleSaveAccessibilitySettings = async (e: FormEvent) => {
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
      setProfileSaveError(err instanceof Error ? err.message : "Could not save accessibility settings.");
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

  const handleUploadShowcaseGalleryAsset = (showcaseId: string) => async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const targetShowcase = profileForm.showcases.find((showcase) => showcase.id === showcaseId);
    if (!targetShowcase || targetShowcase.kind !== "gallery") {
      setProfileSaveError("Select a gallery showcase first.");
      e.target.value = "";
      return;
    }
    if (!file.type.startsWith("image/")) {
      setProfileSaveError("Only image files can be added to gallery showcases.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_THEME_IMAGE_BYTES) {
      setProfileSaveError("Gallery upload must be 8MB or smaller.");
      e.target.value = "";
      return;
    }

    setShowcaseGalleryUploadBusyId(showcaseId);
    setProfileSaveError("");
    try {
      const uploadedUrl = await uploadProfileAsset(accessToken, currentUserId, file, "theme");
      setProfileForm((prev) => ({
        ...prev,
        showcases: prev.showcases.map((showcase) => {
          if (showcase.id !== showcaseId || showcase.kind !== "gallery") {
            return showcase;
          }
          const nextEntries = [...showcase.entries, uploadedUrl].slice(0, SHOWCASE_MAX_ENTRIES);
          return {
            ...showcase,
            entries: nextEntries,
          };
        }),
      }));
    } catch (err) {
      setProfileSaveError(err instanceof Error ? err.message : "Could not upload gallery image.");
    } finally {
      setShowcaseGalleryUploadBusyId((prev) => (prev === showcaseId ? null : prev));
      e.target.value = "";
    }
  };

  const handleQuickThemeImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!quickThemeTarget) {
      setQuickThemeError("Open a DM, group chat, or text channel first.");
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
      } else if (quickThemeTarget.kind === "group") {
        const groupChatId = Number.parseInt(quickThemeTarget.key, 10);
        if (!Number.isFinite(groupChatId) || groupChatId <= 0) {
          throw new Error("Invalid group chat.");
        }
        const nextByChat = {
          ...profileForm.groupBackgroundByChat,
          [quickThemeTarget.key]: nextOverride,
        };
        const updated = await updateMyProfileCustomization(accessToken, currentUserId, {
          profile_theme: buildProfileThemePayload({
            ...profileForm,
            groupBackgroundByChat: nextByChat,
          }),
        });
        const nextProfile = updated[0] || null;
        if (nextProfile) {
          setCurrentProfile(nextProfile);
          setKnownProfiles((prev) => ({ ...prev, [nextProfile.user_id]: nextProfile }));
          setViewedProfile((prev) => (prev?.user_id === nextProfile.user_id ? nextProfile : prev));
        }
        setProfileForm((prev) => ({
          ...prev,
          groupBackgroundByChat: nextByChat,
        }));
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
      } else if (quickThemeTarget.kind === "group") {
        const groupChatId = Number.parseInt(quickThemeTarget.key, 10);
        if (!Number.isFinite(groupChatId) || groupChatId <= 0) {
          throw new Error("Invalid group chat.");
        }
        const nextByChat = { ...profileForm.groupBackgroundByChat };
        delete nextByChat[quickThemeTarget.key];
        const updated = await updateMyProfileCustomization(accessToken, currentUserId, {
          profile_theme: buildProfileThemePayload({
            ...profileForm,
            groupBackgroundByChat: nextByChat,
          }),
        });
        const nextProfile = updated[0] || null;
        if (nextProfile) {
          setCurrentProfile(nextProfile);
          setKnownProfiles((prev) => ({ ...prev, [nextProfile.user_id]: nextProfile }));
          setViewedProfile((prev) => (prev?.user_id === nextProfile.user_id ? nextProfile : prev));
        }
        setProfileForm((prev) => ({
          ...prev,
          groupBackgroundByChat: nextByChat,
        }));
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

  const clearBannerCropDraft = useCallback(() => {
    setBannerCropSourceUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return "";
    });
    bannerCropPointerRef.current = null;
    setBannerCropDragging(false);
    setBannerCropZoom(1);
    setBannerCropOffsetX(0);
    setBannerCropOffsetY(0);
    setBannerCropNaturalSize(null);
    setBannerCropSourceType("image/webp");
  }, []);

  const handleSaveBannerCrop = useCallback(async () => {
    if (!bannerCropSourceUrl || !bannerCropNaturalSize) return;

    setBannerUploadBusy(true);
    setProfileSaveError("");
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Could not read the banner image."));
        img.src = bannerCropSourceUrl;
      });

      const { sx, sy, sw, sh } = computeBannerCropSourceRect(
        bannerCropNaturalSize,
        bannerCropZoom,
        bannerCropOffsetX,
        bannerCropOffsetY,
      );
      const canvas = document.createElement("canvas");
      canvas.width = BANNER_OUTPUT_WIDTH;
      canvas.height = BANNER_OUTPUT_HEIGHT;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Could not initialize banner crop canvas.");
      }
      ctx.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(
          (nextBlob) => resolve(nextBlob),
          bannerCropSourceType || "image/webp",
          0.92,
        );
      });
      if (!blob) {
        throw new Error("Could not export cropped banner.");
      }

      const extension = blob.type.includes("png")
        ? "png"
        : blob.type.includes("jpeg")
          ? "jpg"
          : blob.type.includes("gif")
            ? "gif"
            : "webp";
      const croppedFile = new File([blob], `banner-${Date.now()}.${extension}`, {
        type: blob.type || "image/webp",
      });
      const uploadedUrl = await uploadProfileAsset(accessToken, currentUserId, croppedFile, "banner");
      setProfileForm((prev) => ({ ...prev, bannerUrl: uploadedUrl }));
      clearBannerCropDraft();
    } catch (err) {
      setProfileSaveError(err instanceof Error ? err.message : "Could not crop banner.");
    } finally {
      setBannerUploadBusy(false);
    }
  }, [
    accessToken,
    bannerCropNaturalSize,
    bannerCropOffsetX,
    bannerCropOffsetY,
    bannerCropSourceType,
    bannerCropSourceUrl,
    bannerCropZoom,
    clearBannerCropDraft,
    currentUserId,
  ]);

  const handleBannerCropPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!bannerCropSourceUrl) return;
    event.preventDefault();
    (event.currentTarget as HTMLDivElement).setPointerCapture?.(event.pointerId);
    bannerCropPointerRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: bannerCropOffsetX,
      originY: bannerCropOffsetY,
    };
    setBannerCropDragging(true);
  }, [bannerCropOffsetX, bannerCropOffsetY, bannerCropSourceUrl]);

  const handleBannerCropPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const pointer = bannerCropPointerRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId || !bannerCropNaturalSize) return;
    event.preventDefault();
    const deltaX = event.clientX - pointer.startX;
    const deltaY = event.clientY - pointer.startY;
    const next = clampBannerCropOffsets(
      bannerCropNaturalSize,
      bannerCropZoom,
      pointer.originX + deltaX,
      pointer.originY + deltaY,
    );
    setBannerCropOffsetX(next.x);
    setBannerCropOffsetY(next.y);
  }, [bannerCropNaturalSize, bannerCropZoom]);

  const handleBannerCropPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const pointer = bannerCropPointerRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) return;
    (event.currentTarget as HTMLDivElement).releasePointerCapture?.(event.pointerId);
    bannerCropPointerRef.current = null;
    setBannerCropDragging(false);
  }, []);

  const handleProfileImageUpload =
    (kind: "avatar" | "banner") => async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setProfileSaveError("");

      if (kind === "banner") {
        const sourceUrl = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
          setBannerCropSourceUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return sourceUrl;
          });
          setBannerCropNaturalSize({
            width: image.naturalWidth || image.width,
            height: image.naturalHeight || image.height,
          });
          setBannerCropSourceType(file.type === "image/png" ? "image/png" : "image/webp");
          setBannerCropZoom(1);
          setBannerCropOffsetX(0);
          setBannerCropOffsetY(0);
          setBannerCropDragging(false);
        };
        image.onerror = () => {
          URL.revokeObjectURL(sourceUrl);
          setProfileSaveError("Could not read banner image.");
        };
        image.src = sourceUrl;
        e.target.value = "";
        return;
      }

      setAvatarUploadBusy(true);
      try {
        const uploadedUrl = await uploadProfileAsset(accessToken, currentUserId, file, kind);
        setProfileForm((prev) => ({ ...prev, avatarUrl: uploadedUrl }));
      } catch (err) {
        setProfileSaveError(err instanceof Error ? err.message : "Could not upload image.");
      } finally {
        setAvatarUploadBusy(false);
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

    const maxMembersDraft = glytchProfileMaxMembersDraft.trim();
    let maxMembers: number | null = null;
    if (maxMembersDraft) {
      const parsed = Number.parseInt(maxMembersDraft, 10);
      if (!Number.isFinite(parsed) || parsed < GLYTCH_MAX_MEMBERS_MIN || parsed > GLYTCH_MAX_MEMBERS_MAX) {
        setGlytchProfileError(`Max users must be between ${GLYTCH_MAX_MEMBERS_MIN} and ${GLYTCH_MAX_MEMBERS_MAX}.`);
        return;
      }
      maxMembers = Math.trunc(parsed);
    }

    setGlytchProfileBusy(true);
    setGlytchProfileError("");
    try {
      const updated = await setGlytchProfile(accessToken, activeGlytch.id, name, glytchProfileBioDraft.trim() || null, {
        isPublic: glytchProfileVisibilityDraft === "public",
        maxMembers,
      });
      setGlytches((prev) => prev.map((glytch) => (glytch.id === activeGlytch.id ? { ...glytch, ...updated } : glytch)));
      setGlytchProfileNameDraft(updated.name || "");
      setGlytchProfileBioDraft(updated.bio || "");
      setGlytchProfileVisibilityDraft(updated.is_public ? "public" : "private");
      setGlytchProfileMaxMembersDraft(
        typeof updated.max_members === "number" && Number.isFinite(updated.max_members)
          ? String(Math.trunc(updated.max_members))
          : "",
      );
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
      } else if (viewMode === "group") {
        if (shouldAdd) {
          await addGroupChatMessageReaction(accessToken, messageId, currentUserId, normalizedEmoji);
        } else {
          await deleteGroupChatMessageReaction(accessToken, messageId, currentUserId, normalizedEmoji);
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
    const draftText = (messageInputRef.current?.value || "").trim();
    const hasAttachment = Boolean(composerAttachment);
    const hasGif = Boolean(selectedGif);
    if (!draftText && !hasAttachment && !hasGif) return;
    if (hasGif && !thirdPartyIntegrationsEnabled) {
      setChatError("Third-party integrations are disabled. Enable them in system settings to send GIFs.");
      return;
    }
    const text =
      viewMode === "dm" && composerReplyTarget
        ? serializeDmReplyMessage({
            replyToMessageId: composerReplyTarget.messageId,
            replyToSenderName: composerReplyTarget.senderName,
            replyPreview: composerReplyTarget.preview,
            body: draftText,
          })
        : draftText;
    if (viewMode === "glytch" && activeChannel?.kind === "text" && activeChannel.text_post_mode === "text_only" && (hasAttachment || hasGif)) {
      setChatError("This channel is text-only. Remove images/GIFs before sending.");
      return;
    }
    if (viewMode === "glytch" && activeChannel?.kind === "text" && activeChannel.text_post_mode === "images_only" && !hasAttachment && !hasGif) {
      setChatError("This channel is images-only. Attach an image or GIF to send.");
      return;
    }
    if (viewMode === "dm" && !activeConversationId) return;
    if (viewMode === "group" && !activeGroupChatId) return;
    if (viewMode === "glytch" && (!activeChannelId || activeChannel?.kind === "voice")) return;

    setChatError("");

    const uploadContext = viewMode === "dm" ? "dm" : viewMode === "group" ? "group" : "glytch";
    const uploadContextId = viewMode === "dm" ? activeConversationId! : viewMode === "group" ? activeGroupChatId! : activeChannelId!;
    let uploadedAttachmentUrl: string | null = null;
    let uploadedAttachmentType: MessageAttachmentType | null = null;

    if (composerAttachment || selectedGif) {
      setMessageMediaBusy(true);
      try {
        if (composerAttachment) {
          const uploaded = await uploadMessageAsset(
            accessToken,
            currentUserId,
            composerAttachment.file,
            uploadContext,
            uploadContextId,
          );
          uploadedAttachmentUrl = uploaded.url;
          uploadedAttachmentType = uploaded.attachmentType;
        } else if (selectedGif) {
          if (!thirdPartyIntegrationsEnabled) {
            throw new Error("Third-party integrations are disabled.");
          }
          try {
            const uploaded = await ingestRemoteMessageAsset(accessToken, uploadContext, uploadContextId, selectedGif.url);
            uploadedAttachmentUrl = uploaded.url;
            uploadedAttachmentType = uploaded.attachmentType;
          } catch {
            // Keep GIF sending resilient when backend ingestion fails for a provider URL.
            uploadedAttachmentUrl = selectedGif.url;
            uploadedAttachmentType = "gif";
          }
        }
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
            senderName: displayName,
            senderAvatarUrl: currentProfile?.avatar_url || "",
            readAt: row.read_by_receiver_at ? new Date(row.read_by_receiver_at) : null,
            editedAt: row.edited_at ? new Date(row.edited_at) : null,
            reactions: [],
          })),
        );
        setMessages((prev) => [...prev, ...appended]);
        if (appended.length > 0 && dmLastLoadedConversationIdRef.current === activeConversationId) {
          const latestId = appended[appended.length - 1]?.id ?? 0;
          dmLastLoadedMessageIdRef.current = Math.max(dmLastLoadedMessageIdRef.current, latestId);
        }
        if (appended.length > 0) {
          const latestId = appended[appended.length - 1]?.id ?? 0;
          if (latestId > 0) {
            const nextLatestByConversation = {
              ...dmLatestMessageIdsRef.current,
              [activeConversationId]: Math.max(dmLatestMessageIdsRef.current[activeConversationId] || 0, latestId),
            };
            dmLatestMessageIdsRef.current = nextLatestByConversation;
            setDmLatestMessageIds(nextLatestByConversation);
            setDms((prev) => sortDmsByPinned(prev, nextLatestByConversation));
          }
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
        setComposerReplyTarget(null);
        setShowEmojiPicker(false);
        setShowGifPicker(false);
        setChatError("");
      } catch (err) {
        setChatError(err instanceof Error ? err.message : "Could not send message.");
      }
      return;
    }

    if (viewMode === "group") {
      if (!activeGroupChatId) return;
      try {
        const shouldAutoScrollAfterSend = isMessageListNearBottom();
        const inserted = await createGroupChatMessage(
          accessToken,
          currentUserId,
          activeGroupChatId,
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
            senderName: displayName,
            senderAvatarUrl: currentProfile?.avatar_url || "",
            readAt: null,
            editedAt: row.edited_at ? new Date(row.edited_at) : null,
            reactions: [],
          })),
        );
        setMessages((prev) => [...prev, ...appended]);
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
            senderName: displayName,
            senderAvatarUrl: currentProfile?.avatar_url || "",
            readAt: null,
            editedAt: row.edited_at ? new Date(row.edited_at) : null,
            reactions: [],
          })),
        );
        const transientMessageIds = inserted
          .filter((row) => Boolean(row.bot_should_delete))
          .map((row) => row.id);
        setMessages((prev) => [...prev, ...appended]);
        if (transientMessageIds.length > 0) {
          window.setTimeout(() => {
            setMessages((prev) => prev.filter((msg) => !transientMessageIds.includes(msg.id)));
          }, 900);
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
    }
  };

  const syncRemoteScreenShareUsers = useCallback(() => {
    const nextShareIds: string[] = [];
    const maybeOrphanedUserIds = new Set<string>();
    for (const [shareId, stream] of remoteScreenStreamsRef.current.entries()) {
      const hasLiveVideoTrack = stream.getVideoTracks().some((track) => track.readyState !== "ended");
      if (hasLiveVideoTrack) {
        nextShareIds.push(shareId);
        continue;
      }
      const ownerUserId = remoteScreenShareOwnerByIdRef.current.get(shareId);
      if (ownerUserId) {
        maybeOrphanedUserIds.add(ownerUserId);
      }
      remoteScreenStreamsRef.current.delete(shareId);
      remoteScreenShareOwnerByIdRef.current.delete(shareId);
      remoteScreenShareKindByIdRef.current.delete(shareId);
      const pendingPromoteTimeoutId = remoteScreenPromoteTimeoutsRef.current.get(shareId);
      if (typeof pendingPromoteTimeoutId === "number") {
        window.clearTimeout(pendingPromoteTimeoutId);
        remoteScreenPromoteTimeoutsRef.current.delete(shareId);
      }
      const pendingDemoteTimeoutId = remoteScreenDemoteTimeoutsRef.current.get(shareId);
      if (typeof pendingDemoteTimeoutId === "number") {
        window.clearTimeout(pendingDemoteTimeoutId);
        remoteScreenDemoteTimeoutsRef.current.delete(shareId);
      }
    }
    for (const userId of maybeOrphanedUserIds) {
      if (hasRemoteShareForUser(userId)) continue;
      remoteScreenStreamIdsRef.current.delete(userId);
      remoteScreenAudioStreamsRef.current.delete(userId);
      const screenAudioEl = remoteScreenAudioElsRef.current.get(userId);
      if (screenAudioEl) {
        screenAudioEl.pause();
        screenAudioEl.srcObject = null;
        remoteScreenAudioElsRef.current.delete(userId);
      }
      setRemoteVideoShareKinds((prev) => {
        if (!(userId in prev)) return prev;
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    }
    setRemoteScreenShareUserIds(nextShareIds);
  }, [hasRemoteShareForUser]);

  const removeRemoteScreenShare = useCallback(
    (shareId: string) => {
      const ownerUserId = remoteScreenShareOwnerByIdRef.current.get(shareId) || shareId.split(":")[0] || null;
      const pendingTimeoutId = remoteScreenPromoteTimeoutsRef.current.get(shareId);
      if (typeof pendingTimeoutId === "number") {
        window.clearTimeout(pendingTimeoutId);
        remoteScreenPromoteTimeoutsRef.current.delete(shareId);
      }
      const pendingDemoteTimeoutId = remoteScreenDemoteTimeoutsRef.current.get(shareId);
      if (typeof pendingDemoteTimeoutId === "number") {
        window.clearTimeout(pendingDemoteTimeoutId);
        remoteScreenDemoteTimeoutsRef.current.delete(shareId);
      }
      remoteScreenShareOwnerByIdRef.current.delete(shareId);
      remoteScreenShareKindByIdRef.current.delete(shareId);
      const removed = remoteScreenStreamsRef.current.delete(shareId);
      if (!removed) return;
      if (ownerUserId && !hasRemoteShareForUser(ownerUserId)) {
        remoteScreenStreamIdsRef.current.delete(ownerUserId);
        remoteScreenAudioStreamsRef.current.delete(ownerUserId);
        const screenAudioEl = remoteScreenAudioElsRef.current.get(ownerUserId);
        if (screenAudioEl) {
          screenAudioEl.pause();
          screenAudioEl.srcObject = null;
          remoteScreenAudioElsRef.current.delete(ownerUserId);
        }
        setRemoteVideoShareKinds((prev) => {
          if (!(ownerUserId in prev)) return prev;
          const next = { ...prev };
          delete next[ownerUserId];
          return next;
        });
      }
      syncRemoteScreenShareUsers();
    },
    [hasRemoteShareForUser, syncRemoteScreenShareUsers],
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
        if (pc.signalingState !== "stable") {
          queuedNegotiationPeerIdsRef.current.add(targetUserId);
          return;
        }
        try {
          await pc.setLocalDescription(offer);
        } catch (err) {
          const message = err instanceof Error ? err.message.toLowerCase() : "";
          if (message.includes("wrong state") || message.includes("called in wrong state")) {
            queuedNegotiationPeerIdsRef.current.add(targetUserId);
            return;
          }
          throw err;
        }
        if (!pc.localDescription || pc.localDescription.type !== "offer") {
          return;
        }
        await sendVoiceSignal(accessToken, voiceRoomKey, currentUserId, targetUserId, "offer", {
          sdp: pc.localDescription,
          videoShareKind: getLocalPrimaryVideoShareKind(),
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
    [accessToken, currentUserId, getLocalPrimaryVideoShareKind, voiceRoomKey],
  );

  const attachLocalShareTracksToPeers = useCallback(
    (stream: MediaStream, shareKind: LocalVideoShareKind) => {
      const senderMapRef = shareKind === "screen" ? desktopTrackSendersRef : cameraTrackSendersRef;
      for (const [userId, pc] of peerConnectionsRef.current.entries()) {
        const senders: RTCRtpSender[] = [];
        stream.getTracks().forEach((streamTrack) => {
          senders.push(pc.addTrack(streamTrack, stream));
        });
        if (senders.length > 0) {
          senderMapRef.current.set(userId, senders);
        }
        void renegotiatePeerConnection(userId, pc);
      }
    },
    [renegotiatePeerConnection],
  );

  const detachLocalShareTracksFromPeers = useCallback(
    async (shareKind: LocalVideoShareKind, renegotiatePeers: boolean) => {
      const senderMapRef = shareKind === "screen" ? desktopTrackSendersRef : cameraTrackSendersRef;
      const peersToRenegotiate: Array<[string, RTCPeerConnection]> = [];
      for (const [userId, senders] of senderMapRef.current.entries()) {
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
      senderMapRef.current.clear();

      if (renegotiatePeers) {
        for (const [userId, pc] of peersToRenegotiate) {
          await renegotiatePeerConnection(userId, pc);
        }
      }
    },
    [renegotiatePeerConnection],
  );

  const stopLocalDesktopShare = useCallback(
    async (renegotiatePeers: boolean) => {
      const currentTrack = localScreenTrackRef.current;
      const currentStream = localScreenStreamRef.current;

      localScreenTrackRef.current = null;
      localScreenStreamRef.current = null;
      setLocalScreenStream(null);

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

      await detachLocalShareTracksFromPeers("screen", renegotiatePeers);
    },
    [detachLocalShareTracksFromPeers],
  );

  const stopLocalCameraShare = useCallback(
    async (renegotiatePeers: boolean) => {
      const currentTrack = localCameraTrackRef.current;
      const currentStream = localCameraStreamRef.current;

      localCameraTrackRef.current = null;
      localCameraStreamRef.current = null;
      setLocalCameraStream(null);
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

      await detachLocalShareTracksFromPeers("camera", renegotiatePeers);
    },
    [detachLocalShareTracksFromPeers],
  );

  const startLocalCameraShare = useCallback(async (): Promise<boolean> => {
    if (cameraFallbackInFlightRef.current) return false;
    if (localCameraTrackRef.current && localCameraStreamRef.current) return true;
    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return false;
    if (!(await ensureWindowsMediaStatus("camera"))) return false;

    cameraFallbackInFlightRef.current = true;
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            frameRate: { ideal: 30, max: 60 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

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

      localCameraTrackRef.current = track;
      localCameraStreamRef.current = stream;
      setLocalCameraStream(stream);

      track.onended = () => {
        void stopLocalCameraShare(true).catch(() => undefined);
      };

      attachLocalShareTracksToPeers(stream, "camera");
      return true;
    } catch (err) {
      if (isPermissionDeniedMediaError(err)) {
        setVoiceError("Camera permission was denied. Allow camera access for Glytch Chat and try again.");
      }
      return false;
    } finally {
      cameraFallbackInFlightRef.current = false;
    }
  }, [attachLocalShareTracksToPeers, ensureWindowsMediaStatus, stopLocalCameraShare]);

  const handleStartScreenShare = async () => {
    if (!voiceRoomKey) {
      setVoiceError("Join voice before starting screen share.");
      return;
    }
    if (localScreenTrackRef.current && localScreenStreamRef.current) return;
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
      let stream: MediaStream | null = null;
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
          let recoveredViaVideoOnly = false;
          let fallbackError: unknown = displayError;

          if (screenShareIncludeSystemAudio && !isPermissionDeniedMediaError(displayError)) {
            try {
              stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                  frameRate: { ideal: 30, max: 60 },
                },
                audio: false,
              });
              recoveredViaVideoOnly = true;
            } catch (retryError) {
              fallbackError = retryError;
            }
          }

          if (!recoveredViaVideoOnly) {
            const isSupportIssue =
              fallbackError instanceof DOMException &&
              (fallbackError.name === "NotSupportedError" || fallbackError.name === "NotFoundError");
            if (!isSupportIssue || !canUseElectronFallback) {
              throw fallbackError;
            }
            stream = await requestElectronScreenStream(preferredDesktopSourceId, screenShareIncludeSystemAudio);
          }
        }
      } else {
        stream = await requestElectronScreenStream(preferredDesktopSourceId, screenShareIncludeSystemAudio);
      }
      if (!stream) {
        throw new Error("Could not start screen sharing.");
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

      track.onended = () => {
        void stopLocalDesktopShare(true).catch(() => undefined);
        setVoiceError("Screen share ended.");
      };

      attachLocalShareTracksToPeers(stream, "screen");

      if (screenShareIncludeSystemAudio && stream.getAudioTracks().length === 0) {
        setVoiceError("System audio is unavailable for this source. Sharing video only.");
      }
    } catch (err) {
      await stopLocalDesktopShare(false).catch(() => undefined);
      if (isPermissionDeniedMediaError(err)) {
        setVoiceError("Screen share permission was denied. Allow screen capture access for Glytch Chat and try again.");
      } else {
        setVoiceError(err instanceof Error ? err.message : "Could not start screen sharing.");
      }
    } finally {
      setScreenShareBusy(false);
    }
  };

  const handleStopScreenShare = async () => {
    if (!localScreenTrackRef.current && !localScreenStreamRef.current) return;
    setScreenShareBusy(true);
    setVoiceError("");
    try {
      await stopLocalDesktopShare(true);
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : "Could not stop screen sharing.");
    } finally {
      setScreenShareBusy(false);
    }
  };

  const handleToggleWebcamShare = async () => {
    if (!voiceRoomKey) {
      setVoiceError("Join voice before starting webcam.");
      return;
    }

    setScreenShareBusy(true);
    setVoiceError("");
    try {
      if (localCameraTrackRef.current && localCameraStreamRef.current) {
        await stopLocalCameraShare(true);
        return;
      }

      const started = await startLocalCameraShare();
      if (!started) {
        throw new Error("Could not start webcam.");
      }
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : "Could not update webcam.");
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
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.88;
    source.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);
    let rafId = 0;
    let active = true;
    let smoothedLevel = 0;
    let speakingState = false;
    let holdUntilMs = 0;

    const tick = () => {
      if (!active) return;
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i += 1) sum += data[i];
      const avg = sum / data.length;
      smoothedLevel = smoothedLevel * 0.82 + avg * 0.18;
      const nowMs = Date.now();
      const activateThreshold = 19;
      const deactivateThreshold = 11;

      if (smoothedLevel >= activateThreshold) {
        speakingState = true;
        holdUntilMs = nowMs + 480;
      } else if (speakingState && smoothedLevel <= deactivateThreshold && nowMs > holdUntilMs) {
        speakingState = false;
      }

      setSpeakingUserIds((prev) => {
        const has = prev.includes(userId);
        if (speakingState && !has) return [...prev, userId];
        if (!speakingState && has) return prev.filter((id) => id !== userId);
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

  const stopMicTest = useCallback(async () => {
    const pendingRecordTimeout = micTestRecordTimeoutRef.current;
    if (typeof pendingRecordTimeout === "number") {
      window.clearTimeout(pendingRecordTimeout);
      micTestRecordTimeoutRef.current = null;
    }

    const recorder = micTestRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // Ignore stale recorder stop failures.
      }
    }
    micTestRecorderRef.current = null;

    if (micTestMeterRafRef.current) {
      window.cancelAnimationFrame(micTestMeterRafRef.current);
      micTestMeterRafRef.current = 0;
    }
    try {
      micTestMeterSourceRef.current?.disconnect();
    } catch {
      // Ignore disconnect failures.
    }
    try {
      micTestMeterAnalyserRef.current?.disconnect();
    } catch {
      // Ignore disconnect failures.
    }
    try {
      await micTestMeterAudioContextRef.current?.close();
    } catch {
      // Ignore AudioContext close failures.
    }
    micTestMeterSourceRef.current = null;
    micTestMeterAnalyserRef.current = null;
    micTestMeterAudioContextRef.current = null;

    if (micTestMonitorAudioRef.current) {
      micTestMonitorAudioRef.current.pause();
      micTestMonitorAudioRef.current.srcObject = null;
      micTestMonitorAudioRef.current = null;
    }

    micTestStreamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });
    micTestStreamRef.current = null;

    await disposeVoiceEnhancementPipeline();
    await disposeRnnoiseVoicePipeline();

    setMicTestRunning(false);
    setMicTestRecording(false);
    setMicTestLevel(0);
  }, [disposeRnnoiseVoicePipeline, disposeVoiceEnhancementPipeline]);

  const startMicTest = useCallback(async () => {
    if (voiceRoomKey) {
      setMicTestError("Leave voice chat before starting mic test.");
      return;
    }
    if (micTestBusy) return;

    setMicTestBusy(true);
    setMicTestError("");
    try {
      if (!(await ensureWindowsMediaStatus("microphone"))) {
        setMicTestRunning(false);
        return;
      }
      await stopMicTest();

      const capturedStream = await requestVoiceMicrophoneStream();
      const [capturedTrack] = capturedStream.getAudioTracks();
      if (!capturedTrack) {
        throw new Error("Microphone did not provide an audio track.");
      }
      if (capturedTrack?.applyConstraints) {
        await capturedTrack
          .applyConstraints(buildStrictVoiceAudioConstraints(voiceMicSettings))
          .catch(() =>
            capturedTrack
              .applyConstraints(buildVoiceAudioConstraints(voiceMicSettings))
              .catch(() => undefined),
          );
      }

      const rnnoiseProcessedStream = await buildRnnoiseNoiseSuppressedStream(capturedStream, voiceMicSettings);
      const enhancedBaseStream = rnnoiseProcessedStream || capturedStream;
      const voiceEnhancedStream = await buildVoiceEnhancementStream(enhancedBaseStream, voiceMicSettings);
      const micStream = voiceEnhancedStream || enhancedBaseStream;
      micTestStreamRef.current = micStream;

      const levelContext = new AudioContext({ latencyHint: "interactive", sampleRate: 48000 });
      const levelSource = levelContext.createMediaStreamSource(micStream);
      const analyser = levelContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.82;
      levelSource.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let rms = 0;
        for (let i = 0; i < data.length; i += 1) {
          const normalized = (data[i] - 128) / 128;
          rms += normalized * normalized;
        }
        rms = Math.sqrt(rms / data.length);
        const scaled = Math.max(0, Math.min(1, rms * 5.2));
        setMicTestLevel(Math.round(scaled * 100));
        micTestMeterRafRef.current = window.requestAnimationFrame(tick);
      };
      micTestMeterAudioContextRef.current = levelContext;
      micTestMeterSourceRef.current = levelSource;
      micTestMeterAnalyserRef.current = analyser;
      micTestMeterRafRef.current = window.requestAnimationFrame(tick);

      if (micTestMonitorEnabled) {
        const monitorAudio = new Audio();
        monitorAudio.autoplay = true;
        monitorAudio.muted = false;
        monitorAudio.volume = 0.85;
        monitorAudio.srcObject = micStream;
        micTestMonitorAudioRef.current = monitorAudio;
        void monitorAudio.play().catch(() => undefined);
      }

      setMicTestRunning(true);
      void refreshVoiceInputDevices();
    } catch (err) {
      await stopMicTest();
      if (isPermissionDeniedMediaError(err)) {
        setMicTestError("Microphone permission was denied. Allow microphone access for Glytch Chat and try again.");
      } else {
        setMicTestError(err instanceof Error ? err.message : "Could not start microphone test.");
      }
    } finally {
      setMicTestBusy(false);
    }
  }, [
    buildRnnoiseNoiseSuppressedStream,
    buildVoiceEnhancementStream,
    ensureWindowsMediaStatus,
    micTestBusy,
    micTestMonitorEnabled,
    refreshVoiceInputDevices,
    requestVoiceMicrophoneStream,
    stopMicTest,
    voiceMicSettings,
    voiceRoomKey,
  ]);

  const handleRecordMicSample = useCallback(async () => {
    if (!micTestRunning || !micTestStreamRef.current) {
      setMicTestError("Start mic test before recording a sample.");
      return;
    }
    if (micTestRecording) return;
    if (typeof MediaRecorder === "undefined") {
      setMicTestError("Mic sample recording is not supported in this browser/runtime.");
      return;
    }

    setMicTestError("");
    setMicTestRecording(true);
    setMicTestSampleUrl((prev) => {
      if (prev.startsWith("blob:")) {
        URL.revokeObjectURL(prev);
      }
      return "";
    });

    try {
      const stream = micTestStreamRef.current;
      if (!stream) throw new Error("Mic stream is no longer active.");

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      recorder.onerror = () => {
        setMicTestRecording(false);
        setMicTestError("Mic sample recording failed.");
      };
      recorder.onstop = () => {
        micTestRecorderRef.current = null;
        setMicTestRecording(false);
        if (chunks.length === 0) {
          setMicTestError("Recorded sample was empty.");
          return;
        }
        const sampleBlob = new Blob(chunks, { type: mimeType || "audio/webm" });
        const sampleUrl = URL.createObjectURL(sampleBlob);
        setMicTestSampleUrl((prev) => {
          if (prev.startsWith("blob:")) {
            URL.revokeObjectURL(prev);
          }
          return sampleUrl;
        });
      };

      micTestRecorderRef.current = recorder;
      recorder.start();
      micTestRecordTimeoutRef.current = window.setTimeout(() => {
        micTestRecordTimeoutRef.current = null;
        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      }, 5000);
    } catch (err) {
      setMicTestRecording(false);
      setMicTestError(err instanceof Error ? err.message : "Could not record sample.");
    }
  }, [micTestRecording, micTestRunning]);

  const closePeerConnection = useCallback((userId: string) => {
    const pendingDisconnectTimeoutId = peerDisconnectTimeoutsRef.current.get(userId);
    if (typeof pendingDisconnectTimeoutId === "number") {
      window.clearTimeout(pendingDisconnectTimeoutId);
      peerDisconnectTimeoutsRef.current.delete(userId);
    }

    const pc = peerConnectionsRef.current.get(userId);
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.close();
      peerConnectionsRef.current.delete(userId);
    }
    desktopTrackSendersRef.current.delete(userId);
    cameraTrackSendersRef.current.delete(userId);
    activeNegotiationPeerIdsRef.current.delete(userId);
    queuedNegotiationPeerIdsRef.current.delete(userId);

    const audio = remoteStreamsRef.current.get(userId);
    if (audio) {
      remoteStreamsRef.current.delete(userId);
    }
    disconnectRemoteAudioOutputNode(userId);

    const audioEl = remoteAudioElsRef.current.get(userId);
    if (audioEl) {
      audioEl.pause();
      audioEl.srcObject = null;
      remoteAudioElsRef.current.delete(userId);
    }
    const screenAudioEl = remoteScreenAudioElsRef.current.get(userId);
    if (screenAudioEl) {
      screenAudioEl.pause();
      screenAudioEl.srcObject = null;
      remoteScreenAudioElsRef.current.delete(userId);
    }
    remoteScreenAudioStreamsRef.current.delete(userId);
    remoteScreenStreamIdsRef.current.delete(userId);

    const cleanup = speakingAnalyserCleanupRef.current.get(userId);
    if (cleanup) {
      cleanup();
      speakingAnalyserCleanupRef.current.delete(userId);
    }

    const shareIdsToRemove: string[] = [];
    for (const [shareId, ownerUserId] of remoteScreenShareOwnerByIdRef.current.entries()) {
      if (ownerUserId === userId) {
        shareIdsToRemove.push(shareId);
      }
    }
    for (const shareId of shareIdsToRemove) {
      remoteScreenStreamsRef.current.delete(shareId);
      remoteScreenShareOwnerByIdRef.current.delete(shareId);
      remoteScreenShareKindByIdRef.current.delete(shareId);
      const pendingPromoteTimeoutId = remoteScreenPromoteTimeoutsRef.current.get(shareId);
      if (typeof pendingPromoteTimeoutId === "number") {
        window.clearTimeout(pendingPromoteTimeoutId);
        remoteScreenPromoteTimeoutsRef.current.delete(shareId);
      }
      const pendingDemoteTimeoutId = remoteScreenDemoteTimeoutsRef.current.get(shareId);
      if (typeof pendingDemoteTimeoutId === "number") {
        window.clearTimeout(pendingDemoteTimeoutId);
        remoteScreenDemoteTimeoutsRef.current.delete(shareId);
      }
    }
    syncRemoteScreenShareUsers();
    setRemoteVideoShareKinds((prev) => {
      if (!(userId in prev)) return prev;
      const next = { ...prev };
      delete next[userId];
      return next;
    });

    pendingCandidatesRef.current.delete(userId);
  }, [disconnectRemoteAudioOutputNode, syncRemoteScreenShareUsers]);

  const teardownVoice = useCallback(() => {
    Array.from(peerConnectionsRef.current.keys()).forEach(closePeerConnection);
    const selfCleanup = speakingAnalyserCleanupRef.current.get(currentUserId);
    if (selfCleanup) {
      selfCleanup();
      speakingAnalyserCleanupRef.current.delete(currentUserId);
    }
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    void disposeLivekitVoicePipeline();
    void disposeRnnoiseVoicePipeline();
    void disposeVoiceEnhancementPipeline();
    if (localScreenTrackRef.current) {
      localScreenTrackRef.current.onended = null;
    }
    localScreenStreamRef.current?.getTracks().forEach((track) => track.stop());
    if (localCameraTrackRef.current) {
      localCameraTrackRef.current.onended = null;
    }
    localCameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    localScreenTrackRef.current = null;
    localScreenStreamRef.current = null;
    localCameraTrackRef.current = null;
    localCameraStreamRef.current = null;
    setLocalScreenStream(null);
    setLocalCameraStream(null);
    desktopTrackSendersRef.current.clear();
    cameraTrackSendersRef.current.clear();
    for (const timeoutId of peerDisconnectTimeoutsRef.current.values()) {
      window.clearTimeout(timeoutId);
    }
    peerDisconnectTimeoutsRef.current.clear();
    activeNegotiationPeerIdsRef.current.clear();
    queuedNegotiationPeerIdsRef.current.clear();
    cameraFallbackInFlightRef.current = false;
    remoteScreenStreamsRef.current.clear();
    remoteScreenShareOwnerByIdRef.current.clear();
    remoteScreenShareKindByIdRef.current.clear();
    remoteScreenAudioStreamsRef.current.clear();
    remoteScreenStreamIdsRef.current.clear();
    for (const audioEl of remoteScreenAudioElsRef.current.values()) {
      audioEl.pause();
      audioEl.srcObject = null;
    }
    remoteScreenAudioElsRef.current.clear();
    for (const timeoutId of remoteScreenPromoteTimeoutsRef.current.values()) {
      window.clearTimeout(timeoutId);
    }
    remoteScreenPromoteTimeoutsRef.current.clear();
    for (const timeoutId of remoteScreenDemoteTimeoutsRef.current.values()) {
      window.clearTimeout(timeoutId);
    }
    remoteScreenDemoteTimeoutsRef.current.clear();
    remoteVoiceAudioSourceNodesRef.current.clear();
    remoteVoiceGainNodesRef.current.clear();
    remoteScreenAudioSourceNodesRef.current.clear();
    remoteScreenGainNodesRef.current.clear();
    const remoteOutputAudioContext = remoteOutputAudioContextRef.current;
    remoteOutputAudioContextRef.current = null;
    if (remoteOutputAudioContext) {
      void remoteOutputAudioContext.close().catch(() => undefined);
    }
    setRemoteScreenShareUserIds([]);
    setRemoteVideoShareKinds({});
    setScreenShareAudioMuted(false);
    setScreenShareBusy(false);
    pendingCandidatesRef.current.clear();
    signalSinceIdRef.current = 0;
    setSpeakingUserIds([]);
  }, [closePeerConnection, currentUserId, disposeLivekitVoicePipeline, disposeRnnoiseVoicePipeline, disposeVoiceEnhancementPipeline]);

  const stopVoiceSession = useCallback(async (notifyServer: boolean) => {
    const roomToLeave = voiceRoomKey;
    teardownVoice();
    setVoiceParticipants([]);
    setVoiceRoomKey(null);
    missingSelfParticipantCountRef.current = 0;
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
        desktopTrackSendersRef.current.set(targetUserId, senders);
      }
    }
    const localCameraStream = localCameraStreamRef.current;
    if (localCameraStream) {
      const senders: RTCRtpSender[] = [];
      localCameraStream.getTracks().forEach((streamTrack) => {
        senders.push(pc.addTrack(streamTrack, localCameraStream));
      });
      if (senders.length > 0) {
        cameraTrackSendersRef.current.set(targetUserId, senders);
      }
    }

    pc.onicecandidate = (event) => {
      if (!event.candidate || !voiceRoomKey) return;
      void sendVoiceSignal(accessToken, voiceRoomKey, currentUserId, targetUserId, "candidate", {
        candidate: event.candidate.toJSON(),
        videoShareKind: getLocalPrimaryVideoShareKind(),
      });
    };

    pc.ontrack = (event) => {
      if (event.track.kind === "audio") {
        const streamIds = event.streams.map((stream) => stream.id).filter((id) => id.length > 0);
        const knownScreenStreamIds = remoteScreenStreamIdsRef.current.get(targetUserId);
        const belongsToKnownScreenStream = Boolean(
          knownScreenStreamIds && streamIds.some((streamId) => knownScreenStreamIds.has(streamId)),
        );
        const eventStreamHasVideo = event.streams.some((stream) =>
          stream.getVideoTracks().some((videoTrack) => videoTrack.readyState !== "ended"),
        );
        const userHasActiveScreenShare = hasRemoteShareForUser(targetUserId);
        const voiceLiveTrackCount =
          remoteStreamsRef.current
            .get(targetUserId)
            ?.getAudioTracks()
            .filter((audioTrack) => audioTrack.readyState !== "ended").length || 0;
        const isLikelyScreenShareAudio =
          belongsToKnownScreenStream ||
          eventStreamHasVideo ||
          (userHasActiveScreenShare && voiceLiveTrackCount > 0);

        if (isLikelyScreenShareAudio) {
          let screenAudioStream = remoteScreenAudioStreamsRef.current.get(targetUserId);
          if (!screenAudioStream) {
            screenAudioStream = new MediaStream();
            remoteScreenAudioStreamsRef.current.set(targetUserId, screenAudioStream);
          }
          screenAudioStream.getAudioTracks().forEach((audioTrack) => {
            if (audioTrack.id !== event.track.id) {
              screenAudioStream.removeTrack(audioTrack);
            }
          });
          const hasScreenAudioTrack = screenAudioStream
            .getAudioTracks()
            .some((audioTrack) => audioTrack.id === event.track.id);
          if (!hasScreenAudioTrack) {
            screenAudioStream.addTrack(event.track);
          }
          event.track.onended = () => {
            const trackedScreenAudioStream = remoteScreenAudioStreamsRef.current.get(targetUserId);
            if (!trackedScreenAudioStream) return;
            const remainingScreenAudioTracks = trackedScreenAudioStream
              .getAudioTracks()
              .filter((audioTrack) => audioTrack.readyState !== "ended");
            if (remainingScreenAudioTracks.length > 0) return;
            const trackedScreenAudioEl = remoteScreenAudioElsRef.current.get(targetUserId);
            if (trackedScreenAudioEl) {
              trackedScreenAudioEl.pause();
              trackedScreenAudioEl.srcObject = null;
              remoteScreenAudioElsRef.current.delete(targetUserId);
            }
            remoteScreenAudioStreamsRef.current.delete(targetUserId);
          };

          let screenAudioEl = remoteScreenAudioElsRef.current.get(targetUserId);
          if (!screenAudioEl) {
            screenAudioEl = new Audio();
            screenAudioEl.autoplay = true;
            remoteScreenAudioElsRef.current.set(targetUserId, screenAudioEl);
          }
          if (screenAudioEl.srcObject !== screenAudioStream) {
            screenAudioEl.srcObject = screenAudioStream;
          }
          applyRemoteAudioOutput(targetUserId);
          void screenAudioEl.play().catch(() => undefined);
          return;
        }

        let voiceAudioStream = remoteStreamsRef.current.get(targetUserId);
        if (!voiceAudioStream) {
          voiceAudioStream = new MediaStream();
          remoteStreamsRef.current.set(targetUserId, voiceAudioStream);
        }
        voiceAudioStream.getAudioTracks().forEach((audioTrack) => {
          if (audioTrack.id !== event.track.id) {
            voiceAudioStream.removeTrack(audioTrack);
          }
        });
        const hasVoiceTrack = voiceAudioStream.getAudioTracks().some((audioTrack) => audioTrack.id === event.track.id);
        if (!hasVoiceTrack) {
          voiceAudioStream.addTrack(event.track);
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

        let voiceAudioEl = remoteAudioElsRef.current.get(targetUserId);
        if (!voiceAudioEl) {
          voiceAudioEl = new Audio();
          voiceAudioEl.autoplay = true;
          remoteAudioElsRef.current.set(targetUserId, voiceAudioEl);
        }
        if (voiceAudioEl.srcObject !== voiceAudioStream) {
          voiceAudioEl.srcObject = voiceAudioStream;
        }
        applyRemoteAudioOutput(targetUserId);
        void voiceAudioEl.play().catch(() => undefined);
        startSpeakingMeter(targetUserId, voiceAudioStream);
        return;
      }

      if (event.track.kind === "video") {
        const streamIds = event.streams.map((stream) => stream.id).filter((id) => id.length > 0);
        if (streamIds.length > 0) {
          const knownStreamIds = remoteScreenStreamIdsRef.current.get(targetUserId) || new Set<string>();
          streamIds.forEach((streamId) => {
            knownStreamIds.add(streamId);
          });
          remoteScreenStreamIdsRef.current.set(targetUserId, knownStreamIds);
        }
        const videoTrack = event.track;
        const inferredShareKind = inferVideoShareKindFromTrack(videoTrack);
        const fallbackShareKind = remoteVideoShareKinds[targetUserId] || null;
        const shareKind: LocalVideoShareKind = inferredShareKind || fallbackShareKind || "screen";
        const primaryStreamId = streamIds[0] || videoTrack.id;
        const shareId = `${targetUserId}:${primaryStreamId}`;
        remoteScreenShareOwnerByIdRef.current.set(shareId, targetUserId);
        remoteScreenShareKindByIdRef.current.set(shareId, shareKind);

        const clearPendingPromote = () => {
          const pendingTimeoutId = remoteScreenPromoteTimeoutsRef.current.get(shareId);
          if (typeof pendingTimeoutId === "number") {
            window.clearTimeout(pendingTimeoutId);
            remoteScreenPromoteTimeoutsRef.current.delete(shareId);
          }
        };
        const clearPendingDemote = () => {
          const pendingTimeoutId = remoteScreenDemoteTimeoutsRef.current.get(shareId);
          if (typeof pendingTimeoutId === "number") {
            window.clearTimeout(pendingTimeoutId);
            remoteScreenDemoteTimeoutsRef.current.delete(shareId);
          }
        };
        const getShareVideoTrackState = () => {
          const stream = remoteScreenStreamsRef.current.get(shareId);
          const streamVideoTracks = stream?.getVideoTracks() || [];
          const hasLiveVideoTrack =
            streamVideoTracks.some((track) => track.readyState !== "ended") ||
            videoTrack.readyState !== "ended";
          const hasRenderableVideoTrack =
            streamVideoTracks.some((track) => track.readyState !== "ended" && !track.muted) ||
            (videoTrack.readyState !== "ended" && !videoTrack.muted);
          return { hasLiveVideoTrack, hasRenderableVideoTrack };
        };
        const removeIfNoLiveVideo = () => {
          const { hasLiveVideoTrack } = getShareVideoTrackState();
          if (!hasLiveVideoTrack) {
            removeRemoteScreenShare(shareId);
          }
        };
        const scheduleRemoveIfNoLiveVideo = (delayMs: number) => {
          clearPendingDemote();
          const timeoutId = window.setTimeout(() => {
            remoteScreenDemoteTimeoutsRef.current.delete(shareId);
            const { hasLiveVideoTrack } = getShareVideoTrackState();
            if (!hasLiveVideoTrack) {
              removeRemoteScreenShare(shareId);
            }
          }, delayMs);
          remoteScreenDemoteTimeoutsRef.current.set(shareId, timeoutId);
        };
        const scheduleEnsureRemoteShareVisible = () => {
          clearPendingPromote();
          clearPendingDemote();
          const promoteDelayMs = remoteScreenStreamsRef.current.has(shareId)
            ? 0
            : REMOTE_SCREEN_SHARE_PROMOTE_DELAY_MS;
          const timeoutId = window.setTimeout(() => {
            remoteScreenPromoteTimeoutsRef.current.delete(shareId);
            if (videoTrack.readyState === "ended") {
              removeIfNoLiveVideo();
              return;
            }
            const hasExistingShare = remoteScreenStreamsRef.current.has(shareId);
            if (videoTrack.muted && !hasExistingShare) {
              removeIfNoLiveVideo();
              return;
            }
            const { hasRenderableVideoTrack } = getShareVideoTrackState();
            if (!hasRenderableVideoTrack && !hasExistingShare) {
              return;
            }
            const existing = remoteScreenStreamsRef.current.get(shareId);
            const hasThisTrack = existing?.getVideoTracks().some((track) => track.id === videoTrack.id) || false;
            if (!hasThisTrack) {
              remoteScreenStreamsRef.current.set(shareId, new MediaStream([videoTrack]));
            }
            syncRemoteScreenShareUsers();
          }, promoteDelayMs);
          remoteScreenPromoteTimeoutsRef.current.set(shareId, timeoutId);
        };
        videoTrack.onunmute = () => {
          scheduleEnsureRemoteShareVisible();
        };
        videoTrack.onmute = () => {
          clearPendingPromote();
          scheduleRemoveIfNoLiveVideo(REMOTE_SCREEN_SHARE_MUTE_GRACE_MS);
        };
        videoTrack.onended = () => {
          clearPendingPromote();
          scheduleRemoveIfNoLiveVideo(REMOTE_SCREEN_SHARE_ENDED_GRACE_MS);
        };
        if (!videoTrack.muted && videoTrack.readyState !== "ended") {
          scheduleEnsureRemoteShareVisible();
        } else if (videoTrack.muted) {
          if (remoteScreenStreamsRef.current.has(shareId)) {
            scheduleEnsureRemoteShareVisible();
          }
          scheduleRemoveIfNoLiveVideo(REMOTE_SCREEN_SHARE_MUTE_GRACE_MS);
        }
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "connected") {
        const pendingDisconnectTimeoutId = peerDisconnectTimeoutsRef.current.get(targetUserId);
        if (typeof pendingDisconnectTimeoutId === "number") {
          window.clearTimeout(pendingDisconnectTimeoutId);
          peerDisconnectTimeoutsRef.current.delete(targetUserId);
        }
        return;
      }

      if (state === "failed") {
        try {
          pc.restartIce();
        } catch {
          // Ignore browsers that do not support explicit ICE restart.
        }
        void renegotiatePeerConnection(targetUserId, pc);
      }

      if (state === "disconnected" || state === "failed") {
        if (!peerDisconnectTimeoutsRef.current.has(targetUserId)) {
          const timeoutId = window.setTimeout(() => {
            peerDisconnectTimeoutsRef.current.delete(targetUserId);
            const activePc = peerConnectionsRef.current.get(targetUserId);
            if (!activePc) return;
            if (activePc.connectionState === "disconnected" || activePc.connectionState === "failed") {
              closePeerConnection(targetUserId);
            }
          }, 9000);
          peerDisconnectTimeoutsRef.current.set(targetUserId, timeoutId);
        }
        return;
      }

      if (state === "closed") {
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
    getLocalPrimaryVideoShareKind,
    hasRemoteShareForUser,
    removeRemoteScreenShare,
    renegotiatePeerConnection,
    remoteVideoShareKinds,
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
      if (!(await ensureWindowsMediaStatus("microphone"))) {
        return;
      }
      await stopMicTest();
      await disposeLivekitVoicePipeline();
      await disposeRnnoiseVoicePipeline();
      await disposeVoiceEnhancementPipeline();
      await ensureSoundContext();
      const capturedStream = await requestVoiceMicrophoneStream();

      const [capturedTrack] = capturedStream.getAudioTracks();
      if (capturedTrack?.applyConstraints) {
        await capturedTrack
          .applyConstraints(buildStrictVoiceAudioConstraints(voiceMicSettings))
          .catch(() =>
            capturedTrack
              .applyConstraints(buildVoiceAudioConstraints(voiceMicSettings))
              .catch(() => undefined),
          );
      }
      if (capturedTrack?.getSettings) {
        const settings = capturedTrack.getSettings();
        if (settings.echoCancellation === false || settings.noiseSuppression === false) {
          console.warn("[voice] Microphone driver rejected AEC/NS constraints; echo may increase on speakers.", settings);
        }
      }

      if (!capturedTrack) {
        throw new Error("Microphone did not provide an audio track.");
      }

      if (capturedTrack.readyState === "ended") {
        throw new Error("Microphone track ended unexpectedly. Rejoin voice and try a different input device.");
      }

      const livekitProcessedStream = await buildLivekitNoiseSuppressedStream(capturedStream, room);
      const rnnoiseProcessedStream = livekitProcessedStream
        ? null
        : await buildRnnoiseNoiseSuppressedStream(capturedStream, voiceMicSettings);
      const enhancementInputStream = livekitProcessedStream || rnnoiseProcessedStream || capturedStream;
      const voiceEnhancedStream = await buildVoiceEnhancementStream(enhancementInputStream, voiceMicSettings);
      const stream = voiceEnhancedStream || enhancementInputStream;
      localStreamRef.current = stream;
      applyLocalVoiceMute(effectiveVoiceMuted);
      startSpeakingMeter(currentUserId, stream);
      const latestSignalIdBeforeJoin = await getLatestVoiceSignalId(accessToken, room, currentUserId).catch(() => 0);
      signalSinceIdRef.current = latestSignalIdBeforeJoin;
      await joinVoiceRoom(accessToken, room, currentUserId, effectiveVoiceMuted, voiceDeafened);
      setVoiceRoomKey(room);
      setVoiceError("");
    } catch (err) {
      teardownVoice();
      if (isPermissionDeniedMediaError(err)) {
        setVoiceError("Microphone permission was denied. Allow microphone access for Glytch Chat and try again.");
      } else {
        setVoiceError(err instanceof Error ? err.message : "Could not join voice.");
      }
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
    ? isDesktopSharing
      ? "Stopping screen share..."
      : "Starting screen share..."
    : isDesktopSharing
      ? "Stop screen share"
      : "Start screen share";
  const webcamButtonLabel = screenShareBusy
    ? isCameraSharing
      ? "Stopping webcam..."
      : "Starting webcam..."
    : isCameraSharing
      ? "Stop webcam"
      : "Start webcam";
  const activeDmIncomingCallCount =
    viewMode === "dm" && activeConversationId ? dmIncomingCallCounts[activeConversationId] || 0 : 0;
  const shouldShowJoinDmCallAction =
    viewMode === "dm" && !voiceRoomKey && activeDmIncomingCallCount > 0;
  const activeDmIncomingCallerLabel = activeDm?.friendName?.trim() || "Friend";
  const shouldShowDmIncomingCallPreviewPanel =
    viewMode === "dm" && !voiceRoomKey && shouldShowJoinDmCallAction && Boolean(activeDm);
  const activeDmIncomingCallerPresenceStatus = activeDm ? resolvePresenceForUser(activeDm.friendUserId) : "offline";
  const activeDmIncomingCallerPresenceTitle = `Status: ${presenceStatusLabel(activeDmIncomingCallerPresenceStatus)}`;
  const joinVoiceButtonLabel =
    viewMode === "dm"
      ? shouldShowJoinDmCallAction
        ? `Join ${activeDmIncomingCallerLabel}`
        : "Start Call"
      : "Join Voice";

  const canComposeInCurrentView =
    viewMode === "dm"
      ? !!activeConversationId
      : viewMode === "group"
        ? !!activeGroupChatId
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
        DEFAULT_DM_CHAT_BACKGROUND;
      return {
        ...resolveChatBackgroundStyle(background),
        "--chat-bg-from": background.from,
        "--chat-bg-to": background.to,
      } as CSSProperties;
    }
    if (viewMode === "group") {
      const personalOverride = activeGroupChatId
        ? profileForm.groupBackgroundByChat[String(activeGroupChatId)] || null
        : null;
      const background = personalOverride || DEFAULT_DM_CHAT_BACKGROUND;
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
    profileForm.dmBackgroundByConversation,
    profileForm.groupBackgroundByChat,
    profileForm.glytchBackgroundFrom,
    profileForm.glytchBackgroundTo,
    activeGroupChatId,
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

  const contextMenuMessage = useMemo(() => {
    if (!messageContextMenu) return null;
    return messages.find((message) => message.id === messageContextMenu.messageId) || null;
  }, [messageContextMenu, messages]);

  const renderedMessageRows = useMemo(
    () => {
      const visibleMessages =
        (messages.length > MAX_RENDERED_MESSAGES ? messages.slice(messages.length - MAX_RENDERED_MESSAGES) : messages)
          .filter((msg) => !(viewMode === "dm" && dismissedDmMessageIds[msg.id]))
          .filter((msg) => {
            if (viewMode !== "dm" || !dmMessageSearchQuery) return true;
            const searchableText = `${msg.senderName} ${msg.text || ""}`.toLowerCase();
            return searchableText.includes(dmMessageSearchQuery);
          });
      const rows: ReactNode[] = [];
      const shouldRenderDateDividers = viewMode === "dm";
      let previousDateDividerKey = "";
      for (const msg of visibleMessages) {
        const currentDateDividerKey = messageDateKey(msg.timestamp);
        if (shouldRenderDateDividers && currentDateDividerKey !== previousDateDividerKey) {
          previousDateDividerKey = currentDateDividerKey;
          rows.push(
            <div key={`date-divider-${currentDateDividerKey}-${msg.id}`} className="messageDateDivider" data-message-date-divider="true">
              <span>{formatMessageDateDivider(msg.timestamp)}</span>
            </div>,
          );
        }

        const invitePayload = viewMode === "dm" ? parseGlytchInviteMessage(msg.text || "") : null;
        const replyPayload = viewMode === "dm" ? parseDmReplyMessage(msg.text || "") : null;
        const messageBodyText = replyPayload ? replyPayload.body : msg.text;
        const isEditingMessage = editingMessageId === msg.id && msg.sender === "me" && !invitePayload;
        rows.push(
          <article
            key={msg.id}
            className={`messageRow ${msg.sender === "me" ? "fromMe" : "fromOther"}`}
            data-dm-message-row="true"
            data-message-id={msg.id}
            data-sender={msg.sender}
          >
            <span className="messageAvatar" aria-hidden="true">
              {msg.senderAvatarUrl ? <img src={msg.senderAvatarUrl} alt="" /> : <span>{initialsFromName(msg.senderName)}</span>}
            </span>
              <div className="messageContent">
                {msg.sender !== "me" && <p className="senderName">{msg.senderName}</p>}
              <div
                className="messageBody"
                data-dm-message-body="true"
              >
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
                  <>
                    {replyPayload && (
                      <div className="messageReplyBlock">
                        <p className="messageReplyLabel">Replying to {replyPayload.replyToSenderName}</p>
                        <p className="messageReplyText">{replyPayload.replyPreview}</p>
                      </div>
                    )}
                    {isEditingMessage ? (
                      <form
                        className="messageEditForm"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void handleSaveMessageEdit();
                        }}
                      >
                        <input
                          value={editingMessageDraft}
                          onChange={(event) => setEditingMessageDraft(event.target.value)}
                          autoFocus
                          maxLength={4000}
                          disabled={messageEditBusy}
                          aria-label="Edit message text"
                        />
                        <div className="messageEditActions">
                          <button type="submit" disabled={messageEditBusy || !editingMessageDraft.trim()}>
                            {messageEditBusy ? "Saving..." : "Save"}
                          </button>
                          <button type="button" className="ghostButton" onClick={handleCancelMessageEdit} disabled={messageEditBusy}>
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      messageBodyText && <div className="msg">{messageBodyText}</div>
                    )}
                  </>
                )}
                {msg.attachmentUrl && (
                  <a href={msg.attachmentUrl} target="_blank" rel="noreferrer" className="messageMediaLink">
                    {msg.attachmentType === "gif" ? (
                      <HoverGifImage
                        src={msg.attachmentUrl}
                        alt={`${msg.senderName} attachment`}
                        className="messageMedia gif"
                        onError={() => {
                          void handleMessageAttachmentLoadError(msg.id, msg.attachmentUrl);
                        }}
                      />
                    ) : (
                      <img
                        src={msg.attachmentUrl}
                        alt={`${msg.senderName} attachment`}
                        className="messageMedia"
                        loading="lazy"
                        onError={() => {
                          void handleMessageAttachmentLoadError(msg.id, msg.attachmentUrl);
                        }}
                      />
                    )}
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
                {viewMode !== "dm" && (
                  <>
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
                  </>
                )}
              </div>
              <div className="msgMeta">
                <time className="msgTime">{shouldRenderDateDividers ? formatMessageTimestamp(msg.timestamp) : formatTime(msg.timestamp)}</time>
                {msg.editedAt && <span className="msgEdited">(edited)</span>}
                {msg.sender === "me" && latestSeenOutgoingMessageId === msg.id && <span className="msgSeen">Seen</span>}
              </div>
            </div>
          </article>,
        );
      }
      return rows;
    },
    [
      editingMessageDraft,
      editingMessageId,
      handleJoinInviteFromDmMessage,
      handleCancelMessageEdit,
      dismissedDmMessageIds,
      handleRejectInviteFromDmMessage,
      handleSaveMessageEdit,
      handleMessageAttachmentLoadError,
      handleToggleMessageReaction,
      joinInviteBusyMessageId,
      latestSeenOutgoingMessageId,
      messageEditBusy,
      messages,
      dmMessageSearchQuery,
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
  const viewedAccent = typeof viewedTheme.accentColor === "string" ? viewedTheme.accentColor : "#4e8cff";
  const viewedFrom = typeof viewedTheme.backgroundFrom === "string" ? viewedTheme.backgroundFrom : "#101b2f";
  const viewedTo = typeof viewedTheme.backgroundTo === "string" ? viewedTheme.backgroundTo : "#0a111f";
  const viewedCardStyle = viewedTheme.cardStyle === "solid" ? "solid" : "glass";
  const viewedProfileNameColor =
    typeof viewedTheme.profileNameColor === "string" ? viewedTheme.profileNameColor : DEFAULT_PROFILE_NAME_COLOR;
  const viewedProfileBodyColor =
    typeof viewedTheme.profileBodyColor === "string" ? viewedTheme.profileBodyColor : DEFAULT_PROFILE_BODY_COLOR;
  const viewedShowcaseAccentColor =
    typeof viewedTheme.showcaseAccentColor === "string" ? viewedTheme.showcaseAccentColor : DEFAULT_SHOWCASE_ACCENT_COLOR;
  const viewedShowcaseLayout = normalizeProfileShowcaseLayout(viewedTheme.showcaseLayout);
  const viewedShowcaseCardStyle = normalizeProfileShowcaseCardStyle(viewedTheme.showcaseCardStyle);
  const viewedProfileCommentsVisibility = normalizeProfileCommentsVisibility(viewedTheme.profileCommentsVisibility);
  const viewedAvatarDecoration = normalizeAvatarDecoration(viewedTheme.avatarDecoration);
  const viewedAvatarDecorationColor =
    typeof viewedTheme.avatarDecorationColor === "string" ? viewedTheme.avatarDecorationColor : DEFAULT_AVATAR_DECORATION_COLOR;
  const viewedAvatarDecorationBackground =
    typeof viewedTheme.avatarDecorationBackground === "string"
      ? viewedTheme.avatarDecorationBackground
      : DEFAULT_AVATAR_DECORATION_BG;
  const viewedDisplayName = viewedProfile?.display_name || viewedProfile?.username || "User";
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
  const viewedCanSeeProfileComments =
    viewedIsSelf ||
    viewedProfileCommentsVisibility === "public" ||
    (viewedProfileCommentsVisibility === "friends" && viewedIsFriend);
  const viewedCanWriteProfileComments =
    Boolean(viewedProfileUserId) &&
    viewedProfileCommentsVisibility !== "off" &&
    (viewedProfileCommentsVisibility === "public" ||
      (viewedProfileCommentsVisibility === "friends" && (viewedIsSelf || viewedIsFriend)) ||
      (viewedProfileCommentsVisibility === "private" && viewedIsSelf));
  const viewedProfileCommentsVisibilitySummary = viewedIsSelf
    ? viewedProfileCommentsVisibility === "off"
      ? "Comments are off."
      : viewedProfileCommentsVisibility === "private"
        ? "Comments are private."
        : viewedProfileCommentsVisibility === "friends"
          ? "Comments are friends-only."
          : "Comments are public."
    : "";
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
  const hydrateProfileComments = useCallback(
    async (profileUserId: string): Promise<ProfileCommentWithAuthor[]> => {
      const rows: ProfileComment[] = await listProfileComments(accessToken, profileUserId);
      if (rows.length === 0) {
        return [];
      }

      const authorIds = Array.from(new Set(rows.map((row) => row.author_user_id)));
      const authorProfiles = authorIds.length > 0 ? await fetchProfilesByIds(accessToken, authorIds) : [];
      if (authorProfiles.length > 0) {
        setKnownProfiles((prev) => ({
          ...prev,
          ...Object.fromEntries(authorProfiles.map((profile) => [profile.user_id, profile])),
        }));
      }
      const profileMap = new Map<string, Profile>(authorProfiles.map((profile) => [profile.user_id, profile]));
      return rows.map((row) => {
        const authorProfile = profileMap.get(row.author_user_id);
        return {
          id: row.id,
          profileUserId: row.profile_user_id,
          authorUserId: row.author_user_id,
          content: row.content,
          createdAt: row.created_at,
          authorName: authorProfile?.display_name || authorProfile?.username || "User",
          authorAvatarUrl: authorProfile?.avatar_url || "",
        };
      });
    },
    [accessToken],
  );
  useEffect(() => {
    if (!viewedProfileUserId || !viewedCanSeeProfileComments) {
      setViewedProfileComments([]);
      setViewedProfileCommentsLoading(false);
      setViewedProfileCommentsError("");
      setViewedProfileCommentDraft("");
      setViewedProfileCommentDeleteId(null);
      return;
    }

    let mounted = true;
    setViewedProfileCommentsLoading(true);
    setViewedProfileCommentsError("");
    setViewedProfileCommentDraft("");
    setViewedProfileCommentDeleteId(null);

    void hydrateProfileComments(viewedProfileUserId)
      .then((nextComments) => {
        if (!mounted) return;
        setViewedProfileComments(nextComments);
      })
      .catch((err) => {
        if (!mounted) return;
        setViewedProfileComments([]);
        setViewedProfileCommentsError(err instanceof Error ? err.message : "Could not load profile comments.");
      })
      .finally(() => {
        if (!mounted) return;
        setViewedProfileCommentsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [hydrateProfileComments, viewedCanSeeProfileComments, viewedProfileUserId]);
  const handleSubmitViewedProfileComment = useCallback(async () => {
    if (!viewedProfileUserId || !viewedCanWriteProfileComments) return;
    const trimmed = viewedProfileCommentDraft.trim();
    if (!trimmed) return;
    if (trimmed.length > PROFILE_COMMENT_MAX_LENGTH) {
      setViewedProfileCommentsError(`Comment must be ${PROFILE_COMMENT_MAX_LENGTH} characters or less.`);
      return;
    }

    setViewedProfileCommentBusy(true);
    setViewedProfileCommentsError("");
    try {
      await createProfileComment(accessToken, viewedProfileUserId, trimmed);
      const nextComments = await hydrateProfileComments(viewedProfileUserId);
      setViewedProfileComments(nextComments);
      setViewedProfileCommentDraft("");
    } catch (err) {
      setViewedProfileCommentsError(err instanceof Error ? err.message : "Could not post comment.");
    } finally {
      setViewedProfileCommentBusy(false);
    }
  }, [
    accessToken,
    hydrateProfileComments,
    viewedCanWriteProfileComments,
    viewedProfileCommentDraft,
    viewedProfileUserId,
  ]);
  const handleDeleteViewedProfileComment = useCallback(
    async (commentId: number) => {
      setViewedProfileCommentsError("");
      setViewedProfileCommentDeleteId(commentId);
      try {
        await deleteProfileComment(accessToken, commentId);
        setViewedProfileComments((prev) => prev.filter((comment) => comment.id !== commentId));
      } catch (err) {
        setViewedProfileCommentsError(err instanceof Error ? err.message : "Could not delete comment.");
      } finally {
        setViewedProfileCommentDeleteId((prev) => (prev === commentId ? null : prev));
      }
    },
    [accessToken],
  );
  const previewShowcases = profileForm.showcases;
  const showcaseLimitReached = profileForm.showcases.length >= SHOWCASE_MAX_MODULES;
  const voiceSpeakingRingColor = profileForm.speakingRingColor.trim() || "#00ffff";
  const appThemePalette =
    APP_THEME_PALETTES[profileForm.appThemeMode]?.[profileForm.appTheme] || APP_THEME_PALETTES.dark.simplistic;
  const appFontPreset = APP_FONT_PRESET_STYLES[profileForm.appFontPreset] || APP_FONT_PRESET_STYLES.cyber;
  const appTextColorRaw = profileForm.appTextColor.trim() || appThemePalette.text;
  const appTextColor = ensureReadableTextColor(
    appTextColorRaw,
    appThemePalette.text,
    [appThemePalette.bg, appThemePalette.panel, appThemePalette.card, appThemePalette.bubbleBot, appThemePalette.bubbleMe],
    profileForm.appThemeMode === "light" ? 4.8 : 4.2,
  );
  const effectiveUiFont = profileForm.accessibilityDyslexiaFont
    ? '"Atkinson Hyperlegible", "Manrope", "Avenir Next", "Segoe UI", sans-serif'
    : appFontPreset.ui;
  const effectiveDisplayFont = profileForm.accessibilityDyslexiaFont
    ? '"Atkinson Hyperlegible", "Sora", "Manrope", sans-serif'
    : appFontPreset.display;
  const highContrastTextColor = profileForm.accessibilityHighContrast
    ? profileForm.appThemeMode === "light"
      ? "#17242d"
      : "#f4f7f9"
    : appTextColor;
  const highContrastPanelBorder = profileForm.accessibilityHighContrast
    ? profileForm.appThemeMode === "light"
      ? "#2f404d"
      : "#85ebd9"
    : appThemePalette.panelBorder;
  const highContrastCardBorder = profileForm.accessibilityHighContrast
    ? profileForm.appThemeMode === "light"
      ? "#2f404d"
      : "#85ebd9"
    : appThemePalette.cardBorder;
  const accentColorParsed = parseHexColor(appThemePalette.accent);
  const darkAccentText = parseHexColor("#0b0f1a");
  const lightAccentText = parseHexColor("#f3f4f6");
  const textOnAccentColor =
    accentColorParsed && darkAccentText && lightAccentText
      ? contrastRatio(darkAccentText, accentColorParsed) >= contrastRatio(lightAccentText, accentColorParsed)
        ? "#0b0f1a"
        : "#f3f4f6"
      : profileForm.appThemeMode === "light"
        ? "#15262d"
        : "#f3f4f6";
  const pageStyle = useMemo(
    () =>
      ({
        colorScheme: profileForm.appThemeMode,
        fontSize: `${profileForm.accessibilityTextScale}%`,
        "--voice-speaking-ring-color": voiceSpeakingRingColor,
        "--font-ui": effectiveUiFont,
        "--font-display": effectiveDisplayFont,
        "--bg": appThemePalette.bg,
        "--panel": appThemePalette.panel,
        "--panel-border": highContrastPanelBorder,
        "--text": highContrastTextColor,
        "--muted": appThemePalette.muted,
        "--accent": appThemePalette.accent,
        "--accent-strong": appThemePalette.accentStrong,
        "--card": appThemePalette.card,
        "--card-border": highContrastCardBorder,
        "--bubble-bot": appThemePalette.bubbleBot,
        "--bubble-me": appThemePalette.bubbleMe,
        "--hot": appThemePalette.hot,
        "--orange": appThemePalette.orange,
        "--warn": appThemePalette.warn,
        "--violet": appThemePalette.violet,
        "--text-on-accent": textOnAccentColor,
      }) as CSSProperties,
    [
      appThemePalette,
      effectiveDisplayFont,
      effectiveUiFont,
      highContrastCardBorder,
      highContrastPanelBorder,
      highContrastTextColor,
      profileForm.accessibilityTextScale,
      profileForm.appThemeMode,
      textOnAccentColor,
      voiceSpeakingRingColor,
    ],
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
            const host = extractShowcaseLinkHost(href);
            return (
              <li key={`${showcase.id}:${entry}`}>
                <a href={href} target="_blank" rel="noreferrer">
                  {parsed.label}
                </a>
                {host && <small className="profileShowcaseLinkHost">{host}</small>}
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
            const progress = parseShowcaseStatProgress(parsed.value);
            return (
              <div key={`${showcase.id}:${entry}`} className="profileShowcaseStatItem">
                <p className="profileShowcaseStatRow">
                  <span>{parsed.label || "Stat"}</span>
                  <strong>{parsed.value || "-"}</strong>
                </p>
                {progress !== null && (
                  <span className="profileShowcaseStatMeter" aria-hidden="true">
                    <span style={{ width: `${progress}%` }} />
                  </span>
                )}
              </div>
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

  const renderProfileShowcaseList = (
    showcases: ProfileShowcase[],
    options: {
      layout: ProfileShowcaseLayout;
      cardStyle: ProfileShowcaseCardStyle;
      accentColor: string;
    },
  ) => {
    if (showcases.length === 0) {
      return <p className="smallMuted">No showcases yet.</p>;
    }

    return (
      <div className={`profileShowcaseList ${options.layout === "stack" ? "stack" : "grid"}`}>
        {showcases.map((showcase) => (
          <section
            key={showcase.id}
            className={`profileShowcaseCard showcaseStyle-${options.cardStyle}`}
            style={{ "--profile-showcase-accent": options.accentColor } as CSSProperties}
          >
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
    setGlytchDirectoryTab("my");
    setActiveGlytchId(null);
    setActiveChannelId(null);
    setMessages([]);
    setChatError("");
    setJoinBannedGlytchId(null);
    setJoinUnbanRequestDraft("");
    setJoinUnbanRequestNotice("");
    setGlytchBotSettings(null);
    setGlytchBotBlockedWordsDraft("");
    setGlytchBotWebhookDraft("");
    setGlytchBotSettingsError("");
    setGlytchBotSettingsNotice("");
    setShowQuickThemeEditor(false);
  }, []);

  const openSettingsView = useCallback(
    (section: SettingsSection = "profile", tab?: SettingsTab) => {
      setSettingsSection(section);
      if (tab) {
        setSettingsTab(tab);
      } else {
        setSettingsTab(section === "profile" ? "edit" : "updates");
      }
      setViewMode("settings");
    },
    [],
  );
  const useUnifiedSidebar = true;

  const pageClassName = [
    "page",
    profileForm.accessibilityReduceMotion ? "a11yReduceMotion" : "",
    profileForm.accessibilityUnderlineLinks ? "a11yUnderlineLinks" : "",
    profileForm.accessibilityHighContrast ? "a11yHighContrast" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={pageClassName} style={pageStyle}>
      <aside className="sidemenu">
        {!useUnifiedSidebar && (
          <>
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
            onClick={() => {
              setDmNavContextMenu(null);
              setViewMode("dm");
            }}
            onContextMenu={openDmNavContextMenu}
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
              {totalDmAlertCount > 0 && <span className="navUnreadBadge">{totalDmAlertLabel}</span>}
            </span>
            <span>DMs</span>
          </button>
          {dmNavContextMenu && (
            <div
              className="dmNavContextMenu"
              role="menu"
              aria-label="DM options"
              style={{ left: dmNavContextMenu.x, top: dmNavContextMenu.y }}
              onPointerDown={(event) => event.stopPropagation()}
              onContextMenu={(event) => event.preventDefault()}
            >
              <button
                type="button"
                className="dmNavContextMenuItem"
                role="menuitem"
                onClick={() => void handleMarkAllDmsSeenFromNavContextMenu()}
                disabled={dmSidebarActionBusyKey === "seen-all" || Object.values(unreadDmCounts).every((count) => (count || 0) <= 0)}
              >
                Mark all as seen
              </button>
            </div>
          )}
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
          <button
            className={viewMode === "group" ? "navOption active" : "navOption"}
            type="button"
            onClick={() => setViewMode("group")}
          >
            <span className="navOptionIcon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="presentation">
                <circle cx="8" cy="9" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="16" cy="9" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <path
                  d="M4.5 18.5c.6-2.4 2.1-4.3 3.5-4.3h8c1.4 0 2.9 1.9 3.5 4.3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span>Group Chats</span>
          </button>
          <button
            className={viewMode === "patch-notes" ? "navOption active" : "navOption"}
            type="button"
            onClick={() => setViewMode("patch-notes")}
          >
            <span className="navOptionIcon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="presentation">
                <path
                  d="M6 4.5h9l3 3V19a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 19V6A1.5 1.5 0 0 1 6.5 4.5Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <path d="M9 10h6M9 13h6M9 16h4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
            <span>Patch Notes</span>
          </button>

          <div className="railIdentity">
            <button
              className="railSystemButton"
              type="button"
              aria-label="Open system settings"
              title="System settings"
              onClick={() => openSettingsView("system", "updates")}
            >
              <AppGlyphIcon kind="settings" size="medium" />
            </button>
            <button
              className="avatarButton railAvatarButton withPresence"
              type="button"
              title={`Status: ${currentUserPresenceLabel}`}
              onClick={() => openSettingsView("profile", "edit")}
            >
              <span className="avatarButtonMedia">
                {sidebarAvatar ? (
                  <img src={sidebarAvatar} alt="Profile" />
                ) : (
                  <span>{initialsFromName(displayName)}</span>
                )}
              </span>
              {renderAvatarDecoration(profileForm.avatarDecoration, {
                color: profileForm.avatarDecorationColor,
                background: profileForm.avatarDecorationBackground,
                size: "small",
              })}
              <span className={`presenceDot ${currentUserPresenceStatus}`} aria-hidden="true" />
            </button>

            <div className="identityCard railIdentityPopover">
              <button
                className="avatarButton withPresence"
                type="button"
                title={`Status: ${currentUserPresenceLabel}`}
                onClick={() => openSettingsView("profile", "edit")}
              >
                <span className="avatarButtonMedia">
                  {sidebarAvatar ? (
                    <img src={sidebarAvatar} alt="Profile" />
                  ) : (
                    <span>{initialsFromName(displayName)}</span>
                  )}
                </span>
                {renderAvatarDecoration(profileForm.avatarDecoration, {
                  color: profileForm.avatarDecorationColor,
                  background: profileForm.avatarDecorationBackground,
                  size: "small",
                })}
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
                <button className="settingsLink" type="button" onClick={() => openSettingsView("profile", "edit")}>
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
                          <p>{req.sender_profile?.display_name || req.sender_profile?.username || "User"}</p>
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
                            {req.receiver_profile?.display_name || req.receiver_profile?.username || "User"}
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
                  <nav className="channelList" aria-label="Direct messages" ref={dmSidebarListRef}>
                    <p className="sectionLabel">Direct Messages</p>
                    <div className="dmSearchRow">
                      <input
                        className="dmSearchInput"
                        value={dmSearchDraft}
                        onChange={(e) => setDmSearchDraft(e.target.value)}
                        placeholder="Search direct messages"
                        aria-label="Search direct messages"
                      />
                    </div>
                    {sortedDms.length === 0 && <p className="smallMuted">No DMs yet</p>}
                    {sortedDms.length > 0 && filteredDms.length === 0 && (
                      <p className="smallMuted">No direct messages matched your search.</p>
                    )}
                    {filteredDms.map((dm) => {
                      const unreadCount = unreadDmCounts[dm.conversationId] || 0;
                      const unreadLabel = unreadCount > 99 ? "99+" : String(unreadCount);
                      const incomingCallCount = dmIncomingCallCounts[dm.conversationId] || 0;
                      const isDmMuted = mutedDmConversationIdSet.has(dm.conversationId);
                      const dmPresenceStatus = resolvePresenceForUser(dm.friendUserId);
                      const dmPresenceTitle = `Status: ${presenceStatusLabel(dmPresenceStatus)}`;
                      return (
                        <div
                          key={dm.conversationId}
                          className="friendRow"
                          onContextMenu={(event) => {
                            openDmSidebarContextMenu(
                              event,
                              dm.conversationId,
                              unreadCount,
                              dm.isPinned,
                              isDmMuted,
                            );
                          }}
                        >
                          <button
                            className="friendAvatarButton"
                            type="button"
                            aria-label={`View ${dm.friendName} profile`}
                            onClick={() => {
                              setDmSidebarContextMenu(null);
                              void openProfileViewer(dm.friendUserId);
                            }}
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
                            onClick={() => {
                              handleOpenDmConversation(dm.conversationId, unreadCount);
                            }}
                          >
                            <span className="dmNameRow">
                              <span className="dmNameText">{dm.friendName}</span>
                              {dm.isPinned && <span className="dmPinnedBadge" title="Pinned DM" aria-hidden="true" />}
                              {isDmMuted && <span className="dmMutedBadge" title="Conversation muted" aria-hidden="true">🔕</span>}
                            </span>
                            {(incomingCallCount > 0 || unreadCount > 0) && (
                              <span className="dmAlertBubbles">
                                {incomingCallCount > 0 && (
                                  <span
                                    className="callBubble"
                                    aria-label={`${dm.friendName} is calling`}
                                    title={`${dm.friendName} is calling`}
                                  >
                                    <svg viewBox="0 0 24 24" role="presentation" aria-hidden="true">
                                      <path
                                        d="M7.4 3.8h3.2l1.3 3.5-1.8 1.5a12.3 12.3 0 0 0 5.1 5.1l1.5-1.8 3.5 1.3v3.2l-2.2.8c-1.1.4-2.3.4-3.3-.1a17.3 17.3 0 0 1-8-8 3.6 3.6 0 0 1-.1-3.3l.8-2.2Z"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  </span>
                                )}
                                {unreadCount > 0 && <span className="unreadBubble">{unreadLabel}</span>}
                              </span>
                            )}
                          </button>
                        </div>
                      );
                    })}
                    {dmSidebarContextMenu && (
                      <div
                        className="dmSidebarContextMenu"
                        role="menu"
                        aria-label="Direct message options"
                        style={{ left: dmSidebarContextMenu.x, top: dmSidebarContextMenu.y }}
                        onPointerDown={(event) => event.stopPropagation()}
                        onContextMenu={(event) => event.preventDefault()}
                      >
                        <button
                          type="button"
                          className="dmSidebarContextMenuItem"
                          role="menuitem"
                          onClick={() => void handleMarkDmSeenFromSidebarContextMenu()}
                          disabled={
                            dmSidebarContextMenu.unreadCount === 0 ||
                            dmSidebarActionBusyKey === `seen:${dmSidebarContextMenu.conversationId}`
                          }
                        >
                          Mark as seen
                        </button>
                        <button
                          type="button"
                          className="dmSidebarContextMenuItem"
                          role="menuitem"
                          onClick={() => void handleTogglePinDmFromSidebarContextMenu()}
                          disabled={dmSidebarActionBusyKey === `pin:${dmSidebarContextMenu.conversationId}`}
                        >
                          {dmSidebarContextMenu.isPinned ? "Unpin DM" : "Pin DM"}
                        </button>
                        <button
                          type="button"
                          className="dmSidebarContextMenuItem"
                          role="menuitem"
                          onClick={() => void handleToggleMuteDmFromSidebarContextMenu()}
                          disabled={dmSidebarActionBusyKey === `mute:${dmSidebarContextMenu.conversationId}`}
                        >
                          {dmSidebarContextMenu.isMuted ? "Unmute conversation" : "Mute conversation"}
                        </button>
                        <button
                          type="button"
                          className="dmSidebarContextMenuItem danger"
                          role="menuitem"
                          onClick={() => void handleDeleteDmFromSidebarContextMenu()}
                          disabled={dmSidebarActionBusyKey === `delete:${dmSidebarContextMenu.conversationId}`}
                        >
                          Delete DM
                        </button>
                      </div>
                    )}
                  </nav>
                )}
              </>
            ) : viewMode === "group" ? (
              <>
                {groupError && <p className="chatError">{groupError}</p>}

                <section className="requestSection">
                  <p className="sectionLabel">Create Group Chat</p>
                  <form className="stackedForm" onSubmit={handleCreateGroupChat}>
                    <input
                      value={groupNameDraft}
                      onChange={(e) => setGroupNameDraft(e.target.value)}
                      placeholder="Group chat name"
                      aria-label="Group chat name"
                      disabled={groupCreateBusy}
                    />
                    <div className="glytchInviteList" aria-label="Select group members">
                      {dms.length === 0 ? (
                        <p className="smallMuted">Add friends first to include them in a group chat.</p>
                      ) : (
                        dms.map((dm) => (
                          <label key={dm.friendUserId} className="permissionToggle">
                            <input
                              type="checkbox"
                              checked={groupCreateMemberIds.includes(dm.friendUserId)}
                              onChange={(e) => handleToggleGroupCreateMember(dm.friendUserId, e.target.checked)}
                              disabled={groupCreateBusy}
                            />
                            <span>{dm.friendName}</span>
                          </label>
                        ))
                      )}
                    </div>
                    <button type="submit" disabled={groupCreateBusy}>
                      {groupCreateBusy ? "Creating..." : "Create Group Chat"}
                    </button>
                  </form>
                </section>

                <nav className="channelList" aria-label="Group chats">
                  <p className="sectionLabel">Group Chats</p>
                  {groupChats.length === 0 && <p className="smallMuted">No group chats yet</p>}
                  {groupChats.map((chat) => {
                    const unreadCount = unreadGroupCounts[chat.groupChatId] || 0;
                    const unreadLabel = unreadCount > 99 ? "99+" : String(unreadCount);
                    const memberCount = chat.members.length;
                    return (
                      <button
                        key={chat.groupChatId}
                        className={chat.groupChatId === activeGroupChatId ? "channelItem friendItem active" : "channelItem friendItem"}
                        type="button"
                        onClick={() => setActiveGroupChatId(chat.groupChatId)}
                      >
                        <span>{chat.name}</span>
                        <span className="smallMuted">{memberCount} member{memberCount === 1 ? "" : "s"}</span>
                        {unreadCount > 0 && <span className="unreadBubble">{unreadLabel}</span>}
                      </button>
                    );
                  })}
                </nav>

                {activeGroupChat && (
                  <section className="requestSection">
                    <p className="sectionLabel">Members</p>
                    <p className="smallMuted">
                      {activeGroupChat.members
                        .map((member) => {
                          const profile = knownProfiles[member.user_id];
                          return profile?.display_name || profile?.username || "User";
                        })
                        .join(", ")}
                    </p>
                    <form className="requestActions groupMemberAddForm" onSubmit={handleAddMemberToActiveGroup}>
                      <select
                        value={groupAddMemberId}
                        onChange={(e) => setGroupAddMemberId(e.target.value)}
                        aria-label="Friend to add"
                        disabled={groupAddMemberBusy || availableFriendsForActiveGroup.length === 0}
                      >
                        {availableFriendsForActiveGroup.length === 0 ? (
                          <option value="">No friends available</option>
                        ) : (
                          availableFriendsForActiveGroup.map((dm) => (
                            <option key={dm.friendUserId} value={dm.friendUserId}>
                              {dm.friendName}
                            </option>
                          ))
                        )}
                      </select>
                      <button
                        type="submit"
                        disabled={groupAddMemberBusy || !groupAddMemberId || availableFriendsForActiveGroup.length === 0}
                      >
                        {groupAddMemberBusy ? "Adding..." : "Add Member"}
                      </button>
                    </form>
                  </section>
                )}
              </>
            ) : viewMode === "patch-notes" ? (
              <section className="requestSection">
                <p className="sectionLabel">Versions</p>
                <div className="patchNotesSidebarVersions">
                  {PATCH_NOTES.map((entry) => (
                    <button
                      key={`sidebar-patch-${entry.version}`}
                      className={selectedPatchNoteVersion === entry.version ? "channelItem friendItem active" : "channelItem friendItem"}
                      type="button"
                      onClick={() => setSelectedPatchNoteVersion(entry.version)}
                    >
                      <span>v{entry.version}</span>
                    </button>
                  ))}
                </div>
              </section>
            ) : viewMode === "glytch" || viewMode === "glytch-settings" ? (
              <>
                {glytchError && <p className="chatError">{glytchError}</p>}

                {(showGlytchDirectory || !activeGlytch) && (
                  <section className="requestSection glytchSidebarDirectory">
                    <p className="sectionLabel">My Glytches</p>
                    <input
                      className="glytchInviteSearch"
                      value={glytchSidebarSearchDraft}
                      onChange={(e) => setGlytchSidebarSearchDraft(e.target.value)}
                      placeholder="Search your Glytches by name or #id"
                      aria-label="Search your Glytches by name or ID"
                    />
                    {filteredSidebarGlytches.length === 0 ? (
                      <p className="smallMuted">No Glytches matched your search.</p>
                    ) : (
                      <div className="glytchSelectionList">
                        {filteredSidebarGlytches.map((glytch) => {
                          const isSelected = !showGlytchDirectory && activeGlytchId === glytch.id;
                          const isPublic = Boolean(glytch.is_public);
                          const maxMembersLabel =
                            typeof glytch.max_members === "number" && Number.isFinite(glytch.max_members)
                              ? ` · max ${Math.trunc(glytch.max_members)}`
                              : "";
                          return (
                            <button
                              key={`sidebar-glytch-${glytch.id}`}
                              className={isSelected ? "channelItem glytchSelectionItem active" : "channelItem glytchSelectionItem"}
                              type="button"
                              onClick={() => {
                                setActiveGlytchId(glytch.id);
                                setActiveChannelId(null);
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
                              <span className="smallMuted">{isPublic ? "Public" : "Private"}{maxMembersLabel}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </section>
                )}

                {showGlytchDirectory || !activeGlytch ? (
                  <>
                    <section className="requestSection">
                      <p className="smallMuted">Browse public Glytches in Discover from the main panel.</p>
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
                          <img src={settingsIconAssetUrl} alt="" aria-hidden="true" />
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
          </>
        )}

        {useUnifiedSidebar && (
          <div className="unifiedSidebarFlow">
            <div className="unifiedSidebarTopBar">
              <button
                type="button"
                className="unifiedSidebarBrandButton"
                onClick={() => {
                  setUnifiedSidebarView("dms");
                  setViewMode("dm");
                  setDmPanelMode("dms");
                  setActiveConversationId(null);
                }}
                aria-label="Open direct messages"
                title="Glytch Chat"
              >
                <span className="unifiedSidebarBrandLogo" aria-hidden="true">
                  <img src={logoAssetUrl} alt="" />
                </span>
                <span className="unifiedSidebarBrandName">Glytch Chat</span>
              </button>
              <input
                className="unifiedSidebarGlobalSearch"
                value={unifiedSidebarSearchDraft}
                onChange={(e) => setUnifiedSidebarSearchDraft(e.target.value)}
                placeholder="Search this panel"
                aria-label="Search the left panel"
              />
              <button
                type="button"
                className={dmPanelMode === "friends" ? "railSystemButton active unifiedSidebarFriendsToggle" : "railSystemButton unifiedSidebarFriendsToggle"}
                aria-label="Open friends"
                title="Friends"
                onClick={() => {
                  setUnifiedSidebarView("dms");
                  setViewMode("dm");
                  setActiveConversationId(null);
                  setDmPanelMode((prev) => (prev === "friends" ? "dms" : "friends"));
                }}
              >
                <AppGlyphIcon kind="friends" size="medium" />
              </button>
            </div>

            <nav className="unifiedSidebarNavList" aria-label="Primary sections">
              {viewMode === "settings" ? (
                <>
                  <button
                    type="button"
                    className={settingsSection === "profile" ? "channelItem unifiedSidebarNavItem active" : "channelItem unifiedSidebarNavItem"}
                    onClick={() => {
                      setSettingsSection("profile");
                      if (!PROFILE_SETTINGS_TABS.includes(settingsTab)) {
                        setSettingsTab("edit");
                      }
                    }}
                  >
                    <AppGlyphIcon kind="friends" className="unifiedSidebarSectionIcon" />
                    Profile Settings
                  </button>
                  <button
                    type="button"
                    className={settingsSection === "system" ? "channelItem unifiedSidebarNavItem active" : "channelItem unifiedSidebarNavItem"}
                    onClick={() => {
                      setSettingsSection("system");
                      if (!SYSTEM_SETTINGS_TABS.includes(settingsTab)) {
                        setSettingsTab("updates");
                      }
                    }}
                  >
                    <AppGlyphIcon kind="settings" className="unifiedSidebarSectionIcon" />
                    System Settings
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className={unifiedSidebarView === "dms" ? "channelItem unifiedSidebarNavItem active" : "channelItem unifiedSidebarNavItem"}
                    onClick={() => {
                      setUnifiedSidebarView("dms");
                      setViewMode("dm");
                      setDmPanelMode("dms");
                      setActiveConversationId(null);
                    }}
                  >
                    <AppGlyphIcon kind="group" className="unifiedSidebarSectionIcon" />
                    Direct Messages
                  </button>
                  <button
                    type="button"
                    className={unifiedSidebarView === "glytches" ? "channelItem unifiedSidebarNavItem active" : "channelItem unifiedSidebarNavItem"}
                    onClick={() => {
                      setUnifiedSidebarView("glytches");
                      setViewMode("glytch");
                      setShowGlytchDirectory(true);
                      setGlytchDirectoryTab("my");
                      setActiveChannelId(null);
                    }}
                  >
                    <AppGlyphIcon kind="glytch" className="unifiedSidebarSectionIcon" />
                    Glytches
                  </button>
                  <button
                    type="button"
                    className={unifiedSidebarView === "groups" ? "channelItem unifiedSidebarNavItem active" : "channelItem unifiedSidebarNavItem"}
                    onClick={() => {
                      setUnifiedSidebarView("groups");
                      setViewMode("group");
                      setActiveGroupChatId(null);
                    }}
                  >
                    <AppGlyphIcon kind="friends" className="unifiedSidebarSectionIcon" />
                    Groups
                  </button>
                </>
              )}
            </nav>

            <div className="unifiedSidebarBody">
              {viewMode === "settings" ? (
                <section className="requestSection unifiedSidebarSection unifiedSidebarPrimarySection" aria-label="Settings menu">
                  <p className="sectionLabel">
                    <AppGlyphIcon kind="settings" className="unifiedSidebarSectionIcon" />
                    {settingsSection === "profile" ? "Profile Options" : "System Options"}
                  </p>
                  <div className="patchNotesSidebarVersions">
                    {(settingsSection === "profile" ? PROFILE_SETTINGS_TABS : SYSTEM_SETTINGS_TABS).map((tab) => (
                      <button
                        key={`settings-sidebar-tab-${tab}`}
                        className={settingsTab === tab ? "channelItem friendItem active unifiedListItem" : "channelItem friendItem unifiedListItem"}
                        type="button"
                        onClick={() => setSettingsTab(tab)}
                      >
                        <span>
                          {tab === "edit"
                            ? "Identity"
                            : tab === "theme"
                              ? "Appearance"
                              : tab === "accessibility"
                                ? "Accessibility"
                                : tab === "mic"
                                  ? "Voice & Mic"
                                  : tab === "updates"
                                    ? "Updates"
                                  : tab === "showcases"
                                    ? "Showcase Modules"
                                    : tab === "notifications"
                                      ? "Notifications"
                                      : tab === "privacy"
                                        ? "Privacy"
                                      : "Live Preview"}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ) : unifiedSidebarView === "dms" ? (
                <section
                  className="requestSection unifiedSidebarSection unifiedSidebarPrimarySection"
                  aria-label="Direct messages"
                  onContextMenu={dmPanelMode === "dms" ? openDmNavContextMenu : undefined}
                >
                  {dmNavContextMenu && (
                    <div
                      className="dmNavContextMenu"
                      role="menu"
                      aria-label="DM options"
                      style={{ left: dmNavContextMenu.x, top: dmNavContextMenu.y }}
                      onPointerDown={(event) => event.stopPropagation()}
                      onContextMenu={(event) => event.preventDefault()}
                    >
                      <button
                        type="button"
                        className="dmNavContextMenuItem"
                        role="menuitem"
                        onClick={() => void handleMarkAllDmsSeenFromNavContextMenu()}
                        disabled={dmSidebarActionBusyKey === "seen-all" || Object.values(unreadDmCounts).every((count) => (count || 0) <= 0)}
                      >
                        Mark all as seen
                      </button>
                    </div>
                  )}

                  {dmPanelMode === "friends" ? (
                    <>
                      <div className="unifiedSidebarHeadingRow">
                        <p className="sectionLabel">Friends</p>
                      </div>
                      <form className="addFriendForm unifiedSidebarAddFriendForm" onSubmit={handleAddFriend}>
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
                            <p>{req.sender_profile?.display_name || req.sender_profile?.username || "User"}</p>
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
                              {req.receiver_profile?.display_name || req.receiver_profile?.username || "User"}
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
                    <>
                      <p className="sectionLabel">Direct Messages</p>
                      <div className="dmSearchRow">
                        <input
                          className="dmSearchInput"
                          value={dmSearchDraft}
                          onChange={(e) => setDmSearchDraft(e.target.value)}
                          placeholder="Search direct messages"
                          aria-label="Search direct messages"
                        />
                      </div>
                      {filteredUnifiedDmRows.length === 0 ? (
                        <p className="smallMuted">{sortedDms.length === 0 ? "No DMs yet." : "No direct messages matched your search."}</p>
                      ) : (
                        <nav className="channelList unifiedSidebarList" aria-label="Direct messages" ref={dmSidebarListRef}>
                          {filteredUnifiedDmRows.map((dm) => {
                            const unreadCount = unreadDmCounts[dm.conversationId] || 0;
                            const unreadLabel = unreadCount > 99 ? "99+" : String(unreadCount);
                            const incomingCallCount = dmIncomingCallCounts[dm.conversationId] || 0;
                            const isDmMuted = mutedDmConversationIdSet.has(dm.conversationId);
                            const dmPresenceStatus = resolvePresenceForUser(dm.friendUserId);
                            const dmPresenceTitle = `Status: ${presenceStatusLabel(dmPresenceStatus)}`;
                            return (
                              <div
                                key={`unified-dm-${dm.conversationId}`}
                                className="friendRow mainDmRow"
                                onContextMenu={(event) =>
                                  openDmSidebarContextMenu(event, dm.conversationId, unreadCount, dm.isPinned, isDmMuted)
                                }
                              >
                                <button
                                  className="friendAvatarButton"
                                  type="button"
                                  aria-label={`View ${dm.friendName} profile`}
                                  onClick={() => {
                                    setDmSidebarContextMenu(null);
                                    void openProfileViewer(dm.friendUserId);
                                  }}
                                >
                                  <span className="friendAvatar withPresence" title={dmPresenceTitle}>
                                    {dm.friendAvatarUrl ? <img src={dm.friendAvatarUrl} alt="" /> : <span>{initialsFromName(dm.friendName)}</span>}
                                    <span className={`presenceDot ${dmPresenceStatus}`} aria-hidden="true" />
                                  </span>
                                </button>
                                <button
                                  className={
                                    viewMode === "dm" && dm.conversationId === activeConversationId
                                      ? "channelItem friendItem active unifiedListItem"
                                      : "channelItem friendItem unifiedListItem"
                                  }
                                  type="button"
                                  onClick={() => {
                                    setViewMode("dm");
                                    setDmPanelMode("dms");
                                    handleOpenDmConversation(dm.conversationId, unreadCount);
                                  }}
                                >
                                  <span className="dmNameRow">
                                    <span className="dmNameText">{dm.friendName}</span>
                                    {dm.isPinned && <span className="dmPinnedBadge" title="Pinned DM" aria-hidden="true" />}
                                    {isDmMuted && (
                                      <span className="dmMutedBadge" title="Conversation muted" aria-hidden="true">
                                        🔕
                                      </span>
                                    )}
                                  </span>
                                  {(incomingCallCount > 0 || unreadCount > 0) && (
                                    <span className="dmAlertBubbles">
                                      {incomingCallCount > 0 && (
                                        <span
                                          className="callBubble"
                                          aria-label={`${dm.friendName} is calling`}
                                          title={`${dm.friendName} is calling`}
                                        >
                                          <svg viewBox="0 0 24 24" role="presentation" aria-hidden="true">
                                            <path
                                              d="M7.4 3.8h3.2l1.3 3.5-1.8 1.5a12.3 12.3 0 0 0 5.1 5.1l1.5-1.8 3.5 1.3v3.2l-2.2.8c-1.1.4-2.3.4-3.3-.1a17.3 17.3 0 0 1-8-8 3.6 3.6 0 0 1-.1-3.3l.8-2.2Z"
                                              fill="none"
                                              stroke="currentColor"
                                              strokeWidth="1.8"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                            />
                                          </svg>
                                        </span>
                                      )}
                                      {unreadCount > 0 && <span className="unreadBubble">{unreadLabel}</span>}
                                    </span>
                                  )}
                                </button>
                              </div>
                            );
                          })}
                          {dmSidebarContextMenu && (
                            <div
                              className="dmSidebarContextMenu"
                              role="menu"
                              aria-label="Direct message options"
                              style={{ left: dmSidebarContextMenu.x, top: dmSidebarContextMenu.y }}
                              onPointerDown={(event) => event.stopPropagation()}
                              onContextMenu={(event) => event.preventDefault()}
                            >
                              <button
                                type="button"
                                className="dmSidebarContextMenuItem"
                                role="menuitem"
                                onClick={() => void handleMarkDmSeenFromSidebarContextMenu()}
                                disabled={
                                  dmSidebarContextMenu.unreadCount === 0 ||
                                  dmSidebarActionBusyKey === `seen:${dmSidebarContextMenu.conversationId}`
                                }
                              >
                                Mark as seen
                              </button>
                              <button
                                type="button"
                                className="dmSidebarContextMenuItem"
                                role="menuitem"
                                onClick={() => void handleTogglePinDmFromSidebarContextMenu()}
                                disabled={dmSidebarActionBusyKey === `pin:${dmSidebarContextMenu.conversationId}`}
                              >
                                {dmSidebarContextMenu.isPinned ? "Unpin DM" : "Pin DM"}
                              </button>
                              <button
                                type="button"
                                className="dmSidebarContextMenuItem"
                                role="menuitem"
                                onClick={() => void handleToggleMuteDmFromSidebarContextMenu()}
                                disabled={dmSidebarActionBusyKey === `mute:${dmSidebarContextMenu.conversationId}`}
                              >
                                {dmSidebarContextMenu.isMuted ? "Unmute conversation" : "Mute conversation"}
                              </button>
                              <button
                                type="button"
                                className="dmSidebarContextMenuItem danger"
                                role="menuitem"
                                onClick={() => void handleDeleteDmFromSidebarContextMenu()}
                                disabled={dmSidebarActionBusyKey === `delete:${dmSidebarContextMenu.conversationId}`}
                              >
                                Delete DM
                              </button>
                            </div>
                          )}
                        </nav>
                      )}
                    </>
                  )}
                </section>
              ) : unifiedSidebarView === "glytches" ? (
                <section className="requestSection unifiedSidebarSection unifiedSidebarPrimarySection" aria-label="Glytches">
                  <p className="sectionLabel">
                    <AppGlyphIcon kind="glytch" className="unifiedSidebarSectionIcon" />
                    Glytches
                  </p>
                  {showGlytchDirectory || !activeGlytch ? (
                    <>
                      <p className="smallMuted">Choose and switch Glytches from the grid in the main panel.</p>
                      <button
                        type="button"
                        className="channelItem unifiedSidebarBackButton unifiedListItem"
                        onClick={() => {
                          setUnifiedSidebarView("glytches");
                          setViewMode("glytch");
                          setShowGlytchDirectory(true);
                          setGlytchDirectoryTab("my");
                          setActiveChannelId(null);
                        }}
                      >
                        Open Glytch Grid
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="activeGlytchSummaryRow">
                        <span className="glytchItemIcon" aria-hidden="true">
                          {activeGlytch.icon_url ? <img src={activeGlytch.icon_url} alt="" /> : <span>{initialsFromName(activeGlytch.name)}</span>}
                        </span>
                        <span className="activeGlytchSummaryName">{activeGlytch.name}</span>
                      </div>
                      <button
                        type="button"
                        className="ghostButton activeGlytchSwitchButton"
                        onClick={handleOpenGlytchDirectory}
                      >
                        Switch Glytch
                      </button>
                      <div className="unifiedSidebarChannelList" aria-label={`${activeGlytch.name} channels`}>
                        {channels.length === 0 && <p className="smallMuted">No channels in this Glytch.</p>}
                        {categorizedChannels.map((group) => (
                          <div key={`unified-category-${group.category.id}`} className="channelCategoryGroup">
                            <p className="channelCategoryTitle">{group.category.name}</p>
                            <div className="channelCategoryChannels">
                              {group.channels.map((channel) => {
                                const channelParticipants = voiceParticipantsByChannelId[channel.id] || [];
                                return (
                                  <button
                                    key={`unified-channel-${channel.id}`}
                                    className={channel.id === activeChannelId ? "channelItem active unifiedListItem" : "channelItem unifiedListItem"}
                                    type="button"
                                    onClick={() => {
                                      setViewMode("glytch");
                                      setShowGlytchDirectory(false);
                                      setActiveChannelId(channel.id);
                                    }}
                                  >
                                    {channel.kind === "voice" ? "🔊" : "#"} {channel.name}
                                    {channel.kind === "voice" && channel.voice_user_limit
                                      ? ` (${channelParticipants.length}/${channel.voice_user_limit})`
                                      : ""}
                                  </button>
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
                                  <button
                                    key={`unified-uncategorized-${channel.id}`}
                                    className={channel.id === activeChannelId ? "channelItem active unifiedListItem" : "channelItem unifiedListItem"}
                                    type="button"
                                    onClick={() => {
                                      setViewMode("glytch");
                                      setShowGlytchDirectory(false);
                                      setActiveChannelId(channel.id);
                                    }}
                                  >
                                    {channel.kind === "voice" ? "🔊" : "#"} {channel.name}
                                    {channel.kind === "voice" && channel.voice_user_limit
                                      ? ` (${channelParticipants.length}/${channel.voice_user_limit})`
                                      : ""}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </section>
              ) : unifiedSidebarView === "groups" ? (
                <section className="requestSection unifiedSidebarSection unifiedSidebarPrimarySection" aria-label="Group chats">
                  <p className="sectionLabel">
                    <AppGlyphIcon kind="friends" className="unifiedSidebarSectionIcon" />
                    Group Chats
                  </p>
                  {groupError && <p className="chatError">{groupError}</p>}
                  <form className="stackedForm" onSubmit={handleCreateGroupChat}>
                    <input
                      value={groupNameDraft}
                      onChange={(e) => setGroupNameDraft(e.target.value)}
                      placeholder="Group chat name"
                      aria-label="Group chat name"
                      disabled={groupCreateBusy}
                    />
                    <div className="glytchInviteList" aria-label="Select group members">
                      {dms.length === 0 ? (
                        <p className="smallMuted">Add friends first to include them in a group chat.</p>
                      ) : (
                        dms.map((dm) => (
                          <label key={dm.friendUserId} className="permissionToggle">
                            <input
                              type="checkbox"
                              checked={groupCreateMemberIds.includes(dm.friendUserId)}
                              onChange={(e) => handleToggleGroupCreateMember(dm.friendUserId, e.target.checked)}
                              disabled={groupCreateBusy}
                            />
                            <span>{dm.friendName}</span>
                          </label>
                        ))
                      )}
                    </div>
                    <button type="submit" disabled={groupCreateBusy}>
                      {groupCreateBusy ? "Creating..." : "Create Group Chat"}
                    </button>
                  </form>
                  <button
                    type="button"
                    className="channelItem unifiedSidebarBackButton unifiedListItem"
                    onClick={() => {
                      setUnifiedSidebarView("groups");
                      setViewMode("group");
                      setActiveGroupChatId(null);
                    }}
                  >
                    Open Group Grid
                  </button>
                </section>
              ) : (
                <section className="requestSection unifiedSidebarSection unifiedSidebarPrimarySection" aria-label="Patch notes">
                  <p className="sectionLabel">
                    <AppGlyphIcon kind="patch" className="unifiedSidebarSectionIcon" />
                    Patch Notes
                  </p>
                  <div className="patchNotesSidebarVersions">
                    {PATCH_NOTES.map((entry) => (
                      <button
                        key={`sidebar-patch-${entry.version}`}
                        className={
                          selectedPatchNoteVersion === entry.version
                            ? "channelItem friendItem active unifiedListItem"
                            : "channelItem friendItem unifiedListItem"
                        }
                        type="button"
                        onClick={() => {
                          setViewMode("patch-notes");
                          setSelectedPatchNoteVersion(entry.version);
                        }}
                      >
                        <span>v{entry.version}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="unifiedSidebarFooter">
              <div className="identityCard unifiedSidebarIdentity">
                <div className="unifiedSidebarProfileWrap">
                  <button
                    className="avatarButton withPresence unifiedSidebarProfileButton"
                    type="button"
                    title={`Status: ${currentUserPresenceLabel}`}
                    onClick={() => void openProfileViewer(currentUserId)}
                  >
                    <span className="avatarButtonMedia">
                      {sidebarAvatar ? (
                        <img src={sidebarAvatar} alt="Profile" />
                      ) : (
                        <span>{initialsFromName(displayName)}</span>
                      )}
                    </span>
                    {renderAvatarDecoration(profileForm.avatarDecoration, {
                      color: profileForm.avatarDecorationColor,
                      background: profileForm.avatarDecorationBackground,
                      size: "small",
                    })}
                    <span className={`presenceDot ${currentUserPresenceStatus}`} aria-hidden="true" />
                  </button>
                  <div className="identityCard unifiedSidebarProfilePopover">
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
                      <button className="settingsLink" type="button" onClick={() => openSettingsView("profile", "edit")}>
                        Profile Settings
                      </button>
                    </div>
                  </div>
                </div>
                <div className="identityMeta unifiedSidebarIdentityMeta">
                  <p className="signedInAs">Signed in as</p>
                  <p className="userName">{displayName}</p>
                  <p className={`presenceLabel ${currentUserPresenceStatus}`}>{currentUserPresenceLabel}</p>
                </div>
                <div className="unifiedSidebarFooterActions">
                  <button
                    className={viewMode === "patch-notes" ? "railSystemButton active" : "railSystemButton"}
                    type="button"
                    aria-label="Open patch notes"
                    title="Patch notes"
                    onClick={() => {
                      setUnifiedSidebarView("patch-notes");
                      setViewMode("patch-notes");
                    }}
                  >
                    <AppGlyphIcon kind="patch" size="medium" />
                  </button>
                  <button
                    className="railSystemButton"
                    type="button"
                    aria-label="Open system settings"
                    title="System settings"
                    onClick={() => openSettingsView("system", "updates")}
                  >
                    <AppGlyphIcon kind="settings" size="medium" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
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
              <div className="chatHeaderTitleWithSwitch">
                <span>
                  {activeGlytch && activeChannel
                    ? `${activeGlytch.name} / ${activeChannel.kind === "voice" ? "🔊" : "#"}${activeChannel.name}`
                    : activeGlytch
                      ? activeGlytch.name
                    : "Discover"}
                </span>
                {activeGlytch && glytches.length > 1 && (
                  <select
                    className="headerSwitchSelect"
                    value={activeGlytch.id}
                    onChange={(e) => {
                      const nextGlytchId = Number.parseInt(e.target.value, 10);
                      if (!Number.isFinite(nextGlytchId) || nextGlytchId <= 0) return;
                      setUnifiedSidebarView("glytches");
                      setViewMode("glytch");
                      setShowGlytchDirectory(false);
                      setGlytchDirectoryTab("my");
                      setActiveGlytchId(nextGlytchId);
                      setActiveChannelId(null);
                    }}
                    aria-label="Switch Glytch"
                    title="Switch Glytch"
                  >
                    {glytches.map((glytch) => (
                      <option key={`header-glytch-switch-${glytch.id}`} value={glytch.id}>
                        {glytch.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : viewMode === "group" ? (
              <div className="chatHeaderTitleWithSwitch">
                <span>{activeGroupChat ? `Group Chat / ${activeGroupChat.name}` : "Group Chats"}</span>
                {activeGroupChat && groupChats.length > 1 && (
                  <select
                    className="headerSwitchSelect"
                    value={activeGroupChat.groupChatId}
                    onChange={(e) => {
                      const nextGroupId = Number.parseInt(e.target.value, 10);
                      if (!Number.isFinite(nextGroupId) || nextGroupId <= 0) return;
                      setUnifiedSidebarView("groups");
                      setViewMode("group");
                      setActiveGroupChatId(nextGroupId);
                    }}
                    aria-label="Switch Group Chat"
                    title="Switch Group Chat"
                  >
                    {groupChats.map((groupChat) => (
                      <option key={`header-group-switch-${groupChat.groupChatId}`} value={groupChat.groupChatId}>
                        {groupChat.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : viewMode === "patch-notes" ? (
              <span>Patch Notes</span>
            ) : viewMode === "glytch-settings" ? (
              <span>{activeGlytch ? `${formatGlytchNameWithId(activeGlytch.name, activeGlytch.id)} / Settings` : "Glytch Settings"}</span>
            ) : (
              <span>Profile Settings</span>
            )}
          </div>
          {shouldRenderHeaderActions && (
            <div className="chatHeaderActions">
              {canOpenActiveGlytchSettings && activeGlytch && (
                <button
                  type="button"
                  className="voiceButton iconOnly glytchHeaderSettingsButton"
                  aria-label={`Open settings for ${activeGlytch.name}`}
                  title={`Open settings for ${activeGlytch.name}`}
                  onClick={() => {
                    setGlytchSettingsTab("profile");
                    setViewMode("glytch-settings");
                  }}
                >
                  <span className="voiceButtonIcon" aria-hidden="true">
                    <img src={settingsIconAssetUrl} alt="" />
                  </span>
                </button>
              )}
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
                    {isElectronRuntime && (
                      <div className="screenShareHeaderControls">
                        <label className="screenShareControl source">
                          <span>Source</span>
                          <select
                            value={selectedDesktopSourceId}
                            onChange={(e) => setSelectedDesktopSourceId(e.target.value)}
                            disabled={screenShareBusy || isDesktopSharing}
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
                          disabled={screenShareBusy || isDesktopSharing}
                        >
                          Refresh Sources
                        </button>
                      </div>
                    )}
                    {isAnyScreenShareActive && canRestoreRemoteScreenShareView && (
                      <button
                        type="button"
                        className="voiceButton iconOnly"
                        onClick={handleRestoreRemoteScreenShareView}
                        aria-label={restoreRemoteMediaViewLabel}
                        title={restoreRemoteMediaViewLabel}
                      >
                        <span className="voiceButtonIcon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" role="presentation">
                            <path
                              d="M2.5 12s3.5-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.5 5.5-9.5 5.5-9.5-5.5-9.5-5.5Z"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <circle
                              cx="12"
                              cy="12"
                              r="2.7"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                            />
                          </svg>
                        </span>
                      </button>
                    )}
                    <button
                      type="button"
                      className={isCameraSharing ? "voiceButton iconOnly screenShareActive" : "voiceButton iconOnly"}
                      onClick={() => void handleToggleWebcamShare()}
                      disabled={screenShareBusy}
                      aria-label={webcamButtonLabel}
                      title={webcamButtonLabel}
                    >
                      <span className="voiceButtonIcon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" role="presentation">
                          <rect
                            x="3"
                            y="7"
                            width="12"
                            height="10"
                            rx="2"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          />
                          <path
                            d="m15 10.5 5.5-2v7l-5.5-2"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={isDesktopSharing ? "voiceButton iconOnly screenShareActive" : "voiceButton iconOnly"}
                      onClick={() => void (isDesktopSharing ? handleStopScreenShare() : handleStartScreenShare())}
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
                  <button
                    type="button"
                    className={
                      viewMode === "dm"
                        ? shouldShowJoinDmCallAction
                          ? "voiceButton iconOnly active callActionButton"
                          : "voiceButton iconOnly callActionButton"
                        : shouldShowJoinDmCallAction
                          ? "voiceButton active"
                          : "voiceButton"
                    }
                    onClick={() => void handleJoinVoice()}
                    aria-label={joinVoiceButtonLabel}
                    title={joinVoiceButtonLabel}
                  >
                    {viewMode === "dm" ? (
                      <>
                        <span className="voiceButtonIcon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" role="presentation">
                            <path
                              d="M7.4 3.8h3.2l1.3 3.5-1.8 1.5a12.3 12.3 0 0 0 5.1 5.1l1.5-1.8 3.5 1.3v3.2l-2.2.8c-1.1.4-2.3.4-3.3-.1a17.3 17.3 0 0 1-8-8 3.6 3.6 0 0 1-.1-3.3l.8-2.2Z"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                        {shouldShowJoinDmCallAction && (
                          <span className="voiceCallBadge">
                            {activeDmIncomingCallCount > 99 ? "99+" : String(activeDmIncomingCallCount)}
                          </span>
                        )}
                      </>
                    ) : (
                      joinVoiceButtonLabel
                    )}
                  </button>
                ))}
              {shouldShowQuickThemeControl && quickThemeTarget && (
                <div className="quickThemeControl">
                  <button
                    type="button"
                    className={
                      showQuickThemeEditor ? "voiceButton iconOnly quickThemeButton active" : "voiceButton iconOnly quickThemeButton"
                    }
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
                            ? "Using the default DM background preset."
                            : quickThemeTarget.kind === "group"
                              ? "Using your default Group Chat colors."
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
            {profileSaveError && <p className="chatError">{profileSaveError}</p>}

            {settingsTab === "edit" ? (
              <form className="settingsForm" onSubmit={handleSaveProfile}>
                <label>
                  Display Name
                  <input
                    type="text"
                    value={profileForm.displayName}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, displayName: e.target.value }))}
                    placeholder="How your name appears in chat"
                    maxLength={48}
                  />
                </label>
                <label>
                  Username (used to add friends)
                  <input type="text" value={settingsUsername} readOnly disabled />
                </label>
                <p className="smallMuted">Usernames are unique and include a built-in 6-character ID suffix.</p>

                <label>
                  Profile Picture
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                    onChange={handleProfileImageUpload("avatar")}
                  />
                </label>
                <p className="smallMuted">GIF profile pictures are supported.</p>
                {avatarUploadBusy && <p className="smallMuted">Uploading avatar...</p>}
                {profileForm.avatarUrl && (
                  <div className="settingsAvatarPreview">
                    <img className="settingsThumb avatar" src={profileForm.avatarUrl} alt="Avatar preview" />
                    {renderAvatarDecoration(profileForm.avatarDecoration, {
                      color: profileForm.avatarDecorationColor,
                      background: profileForm.avatarDecorationBackground,
                    })}
                  </div>
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

                <div className="profileDecorationGrid">
                  <label>
                    Avatar Decoration
                    <select
                      value={profileForm.avatarDecoration}
                      onChange={(e) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          avatarDecoration: normalizeAvatarDecoration(e.target.value),
                        }))
                      }
                    >
                      {Object.entries(AVATAR_DECORATION_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Decoration Icon Color
                    <input
                      type="color"
                      value={profileForm.avatarDecorationColor}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, avatarDecorationColor: e.target.value }))}
                    />
                  </label>
                  <label>
                    Decoration Background
                    <input
                      type="color"
                      value={profileForm.avatarDecorationBackground}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, avatarDecorationBackground: e.target.value }))
                      }
                    />
                  </label>
                </div>
                <div className="profileAppearancePicker" role="radiogroup" aria-label="Avatar decoration presets">
                  {Object.entries(AVATAR_DECORATION_LABELS).map(([value, label]) => {
                    const decorationValue = normalizeAvatarDecoration(value);
                    const selected = profileForm.avatarDecoration === decorationValue;
                    return (
                      <button
                        key={`decor-option-${value}`}
                        type="button"
                        className={selected ? "profileAppearanceOption active" : "profileAppearanceOption"}
                        onClick={() => setProfileForm((prev) => ({ ...prev, avatarDecoration: decorationValue }))}
                        aria-pressed={selected}
                      >
                        <span className="avatarButton withPresence profileAppearanceAvatarPreview" aria-hidden="true">
                          <span className="avatarButtonMedia">
                            {profileForm.avatarUrl ? <img src={profileForm.avatarUrl} alt="" /> : <span>{initialsFromName(displayName)}</span>}
                          </span>
                          {renderAvatarDecoration(decorationValue, {
                            color: profileForm.avatarDecorationColor,
                            background: profileForm.avatarDecorationBackground,
                            size: "small",
                          })}
                          <span className={`presenceDot ${currentUserPresenceStatus}`} aria-hidden="true" />
                        </span>
                        <span className="profileAppearanceMeta">
                          <span className="profileAppearanceTitle">{label}</span>
                          <span className="profileAppearanceHint">{AVATAR_DECORATION_HINTS[decorationValue]}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <label>
                  Banner Image
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                    onChange={handleProfileImageUpload("banner")}
                  />
                </label>
                {bannerCropSourceUrl && (
                  <p className="smallMuted">Crop and position your banner in the popup, then save it.</p>
                )}
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
                    ref={profileBioInputRef}
                    className="profileBioInput"
                    value={profileForm.bio}
                    onChange={(e) => {
                      setProfileForm((prev) => ({ ...prev, bio: e.target.value }));
                      requestAnimationFrame(() => {
                        resizeProfileBioInput();
                      });
                    }}
                    rows={4}
                    placeholder="Tell people about your profile page"
                  />
                </label>

                <label>
                  Profile Comments
                  <select
                    value={profileForm.profileCommentsVisibility}
                    onChange={(e) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        profileCommentsVisibility: normalizeProfileCommentsVisibility(e.target.value),
                      }))
                    }
                  >
                    <option value="public">Public</option>
                    <option value="friends">Friends only</option>
                    <option value="private">Private (only you)</option>
                    <option value="off">Off</option>
                  </select>
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
                    <option value="simplistic">Simplistic (Default)</option>
                    <option value="default">Glitch Neon</option>
                    <option value="legacy">Legacy (0.1)</option>
                    <option value="neon">Neon</option>
                    <option value="ocean">Ocean</option>
                    <option value="sunset">Sunset</option>
                    <option value="mint">Mint</option>
                  </select>
                </label>

                <label>
                  Font Style
                  <select
                    value={profileForm.appFontPreset}
                    onChange={(e) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        appFontPreset: normalizeAppFontPreset(e.target.value),
                      }))
                    }
                  >
                    {Object.entries(APP_FONT_PRESET_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="colorGrid profileCustomizationColorGrid">
                  <label>
                    App Text Color
                    <input
                      type="color"
                      value={profileForm.appTextColor}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, appTextColor: e.target.value }))}
                    />
                  </label>
                  <label>
                    Profile Name Color
                    <input
                      type="color"
                      value={profileForm.profileNameColor}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, profileNameColor: e.target.value }))}
                    />
                  </label>
                  <label>
                    Profile Body Color
                    <input
                      type="color"
                      value={profileForm.profileBodyColor}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, profileBodyColor: e.target.value }))}
                    />
                  </label>
                  <label>
                    Showcase Accent
                    <input
                      type="color"
                      value={profileForm.showcaseAccentColor}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, showcaseAccentColor: e.target.value }))}
                    />
                  </label>
                </div>

                <label>
                  Showcase Layout
                  <select
                    value={profileForm.showcaseLayout}
                    onChange={(e) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        showcaseLayout: normalizeProfileShowcaseLayout(e.target.value),
                      }))
                    }
                  >
                    <option value="grid">Grid</option>
                    <option value="stack">Stack</option>
                  </select>
                </label>

                <label>
                  Showcase Card Style
                  <select
                    value={profileForm.showcaseCardStyle}
                    onChange={(e) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        showcaseCardStyle: normalizeProfileShowcaseCardStyle(e.target.value),
                      }))
                    }
                  >
                    <option value="gradient">Gradient</option>
                    <option value="glass">Glass</option>
                    <option value="solid">Solid</option>
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
                  Build a welcoming profile layout with up to {SHOWCASE_MAX_MODULES} modules. Reorder modules and upload gallery media.
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
                  <p className="smallMuted">You reached the {SHOWCASE_MAX_MODULES}-module limit. Remove one to add another.</p>
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
                          <>
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
                            <label className="uploadButton showcaseUploadButton">
                              {showcaseGalleryUploadBusyId === showcase.id ? "Uploading..." : "Upload Gallery Image/GIF"}
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                                onChange={handleUploadShowcaseGalleryAsset(showcase.id)}
                                disabled={showcaseGalleryUploadBusyId === showcase.id}
                              />
                            </label>
                          </>
                        )}
                        <div className="showcaseEditorPreview">
                          <p className="sectionLabel">Live Preview</p>
                          <section
                            className={`profileShowcaseCard compact showcaseStyle-${profileForm.showcaseCardStyle}`}
                            style={{ "--profile-showcase-accent": profileForm.showcaseAccentColor } as CSSProperties}
                          >
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
                          notifyGlytchMessages: enabled ? prev.notifyGlytchMessages : false,
                          notifyFriendRequests: enabled ? prev.notifyFriendRequests : false,
                          notifyFriendRequestAccepted: enabled ? prev.notifyFriendRequestAccepted : false,
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

                <label className="permissionToggle settingsToggle">
                  <input
                    type="checkbox"
                    checked={profileForm.notifyGlytchMessages}
                    disabled={!profileForm.notificationsEnabled}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, notifyGlytchMessages: e.target.checked }))}
                  />
                  <span>Notify for new Glytch messages</span>
                </label>

                <label className="permissionToggle settingsToggle">
                  <input
                    type="checkbox"
                    checked={profileForm.notifyFriendRequests}
                    disabled={!profileForm.notificationsEnabled}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, notifyFriendRequests: e.target.checked }))}
                  />
                  <span>Notify for new friend requests</span>
                </label>

                <label className="permissionToggle settingsToggle">
                  <input
                    type="checkbox"
                    checked={profileForm.notifyFriendRequestAccepted}
                    disabled={!profileForm.notificationsEnabled}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, notifyFriendRequestAccepted: e.target.checked }))
                    }
                  />
                  <span>Notify when friend requests are accepted</span>
                </label>

                <label className="permissionToggle settingsToggle">
                  <input
                    type="checkbox"
                    checked={profileForm.thirdPartyIntegrationsEnabled}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, thirdPartyIntegrationsEnabled: e.target.checked }))
                    }
                  />
                  <span>Enable third-party integrations (GIF search and remote media)</span>
                </label>

                <p className="smallMuted">
                  Notifications use your browser/Electron desktop permission. Third-party integrations control external services.
                </p>

                <button type="submit" disabled={profileSaveBusy}>
                  {profileSaveBusy ? "Saving..." : "Save Notification Settings"}
                </button>
              </form>
            ) : settingsTab === "privacy" ? (
              <form className="settingsForm" onSubmit={handleSavePrivacySettings}>
                <p className="sectionLabel">Privacy</p>
                <label className="permissionToggle settingsToggle">
                  <input
                    type="checkbox"
                    checked={profileForm.notifyInAppDmBanners}
                    onChange={(e) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        notifyInAppDmBanners: e.target.checked,
                      }))
                    }
                  />
                  <span>Show in-app DM popup banners</span>
                </label>
                <p className="smallMuted">When enabled, new DM alerts appear in the top-right for 5 seconds.</p>

                <label className="permissionToggle settingsToggle">
                  <input
                    type="checkbox"
                    checked={profileForm.gameActivitySharingEnabled}
                    onChange={(e) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        gameActivitySharingEnabled: e.target.checked,
                      }))
                    }
                    disabled={!isElectronRuntime}
                  />
                  <span>Detect and share currently playing game</span>
                </label>
                {isElectronRuntime ? (
                  <p className="smallMuted">
                    Enabled by default. Glytch Chat scans local process names to show what game you are currently playing.
                  </p>
                ) : (
                  <p className="smallMuted">Game activity detection is available in the desktop Electron app.</p>
                )}

                <button type="submit" disabled={profileSaveBusy}>
                  {profileSaveBusy ? "Saving..." : "Save Privacy Settings"}
                </button>
              </form>
            ) : settingsTab === "accessibility" ? (
              <form className="settingsForm" onSubmit={handleSaveAccessibilitySettings}>
                <p className="sectionLabel">Accessibility</p>
                <label className="permissionToggle settingsToggle">
                  <input
                    type="checkbox"
                    checked={profileForm.accessibilityReduceMotion}
                    onChange={(e) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        accessibilityReduceMotion: e.target.checked,
                      }))
                    }
                  />
                  <span>Reduce motion and animation</span>
                </label>
                <label className="permissionToggle settingsToggle">
                  <input
                    type="checkbox"
                    checked={profileForm.accessibilityHighContrast}
                    onChange={(e) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        accessibilityHighContrast: e.target.checked,
                      }))
                    }
                  />
                  <span>High-contrast UI mode</span>
                </label>
                <label className="permissionToggle settingsToggle">
                  <input
                    type="checkbox"
                    checked={profileForm.accessibilityDyslexiaFont}
                    onChange={(e) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        accessibilityDyslexiaFont: e.target.checked,
                      }))
                    }
                  />
                  <span>Use dyslexia-friendly font</span>
                </label>
                <label className="permissionToggle settingsToggle">
                  <input
                    type="checkbox"
                    checked={profileForm.accessibilityUnderlineLinks}
                    onChange={(e) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        accessibilityUnderlineLinks: e.target.checked,
                      }))
                    }
                  />
                  <span>Always underline links</span>
                </label>
                <label>
                  Text Size ({profileForm.accessibilityTextScale}%)
                  <input
                    type="range"
                    min={ACCESSIBILITY_TEXT_SCALE_MIN}
                    max={ACCESSIBILITY_TEXT_SCALE_MAX}
                    step={1}
                    value={profileForm.accessibilityTextScale}
                    onChange={(e) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        accessibilityTextScale: normalizeAccessibilityTextScale(e.target.value),
                      }))
                    }
                  />
                </label>
                <p className="smallMuted">
                  Accessibility settings apply immediately and are saved to your profile for future sessions.
                </p>

                <button type="submit" disabled={profileSaveBusy}>
                  {profileSaveBusy ? "Saving..." : "Save Accessibility Settings"}
                </button>
              </form>
            ) : settingsTab === "mic" ? (
              <section className="settingsForm" aria-label="Voice and microphone settings">
                <p className="sectionLabel">Voice & Microphone</p>
                <label>
                  Input Device
                  <select
                    value={normalizeMicInputDeviceId(voiceMicSettings.inputDeviceId)}
                    onChange={(e) =>
                      setVoiceMicSettings((prev) => ({
                        ...prev,
                        inputDeviceId: normalizeMicInputDeviceId(e.target.value),
                      }))
                    }
                  >
                    <option value="default">Default Microphone</option>
                    {voiceInputDevices.map((device, index) => (
                      <option key={`mic-device-${device.deviceId || index}`} value={device.deviceId}>
                        {device.label || `Microphone ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Suppression Profile
                  <select
                    value={voiceMicSettings.suppressionProfile}
                    onChange={(e) =>
                      setVoiceMicSettings((prev) => ({
                        ...prev,
                        suppressionProfile: normalizeVoiceSuppressionProfile(e.target.value),
                      }))
                    }
                  >
                    <option value="balanced">Balanced</option>
                    <option value="strong">Strong</option>
                    <option value="ultra">Max</option>
                  </select>
                </label>
                <label className="permissionToggle settingsToggle">
                  <input
                    type="checkbox"
                    checked={voiceMicSettings.echoCancellation}
                    onChange={(e) =>
                      setVoiceMicSettings((prev) => ({
                        ...prev,
                        echoCancellation: e.target.checked,
                      }))
                    }
                  />
                  <span>Echo cancellation</span>
                </label>
                <label className="permissionToggle settingsToggle">
                  <input
                    type="checkbox"
                    checked={voiceMicSettings.noiseSuppression}
                    onChange={(e) =>
                      setVoiceMicSettings((prev) => ({
                        ...prev,
                        noiseSuppression: e.target.checked,
                      }))
                    }
                  />
                  <span>Noise suppression</span>
                </label>
                <label className="permissionToggle settingsToggle">
                  <input
                    type="checkbox"
                    checked={voiceMicSettings.autoGainControl}
                    onChange={() => {}}
                    disabled
                  />
                  <span>Automatic gain control (disabled to prevent volume boosting)</span>
                </label>
                <label className="permissionToggle settingsToggle">
                  <input
                    type="checkbox"
                    checked={voiceMicSettings.voiceIsolation}
                    onChange={(e) =>
                      setVoiceMicSettings((prev) => ({
                        ...prev,
                        voiceIsolation: e.target.checked,
                      }))
                    }
                  />
                  <span>Prefer voice isolation when available</span>
                </label>
                <label>
                  Input Gain ({voiceMicSettings.inputGainPercent}%)
                  <input
                    type="range"
                    min={VOICE_MIC_INPUT_GAIN_MIN}
                    max={VOICE_MIC_INPUT_GAIN_MAX}
                    step={1}
                    value={voiceMicSettings.inputGainPercent}
                    onChange={(e) =>
                      setVoiceMicSettings((prev) => ({
                        ...prev,
                        inputGainPercent: normalizeMicInputGainPercent(e.target.value),
                      }))
                    }
                  />
                </label>
                <p className="smallMuted">
                  Max mode uses dual-pass RNNoise plus voice-only AI gating with keyboard click/fan rejection, voice-focused EQ, compression, and limiting.
                </p>
                <p className="smallMuted">
                  Voice AI keeps output at or below your original loudness and focuses on clarity/noise cleanup instead of amplification.
                </p>
                <p className="smallMuted">For best echo reduction, use headphones instead of open speakers.</p>
                <div className="moderationActionRow">
                  <button
                    type="button"
                    onClick={() => void (micTestRunning ? stopMicTest() : startMicTest())}
                    disabled={micTestBusy || Boolean(voiceRoomKey)}
                  >
                    {micTestBusy ? "Starting..." : micTestRunning ? "Stop Mic Test" : "Start Mic Test"}
                  </button>
                  <button type="button" onClick={() => void handleRecordMicSample()} disabled={!micTestRunning || micTestRecording}>
                    {micTestRecording ? "Recording 5s..." : "Record 5s Sample"}
                  </button>
                  {isWindowsElectronRuntime && (
                    <button
                      type="button"
                      onClick={() => void openWindowsPrivacySettings("microphone")}
                      disabled={windowsPrivacyOpenBusy === "microphone"}
                    >
                      {windowsPrivacyOpenBusy === "microphone" ? "Opening..." : "Mic Permissions"}
                    </button>
                  )}
                </div>
                {voiceRoomKey && <p className="smallMuted">Leave your current voice room before running mic test.</p>}
                <label className="themeOption">
                  <input
                    type="checkbox"
                    checked={micTestMonitorEnabled}
                    onChange={(e) => setMicTestMonitorEnabled(e.target.checked)}
                  />
                  <span>Monitor my mic during test (recommended with headphones)</span>
                </label>
                <div className="micTestMeterShell" role="progressbar" aria-label="Microphone level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={micTestLevel}>
                  <div className={`micTestMeterFill${micTestLevel > 88 ? " danger" : micTestLevel > 70 ? " warn" : ""}`} style={{ width: `${micTestLevel}%` }} />
                </div>
                <p className="smallMuted">Live input level: {micTestLevel}%</p>
                {micTestSampleUrl && (
                  <label>
                    Latest Mic Sample
                    <audio className="micTestSamplePlayer" controls src={micTestSampleUrl} />
                  </label>
                )}
                {micTestError && <p className="chatError">{micTestError}</p>}
              </section>
            ) : settingsTab === "updates" ? (
              <section className="settingsForm" aria-label="Desktop updates">
                <p className="sectionLabel">Desktop App Updates</p>
                {!isElectronRuntime ? (
                  <p className="smallMuted">Open the desktop app to check for and install updates.</p>
                ) : (
                  <>
                    <p className="smallMuted">Installed: v{desktopAppVersion || "0.0.0"}</p>
                    <p className="smallMuted">Latest: {desktopLatestVersion ? `v${desktopLatestVersion}` : "Not checked yet"}</p>
                    <p className="smallMuted">Latest build: {formatLocalDateTime(desktopUpdatePublishedAt)}</p>
                    <p className="smallMuted">Last check: {formatLocalDateTime(desktopUpdateLastCheckedAt)}</p>
                    {desktopUpdateNotice && <p className="smallMuted">{desktopUpdateNotice}</p>}
                    {desktopUpdateError && <p className="chatError">{desktopUpdateError}</p>}
                    <div className="moderationActionRow">
                      <button type="button" onClick={() => void checkForDesktopAppUpdate()} disabled={desktopUpdateBusy}>
                        {desktopUpdateBusy ? "Checking..." : "Check for Updates"}
                      </button>
                      {supportsDesktopUpdateAction && (
                        <button
                          type="button"
                          onClick={() => void handleInstallDesktopUpdate()}
                          disabled={!isDesktopUpdateAvailable || desktopUpdateBusy || desktopUpdateInstallBusy}
                        >
                          {desktopUpdateInstallBusy ? "Starting..." : desktopUpdateActionLabel}
                        </button>
                      )}
                      {electronDesktopPlatform === "windows" && (
                        <button type="button" onClick={() => void handleOpenDesktopUninstall()} disabled={desktopUninstallBusy}>
                          {desktopUninstallBusy ? "Opening..." : "Uninstall App"}
                        </button>
                      )}
                    </div>
                    {!supportsDesktopUpdateAction && (
                      <p className="smallMuted">Update actions are currently available on Windows and macOS desktop builds.</p>
                    )}
                    {electronDesktopPlatform === "mac" && (
                      <p className="smallMuted">
                        {hasInAppInstallerUpdateBridge
                          ? "macOS updates now run an in-app installer flow."
                          : "macOS updates open the latest DMG download for manual install."}
                      </p>
                    )}
                    {electronDesktopPlatform === "windows" && (
                      <>
                        <label className="themeOption">
                          <input
                            type="checkbox"
                            checked={desktopAutoUpdateWindowsEnabled}
                            onChange={(e) => setDesktopAutoUpdateWindowsEnabled(e.target.checked)}
                            disabled={!hasInAppInstallerUpdateBridge}
                          />
                          <span>Auto-install updates on startup</span>
                        </label>
                        <p className="smallMuted">
                          {hasInAppInstallerUpdateBridge
                            ? "When enabled, Windows checks for updates on launch and installs automatically."
                            : "Auto-install requires the latest desktop build with in-app updater support."}
                        </p>
                      </>
                    )}
                  </>
                )}
              </section>
            ) : (
              <div
                className={`profilePreviewCard ${profileForm.cardStyle}`}
                style={
                  {
                    background: `linear-gradient(150deg, ${profileForm.backgroundFrom}, ${profileForm.backgroundTo})`,
                    borderColor: profileForm.accentColor,
                    "--profile-name-color": profileForm.profileNameColor,
                    "--profile-body-color": profileForm.profileBodyColor,
                    "--profile-showcase-accent": profileForm.showcaseAccentColor,
                  } as CSSProperties
                }
              >
                <div
                  className="profileBanner"
                  style={
                    profileForm.bannerUrl
                      ? { backgroundImage: `url(${profileForm.bannerUrl})` }
                      : undefined
                  }
                />
                <div
                  className="profileAvatarLarge withPresence"
                  style={{ borderColor: profileForm.accentColor }}
                  title={`Status: ${currentUserPresenceLabel}`}
                >
                  <span className="profileAvatarMedia">
                    {profileForm.avatarUrl ? (
                      <img src={profileForm.avatarUrl} alt="Avatar" />
                    ) : (
                      <span>{initialsFromName(displayName)}</span>
                    )}
                  </span>
                  {renderAvatarDecoration(profileForm.avatarDecoration, {
                    color: profileForm.avatarDecorationColor,
                    background: profileForm.avatarDecorationBackground,
                  })}
                  <span className={`profilePresenceDot ${currentUserPresenceStatus}`} aria-hidden="true" />
                </div>
                <h2>{displayName}</h2>
                <p className="profileUsernameTag">@{settingsUsername || profileForm.username || currentProfile?.username || currentUserName}</p>
                <p className={`profilePresenceText ${currentUserPresenceStatus}`}>{currentUserPresenceLabel}</p>
                <p>{profileForm.bio || "No bio yet. Edit your profile to personalize this page."}</p>
                <p className="sectionLabel">Showcases</p>
                {renderProfileShowcaseList(previewShowcases, {
                  layout: profileForm.showcaseLayout,
                  cardStyle: profileForm.showcaseCardStyle,
                  accentColor: profileForm.showcaseAccentColor,
                })}
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
        ) : viewMode === "patch-notes" ? (
          <section className="settingsPage patchNotesPage" aria-label="Patch notes">
            <div className="patchNotesLayout">
              <section className="patchNotesMessagePanel" aria-label="Patch note details">
                {!selectedPatchNoteEntry ? (
                  <p className="smallMuted">No patch notes available.</p>
                ) : (
                  <>
                    <header className="patchNotesEntryHeader">
                      <h2>v{selectedPatchNoteEntry.version}</h2>
                      <p className="smallMuted">{selectedPatchNoteEntry.date}</p>
                    </header>
                    <article className="requestCard patchNotesSectionCard">
                      <p className="sectionLabel">Bug Fixes</p>
                      {selectedPatchNoteEntry.bugFixes.length === 0 ? (
                        <p className="smallMuted">No bug fixes listed for this version.</p>
                      ) : (
                        <ul className="patchNotesBulletList">
                          {selectedPatchNoteEntry.bugFixes.map((item) => (
                            <li key={`patch-${selectedPatchNoteEntry.version}-bug-${item}`}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </article>
                    <article className="requestCard patchNotesSectionCard">
                      <p className="sectionLabel">New Features</p>
                      {selectedPatchNoteEntry.newFeatures.length === 0 ? (
                        <p className="smallMuted">No new features listed for this version.</p>
                      ) : (
                        <ul className="patchNotesBulletList">
                          {selectedPatchNoteEntry.newFeatures.map((item) => (
                            <li key={`patch-${selectedPatchNoteEntry.version}-feature-${item}`}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </article>
                    <article className="requestCard patchNotesSectionCard">
                      <p className="sectionLabel">Known Issues</p>
                      {selectedPatchNoteEntry.knownIssues.length === 0 ? (
                        <p className="smallMuted">No known issues listed for this version.</p>
                      ) : (
                        <ul className="patchNotesBulletList">
                          {selectedPatchNoteEntry.knownIssues.map((item) => (
                            <li key={`patch-${selectedPatchNoteEntry.version}-issue-${item}`}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </article>
                  </>
                )}
              </section>
            </div>
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
                className={glytchSettingsTab === "bot" ? "tab active" : "tab"}
                type="button"
                onClick={() => setGlytchSettingsTab("bot")}
              >
                Bot Settings
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
                    <p className="smallMuted">Glytch ID: #{activeGlytch.id}</p>
                    <p className="smallMuted">
                      {activeGlytch.is_public ? "Public Glytch" : "Private Glytch (invite only)"}
                      {typeof activeGlytch.max_members === "number" && Number.isFinite(activeGlytch.max_members)
                        ? ` · Max users: ${Math.trunc(activeGlytch.max_members)}`
                        : " · Max users: Unlimited"}
                    </p>
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
                          <select
                            value={glytchProfileVisibilityDraft}
                            onChange={(e) => setGlytchProfileVisibilityDraft(e.target.value === "public" ? "public" : "private")}
                            aria-label="Glytch visibility"
                          >
                            <option value="private">Private (invite only)</option>
                            <option value="public">Public (discoverable)</option>
                          </select>
                          <input
                            type="number"
                            min={GLYTCH_MAX_MEMBERS_MIN}
                            max={GLYTCH_MAX_MEMBERS_MAX}
                            value={glytchProfileMaxMembersDraft}
                            onChange={(e) => setGlytchProfileMaxMembersDraft(e.target.value)}
                            placeholder={`Max users (blank = unlimited, ${GLYTCH_MAX_MEMBERS_MIN}-${GLYTCH_MAX_MEMBERS_MAX})`}
                            aria-label="Max users in this Glytch"
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
                      <>
                        <p className="smallMuted">{activeGlytch.bio || "No Glytch bio yet."}</p>
                        <p className="smallMuted">
                          {activeGlytch.is_public ? "Public Glytch" : "Private Glytch (invite only)"}
                          {typeof activeGlytch.max_members === "number" && Number.isFinite(activeGlytch.max_members)
                            ? ` · Max users: ${Math.trunc(activeGlytch.max_members)}`
                            : " · Max users: Unlimited"}
                        </p>
                      </>
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

                    <div className="stackedForm">
                      <p className="sectionLabel">Unban Requests</p>
                      {glytchUnbanRequestsUi.length === 0 ? (
                        <p className="smallMuted">No pending unban requests.</p>
                      ) : (
                        glytchUnbanRequestsUi.map((request) => {
                          const approveBusyKey = `approved:${request.requestId}`;
                          const rejectBusyKey = `rejected:${request.requestId}`;
                          const requestBusy =
                            unbanRequestActionBusyKey === approveBusyKey || unbanRequestActionBusyKey === rejectBusyKey;
                          return (
                            <div key={request.requestId} className="requestCard">
                              <div className="roleAccessRow">
                                <span className="friendAvatar" aria-hidden="true">
                                  {request.avatarUrl ? (
                                    <img src={request.avatarUrl} alt="" />
                                  ) : (
                                    <span>{initialsFromName(request.name)}</span>
                                  )}
                                </span>
                                <span>
                                  {request.name}
                                  <span className="smallMuted">
                                    {" "}
                                    · Requested {new Date(request.requestedAt).toLocaleString()}
                                  </span>
                                </span>
                              </div>
                              {request.message ? <p className="smallMuted">{request.message}</p> : null}
                              <div className="moderationActionRow">
                                <button
                                  type="button"
                                  onClick={() => void handleReviewUnbanRequest(request.requestId, "approved")}
                                  disabled={requestBusy}
                                >
                                  {unbanRequestActionBusyKey === approveBusyKey ? "Approving..." : "Approve"}
                                </button>
                                <button
                                  type="button"
                                  className="ghostButton"
                                  onClick={() => void handleReviewUnbanRequest(request.requestId, "rejected")}
                                  disabled={requestBusy}
                                >
                                  {unbanRequestActionBusyKey === rejectBusyKey ? "Rejecting..." : "Reject"}
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                ) : (
                  <p className="smallMuted">You do not have permission to manage bans.</p>
                )}
              </section>
            ) : glytchSettingsTab === "bot" ? (
              <section className="requestSection">
                <p className="sectionLabel">Bot Settings</p>
                {canBanMembersInActiveGlytch ? (
                  <form className="stackedForm" onSubmit={handleSaveGlytchBotSettings}>
                    <p className="smallMuted">
                      Every Glytch includes a built-in moderation bot. Configure what it can block and when it DMs users.
                    </p>
                    {glytchBotSettingsError && <p className="chatError">{glytchBotSettingsError}</p>}
                    {glytchBotSettingsNotice && <p className="smallMuted">{glytchBotSettingsNotice}</p>}
                    <label className="permissionToggle">
                      <input
                        type="checkbox"
                        checked={Boolean(glytchBotSettings?.enabled)}
                        onChange={(e) =>
                          setGlytchBotSettings((prev) => (prev ? { ...prev, enabled: e.target.checked } : prev))
                        }
                        disabled={!glytchBotSettings || glytchBotSettingsBusy}
                      />
                      <span>Enable Glytch Bot automod</span>
                    </label>
                    <label className="permissionToggle">
                      <input
                        type="checkbox"
                        checked={Boolean(glytchBotSettings?.block_invite_links)}
                        onChange={(e) =>
                          setGlytchBotSettings((prev) =>
                            prev ? { ...prev, block_invite_links: e.target.checked } : prev,
                          )
                        }
                        disabled={!glytchBotSettings || glytchBotSettingsBusy}
                      />
                      <span>Block invite links</span>
                    </label>
                    <label className="permissionToggle">
                      <input
                        type="checkbox"
                        checked={Boolean(glytchBotSettings?.block_external_links)}
                        onChange={(e) =>
                          setGlytchBotSettings((prev) =>
                            prev ? { ...prev, block_external_links: e.target.checked } : prev,
                          )
                        }
                        disabled={!glytchBotSettings || glytchBotSettingsBusy}
                      />
                      <span>Block external links</span>
                    </label>
                    <label className="permissionToggle">
                      <input
                        type="checkbox"
                        checked={Boolean(glytchBotSettings?.block_blocked_words)}
                        onChange={(e) =>
                          setGlytchBotSettings((prev) =>
                            prev ? { ...prev, block_blocked_words: e.target.checked } : prev,
                          )
                        }
                        disabled={!glytchBotSettings || glytchBotSettingsBusy}
                      />
                      <span>Block custom word list</span>
                    </label>
                    <textarea
                      value={glytchBotBlockedWordsDraft}
                      onChange={(e) => setGlytchBotBlockedWordsDraft(e.target.value)}
                      placeholder="Blocked words (comma or newline separated)"
                      aria-label="Blocked words"
                      rows={3}
                      disabled={!glytchBotSettings || !glytchBotSettings.block_blocked_words || glytchBotSettingsBusy}
                    />
                    <label className="permissionToggle">
                      <input
                        type="checkbox"
                        checked={Boolean(glytchBotSettings?.dm_on_kick_or_ban)}
                        onChange={(e) =>
                          setGlytchBotSettings((prev) =>
                            prev ? { ...prev, dm_on_kick_or_ban: e.target.checked } : prev,
                          )
                        }
                        disabled={!glytchBotSettings || glytchBotSettingsBusy}
                      />
                      <span>DM users when kicked or banned</span>
                    </label>
                    <label className="permissionToggle">
                      <input
                        type="checkbox"
                        checked={Boolean(glytchBotSettings?.dm_on_message_block)}
                        onChange={(e) =>
                          setGlytchBotSettings((prev) =>
                            prev ? { ...prev, dm_on_message_block: e.target.checked } : prev,
                          )
                        }
                        disabled={!glytchBotSettings || glytchBotSettingsBusy}
                      />
                      <span>DM users when a message is blocked</span>
                    </label>
                    <label className="permissionToggle">
                      <input
                        type="checkbox"
                        checked={Boolean(glytchBotSettings?.third_party_bots_enabled)}
                        onChange={(e) =>
                          setGlytchBotSettings((prev) =>
                            prev ? { ...prev, third_party_bots_enabled: e.target.checked } : prev,
                          )
                        }
                        disabled={!glytchBotSettings || glytchBotSettingsBusy}
                      />
                      <span>Enable third-party bot integrations</span>
                    </label>
                    <input
                      type="url"
                      value={glytchBotWebhookDraft}
                      onChange={(e) => setGlytchBotWebhookDraft(e.target.value)}
                      placeholder="Third-party bot webhook URL (https://...)"
                      aria-label="Third-party bot webhook URL"
                      disabled={!glytchBotSettings || !glytchBotSettings.third_party_bots_enabled || glytchBotSettingsBusy}
                    />
                    <p className="smallMuted">
                      Configure a webhook URL for third-party bot services connected to this Glytch.
                    </p>
                    <button type="submit" disabled={!glytchBotSettings || glytchBotSettingsBusy}>
                      {glytchBotSettingsBusy ? "Saving..." : "Save Glytch Bot Settings"}
                    </button>
                  </form>
                ) : (
                  <p className="smallMuted">You do not have permission to configure bot settings.</p>
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
          glytchDirectoryTab === "my" ? (
            <section className="glytchSelectionState" aria-label="Choose a Glytch">
              <div className="glytchSelectionPanel">
                <p className="sectionLabel">Your Glytches</p>
                <div className="glytchDirectoryTopActions">
                  <button
                    type="button"
                    className="channelItem unifiedListItem"
                    onClick={() => {
                      setViewMode("glytch");
                      setShowGlytchDirectory(true);
                      setGlytchDirectoryTab("discover");
                    }}
                  >
                    <AppGlyphIcon kind="discover" className="unifiedSidebarSectionIcon" />
                    Discover Glytches
                  </button>
                </div>
                {filteredUnifiedSidebarGlytches.length === 0 ? (
                  <p className="chatInfo">No Glytches matched your search.</p>
                ) : (
                  <div className="glytchSelectionList glytchDirectoryGrid">
                    {filteredUnifiedSidebarGlytches.map((glytch) => (
                      <button
                        key={`my-glytch-grid-${glytch.id}`}
                        className="channelItem glytchSelectionItem directoryGlytchCard"
                        type="button"
                        title={`${glytch.name} (#${glytch.id})`}
                        onClick={() => {
                          setUnifiedSidebarView("glytches");
                          setActiveGlytchId(glytch.id);
                          setActiveChannelId(null);
                          setViewMode("glytch");
                          setShowGlytchDirectory(false);
                        }}
                      >
                        <span className="directoryGlytchVisual" aria-hidden="true">
                          {glytch.icon_url ? <img src={glytch.icon_url} alt="" /> : <span>{initialsFromName(glytch.name)}</span>}
                        </span>
                        <span className="directoryGlytchName">{glytch.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>
          ) : (
            <section className="glytchSelectionState" aria-label="Discover Glytches">
              <div className="glytchSelectionPanel">
                <div className="glytchActions glytchSelectionActions">
                  <button
                    className={glytchActionMode === "create" ? "channelItem active" : "channelItem"}
                    type="button"
                    onClick={() => {
                      setGlytchActionMode((prev) => (prev === "create" ? "none" : "create"));
                      setJoinBannedGlytchId(null);
                      setJoinUnbanRequestDraft("");
                      setJoinUnbanRequestNotice("");
                    }}
                  >
                    Create Glytch
                  </button>
                  <button
                    className={glytchActionMode === "join" ? "channelItem active" : "channelItem"}
                    type="button"
                    onClick={() => {
                      const nextMode = glytchActionMode === "join" ? "none" : "join";
                      setGlytchActionMode(nextMode);
                      if (nextMode !== "join") {
                        setJoinBannedGlytchId(null);
                        setJoinUnbanRequestDraft("");
                        setJoinUnbanRequestNotice("");
                      }
                    }}
                  >
                    Join by Invite
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
                    <select
                      value={glytchCreateVisibilityDraft}
                      onChange={(e) => setGlytchCreateVisibilityDraft(e.target.value === "public" ? "public" : "private")}
                      aria-label="Glytch visibility"
                    >
                      <option value="private">Private (invite only)</option>
                      <option value="public">Public (discoverable)</option>
                    </select>
                    <input
                      type="number"
                      min={GLYTCH_MAX_MEMBERS_MIN}
                      max={GLYTCH_MAX_MEMBERS_MAX}
                      value={glytchCreateMaxMembersDraft}
                      onChange={(e) => setGlytchCreateMaxMembersDraft(e.target.value)}
                      placeholder={`Max users (optional, ${GLYTCH_MAX_MEMBERS_MIN}-${GLYTCH_MAX_MEMBERS_MAX})`}
                      aria-label="Max users for Glytch"
                    />
                    <button type="submit">Create</button>
                  </form>
                )}
                {glytchActionMode === "join" && (
                  <>
                    <form className="stackedForm" onSubmit={handleJoinGlytch}>
                      <input
                        value={inviteCodeDraft}
                        onChange={(e) => {
                          setInviteCodeDraft(e.target.value);
                          setJoinBannedGlytchId(null);
                          setJoinUnbanRequestNotice("");
                        }}
                        placeholder="Invite code"
                        aria-label="Invite code"
                      />
                      <button type="submit">Join</button>
                    </form>
                    {joinBannedGlytchId && (
                      <form className="stackedForm" onSubmit={handleSubmitJoinUnbanRequest}>
                        <p className="smallMuted">
                          You are banned from this Glytch. Submit an unban request and moderators can review it.
                        </p>
                        <textarea
                          value={joinUnbanRequestDraft}
                          onChange={(e) => setJoinUnbanRequestDraft(e.target.value)}
                          placeholder="Why should we unban you? (optional)"
                          aria-label="Unban request message"
                          rows={3}
                          disabled={joinUnbanRequestBusy || Boolean(joinUnbanRequestNotice)}
                        />
                        <button
                          type="submit"
                          disabled={joinUnbanRequestBusy || Boolean(joinUnbanRequestNotice)}
                        >
                          {joinUnbanRequestBusy ? "Submitting..." : "Submit Unban Request"}
                        </button>
                        {joinUnbanRequestNotice && <p className="smallMuted">{joinUnbanRequestNotice}</p>}
                      </form>
                    )}
                  </>
                )}
                <div className="dmSearchRow">
                  <input
                    className="dmSearchInput"
                    value={publicGlytchSearchDraft}
                    onChange={(e) => setPublicGlytchSearchDraft(e.target.value)}
                    placeholder="Search public Glytches by name or #id"
                    aria-label="Search public Glytches by name or ID"
                  />
                </div>
                {publicGlytchSearchError && <p className="chatError">{publicGlytchSearchError}</p>}
                {publicGlytchSearchBusy && <p className="smallMuted">Searching public Glytches...</p>}
                {!publicGlytchSearchBusy && !selectedDiscoverGlytch && (
                  <p className="chatInfo">No public Glytches matched your search.</p>
                )}
                {selectedDiscoverGlytch && (
                  <article className="discoverFeaturedCard">
                    <div className="activeGlytchSummaryRow">
                      <span className="glytchItemIcon" aria-hidden="true">
                        {selectedDiscoverGlytch.icon_url ? (
                          <img src={selectedDiscoverGlytch.icon_url} alt="" />
                        ) : (
                          <span>{initialsFromName(selectedDiscoverGlytch.name)}</span>
                        )}
                      </span>
                      <span className="activeGlytchSummaryName">{selectedDiscoverGlytch.name}</span>
                    </div>
                    <p className="smallMuted">
                      {selectedDiscoverGlytch.bio?.trim() || "No profile bio yet."}
                    </p>
                    <p className="smallMuted">
                      {selectedDiscoverGlytch.member_count} member{selectedDiscoverGlytch.member_count === 1 ? "" : "s"}
                      {typeof selectedDiscoverGlytch.max_members === "number" && Number.isFinite(selectedDiscoverGlytch.max_members)
                        ? ` / ${Math.trunc(selectedDiscoverGlytch.max_members)}`
                        : ""}{" "}
                      · Public
                    </p>
                    {selectedDiscoverGlytch.is_joined ? (
                      <button
                        type="button"
                        className="ghostButton"
                        onClick={() => {
                          setUnifiedSidebarView("glytches");
                          setActiveGlytchId(selectedDiscoverGlytch.id);
                          setActiveChannelId(null);
                          setViewMode("glytch");
                          setShowGlytchDirectory(false);
                        }}
                      >
                        Open Glytch
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleJoinPublicGlytch(selectedDiscoverGlytch)}
                        disabled={
                          publicGlytchJoinBusyId === selectedDiscoverGlytch.id ||
                          (typeof selectedDiscoverGlytch.max_members === "number" &&
                            selectedDiscoverGlytch.member_count >= selectedDiscoverGlytch.max_members)
                        }
                      >
                        {publicGlytchJoinBusyId === selectedDiscoverGlytch.id
                          ? "Joining..."
                          : typeof selectedDiscoverGlytch.max_members === "number" &&
                              selectedDiscoverGlytch.member_count >= selectedDiscoverGlytch.max_members
                            ? "Glytch Full"
                            : "Join Glytch"}
                      </button>
                    )}
                  </article>
                )}
                {publicGlytchResults.length > 1 && (
                  <div className="glytchSelectionList">
                    {publicGlytchResults.map((glytch) => (
                      <button
                        key={`discover-${glytch.id}`}
                        className={selectedDiscoverGlytch?.id === glytch.id ? "channelItem glytchSelectionItem active" : "channelItem glytchSelectionItem"}
                        type="button"
                        onClick={() => setSelectedDiscoverGlytchId(glytch.id)}
                      >
                        <span className="glytchItemLabel">
                          <span className="glytchItemIcon" aria-hidden="true">
                            {glytch.icon_url ? <img src={glytch.icon_url} alt="" /> : <span>{initialsFromName(glytch.name)}</span>}
                          </span>
                          <span className="glytchItemName">{glytch.name}</span>
                        </span>
                        <span className="smallMuted">
                          {glytch.member_count}
                          {typeof glytch.max_members === "number" && Number.isFinite(glytch.max_members)
                            ? `/${Math.trunc(glytch.max_members)}`
                            : ""}{" "}
                          members
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )
        ) : viewMode === "group" && !shouldShowGroupChatMessageArea ? (
          <section className="glytchSelectionState" aria-label="Group chat directory">
            <div className="glytchSelectionPanel">
              <article className="requestCard groupDirectoryCreateCard">
                <p className="sectionLabel">Create Group Chat</p>
                <form className="stackedForm" onSubmit={handleCreateGroupChat}>
                  <input
                    value={groupNameDraft}
                    onChange={(e) => setGroupNameDraft(e.target.value)}
                    placeholder="Group chat name"
                    aria-label="Group chat name"
                    disabled={groupCreateBusy}
                  />
                  <div className="glytchInviteList" aria-label="Select group members">
                    {dms.length === 0 ? (
                      <p className="smallMuted">Add friends first to include them in a group chat.</p>
                    ) : (
                      dms.map((dm) => (
                        <label key={`group-directory-member-${dm.friendUserId}`} className="permissionToggle">
                          <input
                            type="checkbox"
                            checked={groupCreateMemberIds.includes(dm.friendUserId)}
                            onChange={(e) => handleToggleGroupCreateMember(dm.friendUserId, e.target.checked)}
                            disabled={groupCreateBusy}
                          />
                          <span>{dm.friendName}</span>
                        </label>
                      ))
                    )}
                  </div>
                  <button type="submit" disabled={groupCreateBusy}>
                    {groupCreateBusy ? "Creating..." : "Create Group Chat"}
                  </button>
                </form>
              </article>
              {groupError && <p className="chatError">{groupError}</p>}
              <p className="sectionLabel">Your Groups</p>
              {filteredUnifiedSidebarGroups.length === 0 ? (
                <p className="chatInfo">{groupChats.length === 0 ? "No groups available." : "No groups matched your search."}</p>
              ) : (
                <div className="glytchSelectionList groupDirectoryGrid">
                  {filteredUnifiedSidebarGroups.map((chat) => {
                    const unreadCount = unreadGroupCounts[chat.groupChatId] || 0;
                    const unreadLabel = unreadCount > 99 ? "99+" : String(unreadCount);
                    return (
                      <button
                        key={`group-grid-${chat.groupChatId}`}
                        className="channelItem friendItem directoryGroupCard"
                        type="button"
                        onClick={() => {
                          setUnifiedSidebarView("groups");
                          setViewMode("group");
                          setActiveGroupChatId(chat.groupChatId);
                        }}
                      >
                        <span className="dmNameRow">
                          <span className="dmNameText">{chat.name}</span>
                        </span>
                        <span className="smallMuted">
                          {chat.members.length} member{chat.members.length === 1 ? "" : "s"}
                        </span>
                        {unreadCount > 0 && <span className="unreadBubble">{unreadLabel}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        ) : (
          <div
            ref={chatLayoutRef}
            className={viewMode === "glytch" ? "chatLayout withMembersPanel" : "chatLayout"}
            style={chatLayoutStyle}
          >
            <div ref={chatStreamColumnRef} className="chatStreamColumn">
              {shouldShowScreenSharePanel && (
                <article className="voicePanel screenSharePanel" aria-label={mediaPanelHeading}>
                  <div className="screenSharePanelHeader">
                    <p className="sectionLabel">{mediaPanelHeading}</p>
                    <div className="screenSharePanelActions">
                      {hasRemoteScreenShares && (
                        <button
                          type="button"
                          className={screenShareAudioMuted ? "voiceButton iconOnly active" : "voiceButton iconOnly"}
                          onClick={() => setScreenShareAudioMuted((prev) => !prev)}
                          aria-label={screenShareAudioMuted ? "Unmute screen share audio" : "Mute screen share audio"}
                          title={screenShareAudioMuted ? "Unmute screen share audio" : "Mute screen share audio"}
                        >
                          <span className="voiceButtonIcon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" role="presentation">
                              <path
                                d="M5 10v4h4l5 4V6l-5 4H5Z"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              {!screenShareAudioMuted && (
                                <>
                                  <path
                                    d="M16 9a4 4 0 0 1 0 6"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                  />
                                  <path
                                    d="M18.5 7a7 7 0 0 1 0 10"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                  />
                                </>
                              )}
                              {screenShareAudioMuted && (
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
                      )}
                      {isAnyScreenShareActive && canDismissRemoteScreenShareView && (
                        <button
                          type="button"
                          className="voiceButton iconOnly screenShareDismissButton"
                          onClick={handleDismissRemoteScreenShareView}
                          aria-label={dismissRemoteMediaViewLabel}
                          title={dismissRemoteMediaViewLabel}
                        >
                          <span className="voiceButtonIcon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" role="presentation">
                              <path
                                d="M3.5 4.5h9v15h-9z"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M13 12h7"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                              />
                              <path
                                d="M17 8l4 4-4 4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="screenShareBody">
                    <div className="screenSharePresenterList" role="list" aria-label="Users sharing screens">
                      {screenSharePresenters.map((presenter) => {
                        const isActive = presenter.presenterId === activeScreenSharePresenter?.presenterId;
                        return (
                          <button
                            key={presenter.presenterId}
                            type="button"
                            role="listitem"
                            className={isActive ? "screenSharePresenterButton active" : "screenSharePresenterButton"}
                            onClick={() => setActiveScreenSharePresenterId(presenter.presenterId)}
                            aria-pressed={isActive}
                            title={
                              presenter.shareKind === "camera"
                                ? `View ${presenter.name}'s webcam`
                                : `View ${presenter.name}'s screen share`
                            }
                          >
                            <span className="screenSharePresenterAvatar" aria-hidden="true">
                              {initialsFromName(presenter.name)}
                            </span>
                            <span className="screenSharePresenterMeta">
                              <span className="screenSharePresenterName">{presenter.name}</span>
                              <span className="screenSharePresenterState">{presenter.isSelf ? "You" : "Live"}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="screenShareViewer">
                      {activeScreenSharePresenter ? (
                        <figure
                          className={activeScreenSharePresenter.isSelf ? "screenShareTile self" : "screenShareTile"}
                          role="button"
                          tabIndex={0}
                          onClick={(e) => openVideoFullscreen(e.currentTarget)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openVideoFullscreen(e.currentTarget);
                            }
                          }}
                          title={
                            activeScreenSharePresenter.shareKind === "camera"
                              ? "Open webcam fullscreen"
                              : "Open shared screen fullscreen"
                          }
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
                            ref={(videoEl) => attachVideoStream(videoEl, activeScreenSharePresenter.stream)}
                            autoPlay
                            playsInline
                            muted={activeScreenSharePresenter.isSelf}
                          />
                          <figcaption>{activeScreenSharePresenter.caption}</figcaption>
                        </figure>
                      ) : (
                        <p className="smallMuted">No active screen shares right now.</p>
                      )}
                    </div>
                  </div>
                </article>
              )}
              {(voiceRoomKey || shouldShowDmIncomingCallPreviewPanel) && (
                <article className="voicePanel dmVoicePanelTop" aria-label="Voice participants">
                  <p className="sectionLabel">Voice Chat</p>
                  {isWindowsElectronRuntime && (
                    <div className="voicePermissionActionRow">
                      <button
                        type="button"
                        className="voiceModerationButton"
                        onClick={() => void openWindowsPrivacySettings("microphone")}
                        disabled={windowsPrivacyOpenBusy === "microphone"}
                      >
                        {windowsPrivacyOpenBusy === "microphone" ? "Opening..." : "Mic Permissions"}
                      </button>
                      <button
                        type="button"
                        className="voiceModerationButton"
                        onClick={() => void openWindowsPrivacySettings("camera")}
                        disabled={windowsPrivacyOpenBusy === "camera"}
                      >
                        {windowsPrivacyOpenBusy === "camera" ? "Opening..." : "Camera Permissions"}
                      </button>
                      <button
                        type="button"
                        className="voiceModerationButton"
                        onClick={() => void openWindowsPrivacySettings("screen")}
                        disabled={windowsPrivacyOpenBusy === "screen"}
                      >
                        {windowsPrivacyOpenBusy === "screen" ? "Opening..." : "Screen Permissions"}
                      </button>
                    </div>
                  )}
                  {voiceRoomKey && (
                    <div className="voicePanelTopActions">
                      <button
                        type="button"
                        className={`voiceModerationButton${soundboardPopoverOpen ? " active" : ""}`}
                        onClick={() => setSoundboardPopoverOpen((prev) => !prev)}
                      >
                        {soundboardPopoverOpen ? "Hide Soundboard" : "Open Soundboard"}
                      </button>
                      {soundboardPopoverOpen && (
                        <section className="soundboardPopover" aria-label="Soundboard">
                          <p className="sectionLabel">Soundboard (max {SOUNDBOARD_MAX_CLIPS})</p>
                          <label className="uploadButton">
                            {soundboardBusy ? "Uploading..." : "Upload Sound"}
                            <input
                              type="file"
                              accept="audio/*"
                              onChange={handleUploadSoundboardClip}
                              disabled={soundboardBusy || soundboardClips.length >= SOUNDBOARD_MAX_CLIPS}
                            />
                          </label>
                          {soundboardError && <p className="chatError">{soundboardError}</p>}
                          {soundboardClips.length === 0 ? (
                            <p className="smallMuted">Upload short audio clips to build your soundboard.</p>
                          ) : (
                            <div className="voiceParticipants">
                              {soundboardClips.map((clip) => (
                                <div key={clip.id} className="voiceParticipant">
                                  <span className="voiceParticipantName">{clip.name}</span>
                                  <div className="voiceParticipantControls">
                                    <button
                                      type="button"
                                      className="voiceModerationButton"
                                      onClick={() => void handlePlaySoundboardClip(clip)}
                                      disabled={soundboardPlayingId === clip.id}
                                    >
                                      {soundboardPlayingId === clip.id ? "Playing..." : "Play"}
                                    </button>
                                    <button
                                      type="button"
                                      className="voiceModerationButton danger"
                                      onClick={() => handleRemoveSoundboardClip(clip.id)}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </section>
                      )}
                    </div>
                  )}
                  {voiceRoomKey ? (
                    <>
                      {voiceParticipants.length === 0 ? (
                        <p className="smallMuted">No one is in voice right now.</p>
                      ) : viewMode === "dm" ? (
                    <>
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
                    <div className="voiceParticipants">
                      {voiceParticipants
                        .filter((participant) => participant.userId !== currentUserId)
                        .map((participant) => {
                          const volumePercent = Math.round(
                            clampVoiceVolume(remoteUserVolumes[participant.userId] ?? 1) * 100,
                          );
                          return (
                            <div key={`dm-volume-${participant.userId}`} className="voiceParticipant">
                              <span className="voiceParticipantName">{participant.name}</span>
                              <div className="voiceParticipantControls">
                                <label className="voiceVolumeControl">
                                  <span className="voiceVolumeLabel">Volume</span>
                                  <input
                                    type="range"
                                    min={0}
                                    max={200}
                                    step={5}
                                    value={volumePercent}
                                    onChange={(e) =>
                                      handleSetRemoteUserVolume(participant.userId, Number(e.target.value) / 100)
                                    }
                                  />
                                  <span className="voiceVolumeValue">{volumePercent}%</span>
                                </label>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                    </>
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
                                    max={200}
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
                    </>
                  ) : activeDm ? (
                    <div className="voiceParticipants avatarOnly">
                      <button
                        type="button"
                        className="voiceAvatarOnlyButton"
                        onClick={() => void openProfileViewer(activeDm.friendUserId)}
                        aria-label={`View ${activeDm.friendName} profile`}
                      >
                        <span className="friendAvatar withPresence voiceAvatarOnly" title={activeDmIncomingCallerPresenceTitle}>
                          {activeDm.friendAvatarUrl ? (
                            <img src={activeDm.friendAvatarUrl} alt={`${activeDm.friendName} avatar`} />
                          ) : (
                            <span>{initialsFromName(activeDm.friendName)}</span>
                          )}
                          <span className={`presenceDot ${activeDmIncomingCallerPresenceStatus}`} aria-hidden="true" />
                        </span>
                      </button>
                    </div>
                  ) : (
                    <p className="smallMuted">No one is in voice right now.</p>
                  )}
                </article>
              )}
              {viewMode === "dm" && activeConversationId && (
                <div className="dmMessageSearchBar">
                  <input
                    value={dmMessageSearchDraft}
                    onChange={(e) => setDmMessageSearchDraft(e.target.value)}
                    placeholder="Search messages in this DM"
                    aria-label="Search direct message history"
                  />
                </div>
              )}
              <section
                ref={messageDisplayRef}
                className={isCurrentMessageBackgroundForcedDefault ? "messagedisplay forceDefaultBackground" : "messagedisplay"}
                style={messageDisplayStyle}
                aria-label="Messages"
                onContextMenuCapture={handleDmMessageContextMenuCapture}
              >
                {voiceError && <p className="chatError">{voiceError}</p>}
                {viewMode === "dm" && !activeConversationId && (
                  <section className="onlineFriendsPanel" aria-label="Friends online now">
                    <p className="sectionLabel">Friends Online</p>
                    {onlineDmRows.length === 0 ? (
                      <p className="chatInfo">No friends online.</p>
                    ) : (
                      <div className="onlineFriendsGrid">
                        {onlineDmRows.map((dm) => {
                          const presence = resolvePresenceForUser(dm.friendUserId);
                          const presenceLabel = presenceStatusLabel(presence);
                          const friendProfile = knownProfiles[dm.friendUserId];
                          const currentGame =
                            typeof friendProfile?.current_game === "string" && friendProfile.current_game.trim()
                              ? friendProfile.current_game.trim()
                              : "";
                          return (
                            <button
                              key={`online-dm-${dm.conversationId}`}
                              type="button"
                              className="onlineFriendCard"
                              onClick={() => handleOpenDmConversation(dm.conversationId, unreadDmCounts[dm.conversationId] || 0)}
                            >
                              <span className="friendAvatar withPresence">
                                {dm.friendAvatarUrl ? <img src={dm.friendAvatarUrl} alt="" /> : <span>{initialsFromName(dm.friendName)}</span>}
                                <span className={`presenceDot ${presence}`} aria-hidden="true" />
                              </span>
                              <span className="onlineFriendMeta">
                                <strong>{dm.friendName}</strong>
                                <span>{currentGame ? `is playing ${currentGame}` : presenceLabel}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </section>
                )}
                {viewMode === "group" && !activeGroupChatId && (
                  <p className="chatInfo">Create or select a group chat to start messaging.</p>
                )}
                {viewMode === "glytch" && !activeChannelId && (
                  <p className="chatInfo">Choose a channel to start chatting.</p>
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
                {viewMode === "dm" && activeConversationId && dmMessageSearchQuery && renderedMessageRows.length === 0 && !chatError && (
                  <p className="chatInfo">No messages matched your search.</p>
                )}

                {(viewMode === "dm"
                  ? !!activeConversationId
                  : viewMode === "group"
                    ? !!activeGroupChatId
                  : !!activeChannelId && activeChannel?.kind !== "voice") &&
                  !loadingMessages &&
                  messages.length === 0 &&
                  !chatError && <p className="chatInfo">No messages yet. Send the first one.</p>}

                {(viewMode === "dm" || viewMode === "group" || (viewMode === "glytch" && activeChannel?.kind !== "voice")) &&
                  showScrollToLatestButton && (
                    <button
                      type="button"
                      className="messageScrollToLatestButton"
                      onClick={() => scrollMessageListToBottom("smooth")}
                    >
                      Jump to latest message
                    </button>
                  )}

                <div ref={messageEndRef} />
              </section>

              {messageContextMenu && (
                <div
                  className="messageContextMenu"
                  style={{ left: messageContextMenu.x, top: messageContextMenu.y }}
                  role="menu"
                  aria-label="Message options"
                  onPointerDown={(event) => event.stopPropagation()}
                  onContextMenu={(event) => event.preventDefault()}
                >
                  {messageContextMenu.canReply && (
                    <button type="button" className="messageContextMenuItem" onClick={handleReplyToDmMessageFromContextMenu}>
                      Reply
                    </button>
                  )}
                  {messageContextMenu.canEdit && (
                    <button type="button" className="messageContextMenuItem" onClick={handleStartEditingMessageFromContextMenu}>
                      Edit message
                    </button>
                  )}
                  <div className="messageContextMenuLabel">React</div>
                  <button
                    type="button"
                    className={`messageContextMenuToggle${messageContextMenuReactionsExpanded ? " active" : ""}`}
                    onClick={() => {
                      setMessageContextMenuReactionsExpanded((prev) => !prev);
                    }}
                    aria-expanded={messageContextMenuReactionsExpanded}
                    aria-controls={`dm-context-reactions-${messageContextMenu.messageId}`}
                    aria-label="Show reaction options"
                  >
                    🙂
                  </button>
                  {messageContextMenuReactionsExpanded && (
                    <div
                      className="messageContextMenuReactions"
                      role="listbox"
                      aria-label="React to message"
                      id={`dm-context-reactions-${messageContextMenu.messageId}`}
                    >
                      {REACTION_EMOJIS.map((emoji) => {
                        const reactionKey = `${messageContextMenu.messageId}:${emoji}`;
                        const reactedByMe = Boolean(
                          contextMenuMessage?.reactions.some((reaction) => reaction.emoji === emoji && reaction.reactedByMe),
                        );
                        return (
                          <button
                            key={emoji}
                            type="button"
                            className={`messageContextMenuReaction${reactedByMe ? " active" : ""}`}
                            onClick={() => {
                              void handleToggleMessageReaction(messageContextMenu.messageId, emoji);
                              setMessageContextMenu(null);
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
                  {messageContextMenu.canDelete && (
                    <button type="button" className="messageContextMenuItem danger" onClick={() => void handleDeleteDmMessageFromContextMenu()}>
                      Delete
                    </button>
                  )}
                </div>
              )}

              {(viewMode === "dm" || viewMode === "group" || activeChannel?.kind !== "voice") && (
                <>
                  {viewMode === "dm" && composerReplyTarget && (
                    <div className="composerReplyPreview">
                      <div className="composerReplyMeta">
                        <span>Replying to {composerReplyTarget.senderName}</span>
                        <small>{composerReplyTarget.preview}</small>
                      </div>
                      <button type="button" onClick={() => setComposerReplyTarget(null)} disabled={messageMediaBusy}>
                        Cancel
                      </button>
                    </div>
                  )}
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
                          disabled={!canAttachMediaInCurrentView || messageMediaBusy || !thirdPartyIntegrationsEnabled}
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
                      disabled={!canAttachMediaInCurrentView || messageMediaBusy || !thirdPartyIntegrationsEnabled}
                      aria-label="Open GIF picker"
                      title={
                        thirdPartyIntegrationsEnabled
                          ? "Open GIF picker"
                          : "Enable third-party integrations in system settings to use GIF search"
                      }
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
                          : viewMode === "group"
                            ? activeGroupChatId
                              ? "Write a group message"
                              : "Select a group chat first"
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

      {dmInAppBanner && (
        <button
          type="button"
          className="dmInAppBanner"
          onClick={() => {
            if (dmInAppBannerTimeoutRef.current !== null) {
              window.clearTimeout(dmInAppBannerTimeoutRef.current);
              dmInAppBannerTimeoutRef.current = null;
            }
            setDmInAppBanner(null);
            setUnifiedSidebarView("dms");
            setViewMode("dm");
            setDmPanelMode("dms");
            handleOpenDmConversation(dmInAppBanner.conversationId, unreadDmCounts[dmInAppBanner.conversationId] || 0);
          }}
          aria-label={`Open conversation with ${dmInAppBanner.friendName}`}
        >
          <span className="friendAvatar withPresence dmInAppBannerAvatar" aria-hidden="true">
            {dmInAppBanner.friendAvatarUrl ? (
              <img src={dmInAppBanner.friendAvatarUrl} alt="" />
            ) : (
              <span>{initialsFromName(dmInAppBanner.friendName)}</span>
            )}
          </span>
          <span className="dmInAppBannerMeta">
            <strong>{dmInAppBanner.friendName}</strong>
            <span>{dmInAppBanner.preview}</span>
          </span>
        </button>
      )}

      {viewedProfile && (
        <div className="profileModalBackdrop" onClick={() => setViewedProfile(null)}>
          <section className="profileModal" onClick={(e) => e.stopPropagation()} aria-label="User profile">
            <button className="profileModalClose" type="button" onClick={() => setViewedProfile(null)}>
              Close
            </button>
            <div
              className={`profilePreviewCard ${viewedCardStyle}`}
              style={
                {
                  background: `linear-gradient(150deg, ${viewedFrom}, ${viewedTo})`,
                  borderColor: viewedAccent,
                  "--profile-name-color": viewedProfileNameColor,
                  "--profile-body-color": viewedProfileBodyColor,
                  "--profile-showcase-accent": viewedShowcaseAccentColor,
                } as CSSProperties
              }
            >
                <div
                  className="profileBanner"
                  style={
                    viewedProfile.banner_url
                    ? { backgroundImage: `url(${viewedProfile.banner_url})` }
                    : undefined
                  }
                />
              <div
                className="profileAvatarLarge withPresence"
                style={{ borderColor: viewedAccent }}
                title={`Status: ${viewedPresenceLabel}`}
              >
                <span className="profileAvatarMedia">
                  {viewedProfile.avatar_url ? (
                    <img src={viewedProfile.avatar_url} alt={`${viewedDisplayName} avatar`} />
                  ) : (
                    <span>{initialsFromName(viewedDisplayName)}</span>
                  )}
                </span>
                {renderAvatarDecoration(viewedAvatarDecoration, {
                  color: viewedAvatarDecorationColor,
                  background: viewedAvatarDecorationBackground,
                })}
                <span className={`profilePresenceDot ${viewedPresenceStatus}`} aria-hidden="true" />
              </div>
              <h2>{viewedDisplayName}</h2>
              <p className="profileUsernameTag">@{formatUsernameWithId(viewedProfile.username, viewedProfile.user_id)}</p>
              <p className={`profilePresenceText ${viewedPresenceStatus}`}>{viewedPresenceLabel}</p>
              <p>{viewedProfile.bio || "No bio yet."}</p>
              <p className="sectionLabel">Showcases</p>
              {renderProfileShowcaseList(viewedShowcases, {
                layout: viewedShowcaseLayout,
                cardStyle: viewedShowcaseCardStyle,
                accentColor: viewedShowcaseAccentColor,
              })}
              <section className="profileCommentsSection" aria-label="Profile comments">
                <p className="sectionLabel">Profile Comments</p>
                {viewedProfileCommentsVisibilitySummary && <p className="smallMuted">{viewedProfileCommentsVisibilitySummary}</p>}
                {!viewedCanSeeProfileComments ? (
                  <p className="smallMuted">Comments are unavailable for this profile.</p>
                ) : (
                  <>
                    {viewedProfileCommentsError && <p className="chatError">{viewedProfileCommentsError}</p>}
                    {viewedProfileCommentsLoading ? (
                      <p className="smallMuted">Loading comments...</p>
                    ) : viewedProfileComments.length === 0 ? (
                      <p className="smallMuted">No comments yet.</p>
                    ) : (
                      <div className="profileCommentsList">
                        {viewedProfileComments.map((comment) => {
                          const canDelete = comment.authorUserId === currentUserId || viewedIsSelf;
                          return (
                            <article key={comment.id} className="profileCommentCard">
                              <div className="profileCommentHeader">
                                <span className="profileCommentAuthor">
                                  <span className="friendAvatar" aria-hidden="true">
                                    {comment.authorAvatarUrl ? (
                                      <img src={comment.authorAvatarUrl} alt="" />
                                    ) : (
                                      <span>{initialsFromName(comment.authorName)}</span>
                                    )}
                                  </span>
                                  <span>{comment.authorName}</span>
                                </span>
                                <span className="profileCommentMeta">
                                  {new Date(comment.createdAt).toLocaleString([], {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p className="profileCommentText">{comment.content}</p>
                              {canDelete && (
                                <button
                                  type="button"
                                  className="profileCommentDelete"
                                  onClick={() => void handleDeleteViewedProfileComment(comment.id)}
                                  disabled={viewedProfileCommentDeleteId === comment.id}
                                >
                                  {viewedProfileCommentDeleteId === comment.id ? "Removing..." : "Remove"}
                                </button>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    )}
                    {viewedCanWriteProfileComments ? (
                      <form
                        className="profileCommentComposer"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void handleSubmitViewedProfileComment();
                        }}
                      >
                        <textarea
                          value={viewedProfileCommentDraft}
                          onChange={(e) => setViewedProfileCommentDraft(e.target.value)}
                          placeholder="Leave a comment on this profile"
                          maxLength={PROFILE_COMMENT_MAX_LENGTH}
                          rows={3}
                          disabled={viewedProfileCommentBusy}
                        />
                        <button type="submit" disabled={viewedProfileCommentBusy || !viewedProfileCommentDraft.trim()}>
                          {viewedProfileCommentBusy ? "Posting..." : "Post Comment"}
                        </button>
                      </form>
                    ) : viewedProfileCommentsVisibility !== "off" ? (
                      <p className="smallMuted">
                        {viewedProfileCommentsVisibility === "private"
                          ? "Only this user can write comments."
                          : "Only friends can write comments."}
                      </p>
                    ) : null}
                  </>
                )}
              </section>
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
      {bannerCropSourceUrl && bannerCropNaturalSize && (
        <div className="bannerCropBackdrop" onClick={clearBannerCropDraft}>
          <section className="bannerCropDialog" onClick={(e) => e.stopPropagation()} aria-label="Crop banner image">
            <p className="sectionLabel">Crop Banner</p>
            <p className="smallMuted">Drag to reposition. Use zoom to fine-tune how your banner fits.</p>
            <div
              className={bannerCropDragging ? "bannerCropViewport dragging" : "bannerCropViewport"}
              onPointerDown={handleBannerCropPointerDown}
              onPointerMove={handleBannerCropPointerMove}
              onPointerUp={handleBannerCropPointerUp}
              onPointerCancel={handleBannerCropPointerUp}
            >
              <img
                className="bannerCropImage"
                src={bannerCropSourceUrl}
                alt="Banner crop preview"
                draggable={false}
                style={{
                  width: `${bannerCropNaturalSize.width}px`,
                  height: `${bannerCropNaturalSize.height}px`,
                  transform: `translate(calc(-50% + ${bannerCropOffsetX}px), calc(-50% + ${bannerCropOffsetY}px)) scale(${bannerCropZoom})`,
                }}
              />
            </div>
            <div className="bannerCropControls">
              <label>
                Zoom ({bannerCropZoom.toFixed(2)}x)
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={bannerCropZoom}
                  onChange={(e) => {
                    const nextZoom = Math.max(1, Math.min(3, Number.parseFloat(e.target.value) || 1));
                    const clamped = clampBannerCropOffsets(
                      bannerCropNaturalSize,
                      nextZoom,
                      bannerCropOffsetX,
                      bannerCropOffsetY,
                    );
                    setBannerCropZoom(nextZoom);
                    setBannerCropOffsetX(clamped.x);
                    setBannerCropOffsetY(clamped.y);
                  }}
                />
              </label>
            </div>
            <div className="bannerCropActions">
              <button type="button" className="clearButton" onClick={clearBannerCropDraft} disabled={bannerUploadBusy}>
                Cancel
              </button>
              <button type="button" onClick={() => void handleSaveBannerCrop()} disabled={bannerUploadBusy}>
                {bannerUploadBusy ? "Saving..." : "Save Banner"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
