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
  mainImage: any;
  body: any;
}

async function getPosts() {
  const posts = await client.fetch<Post[]>(`*[_type == "post"]{
    _id,
    title,
    slug,
    mainImage,
    body
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
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', mt: 4 }}>
      <Box sx={{ width: '100%', maxWidth: 1200, display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'space-between' }}>
        {articles.map((article) => (
          <Card key={article._id} sx={{ width: 380, borderRadius: 0 }}>
            <Link href={`/writing/${article.slug.current}`} passHref>
              <CardActionArea component="a">
                {article.mainImage && (
                  <CardMedia
                    component="img"
                    height="160"
                    image={urlFor(article.mainImage).width(800).url()}
                    alt={article.title}
                  />
                )}
                <CardContent>
                  <Typography gutterBottom variant="h6" component="div">
                    {article.title}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Link>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
