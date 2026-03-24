"use client";

import * as React from 'react';
import { Card, CardMedia, CardContent, Typography, Box } from '@mui/material';
import { client } from '../../sanity-client';
import imageUrlBuilder from '@sanity/image-url';
import { PortableText } from '@portabletext/react';
import Link from "next/link";

const builder = imageUrlBuilder(client);

function urlFor(source: any) {
  return builder.image(source);
}

interface Post {
  _id: string;
  title: string;
  slug: {
    current: string;
  };
  description: string;
  author: {
    name: string;
    slug: {
      current: string;
    };
  };
  publishedAt: string;
  categories: {
    title: string;
    slug: {
      current: string;
    };
  }[];
  mainImage: any;
  body: any;
}

async function getPost(slug: string) {
  const post = await client.fetch<Post>(
    `*[_type == "post" && slug.current == $slug][0]{
    _id,
    title,
    slug,
    description,
    author->{name, slug},
    publishedAt,
    categories[]->{title, slug},
    mainImage,
    body
  }`,
    { slug }
  );
  return post;
}

import { useParams } from "next/navigation";
// ... existing code
export default function ArticleDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [article, setArticle] = React.useState<Post | null>(null);

  React.useEffect(() => {
    if (!slug) return;
    async function fetchPost() {
      const post = await getPost(slug);
      setArticle(post);
    }
    fetchPost();
  }, [slug]);

  if (!article) return <Box sx={{ p: 4 }}>Article not found.</Box>;

  return (
    <Box sx={{ maxWidth: 700, mx: "auto", my: 4, px: 2 }}>
      <Typography gutterBottom variant="h2" component="div">
        {article.title}
      </Typography>
      {article.description && (
        <Typography variant="h5" color="text.secondary" sx={{ mb: 2 }}>
          {article.description}
        </Typography>
      )}
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        {article.author && article.author.slug && (
          <Link href={`/writing/author/${article.author.slug.current}`} passHref>
            <Typography component="a" variant="body2" sx={{ mr: 1, textDecoration: 'none', color: 'inherit' }}>
              By {article.author.name}
            </Typography>
          </Link>
        )}
        {article.publishedAt && (
          <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
            | {new Date(article.publishedAt).toLocaleDateString()}
          </Typography>
        )}
        {article.categories && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
              |
            </Typography>
            {article.categories.map((cat, index) => (
              cat.slug && <Link href={`/writing/category/${cat.slug.current}`} passHref key={cat.slug.current}>
                <Typography component="a" variant="body2" color="text.secondary" sx={{ textDecoration: 'none', color: 'inherit' }}>
                  {cat.title}
                  {index < article.categories.length - 1 && ", "}
                </Typography>
              </Link>
            ))}
          </Box>
        )}
      </Box>
      {article.mainImage && (
        <Box
          component="img"
          src={urlFor(article.mainImage).url()}
          alt={article.title}
          sx={{
            width: "100%",
            height: "auto",
            maxHeight: "400px",
            objectFit: "cover",
            my: 3,
          }}
        />
      )}
      <Box
        sx={{
          "& p": {
            fontSize: "1.1rem",
            lineHeight: "1.7",
          },
        }}
      >
        <PortableText value={article.body} />
      </Box>
    </Box>
  );
}
