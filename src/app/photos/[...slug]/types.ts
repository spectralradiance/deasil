// Shared type definitions for the photo hierarchy (folders, albums, individual photos).

import type { SanityImageSource } from "@sanity/image-url";

export type FolderItem = {
  _id: string;
  _type: string;
  title: string;
  slug: string | null;
  photoCount: number | null;
  coverImage: SanityImageSource | null;
  coverSourceUrl: string | null;
  childCount: number | null;
};

export type FolderData = {
  _id: string;
  title: string;
  children: FolderItem[];
};

export type Photograph = {
  _id: string;
  title: string;
  slug: string | null;
  image: SanityImageSource | null;
  sourceUrl: string | null;
  width: number | null;
  height: number | null;
  dimensions: { width: number; height: number } | null;
  shutterSpeed?: string;
  aperture?: string;
  focalLength?: number;
  cameraBody?: string;
  cameraLens?: string;
  captureDateTime?: string;
};

export type AlbumData = {
  _id: string;
  title: string;
  photographs: Photograph[];
};

export type PhotoData = {
  _id: string;
  title: string;
  image: SanityImageSource | null;
  sourceUrl: string | null;
  dimensions: { width: number; height: number } | null;
  shutterSpeed?: string;
  aperture?: string;
  focalLength?: number;
  cameraBody?: string;
  cameraLens?: string;
  captureDateTime?: string;
};
