"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Masonry from "@mui/lab/Masonry";
import { client } from "../sanity-client";
import imageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url";

const builder = imageUrlBuilder(client);
function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

type Album = {
  _id: string;
  title: string;
  photoCount: number;
  coverImage: SanityImageSource | null;
  coverSourceUrl: string | null;
};

/** Swap the SmugMug size code in the URL (e.g. /D/file-D.jpg → /L/file-L.jpg) */
function smugmugResize(url: string, size: string): string {
  return url.replace(
    /\/([A-Z][A-Z0-9]*)\/([^/]+)-([A-Z][A-Z0-9]*)(\.[a-zA-Z]+)$/,
    `/${size}/$2-${size}$4`
  );
}

function getCoverUrl(album: Album): string | null {
  if (album.coverImage) return urlFor(album.coverImage).width(600).url();
  if (album.coverSourceUrl) return smugmugResize(album.coverSourceUrl, "L");
  return null;
}

export default function PhotosPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAlbums() {
      try {
        const data = await client.fetch<Album[]>(`
          *[_type == "album"] | order(title asc) {
            _id,
            title,
            "photoCount": count(photographs),
            "coverImage": photographs[0]->image,
            "coverSourceUrl": photographs[0]->sourceUrl
          }
        `);
        setAlbums(data ?? []);
      } catch (error) {
        console.error("Error fetching albums:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAlbums();
  }, []);

  if (loading) {
    return (
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <h1>Photo Albums</h1>
        <p>Loading albums...</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <h1>Photo Albums</h1>
      {albums.length === 0 && <p style={{ color: "#888" }}>No albums found.</p>}
      <Masonry columns={{ xs: 2, sm: 3, md: 4 }} spacing={2} sx={{ mt: 3 }}>
        {albums.filter((album) => album.photoCount > 0).map((album) => {
          const coverUrl = getCoverUrl(album);
          return (
            <Link
              key={album._id}
              href={`/photos/${album._id}`}
              style={{ textDecoration: "none", color: "inherit", display: "block" }}
            >
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
                  album.coverImage ? (
                    <Image
                      src={coverUrl}
                      alt={album.title}
                      width={600}
                      height={400}
                      style={{ width: "100%", height: "auto", display: "block" }}
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverUrl}
                      alt={album.title}
                      loading="lazy"
                      style={{ width: "100%", height: "auto", display: "block" }}
                    />
                  )
                ) : (
                  <div style={{ height: 160, background: "#333" }} />
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
                    {album.title}
                  </div>
                  <div style={{ fontSize: "0.78em", color: "#ccc", marginTop: 2 }}>
                    {album.photoCount} {album.photoCount === 1 ? "photo" : "photos"}
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
