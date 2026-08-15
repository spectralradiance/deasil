// Full-size photo detail page: image, capture date, camera equipment, and exposure settings.

"use client";
import Image from "next/image";
import Link from "next/link";
import { CalendarToday, Camera, Lens, PhotoCamera, Straighten, Timer } from "@mui/icons-material";
import type { PhotoData } from "./types";
import { getPhotoDetailUrl } from "./utils";

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

interface Props {
  photoData: PhotoData;
  parentPath: string;
}

export default function PhotoDetail({ photoData, parentPath }: Props) {
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
