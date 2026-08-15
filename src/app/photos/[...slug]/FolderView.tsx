// Renders a masonry grid of sub-folders and albums for a given folder node.

"use client";

import Image from "next/image";
import Link from "next/link";
import Masonry from "@mui/lab/Masonry";
import FolderOpen from "@mui/icons-material/FolderOpen";
import type { FolderData } from "./types";
import { getCoverUrl } from "./utils";

interface Props {
  folderData: FolderData;
  parentPath: string;
}

export default function FolderView({ folderData, parentPath }: Props) {
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
                    bottom: 0, left: 0, right: 0,
                    background: "linear-gradient(transparent, rgba(0,0,0,0.75))",
                    padding: "32px 12px 12px",
                    color: "white",
                  }}
                >
                  <div style={{ fontWeight: "bold", fontSize: "0.95em", textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: "0.78em", color: "#ccc", marginTop: 2 }}>{subtitle}</div>
                </div>
              </div>
            </Link>
          );
        })}
      </Masonry>
    </main>
  );
}
