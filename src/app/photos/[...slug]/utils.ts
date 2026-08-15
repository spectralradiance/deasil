// URL helpers for Sanity images and SmugMug source URLs; initialises the shared Sanity image builder.

import imageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url";
import { client } from "../../sanity-client";
import type { FolderItem, Photograph, PhotoData } from "./types";

export const builder = imageUrlBuilder(client);

export function urlFor(source: SanityImageSource, width: number): string {
  return builder.image(source).width(width).url();
}

export function smugmugResize(url: string, size: string): string {
  return url.replace(
    /\/([A-Z][A-Z0-9]*)\/([^/]+)-([A-Z][A-Z0-9]*)(\.[a-zA-Z]+)$/,
    `/${size}/$2-${size}$4`
  );
}

export function getCoverUrl(item: FolderItem): string | null {
  if (item.coverImage) return builder.image(item.coverImage).width(600).url();
  if (item.coverSourceUrl) return smugmugResize(item.coverSourceUrl, "L");
  return null;
}

export function getThumbnailUrl(photo: Photograph): string {
  if (photo.image) return urlFor(photo.image, 600);
  if (photo.sourceUrl) return smugmugResize(photo.sourceUrl, "L");
  return "";
}

export function getFullUrl(photo: Photograph): string {
  if (photo.image) return urlFor(photo.image, 1600);
  if (photo.sourceUrl) return smugmugResize(photo.sourceUrl, "X2");
  return "";
}

export function getSmugmugBuyUrl(sourceUrl: string | null): string | null {
  if (!sourceUrl) return null;
  const match = sourceUrl.match(/smugmug\.com((?:\/[^/]+)*\/i-[A-Za-z0-9]+)/);
  if (!match) return null;
  return `https://deasil.smugmug.com${match[1]}/buy`;
}

export function getPhotoDetailUrl(photo: PhotoData, width: number): string {
  if (photo.image) return urlFor(photo.image, width);
  if (photo.sourceUrl) return smugmugResize(photo.sourceUrl, "X2");
  return "";
}
