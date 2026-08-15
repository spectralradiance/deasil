// Fetches the Sanity document for the current slug and routes to FolderView, AlbumView, or PhotoDetail.

"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { client } from "../../sanity-client";
import type { SanityImageSource } from "@sanity/image-url";
import type { FolderItem, FolderData, Photograph, AlbumData, PhotoData } from "./types";
import FolderView from "./FolderView";
import AlbumView from "./AlbumView";
import PhotoDetail from "./PhotoDetail";

export default function PhotosSlugPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug: slugArr } = use(params);
  const fullSlug = slugArr.join("/");
  const currentPath = `/photos/${fullSlug}`;
  const parentPath = slugArr.length > 1 ? `/photos/${slugArr.slice(0, -1).join("/")}` : "/photos";

  const [loading, setLoading] = useState(true);
  const [pageType, setPageType] = useState<"folder" | "album" | "photo" | null>(null);
  const [folderData, setFolderData] = useState<FolderData | null>(null);
  const [albumData, setAlbumData] = useState<AlbumData | null>(null);
  const [photoData, setPhotoData] = useState<PhotoData | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setPageType(null);
      setFolderData(null);
      setAlbumData(null);
      setPhotoData(null);
      try {
        const doc = await client.fetch<{
          _id: string;
          _type: string;
          title: string;
          hasChildren: boolean;
          hasPhotographs: boolean;
          children: FolderItem[] | null;
          photographs: Photograph[] | null;
          image: SanityImageSource | null;
          sourceUrl: string | null;
          dimensions: { width: number; height: number } | null;
          shutterSpeed?: string;
          aperture?: string;
          focalLength?: number;
          cameraBody?: string;
          cameraLens?: string;
          captureDateTime?: string;
        } | null>(`
          *[(slug.current == $slug || slug == $slug)][0] {
            _id,
            _type,
            title,
            "hasChildren": defined(children),
            "hasPhotographs": defined(photographs),
            "children": children[]->{
              _id,
              _type,
              title,
              "slug": coalesce(slug.current, slug),
              "photoCount": count(photographs),
              "coverImage": coalesce(photographs[0]->image, children[0]->photographs[0]->image),
              "coverSourceUrl": coalesce(photographs[0]->sourceUrl, children[0]->photographs[0]->sourceUrl),
              "childCount": count(children),
            },
            "photographs": photographs[]->{
              _id,
              title,
              "slug": coalesce(slug.current, slug),
              image { ..., asset-> { url, metadata { dimensions } } },
              sourceUrl,
              width,
              height,
              "dimensions": image.asset->metadata.dimensions,
              shutterSpeed,
              aperture,
              focalLength,
              cameraBody,
              cameraLens,
              captureDateTime
            },
            image { ..., asset-> { url, metadata { dimensions } } },
            sourceUrl,
            "dimensions": image.asset->metadata.dimensions,
            shutterSpeed,
            aperture,
            focalLength,
            cameraBody,
            cameraLens,
            captureDateTime
          }
        `, { slug: fullSlug });

        if (doc?.hasChildren) {
          setPageType("folder");
          setFolderData({ _id: doc._id, title: doc.title, children: doc.children ?? [] });
        } else if (doc?.hasPhotographs) {
          setPageType("album");
          setAlbumData({ _id: doc._id, title: doc.title, photographs: doc.photographs ?? [] });
        } else if (doc) {
          setPageType("photo");
          setPhotoData({
            _id: doc._id, title: doc.title, image: doc.image, sourceUrl: doc.sourceUrl,
            dimensions: doc.dimensions, shutterSpeed: doc.shutterSpeed, aperture: doc.aperture,
            focalLength: doc.focalLength, cameraBody: doc.cameraBody, cameraLens: doc.cameraLens,
            captureDateTime: doc.captureDateTime,
          });
        }
      } catch (error) {
        console.error("Error fetching page data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [fullSlug]);

  if (loading) {
    return <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}><p>Loading...</p></main>;
  }

  if (pageType === "folder" && folderData)
    return <FolderView folderData={folderData} parentPath={parentPath} />;

  if (pageType === "album" && albumData)
    return <AlbumView albumData={albumData} currentPath={currentPath} />;

  if (pageType === "photo" && photoData)
    return <PhotoDetail photoData={photoData} parentPath={parentPath} />;

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <Link href="/photos" style={{ color: "#007ACC", textDecoration: "none", fontSize: "14px", display: "inline-block" }}>
        ← Back to Photos
      </Link>
      <p style={{ color: "#888", marginTop: 16 }}>Page not found.</p>
    </main>
  );
}
import Masonry from "@mui/lab/Masonry";
