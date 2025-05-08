// instalite-frontend/src/utils/avatar.js
const BACKEND = "http://localhost:3030";

/**
 * Decide which avatar URL to use.
 *
 * @param {string|null} profileImageUrl – value from DB (may be null / "")
 * @param {string} handle               – "@username"  (you already have this)
 * @returns {string} fully‑qualified URL
 */
export function resolveAvatar(profileImageUrl, handle) {
  // 1) user has explicitly chosen a photo → use it
  if (profileImageUrl && profileImageUrl.trim() !== "") {
    return profileImageUrl.startsWith("http")
      ? profileImageUrl                       // absolute URL (e.g. S3)
      : `${BACKEND}${profileImageUrl}`;       // stored as "/uploads/…"
  }

  // 2) no custom photo → infer from handle prefix
  if (handle.startsWith("@bluesky_"))  return `${BACKEND}/public/bluesky.png`;
  if (handle.startsWith("@federated_")) return `${BACKEND}/public/federated.png`;

  // 3) last‑ditch placeholder
  return `${BACKEND}/public/placeholder_profile_picture.png`;
}