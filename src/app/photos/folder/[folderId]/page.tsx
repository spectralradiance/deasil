"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import Image from "next/image";
import Masonry from "@mui/lab/Masonry";
import FolderOpen from "@mui/icons-material/FolderOpen";
import { client } from "../../../sanity-client";
import imageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url";

const builder = imageUrlBuilder(client);

type GalleryItem = {
  _id: string;
  _type: "folder" | "album";
  title: string;
  photoCount: number | null;
  coverImage: SanityImageSource | null;
  coverSourceUrl: string | null;
  childCount: number | null;
};

type FolderData = {
  _id: string;
  title: string;
  children: GalleryItem[];
};

/** Swap the SmugMug size code in the URL (e.g. /D/file-D.jpg → /L/file-L.jpg) */
function smugmugResize(url: string, size: string): string {
  return url.replace(
    /\/([A-Z][A-Z0-9]*)\/([^/]+)-([A-Z][A-Z0-9]*)(\.[a-zA-Z]+)$/,
    `/${size}/$2-${size}$4`
  );
}

function getCoverUrl(item: GalleryItem): string | null {
  if (item.coverImage) return builder.image(item.coverImage).width(600).url();
  if (item.coverSourceUrl) return smugmugResize(item.coverSourceUrl, "L");
  return null;
}

export default function FolderPage({ params }: { params: Promise<{ folderId: string }> }) {
  const { folderId } = use(params);
  const [folder, setFolder] = useState<FolderData | null>(null);
  const [parentFolder, setParentFolder] = useState<{ _id: string; title: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [data, parent] = await Promise.all([
          client.fetch<FolderData | null>(`
            *[_type == "folder" && _id == $id][0] {
              _id,
              title,
              "children": children[]->{
                _id,
                _type,
                title,
                "photoCount": count(photographs),
                "coverImage": coalesce(photographs[0]->image, children[0]->photographs[0]->image),
                "coverSourceUrl": coalesce(photographs[0]->sourceUrl, children[0]->photographs[0]->sourceUrl),
                "childCount": count(children),
              }
            }
          `, { id: folderId }),
          client.fetch<{ _id: string; title: string } | null>(
            `*[_type == "folder" && $id in children[]._ref][0] { _id, title }`,
            { id: folderId }
          ),
        ]);
        setFolder(data ?? null);
        setParentFolder(parent ?? null);
      } catch (error) {
        console.error("Error fetching folder data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [folderId]);

  const backHref = parentFolder ? `/photos/folder/${parentFolder._id}` : "/photos";
  const backLabel = parentFolder ? parentFolder.title : "Photos";

  if (loading) {
    return (
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <Link href={backHref} style={{ color: "#007ACC", textDecoration: "none", fontSize: "14px", marginBottom: "16px", display: "inline-block" }}>
          ← Back to {backLabel}
        </Link>
        <h1>Loading...</h1>
      </main>
    );
  }

  if (!folder) {
    return (
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <Link href="/photos" style={{ color: "#007ACC", textDecoration: "none", fontSize: "14px", marginBottom: "16px", display: "inline-block" }}>
          ← Back to Photos
        </Link>
        <p style={{ color: "#888" }}>Folder not found.</p>
      </main>
    );
  }

  const items = folder.children ?? [];

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <Link href={backHref} style={{ color: "#007ACC", textDecoration: "none", fontSize: "14px", marginBottom: "16px", display: "inline-block" }}>
        ← Back to {backLabel}
      </Link>

      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: "0 0 4px 0" }}>{folder.title}</h1>
        <p style={{ color: "#888", fontSize: "14px", margin: 0 }}>
          {items.length} {items.length === 1 ? "item" : "items"}
        </p>
      </div>

      {items.length === 0 && <p style={{ color: "#888" }}>No items in this folder.</p>}

      <Masonry columns={{ xs: 2, sm: 3, md: 4 }} spacing={2} sx={{ mt: 1 }}>
        {items.map((item) => {
          const coverUrl = getCoverUrl(item);
          const href = item._type === "folder" ? `/photos/folder/${item._id}` : `/photos/${item._id}`;
          const subtitle = item._type === "folder"
            ? `${item.childCount ?? 0} ${item.childCount === 1 ? "item" : "items"}`
            : `${item.photoCount ?? 0} ${item.photoCount === 1 ? "photo" : "photos"}`;
          return (
            <Link key={item._id} href={href} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
              <div
                style={{
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: "8px",
                  cursor: "pointer",
                  background: "#222",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.02)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
                }}
              >
                {coverUrl ? (
                  item.coverImage ? (
                    <Image
                      src={coverUrl}
                      alt={item.title}
                      width={600}
                      height={400}
                      style={{ width: "100%", height: "auto", display: "block" }}
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverUrl}
                      alt={item.title}
                      loading="lazy"
                      style={{ width: "100%", height: "auto", display: "block" }}
                    />
                  )
                ) : (
                  <div style={{ height: 160, background: "#333", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {item._type === "folder" && <FolderOpen style={{ fontSize: 48, color: "#666" }} />}
                  </div>
                )}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "linear-gradient(transparent, rgba(0,0,0,0.75))",
                    padding: "32px 12px 12px",
                    color: "white",
                  }}
                >
                  <div style={{ fontWeight: "bold", fontSize: "0.95em", textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: "0.78em", color: "#ccc", marginTop: 2 }}>
                    {subtitle}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </Masonry>
    </main>
  );
}
