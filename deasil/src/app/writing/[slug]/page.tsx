import * as React from 'react';
import { Card, CardMedia, CardContent, Typography, Box } from '@mui/material';

// Example articles data (should match slugs in writing/page.tsx)
const articles = [
  {
    slug: 'first-article',
    title: 'First Article',
    description: 'This is the description for the first article.',
  image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800',
    content: 'Full content for the first article goes here.'
  },
  {
    slug: 'second-article',
    title: 'Second Article',
    description: 'This is the description for the second article.',
  image: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=800',
    content: 'Full content for the second article goes here.'
  },
  {
    slug: 'third-article',
    title: 'Third Article',
    description: 'This is the description for the third article.',
  image: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=800',
    content: 'Full content for the third article goes here.'
  },
];

export async function generateStaticParams() {
  return articles.map(article => ({ slug: article.slug }));
}

export default function ArticleDetailPage({ params }: { params: { slug: string } }) {
  const article = articles.find(a => a.slug === params.slug);
  if (!article) return <Box sx={{ p: 4 }}>Article not found.</Box>;
  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', mt: 4 }}>
      <Card>
        <CardMedia
          component="img"
          height="260"
          image={article.image}
          alt={article.title}
        />
        <CardContent>
          <Typography gutterBottom variant="h4" component="div">
            {article.title}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {article.description}
          </Typography>
          <Typography variant="body1">
            {article.content}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
