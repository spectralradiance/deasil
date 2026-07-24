"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { client } from "../sanity-client";
import imageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url";

const builder = imageUrlBuilder(client);

const FOLDER_ORDER = ["Animals", "Plants & Fungi", "Environment"];

type AlbumItem = {
  _id: string;
  _type: "folder" | "album";
  title: string;
  photoCount: number | null;
  coverImage: SanityImageSource | null;
  coverSourceUrl: string | null;
  childCount: number | null;
};

type FolderSection = {
  _id: string;
  title: string;
  children: AlbumItem[];
};

/** Swap the SmugMug size code in the URL (e.g. /D/file-D.jpg → /L/file-L.jpg) */
function smugmugResize(url: string, size: string): string {
  return url.replace(
    /\/([A-Z][A-Z0-9]*)\/([^/]+)-([A-Z][A-Z0-9]*)(\.[a-zA-Z]+)$/,
    `/${size}/$2-${size}$4`
  );
}

function getCoverUrl(item: AlbumItem): string | null {
  if (item.coverImage) return builder.image(item.coverImage).width(600).url();
  if (item.coverSourceUrl) return smugmugResize(item.coverSourceUrl, "L");
  return null;
}

export default function PhotosPage() {
  const [folders, setFolders] = useState<FolderSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchItems() {
      try {
        const data = await client.fetch<FolderSection[]>(`
          *[_type == "folder" && title in ["Animals", "Plants & Fungi", "Environment"]] {
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
        `);
        const sorted = (data ?? []).sort(
          (a, b) => FOLDER_ORDER.indexOf(a.title) - FOLDER_ORDER.indexOf(b.title)
        );
        setFolders(sorted);
      } catch (error) {
        console.error("Error fetching photos:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchItems();
  }, []);

  if (loading) {
    return (
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <h1>Photos</h1>
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <h1>Photos</h1>
      {folders.map((folder) => (
        <section key={folder._id} style={{ marginTop: 40 }}>
          <h2 style={{ marginBottom: 16 }}>{folder.title}</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 16,
            }}
          >
            {folder.children?.map((item) => {
              const coverUrl = getCoverUrl(item);
              const href = item._type === "folder"
                ? `/photos/folder/${item._id}`
                : `/photos/${item._id}`;
              return (
                <Link key={item._id} href={href} style={{ textDecoration: "none", color: "inherit" }}>
                  <div
                    style={{
                      cursor: "pointer",
                      transition: "transform 0.2s, box-shadow 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "scale(1.03)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        aspectRatio: "1 / 1",
                        overflow: "hidden",
                        borderRadius: 8,
                        background: "#222",
                      }}
                    >
                      {coverUrl ? (
                        item.coverImage ? (
                          <Image
                            src={coverUrl}
                            alt={item.title}
                            fill
                            sizes="(max-width: 600px) 50vw, (max-width: 900px) 33vw, 20vw"
                            style={{ objectFit: "cover" }}
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={coverUrl}
                            alt={item.title}
                            loading="lazy"
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          />
                        )
                      ) : (
                        <div style={{ width: "100%", height: "100%", background: "#333" }} />
                      )}
                    </div>
                    <div style={{ marginTop: 8, fontSize: "0.9em", fontWeight: 500, textAlign: "center" }}>
                      {item.title}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
