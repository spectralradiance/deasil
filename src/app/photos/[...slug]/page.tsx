"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import Image from "next/image";
import Masonry from "@mui/lab/Masonry";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import FolderOpen from "@mui/icons-material/FolderOpen";
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
  CalendarToday,
} from "@mui/icons-material";
import Snackbar from "@mui/material/Snackbar";
import { client } from "../../sanity-client";
import imageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url";

const builder = imageUrlBuilder(client);
function urlFor(source: SanityImageSource, width: number) {
  return builder.image(source).width(width).url();
}

// --- Types ---

type FolderItem = {
  _id: string;
  _type: string;
  title: string;
  slug: string | null;
  photoCount: number | null;
  coverImage: SanityImageSource | null;
  coverSourceUrl: string | null;
  childCount: number | null;
};

type FolderData = {
  _id: string;
  title: string;
  children: FolderItem[];
};

type Photograph = {
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

type AlbumData = {
  _id: string;
  title: string;
  photographs: Photograph[];
};

type PhotoData = {
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

// --- Utilities ---

function smugmugResize(url: string, size: string): string {
  return url.replace(
    /\/([A-Z][A-Z0-9]*)\/([^/]+)-([A-Z][A-Z0-9]*)(\.[a-zA-Z]+)$/,
    `/${size}/$2-${size}$4`
  );
}

function getCoverUrl(item: FolderItem): string | null {
  if (item.coverImage) return builder.image(item.coverImage).width(600).url();
  if (item.coverSourceUrl) return smugmugResize(item.coverSourceUrl, "L");
  return null;
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

function getSmugmugBuyUrl(sourceUrl: string | null): string | null {
  if (!sourceUrl) return null;
  const match = sourceUrl.match(/smugmug\.com((?:\/[^/]+)*\/i-[A-Za-z0-9]+)/);
  if (!match) return null;
  return `https://deasil.smugmug.com${match[1]}/buy`;
}

function getPhotoDetailUrl(photo: PhotoData, width: number): string {
  if (photo.image) return urlFor(photo.image, width);
  if (photo.sourceUrl) return smugmugResize(photo.sourceUrl, "X2");
  return "";
}

// --- Photo detail sub-components ---

function MetaCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--background, #f9f9f9)",
      border: "1px solid rgba(128,128,128,0.15)",
      padding: "16px",
      borderRadius: "8px",
      breakInside: "avoid",
      marginBottom: "16px",
    }}>
      <h2 style={{ marginTop: 0, marginBottom: "12px", fontSize: "0.85em", textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.6 }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function MetaRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", fontSize: "0.95em" }}>
      <span style={{ opacity: 0.6, display: "flex" }}>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

// --- Page ---

export default function PhotosSlugPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug: slugArr } = use(params);
  const fullSlug = slugArr.join("/"); // slug.current stores the full path, e.g. "Animals/Bugs"
  const currentPath = `/photos/${fullSlug}`;
  const parentPath = slugArr.length > 1 ? `/photos/${slugArr.slice(0, -1).join("/")}` : "/photos";

  const [loading, setLoading] = useState(true);
  const [pageType, setPageType] = useState<"folder" | "album" | "photo" | null>(null);
  const [folderData, setFolderData] = useState<FolderData | null>(null);
  const [albumData, setAlbumData] = useState<AlbumData | null>(null);
  const [photographs, setPhotographs] = useState<Photograph[]>([]);
  const [photoData, setPhotoData] = useState<PhotoData | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [showCaptions, setShowCaptions] = useState(true);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setPageType(null);
      setFolderData(null);
      setAlbumData(null);
      setPhotographs([]);
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
          const photos = doc.photographs ?? [];
          setAlbumData({ _id: doc._id, title: doc.title, photographs: photos });
          setPhotographs(photos);
        } else if (doc) {
          setPageType("photo");
          setPhotoData({
            _id: doc._id,
            title: doc.title,
            image: doc.image,
            sourceUrl: doc.sourceUrl,
            dimensions: doc.dimensions,
            shutterSpeed: doc.shutterSpeed,
            aperture: doc.aperture,
            focalLength: doc.focalLength,
            cameraBody: doc.cameraBody,
            cameraLens: doc.cameraLens,
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
    return (
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <p>Loading...</p>
      </main>
    );
  }

  // --- FOLDER ---
  if (pageType === "folder" && folderData) {
    const items = folderData.children ?? [];
    return (
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <h1 style={{ margin: "0 0 12px 0" }}>{folderData.title}</h1>
        <Link href={parentPath} style={{ color: "#007ACC", textDecoration: "none", fontSize: "14px", display: "inline-block" }}>
          ← Back to Photos
        </Link>
        <p style={{ color: "#888", fontSize: "14px", margin: "8px 0 24px" }}>
          {items.length} {items.length === 1 ? "item" : "items"}
        </p>

        {items.length === 0 && <p style={{ color: "#888" }}>No items in this folder.</p>}

        <Masonry columns={{ xs: 2, sm: 3, md: 4 }} spacing={2} sx={{ mt: 1 }}>
          {items.map((item) => {
            const coverUrl = getCoverUrl(item);
            const href = item.slug ? `/photos/${item.slug}` : null;
            const subtitle = item._type === "folder"
              ? `${item.childCount ?? 0} ${item.childCount === 1 ? "item" : "items"}`
              : `${item.photoCount ?? 0} ${item.photoCount === 1 ? "photo" : "photos"}`;
            return (
              <Link key={item._id} href={href ?? "/photos"} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
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

  // --- ALBUM ---
  if (pageType === "album" && albumData) {
    return (
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <h1 style={{ margin: "0 0 12px 0" }}>{albumData.title}</h1>
        <Link href="/photos" style={{ color: "#007ACC", textDecoration: "none", fontSize: "14px", display: "inline-block" }}>
          ← Back to Photos
        </Link>
        <p style={{ color: "#888", fontSize: "14px", margin: "8px 0 24px" }}>
          {photographs.length} {photographs.length === 1 ? "photo" : "photos"}
        </p>

        <style>{`
          @keyframes photoFadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @media (max-width: 600px) {
            .lightbox-caption-bar { padding-top: 56px !important; }
            .yarl__navigation_prev,
            .yarl__navigation_next {
              top: auto !important;
              bottom: 0 !important;
              transform: none !important;
              width: 50% !important;
              height: 56px !important;
              justify-content: center !important;
            }
            .yarl__navigation_prev { left: 0 !important; }
            .yarl__navigation_next { right: 0 !important; left: auto !important; }
            .lightbox-image-area { padding-bottom: 56px !important; }
          }
        `}</style>

        {photographs.length > 0 ? (
          <Masonry columns={{ xs: 2, sm: 3, md: 4, lg: 5 }} spacing={1}>
            {photographs.map((photo, i) => {
              const thumb = getThumbnailUrl(photo);
              return (
                <div
                  key={photo._id}
                  style={{
                    position: "relative",
                    cursor: "pointer",
                    borderRadius: "4px",
                    overflow: "hidden",
                    animation: "photoFadeIn 0.3s ease both",
                    animationDelay: `${i * 50}ms`,
                  }}
                  onClick={() => setLightboxIndex(i)}
                >
                  {(() => {
                    const w = photo.width ?? photo.dimensions?.width ?? 3;
                    const h = photo.height ?? photo.dimensions?.height ?? 2;
                    return photo.image ? (
                      <Image
                        src={thumb}
                        alt={photo.title ?? ""}
                        width={w}
                        height={h}
                        style={{ width: "100%", height: "auto", display: "block" }}
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt={photo.title ?? ""}
                        width={w}
                        height={h}
                        loading="lazy"
                        style={{ width: "100%", height: "auto", display: "block" }}
                      />
                    );
                  })()}
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
                      href={photo.slug ? `${currentPath}/${photo.slug}` : currentPath}
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
                    navigator.clipboard.writeText(photo.slug ? `${window.location.origin}${currentPath}/${photo.slug}` : window.location.href);
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
                    <div className="lightbox-caption-bar" style={{
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
                  <div className="lightbox-image-area" style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
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

  // --- PHOTO DETAIL ---
  if (pageType === "photo" && photoData) {
    const imgUrl = getPhotoDetailUrl(photoData, 1600);
    const w = photoData.dimensions?.width ?? 1600;
    const h = photoData.dimensions?.height ?? 1067;
    const hasCamera = photoData.cameraBody || photoData.cameraLens;
    const hasSettings = photoData.aperture || photoData.focalLength || photoData.shutterSpeed;

    return (
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <h1 style={{ marginBottom: "12px" }}>{photoData.title}</h1>
        <Link
          href={parentPath}
          style={{ color: "#007ACC", textDecoration: "none", fontSize: "14px", marginBottom: "24px", display: "inline-block" }}
        >
          ← Back to Album
        </Link>

        {photoData.image ? (
          <Image
            src={imgUrl}
            alt={photoData.title}
            width={w}
            height={h}
            style={{ width: "100%", height: "auto", borderRadius: "8px", boxShadow: "0 4px 20px rgba(0,0,0,0.12)", marginTop: "24px", marginBottom: "32px" }}
            priority
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgUrl}
            alt={photoData.title}
            style={{ width: "100%", height: "auto", borderRadius: "8px", boxShadow: "0 4px 20px rgba(0,0,0,0.12)", marginTop: "24px", marginBottom: "32px", display: "block" }}
          />
        )}

        <div style={{ columns: "3 200px", columnGap: "16px" }}>
          {photoData.captureDateTime && (
            <MetaCard title="Captured">
              <MetaRow
                icon={<CalendarToday style={{ fontSize: 16 }} />}
                label={new Date(photoData.captureDateTime).toLocaleDateString("en-US", {
                  year: "numeric", month: "long", day: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              />
            </MetaCard>
          )}

          {hasCamera && (
            <MetaCard title="Equipment">
              {photoData.cameraBody && <MetaRow icon={<PhotoCamera style={{ fontSize: 16 }} />} label={photoData.cameraBody} />}
              {photoData.cameraLens && <MetaRow icon={<Lens style={{ fontSize: 16 }} />} label={photoData.cameraLens} />}
            </MetaCard>
          )}

          {hasSettings && (
            <MetaCard title="Settings">
              {photoData.aperture && <MetaRow icon={<Camera style={{ fontSize: 16 }} />} label={photoData.aperture} />}
              {photoData.focalLength && <MetaRow icon={<Straighten style={{ fontSize: 16 }} />} label={`${photoData.focalLength}mm`} />}
              {photoData.shutterSpeed && <MetaRow icon={<Timer style={{ fontSize: 16 }} />} label={photoData.shutterSpeed} />}
            </MetaCard>
          )}
        </div>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <Link href="/photos" style={{ color: "#007ACC", textDecoration: "none", fontSize: "14px", display: "inline-block" }}>
        ← Back to Photos
      </Link>
      <p style={{ color: "#888", marginTop: 16 }}>Page not found.</p>
    </main>
  );
}
