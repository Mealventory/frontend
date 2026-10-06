import { supabase } from "./supabase";

export const ITEM_PHOTO_BUCKET = "pantry-item-images";
const SIGNED_URL_SECONDS = 60 * 60;
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

export function isRemoteItemImageRef(imageRef?: string | null): boolean {
  return Boolean(imageRef && imageRef.startsWith("https://"));
}

export function isStoredItemImageRef(imageRef?: string | null): boolean {
  return Boolean(imageRef && !isRemoteItemImageRef(imageRef));
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const clean = base64.replace(/^data:[^,]+,/, "").replace(/\s/g, "");
  let binary = "";

  if (typeof atob === "function") {
    binary = atob(clean);
  } else if (typeof (globalThis as any).Buffer !== "undefined") {
    binary = (globalThis as any).Buffer.from(clean, "base64").toString("binary");
  } else {
    throw new Error("This device cannot prepare the selected photo.");
  }

  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function extensionForMime(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

export async function uploadItemPhoto(
  householdId: string,
  base64: string,
  mimeType = "image/jpeg",
): Promise<string> {
  if (!supabase) throw new Error("Photo storage is not configured.");
  if (!householdId) throw new Error("Choose a household before adding a photo.");
  if (!base64) throw new Error("The selected photo could not be read.");

  const extension = extensionForMime(mimeType);
  const nonce = Math.random().toString(36).slice(2, 10);
  const path = `${householdId}/${Date.now()}-${nonce}.${extension}`;
  const body = base64ToArrayBuffer(base64);

  const { error } = await supabase.storage
    .from(ITEM_PHOTO_BUCKET)
    .upload(path, body, {
      contentType: mimeType,
      upsert: false,
      cacheControl: "3600",
    });

  if (error) {
    throw new Error(
      error.message?.includes("Bucket not found")
        ? "Pantry photo storage is not set up yet. Apply the latest backend migration."
        : "Could not upload this photo. Please try again.",
    );
  }

  return path;
}

export async function deleteItemPhoto(imageRef?: string | null): Promise<void> {
  if (!supabase || !isStoredItemImageRef(imageRef)) return;
  signedUrlCache.delete(imageRef!);
  const { error } = await supabase.storage
    .from(ITEM_PHOTO_BUCKET)
    .remove([imageRef!]);
  if (error) throw new Error("Could not remove the previous photo.");
}

export async function resolveItemPhotoUrl(
  imageRef?: string | null,
): Promise<string | null> {
  if (!imageRef) return null;
  if (isRemoteItemImageRef(imageRef)) return imageRef;
  if (!supabase) return null;

  const cached = signedUrlCache.get(imageRef);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.url;
  }

  const { data, error } = await supabase.storage
    .from(ITEM_PHOTO_BUCKET)
    .createSignedUrl(imageRef, SIGNED_URL_SECONDS);

  if (error || !data?.signedUrl) return null;
  signedUrlCache.set(imageRef, {
    url: data.signedUrl,
    expiresAt: Date.now() + SIGNED_URL_SECONDS * 1000,
  });
  return data.signedUrl;
}
