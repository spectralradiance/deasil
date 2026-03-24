"use client";

import React from "react";
import { MasonryPhotoAlbum } from "react-photo-album";
import "react-photo-album/masonry.css";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

// Example stock photos (Unsplash)
const photos = [
    {
        src: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800",
        width: 800,
        height: 1200,
        alt: "A winding path through a misty green forest.",
    },
    {
        src: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800",
        width: 800,
        height: 534,
        alt: "A boat on a calm lake in front of alpine mountains.",
    },
    {
        src: "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=800",
        width: 800,
        height: 533,
        alt: "A winding road along a scenic coastline.",
    },
    {
        src: "https://images.unsplash.com/photo-1483728642387-6c351b40b3ac?w=800",
        width: 800,
        height: 534,
        alt: "Snow-covered mountains under a clear blue sky.",
    },
    {
        src: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800",
        width: 800,
        height: 534,
        alt: "Cityscape view from above with dense buildings.",
    },
    {
        src: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800",
        width: 800,
        height: 533,
        alt: "A sunbeam shines through a foggy forest.",
    },
    {
        src: "https://images.unsplash.com/photo-1507525428034-b723a9ce6890?w=800",
        width: 800,
        height: 533,
        alt: "Gentle waves washing up on a sandy beach at sunset.",
    },
    {
        src: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800",
        width: 800,
        height: 533,
        alt: "The aurora borealis over a dark forest.",
    },
    {
        src: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800",
        width: 800,
        height: 1199,
        alt: "Dramatic coastal cliffs meeting a rough sea.",
    },
    {
        src: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800",
        width: 800,
        height: 533,
        alt: "A lone tree in a golden wheat field under a vast sky.",
    },
    {
        src: "https://images.unsplash.com/photo-1431794062232-2a99a5431c6c?w=800",
        width: 800,
        height: 1200,
        alt: "A powerful waterfall cascading down mossy rocks.",
    },
    {
        src: "https://images.unsplash.com/photo-1532974297617-c0f05fe48bff?w=800",
        width: 800,
        height: 533,
        alt: "Colorful hot air balloons floating over a landscape at sunrise.",
    },
    {
        src: "https://images.unsplash.com/photo-1443632864897-14973fa006cf?w=800",
        width: 800,
        height: 533,
        alt: "A vast canyon with orange rock formations.",
    },
    {
        src: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800",
        width: 800,
        height: 533,
        alt: "A tropical beach with palm trees and clear turquoise water.",
    },
    {
        src: "https://images.unsplash.com/photo-1433838552652-f9a46b332c40?w=800",
        width: 800,
        height: 533,
        alt: "Lush green rolling hills in the countryside.",
    },
    {
        src: "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=800",
        width: 800,
        height: 533,
        alt: "Sand dunes in a desert under a clear blue sky.",
    },
    {
        src: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800",
        width: 800,
        height: 1200,
        alt: "A wooden cabin in a snowy, foggy forest.",
    },
    {
        src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
        width: 800,
        height: 533,
        alt: "The Milky Way galaxy over a mountain range.",
    },
    {
        src: "https://images.unsplash.com/photo-1507725954473-d35da694a5ab?w=800",
        width: 800,
        height: 533,
        alt: "A white lighthouse on a rocky coast during sunset.",
    },
    {
        src: "https://images.unsplash.com/photo-1526481280643-33c94628b673?w=800",
        width: 800,
        height: 533,
        alt: "A red Japanese temple with a pagoda roof and cherry blossoms.",
    },
];

export default function PhotosPage() {
	const [open, setOpen] = React.useState(false);
	const [index, setIndex] = React.useState(0);

	const handlePhotoClick = ({ index }: { index: number }) => {
		setIndex(index);
		setOpen(true);
	};

	return (
		<main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
			<h1>
				Photo Gallery
			</h1>
			<MasonryPhotoAlbum
				photos={photos}
				spacing={8}
				columns={5}
				onClick={handlePhotoClick}
			/>
			<Lightbox
				open={open}
				close={() => setOpen(false)}
				index={index}
				slides={photos.map(({ src, alt }) => ({ src, alt }))}
			/>
		</main>
	);
}
