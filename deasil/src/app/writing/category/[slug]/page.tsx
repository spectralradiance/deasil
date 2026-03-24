"use client";

import * as React from "react";
import { Box, Typography, Card, CardActionArea, CardContent, CardMedia } from "@mui/material";
import { client } from "../../../sanity-client";
import Link from "next/link";
import imageUrlBuilder from "@sanity/image-url";
import { PortableText } from "@portabletext/react";

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
}

interface Category {
  title: string;
  description: any;
}

async function getCategory(slug: string) {
  const category = await client.fetch<Category>(
    `*[_type == "category" && slug.current == $slug][0]{
    title,
    description
  }`,
    { slug }
  );
  return category;
}

async function getCategoryPosts(slug: string) {
  const posts = await client.fetch<Post[]>(
    `*[_type == "post" && $slug in categories[]->slug.current]{
    _id,
    title,
    slug,
    mainImage
  }`,
    { slug }
  );
  return posts;
}

import { useParams } from "next/navigation";

export default function CategoryPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [category, setCategory] = React.useState<Category | null>(null);

  React.useEffect(() => {
    if (!slug) return;
    async function fetchData() {
      const [categoryData, postsData] = await Promise.all([
        getCategory(slug),
        getCategoryPosts(slug),
      ]);
      setCategory(categoryData);
      setPosts(postsData);
    }
    fetchData();
  }, [slug]);

  return (
    <Box sx={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", mt: 4 }}>
      {category && (
        <Box sx={{ textAlign: "center", mb: 4, maxWidth: 700 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            {category.title}
          </Typography>
          {category.description && (
            <Typography variant="body1" color="text.secondary">
              {category.description}
            </Typography>
          )}
        </Box>
      )}
      <Box sx={{ width: "100%", maxWidth: 1200, display: "flex", flexWrap: "wrap", gap: 3, justifyContent: "center" }}>
        {posts.map((article) => (
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
