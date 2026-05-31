"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Camera,
  Straighten,
  Timer,
  GridOn,
  PhotoCamera,
  Lens,
  LocalOffer,
} from "@mui/icons-material";

const FLICKR_API_KEY = process.env.NEXT_PUBLIC_FLICKR_API_KEY;

type PhotoDetails = {
  src: string;
  title: string;
  description: string;
  datetaken: string;
  tags: string[];
  width: number;
  height: number;
};

type PhotoMetadata = {
  exif?: {
    aperture?: string;
    focallength?: string;
    iso?: string;
    exposuretime?: string;
    camera?: string;
    lens?: string;
  };
};

export default function PhotoPage({
  params,
}: {
  params: { albumId: string; photoId: string };
}) {
  const [photo, setPhoto] = useState<PhotoDetails | null>(null);
  const [metadata, setMetadata] = useState<PhotoMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPhotoData() {
      try {
        // Fetch photo info
        const infoUrl = `https://www.flickr.com/services/rest/?method=flickr.photos.getInfo&api_key=${FLICKR_API_KEY}&photo_id=${params.photoId}&format=json&nojsoncallback=1`;
        const infoRes = await fetch(infoUrl);
        const infoData = await infoRes.json();

        if (infoData.photo) {
          const p = infoData.photo;
          const photoDetails: PhotoDetails = {
            src: `https://live.staticflickr.com/${p.server}/${p.id}_${p.secret}_b.jpg`,
            title: p.title._content,
            description: p.description._content,
            datetaken: p.dates.taken,
            tags: p.tags.tag.map((t: any) => t._content),
            width: p.originalformat ? 1024 : 800, // Placeholder
            height: p.originalformat ? 683 : 600, // Placeholder
          };
          setPhoto(photoDetails);
        }

        // Fetch EXIF data
        const exifUrl = `https://www.flickr.com/services/rest/?method=flickr.photos.getExif&api_key=${FLICKR_API_KEY}&photo_id=${params.photoId}&format=json&nojsoncallback=1`;
        const exifRes = await fetch(exifUrl);
        const exifData = await exifRes.json();

        const photoMetadata: PhotoMetadata = {};
        if (exifData.photo && exifData.photo.exif) {
          photoMetadata.exif = {};
          exifData.photo.exif.forEach((tag: any) => {
            switch (tag.tag) {
              case "FNumber":
              case "Aperture":
                photoMetadata.exif!.aperture =
                  tag.clean?._content || tag.raw?._content;
                break;
              case "FocalLength":
                photoMetadata.exif!.focallength =
                  tag.clean?._content || tag.raw?._content;
                break;
              case "ISO":
              case "ISOSpeedRatings":
                photoMetadata.exif!.iso =
                  tag.clean?._content || tag.raw?._content;
                break;
              case "ExposureTime":
              case "ShutterSpeedValue":
                photoMetadata.exif!.exposuretime =
                  tag.clean?._content || tag.raw?._content;
                break;
              case "Make":
              case "Camera":
                photoMetadata.exif!.camera =
                  tag.clean?._content || tag.raw?._content;
                break;
              case "Model":
                if (!photoMetadata.exif!.camera) {
                  photoMetadata.exif!.camera =
                    tag.clean?._content || tag.raw?._content;
                } else {
                  photoMetadata.exif!.camera += ` ${
                    tag.clean?._content || tag.raw?._content
                  }`;
                }
                break;
              case "LensModel":
              case "Lens":
                photoMetadata.exif!.lens =
                  tag.clean?._content || tag.raw?._content;
                break;
            }
          });
        }
        setMetadata(photoMetadata);
      } catch (error) {
        console.error("Error fetching photo data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPhotoData();
  }, [params.photoId]);

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

  const exif = metadata?.exif || {};

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <Link
        href={`/photos/${params.albumId}`}
        style={{
          color: "#007ACC",
          textDecoration: "none",
          fontSize: "14px",
          marginBottom: "16px",
          display: "inline-block",
        }}
      >
        ← Back to Album
      </Link>
      <h1 style={{ marginBottom: "16px" }}>{photo.title}</h1>
      <div
        style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "32px" }}
      >
        <div>
          <Image
            src={photo.src}
            alt={photo.title}
            width={photo.width}
            height={photo.height}
            style={{
              width: "100%",
              height: "auto",
              borderRadius: "8px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
            }}
          />
        </div>
        <div style={{ fontSize: "0.9em" }}>
          <div
            style={{
              background: "#f9f9f9",
              padding: "16px",
              borderRadius: "8px",
            }}
          >
            <h2 style={{ marginTop: 0, fontSize: "1.2em" }}>Information</h2>
            {photo.datetaken && (
              <div style={{ marginBottom: "8px", color: "#555" }}>
                <strong>Captured:</strong>
                <br />
                {new Date(photo.datetaken).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            )}
            {photo.description && (
              <div style={{ marginBottom: "8px" }}>
                <strong>Description:</strong>
                <br />
                <div
                  dangerouslySetInnerHTML={{ __html: photo.description }}
                ></div>
              </div>
            )}
            {photo.tags && photo.tags.length > 0 && (
              <div style={{ marginTop: "12px" }}>
                <div
                  style={{
                    marginBottom: "4px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "6px",
                  }}
                >
                  <LocalOffer style={{ fontSize: "16px", marginTop: "2px" }} />
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "4px",
                    }}
                  >
                    {photo.tags.map((tag, i) => (
                      <span
                        key={i}
                        style={{
                          backgroundColor: "#eee",
                          padding: "2px 6px",
                          borderRadius: "12px",
                          fontSize: "0.8em",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              background: "#f9f9f9",
              padding: "16px",
              borderRadius: "8px",
              marginTop: "16px",
            }}
          >
            <h2 style={{ marginTop: 0, fontSize: "1.2em" }}>Camera Details</h2>
            {exif.camera && (
              <div
                style={{
                  marginBottom: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <PhotoCamera style={{ fontSize: "16px" }} />
                <span>{exif.camera}</span>
              </div>
            )}
            {exif.lens && (
              <div
                style={{
                  marginBottom: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Lens style={{ fontSize: "16px" }} />
                <span>{exif.lens}</span>
              </div>
            )}
            {exif.aperture && (
              <div
                style={{
                  marginBottom: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Camera style={{ fontSize: "16px" }} />
                <span>{exif.aperture}</span>
              </div>
            )}
            {exif.focallength && (
              <div
                style={{
                  marginBottom: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Straighten style={{ fontSize: "16px" }} />
                <span>{exif.focallength}</span>
              </div>
            )}
            {exif.exposuretime && (
              <div
                style={{
                  marginBottom: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Timer style={{ fontSize: "16px" }} />
                <span>{exif.exposuretime}</span>
              </div>
            )}
            {exif.iso && (
              <div
                style={{
                  marginBottom: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <GridOn style={{ fontSize: "16px" }} />
                <span>{exif.iso}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
