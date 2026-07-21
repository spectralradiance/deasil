"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import Image from "next/image";
import Masonry from "@mui/lab/Masonry";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import {
  Visibility,
  VisibilityOff,
  Camera,
  Straighten,
  Timer,
  PhotoCamera,
  Lens,
  Info,
  InsertLink,
  ShoppingCart,
} from "@mui/icons-material";
import Snackbar from "@mui/material/Snackbar";
import { client } from "../../sanity-client";
import imageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url";

const builder = imageUrlBuilder(client);
function urlFor(source: SanityImageSource, width: number) {
  return builder.image(source).width(width).url();
}

type Photograph = {
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

type AlbumData = {
  _id: string;
  title: string;
  photographs: Photograph[];
};

/** Swap the SmugMug size code in the URL (e.g. /D/file-D.jpg → /L/file-L.jpg) */
function smugmugResize(url: string, size: string): string {
  return url.replace(
    /\/([A-Z][A-Z0-9]*)\/([^/]+)-([A-Z][A-Z0-9]*)(\.[a-zA-Z]+)$/,
    `/${size}/$2-${size}$4`
  );
}

function getSmugmugBuyUrl(sourceUrl: string | null): string | null {
  if (!sourceUrl) return null;
  const match = sourceUrl.match(/smugmug\.com((?:\/[^/]+)*\/i-[A-Za-z0-9]+)/);
  if (!match) return null;
  return `https://deasil.smugmug.com${match[1]}/buy`;
}

function getThumbnailUrl(photo: Photograph): string {
  if (photo.image) return urlFor(photo.image, 600);
  if (photo.sourceUrl) return smugmugResize(photo.sourceUrl, "L");
  return "";
}

function getFullUrl(photo: Photograph): string {
  if (photo.image) return urlFor(photo.image, 1600);
  if (photo.sourceUrl) return smugmugResize(photo.sourceUrl, "X2");
  return "";
}

export default function AlbumPage({ params }: { params: Promise<{ albumId: string }> }) {
  const { albumId } = use(params);
  const [photographs, setPhotographs] = useState<Photograph[]>([]);
  const [albumInfo, setAlbumInfo] = useState<AlbumData | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [showCaptions, setShowCaptions] = useState(true);
  const [parentFolder, setParentFolder] = useState<{ _id: string; title: string } | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  useEffect(() => {
    async function fetchAlbumData() {
      try {
        const data = await client.fetch<AlbumData | null>(`
          *[_type == "album" && _id == $id][0] {
            _id,
            title,
            "photographs": photographs[]->{
              _id,
              title,
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
          }
        `, { id: albumId });

        if (data) {
          setAlbumInfo(data);
          setPhotographs(data.photographs ?? []);
        }
        const parent = await client.fetch<{ _id: string; title: string } | null>(
          `*[_type == "folder" && $id in children[]._ref][0] { _id, title }`,
          { id: albumId }
        );
        setParentFolder(parent ?? null);
      } catch (error) {
        console.error("Error fetching album data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAlbumData();
  }, [albumId]);

  if (loading) {
    return (
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <Link href="/photos" style={{ color: "#007ACC", textDecoration: "none", fontSize: "14px", marginBottom: "16px", display: "inline-block" }}>
          ← Back to Photos
        </Link>
        <h1>Loading...</h1>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <Link href={parentFolder ? `/photos/folder/${parentFolder._id}` : "/photos"} style={{ color: "#007ACC", textDecoration: "none", fontSize: "14px", marginBottom: "16px", display: "inline-block" }}>
        ← Back to {parentFolder ? parentFolder.title : "Photos"}
      </Link>

      {albumInfo && (
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ margin: "0 0 4px 0" }}>{albumInfo.title}</h1>
          <p style={{ color: "#888", fontSize: "14px", margin: 0 }}>
            {photographs.length} {photographs.length === 1 ? "photo" : "photos"}
          </p>
        </div>
      )}

      {photographs.length > 0 ? (
        <Masonry columns={{ xs: 2, sm: 3, md: 4, lg: 5 }} spacing={1}>
          {photographs.map((photo, i) => {
            const thumb = getThumbnailUrl(photo);
            return (
              <div
                key={photo._id}
                style={{ position: "relative", cursor: "pointer", borderRadius: "4px", overflow: "hidden" }}
                onClick={() => setLightboxIndex(i)}
              >
                {photo.image ? (
                  <Image
                    src={thumb}
                    alt={photo.title ?? ""}
                    width={photo.dimensions?.width ?? 600}
                    height={photo.dimensions?.height ?? 400}
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumb}
                    alt={photo.title ?? ""}
                    loading="lazy"
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                )}
                <div
                  className="photo-overlay"
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "rgba(0,0,0,0.55)",
                    color: "white",
                    padding: "6px 8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "13px",
                    opacity: 0,
                    transition: "opacity 0.2s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0"; }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 6 }}>
                    {photo.title}
                  </span>
                  <Link
                    href={`/photos/${albumId}/${photo._id}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{ color: "white", display: "flex" }}
                  >
                    <Info style={{ fontSize: 18 }} />
                  </Link>
                </div>
              </div>
            );
          })}
        </Masonry>
      ) : (
        <p>No photos found in this album.</p>
      )}

      <Lightbox
        open={lightboxIndex >= 0}
        close={() => setLightboxIndex(-1)}
        index={lightboxIndex}
        on={{ view: ({ index }) => setLightboxIndex(index) }}
        toolbar={{
          buttons: [
            <button
              key="copy-link"
              type="button"
              title="Copy link to photo"
              className="yarl__button"
              onClick={() => {
                const photo = photographs[lightboxIndex];
                if (photo) {
                  navigator.clipboard.writeText(`${window.location.origin}/photos/${albumId}/${photo._id}`);
                  setSnackbarOpen(true);
                }
              }}
              style={{ background: "none", border: "none", color: "white", cursor: "pointer", padding: "8px", display: "flex", alignItems: "center" }}
            >
              <InsertLink style={{ fontSize: 24 }} />
            </button>,
            <button
              key="buy"
              type="button"
              title="Buy print on SmugMug"
              className="yarl__button"
              onClick={() => {
                const photo = photographs[lightboxIndex];
                const buyUrl = photo ? getSmugmugBuyUrl(photo.sourceUrl) : null;
                if (buyUrl) window.open(buyUrl, "_blank", "noopener,noreferrer");
              }}
              style={{ background: "none", border: "none", color: "white", cursor: "pointer", padding: "8px", display: "flex", alignItems: "center" }}
            >
              <ShoppingCart style={{ fontSize: 24 }} />
            </button>,
            <button
              key="toggle-captions"
              type="button"
              title={showCaptions ? "Hide Info" : "Show Info"}
              className="yarl__button"
              onClick={() => setShowCaptions((v) => !v)}
              style={{ background: "none", border: "none", color: "white", cursor: "pointer", padding: "8px", display: "flex", alignItems: "center" }}
            >
              {showCaptions ? <VisibilityOff style={{ fontSize: 24 }} /> : <Visibility style={{ fontSize: 24 }} />}
            </button>,
            "close",
          ],
        }}
        render={{
          slide: ({ slide }) => {
            const p = photographs.find((ph) => getFullUrl(ph) === (slide as { src?: string }).src);
            return (
              <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
                {showCaptions && p && (
                  <div style={{
                    flexShrink: 0,
                    background: "rgba(0,0,0,0.6)",
                    borderBottom: "1px solid rgba(255,255,255,0.1)",
                    padding: "8px 16px",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: "8px 20px",
                    color: "white",
                    fontSize: "0.85em",
                  }}>
                    <span style={{ fontWeight: "bold" }}>{p.title}</span>
                    {p.captureDateTime && (
                      <span style={{ color: "#ccc", display: "flex", alignItems: "center", gap: 5 }}>
                        {new Date(p.captureDateTime).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                    {p.cameraBody && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><PhotoCamera style={{ fontSize: 15 }} />{p.cameraBody}</span>}
                    {p.cameraLens && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Lens style={{ fontSize: 15 }} />{p.cameraLens}</span>}
                    {p.aperture && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Camera style={{ fontSize: 15 }} />{p.aperture}</span>}
                    {p.focalLength && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Straighten style={{ fontSize: 15 }} />{p.focalLength}mm</span>}
                    {p.shutterSpeed && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Timer style={{ fontSize: 15 }} />{p.shutterSpeed}</span>}
                  </div>
                )}
                <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={(slide as { src?: string }).src ?? ""}
                    alt={typeof slide.alt === "string" ? slide.alt : ""}
                    style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                  />
                </div>
              </div>
            );
          },
        }}
        slides={photographs.map((p) => ({
          src: getFullUrl(p),
          alt: p.title,
        }))}
      />
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2500}
        onClose={() => setSnackbarOpen(false)}
        message="Link copied to clipboard"
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </main>
  );
}
