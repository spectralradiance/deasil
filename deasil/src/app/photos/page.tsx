"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

const FLICKR_API_KEY = process.env.NEXT_PUBLIC_FLICKR_API_KEY;
const FLICKR_USER_ID = process.env.NEXT_PUBLIC_FLICKR_USER_ID;

type FlickrAlbum = {
  id: string;
  title: {
    _content: string;
  };
  description: {
    _content: string;
  };
  photos: number;
  primary: string;
  secret: string;
  server: string;
};

type Album = {
  id: string;
  title: string;
  description: string;
  photoCount: number;
  coverPhoto: string;
};

function buildAlbumCoverUrl(album: FlickrAlbum) {
  return `https://live.staticflickr.com/${album.server}/${album.primary}_${album.secret}_b.jpg`;
}

export default function PhotosPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAlbums() {
      try {
        const url = `https://www.flickr.com/services/rest/?method=flickr.photosets.getList&api_key=${FLICKR_API_KEY}&user_id=${FLICKR_USER_ID}&format=json&nojsoncallback=1&per_page=50`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.photosets && data.photosets.photoset) {
          const albumList = data.photosets.photoset.map((album: FlickrAlbum) => ({
            id: album.id,
            title: album.title._content,
            description: album.description._content,
            photoCount: album.photos,
            coverPhoto: buildAlbumCoverUrl(album),
          }));
          setAlbums(albumList);
        }
      } catch (error) {
        console.error('Error fetching albums:', error);
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
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
        gap: '16px',
        marginTop: '24px'
      }}>
        {albums.map((album) => (
          <Link 
            key={album.id} 
            href={`/photos/${album.id}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div style={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '8px',
              transition: 'transform 0.2s, box-shadow 0.2s',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            }}>
              <Image
                src={album.coverPhoto}
                alt={album.title}
                width={800}
                height={600}
                style={{ 
                  width: '100%', 
                  height: 'auto',
                  display: 'block'
                }}
              />
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                padding: '40px 20px 20px 20px',
                color: 'white'
              }}>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: '1.4em', 
                  fontWeight: 'bold',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                }}>
                  {album.title}
                </h3>
                <p style={{
                  margin: '8px 0 0 0',
                  fontSize: '0.9em',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }}>
                  {album.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}