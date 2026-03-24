import * as React from 'react';
import { Card, CardMedia, CardContent, Typography, CardActionArea, Box } from '@mui/material';
import Link from 'next/link';

// Example articles data
const articles = [
  {
    slug: 'introduction-to-spiritual-ecology',
    title: 'Introduction to Spiritual Ecology',
    description: 'Spiritual ecology explores the ',
  image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800',
  },
  {
    slug: 'second-article',
    title: 'Second Article',
    description: 'This is the description for the second article.',
  image: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=800',
  },
  {
    slug: 'third-article',
    title: 'Third Article',
    description: 'This is the description for the third article.',
  image: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=800',
  },
];

export default function WritingPage() {
  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', mt: 4 }}>
      <Box sx={{ width: '100%', maxWidth: 1200, display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'space-between' }}>
        {articles.map((article) => (
          <Card key={article.slug} sx={{ width: 380, borderRadius: 0 }}>
            <Link href={`/writing/${article.slug}`} passHref>
              <CardActionArea component="a">
                <CardMedia
                  component="img"
                  height="160"
                  image={article.image}
                  alt={article.title}
                />
                <CardContent>
                  <Typography gutterBottom variant="h6" component="div">
                    {article.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {article.description}
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
