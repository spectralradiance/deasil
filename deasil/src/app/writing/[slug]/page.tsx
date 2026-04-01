"use client";

import * as React from 'react';
import { Card, CardMedia, CardContent, Typography, Box } from '@mui/material';
import { client } from '../../sanity-client';
import imageUrlBuilder from '@sanity/image-url';
import { PortableText } from '@portabletext/react';
import Link from "next/link";
import TableOfContents from './TableOfContents';

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

  const slugify = (text: string) => {
    return text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  };

  const components = {
    block: {
      h2: ({children}: any) => {
        const text = children.map((child: any) => typeof child === 'string' ? child : child.props.children).join('');
        const id = slugify(text);
        return <Typography variant="h2" id={id} sx={{ mt: 4, mb: 2 }}>{children}</Typography>;
      },
      h3: ({children}: any) => {
        const text = children.map((child: any) => typeof child === 'string' ? child : child.props.children).join('');
        const id = slugify(text);
        return <Typography variant="h3" id={id} sx={{ mt: 3, mb: 1 }}>{children}</Typography>;
      },
      h4: ({children}: any) => {
        const text = children.map((child: any) => typeof child === 'string' ? child : child.props.children).join('');
        const id = slugify(text);
        return <Typography variant="h4" id={id} sx={{ mt: 2, mb: 1 }}>{children}</Typography>;
      },
    },
  };

  if (!article) return <Box sx={{ p: 4 }}>Article not found.</Box>;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', p: 4 }}>
      {article.body && <TableOfContents body={article.body} />}
      <Box sx={{ flexGrow: 1, maxWidth: 700, mx: "auto", px: 2 }}>
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
          <Card sx={{ mb: 2 }}>
            <CardMedia
              component="img"
              height="300"
              image={urlFor(article.mainImage).width(1400).url()}
              alt={article.title}
            />
          </Card>
        )}
        {article.body && <PortableText value={article.body} components={components} />}
      </Box>
    </Box>
  );
}
