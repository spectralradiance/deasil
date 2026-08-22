"use client";

import * as React from 'react';
import { Card, CardMedia, CardContent, Typography, CardActionArea, Box } from '@mui/material';
import Link from 'next/link';
import { client } from '../sanity-client';
import imageUrlBuilder from '@sanity/image-url';

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
  categories: {
    title: string;
    slug: {
      current: string;
    };
  }[];
  mainImage: any;
}

async function getPosts() {
  const posts = await client.fetch<Post[]>(`*[_type == "post"] | order(publishedAt desc){
    _id,
    title,
    slug,
    description,
    categories[]->{title, slug},
    mainImage
  }`);
  return posts;
}

export default function WritingPage() {
  const [articles, setArticles] = React.useState<Post[]>([]);

  React.useEffect(() => {
    async function fetchPosts() {
      const posts = await getPosts();
      setArticles(posts);
    }
    fetchPosts();
  }, []);

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Writing
      </Typography>
      <Box sx={{ width: '100%', maxWidth: 1200, display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'space-between', mt: 2 }}>
        {articles.map((article) => (
          <Card key={article._id} elevation={0} sx={{ width: 380, borderRadius: 0, bgcolor: 'transparent', backgroundImage: 'none', boxShadow: 'none' }}>
            <Link href={`/writing/${article.slug.current}`} passHref>
              <CardActionArea component="a" sx={{ bgcolor: 'transparent', backgroundImage: 'none' }}>
                {article.mainImage && (
                  <CardMedia
                    component="img"
                    height="160"
                    image={urlFor(article.mainImage).width(800).url()}
                    alt={article.title}
                  />
                )}
                <CardContent sx={{ px: 0 }}>
                  <Typography gutterBottom variant="h6" component="div">
                    {article.title}
                  </Typography>
                  {article.description && (
                    <Typography variant="body2" color="text.secondary">
                      {article.description}
                    </Typography>
                  )}
                  {article.categories?.length > 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                      {article.categories.map(cat => cat.title).join(', ')}
                    </Typography>
                  )}
                </CardContent>
              </CardActionArea>
            </Link>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
