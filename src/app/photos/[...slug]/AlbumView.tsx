// Masonry photo grid for an album, with a lightbox, caption bar, and copy-link / buy-print toolbar.

"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Masonry from "@mui/lab/Masonry";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Snackbar from "@mui/material/Snackbar";
import {
  Camera, Lens, Info, InsertLink, PhotoCamera, ShoppingCart,
  Straighten, Timer, Visibility, VisibilityOff,
} from "@mui/icons-material";
import type { AlbumData } from "./types";
import { getThumbnailUrl, getFullUrl, getSmugmugBuyUrl } from "./utils";

interface Props {
  albumData: AlbumData;
  currentPath: string;
}

export default function AlbumView({ albumData, currentPath }: Props) {
  const photographs = albumData.photographs;
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [showCaptions, setShowCaptions] = useState(true);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

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
            top: auto !important; bottom: 0 !important; transform: none !important;
            width: 50% !important; height: 56px !important; justify-content: center !important;
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
            const w = photo.width ?? photo.dimensions?.width ?? 3;
            const h = photo.height ?? photo.dimensions?.height ?? 2;
            return (
              <div
                key={photo._id}
                style={{
                  position: "relative", cursor: "pointer",
                  borderRadius: "4px", overflow: "hidden",
                  animation: "photoFadeIn 0.3s ease both",
                  animationDelay: `${i * 50}ms`,
                }}
                onClick={() => setLightboxIndex(i)}
              >
                {photo.image ? (
                  <Image src={thumb} alt={photo.title ?? ""} width={w} height={h}
                    style={{ width: "100%", height: "auto", display: "block" }} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt={photo.title ?? ""} width={w} height={h} loading="lazy"
                    style={{ width: "100%", height: "auto", display: "block" }} />
                )}
                <div
                  className="photo-overlay"
                  style={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    background: "rgba(0,0,0,0.55)", color: "white",
                    padding: "6px 8px", display: "flex",
                    justifyContent: "space-between", alignItems: "center",
                    fontSize: "13px", opacity: 0, transition: "opacity 0.2s",
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
            <button key="copy-link" type="button" title="Copy link to photo" className="yarl__button"
              onClick={() => {
                const photo = photographs[lightboxIndex];
                if (photo) {
                  navigator.clipboard.writeText(
                    photo.slug ? `${window.location.origin}${currentPath}/${photo.slug}` : window.location.href
                  );
                  setSnackbarOpen(true);
                }
              }}
              style={{ background: "none", border: "none", color: "white", cursor: "pointer", padding: "8px", display: "flex", alignItems: "center" }}
            >
              <InsertLink style={{ fontSize: 24 }} />
            </button>,
            <button key="buy" type="button" title="Buy print on SmugMug" className="yarl__button"
              onClick={() => {
                const photo = photographs[lightboxIndex];
                const buyUrl = photo ? getSmugmugBuyUrl(photo.sourceUrl) : null;
                if (buyUrl) window.open(buyUrl, "_blank", "noopener,noreferrer");
              }}
              style={{ background: "none", border: "none", color: "white", cursor: "pointer", padding: "8px", display: "flex", alignItems: "center" }}
            >
              <ShoppingCart style={{ fontSize: 24 }} />
            </button>,
            <button key="toggle-captions" type="button" title={showCaptions ? "Hide Info" : "Show Info"} className="yarl__button"
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
                    flexShrink: 0, background: "rgba(0,0,0,0.6)",
                    borderBottom: "1px solid rgba(255,255,255,0.1)",
                    padding: "8px 16px", display: "flex", flexWrap: "wrap",
                    alignItems: "center", gap: "8px 20px", color: "white", fontSize: "0.85em",
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
        slides={photographs.map((p) => ({ src: getFullUrl(p), alt: p.title }))}
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
