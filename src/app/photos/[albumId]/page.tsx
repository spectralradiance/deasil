"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import Image from "next/image";
import Masonry from "@mui/lab/Masonry";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { Captions } from "yet-another-react-lightbox/plugins";
import "yet-another-react-lightbox/plugins/captions.css";
import {
  Visibility,
  VisibilityOff,
  Camera,
  Straighten,
  Timer,
  PhotoCamera,
  Lens,
  Info,
} from "@mui/icons-material";
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
          ← Back to Albums
        </Link>
        <h1>Loading...</h1>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <Link href="/photos" style={{ color: "#007ACC", textDecoration: "none", fontSize: "14px", marginBottom: "16px", display: "inline-block" }}>
        ← Back to Albums
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
        plugins={showCaptions ? [Captions] : []}
        toolbar={{
          buttons: [
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
        slides={photographs.map((p) => ({
          src: getFullUrl(p),
          alt: p.title,
          title: showCaptions ? p.title : undefined,
          description: showCaptions ? (
            <div style={{ padding: "12px 16px", color: "white", fontSize: "0.85em" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                <div>
                  {p.captureDateTime && (
                    <div style={{ color: "#ccc" }}>
                      <strong>Captured:</strong><br />
                      {new Date(p.captureDateTime).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  )}
                </div>
                <div>
                  {p.cameraBody && <div style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}><PhotoCamera style={{ fontSize: 15 }} /><span>{p.cameraBody}</span></div>}
                  {p.cameraLens && <div style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}><Lens style={{ fontSize: 15 }} /><span>{p.cameraLens}</span></div>}
                </div>
                <div>
                  {p.aperture && <div style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}><Camera style={{ fontSize: 15 }} /><span>{p.aperture}</span></div>}
                  {p.focalLength && <div style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}><Straighten style={{ fontSize: 15 }} /><span>{p.focalLength}mm</span></div>}
                  {p.shutterSpeed && <div style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}><Timer style={{ fontSize: 15 }} /><span>{p.shutterSpeed}</span></div>}
                </div>
              </div>
            </div>
          ) : undefined,
        }))}
      />
    </main>
  );
}
