"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";

/**
 * Authenticated images (avatars, chat attachments) are served from backend endpoints (e.g. GET /users/{id}/avatar) - a plain
 * `<img src="http://backend/...">` can't carry the httpOnly auth cookie across origins for a
 * subresource request (SameSite=Lax only rides along on a top-level navigation, not an <img> or
 * fetch), so this fetches the bytes through the same axios client every other API call uses
 * (`withCredentials: true`) and turns them into a local blob URL the <img> tag can actually load.
 */
export function useAuthedBlobUrl(avatarUrl: string | null): string | null {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!avatarUrl) {
      setObjectUrl(null);
      return;
    }

    let cancelled = false;
    let currentUrl: string | null = null;

    apiClient
      .get(avatarUrl, { responseType: "blob" })
      .then((response) => {
        if (cancelled) return;
        currentUrl = URL.createObjectURL(response.data);
        setObjectUrl(currentUrl);
      })
      .catch(() => {
        if (!cancelled) setObjectUrl(null);
      });

    return () => {
      cancelled = true;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [avatarUrl]);

  return objectUrl;
}
