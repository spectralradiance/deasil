"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Camera,
  Straighten,
  Timer,
  PhotoCamera,
  Lens,
  CalendarToday,
} from "@mui/icons-material";
import { client } from "../../../sanity-client";
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

/** Swap the SmugMug size code in the URL (e.g. /D/file-D.jpg → /X2/file-X2.jpg) */
function smugmugResize(url: string, size: string): string {
  return url.replace(
    /\/([A-Z][A-Z0-9]*)\/([^/]+)-([A-Z][A-Z0-9]*)(\.[a-zA-Z]+)$/,
    `/${size}/$2-${size}$4`
  );
}

function getPhotoUrl(photo: Photograph, width: number): string {
  if (photo.image) return urlFor(photo.image, width);
  if (photo.sourceUrl) return smugmugResize(photo.sourceUrl, "X2");
  return "";
}

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

export default function PhotoPage({
  params,
}: {
  params: Promise<{ albumId: string; photoId: string }>;
}) {
  const { albumId, photoId } = use(params);
  const [photo, setPhoto] = useState<Photograph | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPhoto() {
      try {
        const data = await client.fetch<Photograph | null>(`
          *[_type == "photograph" && _id == $id][0] {
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
        `, { id: photoId });
        setPhoto(data);
      } catch (error) {
        console.error("Error fetching photo:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPhoto();
  }, [photoId]);

  if (loading) {
    return (
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <p>Loading photo...</p>
      </main>
    );
  }

  if (!photo) {
    return (
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <p>Photo not found.</p>
      </main>
    );
  }

  const imgUrl = getPhotoUrl(photo, 1600);
  const w = photo.dimensions?.width ?? 1600;
  const h = photo.dimensions?.height ?? 1067;
  const hasCamera = photo.cameraBody || photo.cameraLens;
  const hasSettings = photo.aperture || photo.focalLength || photo.shutterSpeed;

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <Link
        href={`/photos/${albumId}`}
        style={{ color: "#007ACC", textDecoration: "none", fontSize: "14px", marginBottom: "16px", display: "inline-block" }}
      >
        ← Back to Album
      </Link>

      <h1 style={{ marginBottom: "24px" }}>{photo.title}</h1>

      {photo.image ? (
        <Image
          src={imgUrl}
          alt={photo.title}
          width={w}
          height={h}
          style={{ width: "100%", height: "auto", borderRadius: "8px", boxShadow: "0 4px 20px rgba(0,0,0,0.12)", marginBottom: "32px" }}
          priority
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imgUrl}
          alt={photo.title}
          style={{ width: "100%", height: "auto", borderRadius: "8px", boxShadow: "0 4px 20px rgba(0,0,0,0.12)", marginBottom: "32px", display: "block" }}
        />
      )}

      <div style={{ columns: "3 200px", columnGap: "16px" }}>
        {photo.captureDateTime && (
          <MetaCard title="Captured">
            <MetaRow
              icon={<CalendarToday style={{ fontSize: 16 }} />}
              label={new Date(photo.captureDateTime).toLocaleDateString("en-US", {
                year: "numeric", month: "long", day: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
            />
          </MetaCard>
        )}

        {hasCamera && (
          <MetaCard title="Equipment">
            {photo.cameraBody && <MetaRow icon={<PhotoCamera style={{ fontSize: 16 }} />} label={photo.cameraBody} />}
            {photo.cameraLens && <MetaRow icon={<Lens style={{ fontSize: 16 }} />} label={photo.cameraLens} />}
          </MetaCard>
        )}

        {hasSettings && (
          <MetaCard title="Settings">
            {photo.aperture && <MetaRow icon={<Camera style={{ fontSize: 16 }} />} label={photo.aperture} />}
            {photo.focalLength && <MetaRow icon={<Straighten style={{ fontSize: 16 }} />} label={`${photo.focalLength}mm`} />}
            {photo.shutterSpeed && <MetaRow icon={<Timer style={{ fontSize: 16 }} />} label={photo.shutterSpeed} />}
          </MetaCard>
        )}
      </div>
    </main>
  );
}
