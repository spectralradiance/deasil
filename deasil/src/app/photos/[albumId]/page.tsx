"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PhotoAlbum, { RenderPhoto } from "react-photo-album";
import "react-photo-album/masonry.css";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { Captions } from "yet-another-react-lightbox/plugins";
import "yet-another-react-lightbox/plugins/captions.css";
import { Visibility, VisibilityOff, Camera, CameraAlt, Straighten, Timer, GridOn, PhotoCamera, Lens, LocalOffer, Info } from "@mui/icons-material";

const FLICKR_API_KEY = process.env.NEXT_PUBLIC_FLICKR_API_KEY;
const FLICKR_USER_ID = process.env.NEXT_PUBLIC_FLICKR_USER_ID;

type FlickrPhoto = {
  id: string;
  server: string;
  secret: string;
  title: string;
  url_w?: string;
  width_w?: string;
  height_w?: string;
  datetaken?: string;
  tags?: string;
  description?: { _content: string };
};

type GalleryPhoto = {
  src: string;
  width: number;
  height: number;
  alt: string;
  id: string;
  server: string;
  secret: string;
  title: string;
  datetaken?: string;
  tags?: string[];
  description?: string;
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
  dates?: {
    taken?: string;
  };
  tags?: string[];
};

type AlbumInfo = {
  id: string;
  title: string;
  description: string;
};

function buildFlickrUrl(photo: FlickrPhoto) {
  return `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_b.jpg`;
}

export default function AlbumPage({ params }: { params: { albumId: string } }) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [photoMetadata, setPhotoMetadata] = useState<Record<string, PhotoMetadata>>({});
  const [albumInfo, setAlbumInfo] = useState<AlbumInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCaptions, setShowCaptions] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchAlbumData() {
      try {
        // Fetch album info
        const albumInfoUrl = `https://www.flickr.com/services/rest/?method=flickr.photosets.getInfo&api_key=${FLICKR_API_KEY}&photoset_id=${params.albumId}&format=json&nojsoncallback=1`;
        const albumInfoRes = await fetch(albumInfoUrl);
        const albumInfoData = await albumInfoRes.json();
        
        if (albumInfoData.photoset) {
          setAlbumInfo({
            id: albumInfoData.photoset.id,
            title: albumInfoData.photoset.title._content,
            description: albumInfoData.photoset.description._content,
          });
        }

        // Fetch photos in the album
        const photosUrl = `https://www.flickr.com/services/rest/?method=flickr.photosets.getPhotos&api_key=${FLICKR_API_KEY}&photoset_id=${params.albumId}&format=json&nojsoncallback=1&extras=url_w,o_dims,date_taken,tags,description&per_page=100`;
        const photosRes = await fetch(photosUrl);
        const photosData = await photosRes.json();
        
        if (photosData.photoset && photosData.photoset.photo) {
          const galleryPhotos = photosData.photoset.photo.map((photo: FlickrPhoto) => ({
            src: photo.url_w || buildFlickrUrl(photo),
            width: parseInt(photo.width_w || '800'),
            height: parseInt(photo.height_w || '600'),
            alt: photo.title || 'Photo',
            id: photo.id,
            server: photo.server,
            secret: photo.secret,
            title: photo.title,
            datetaken: photo.datetaken,
            tags: photo.tags ? photo.tags.split(' ').filter(tag => tag.length > 0) : [],
            description: photo.description?._content || '',
          }));
          setPhotos(galleryPhotos);

          // Fetch detailed metadata for each photo
          const metadataPromises = galleryPhotos.map(async (photo: GalleryPhoto) => {
            try {
              const exifUrl = `https://www.flickr.com/services/rest/?method=flickr.photos.getExif&api_key=${FLICKR_API_KEY}&photo_id=${photo.id}&format=json&nojsoncallback=1`;
              const exifRes = await fetch(exifUrl);
              const exifData = await exifRes.json();
              
              const metadata: PhotoMetadata = {};
              
              if (exifData.photo && exifData.photo.exif) {
                metadata.exif = {};
                exifData.photo.exif.forEach((tag: any) => {
                  switch (tag.tag) {
                    case 'FNumber':
                    case 'Aperture':
                      metadata.exif!.aperture = tag.clean?._content || tag.raw?._content;
                      break;
                    case 'FocalLength':
                      metadata.exif!.focallength = tag.clean?._content || tag.raw?._content;
                      break;
                    case 'ISO':
                    case 'ISOSpeedRatings':
                      metadata.exif!.iso = tag.clean?._content || tag.raw?._content;
                      break;
                    case 'ExposureTime':
                    case 'ShutterSpeedValue':
                      metadata.exif!.exposuretime = tag.clean?._content || tag.raw?._content;
                      break;
                    case 'Make':
                    case 'Camera':
                      metadata.exif!.camera = tag.clean?._content || tag.raw?._content;
                      break;
                    case 'Model':
                      if (!metadata.exif!.camera) {
                        metadata.exif!.camera = tag.clean?._content || tag.raw?._content;
                      } else {
                        metadata.exif!.camera += ` ${tag.clean?._content || tag.raw?._content}`;
                      }
                      break;
                    case 'LensModel':
                    case 'Lens':
                      metadata.exif!.lens = tag.clean?._content || tag.raw?._content;
                      break;
                  }
                });
              }
              
              return { photoId: photo.id, metadata };
            } catch (error) {
              console.error(`Error fetching metadata for photo ${photo.id}:`, error);
              return { photoId: photo.id, metadata: {} };
            }
          });

          const metadataResults = await Promise.all(metadataPromises);
          const metadataMap: Record<string, PhotoMetadata> = {};
          metadataResults.forEach(({ photoId, metadata }) => {
            metadataMap[photoId] = metadata;
          });
          setPhotoMetadata(metadataMap);
        }
      } catch (error) {
        console.error('Error fetching album data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAlbumData();
  }, [params.albumId]);

  const handlePhotoClick = ({ index }: { index: number }) => {
    setIndex(index);
    setOpen(true);
  };

  if (loading) {
    return (
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <Link href="/photos" style={{ 
          color: '#007ACC', 
          textDecoration: 'none',
          fontSize: '14px',
          marginBottom: '16px',
          display: 'inline-block'
        }}>
          ← Back to Albums
        </Link>
        <h1>Loading...</h1>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <Link href="/photos" style={{ 
        color: '#007ACC', 
        textDecoration: 'none',
        fontSize: '14px',
        marginBottom: '16px',
        display: 'inline-block'
      }}>
        ← Back to Albums
      </Link>
      
      {albumInfo && (
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ margin: '0 0 8px 0' }}>{albumInfo.title}</h1>
          {albumInfo.description && (
            <p style={{ color: '#666', margin: '0 0 16px 0' }}>
              {albumInfo.description}
            </p>
          )}
          <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>
            {photos.length} photos
          </p>
        </div>
      )}

      {photos.length > 0 ? (
        <>
          <style>{`
            .photo-overlay-wrapper:hover .photo-overlay {
              opacity: 1;
            }
          `}</style>
          <PhotoAlbum
            photos={photos}
            layout="masonry"
            spacing={8}
            columns={(containerWidth: number) => {
              if (containerWidth >= 1200) return 5;
              if (containerWidth >= 900) return 4;
              if (containerWidth >= 600) return 3;
              if (containerWidth >= 400) return 2;
              return 1;
            }}
            onClick={handlePhotoClick}
            renderPhoto={({ photo, wrapperStyle, renderDefaultPhoto }: RenderPhoto<GalleryPhoto>) => (
              <div style={{ ...wrapperStyle, position: 'relative' }} className="photo-overlay-wrapper">
                {renderDefaultPhoto({ wrapped: true })}
                <div
                  className="photo-overlay"
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    color: 'white',
                    padding: '8px',
                    opacity: 0,
                    transition: 'opacity 0.3s ease',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '14px',
                  }}
                >
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      paddingRight: '8px',
                    }}
                  >
                    {photo.title}
                  </span>
                  <Link href={`/photos/${params.albumId}/${photo.id}`} passHref onClick={(e) => e.stopPropagation()}>
                    <Info style={{ fontSize: 20, color: 'white', cursor: 'pointer', minWidth: '20px' }} />
                  </Link>
                </div>
              </div>
            )}
          />
        </>
      ) : (
        <p>No photos found in this album.</p>
      )}

      <Lightbox
        open={open}
        close={() => setOpen(false)}
        index={index}
        plugins={showCaptions ? [Captions] : []}
        toolbar={{
          buttons: [
            <button
              key="toggle-captions"
              type="button"
              title={showCaptions ? "Hide Info" : "Show Info"}
              className="yarl__button"
              onClick={() => setShowCaptions(!showCaptions)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {showCaptions ? (
                <VisibilityOff style={{ fontSize: 24 }} />
              ) : (
                <Visibility style={{ fontSize: 24 }} />
              )}
            </button>,
            "close"
          ],
        }}
        slides={photos.map((photo) => {
          const metadata = photoMetadata[photo.id] || {};
          const exif = metadata.exif || {};
          
          return {
            src: `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_b.jpg`,
            alt: photo.title,
            title: showCaptions ? photo.title : undefined,
            description: showCaptions ? (
              <div style={{ padding: '16px', color: 'white' }}>
                {(photo.datetaken || photo.description || exif.camera || exif.lens || exif.aperture || exif.focallength || exif.exposuretime || exif.iso || (photo.tags && photo.tags.length > 0)) && (
                  <div style={{ fontSize: '0.85em' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                      {/* First Column: Capture Info & Content */}
                      <div>
                        {photo.datetaken && (
                          <div style={{ marginBottom: '8px', fontSize: '0.9em', color: '#ccc' }}>
                            <strong>Captured:</strong><br />
                            {new Date(photo.datetaken).toLocaleDateString('en-US', { 
                              year: 'numeric', month: 'long', day: 'numeric', 
                              hour: '2-digit', minute: '2-digit' 
                            })}
                          </div>
                        )}
                        {photo.description && (
                          <div style={{ marginBottom: '8px', fontSize: '0.9em' }}>
                            <strong>Description:</strong><br />
                            {photo.description}
                          </div>
                        )}
                        {photo.tags && photo.tags.length > 0 && (
                          <div style={{ marginTop: '8px' }}>
                            <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                              <LocalOffer style={{ fontSize: '16px', marginTop: '2px' }} />
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {photo.tags.map((tag, i) => (
                                  <span key={i} style={{ 
                                    backgroundColor: 'rgba(255,255,255,0.2)', 
                                    padding: '2px 6px', 
                                    borderRadius: '12px', 
                                    fontSize: '0.75em' 
                                  }}>
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Second Column: Equipment */}
                      <div>
                        {exif.camera && (
                          <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <PhotoCamera style={{ fontSize: '16px' }} />
                            <span>{exif.camera}</span>
                          </div>
                        )}
                        {exif.lens && (
                          <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Lens style={{ fontSize: '16px' }} />
                            <span>{exif.lens}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Third Column: Camera Settings */}
                      <div>
                        {exif.aperture && (
                          <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Camera style={{ fontSize: '16px' }} />
                            <span>{exif.aperture}</span>
                          </div>
                        )}
                        {exif.focallength && (
                          <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Straighten style={{ fontSize: '16px' }} />
                            <span>{exif.focallength}</span>
                          </div>
                        )}
                        {exif.exposuretime && (
                          <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Timer style={{ fontSize: '16px' }} />
                            <span>{exif.exposuretime}</span>
                          </div>
                        )}
                        {exif.iso && (
                          <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <GridOn style={{ fontSize: '16px' }} />
                            <span>{exif.iso}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
              </div>
            ) : undefined
          };
        })}
      />
    </main>
  );
}