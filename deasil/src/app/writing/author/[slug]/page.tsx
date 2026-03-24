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

interface Author {
  name: string;
  image: any;
  bio: any;
}

async function getAuthor(slug: string) {
  const author = await client.fetch<Author>(
    `*[_type == "author" && slug.current == $slug][0]{
    name,
    image,
    bio
  }`,
    { slug }
  );
  return author;
}

async function getAuthorPosts(slug: string) {
  const posts = await client.fetch<Post[]>(
    `*[_type == "post" && author->slug.current == $slug]{
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

export default function AuthorPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [author, setAuthor] = React.useState<Author | null>(null);

  React.useEffect(() => {
    if (!slug) return;
    async function fetchData() {
      const [authorData, postsData] = await Promise.all([
        getAuthor(slug),
        getAuthorPosts(slug),
      ]);
      setAuthor(authorData);
      setPosts(postsData);
    }
    fetchData();
  }, [slug]);

  return (
    <Box sx={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", mt: 4 }}>
      {author && (
        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', mb: 4, maxWidth: 900, width: '100%' }}>
          <Box sx={{ flex: 1, pr: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              {author.name}
            </Typography>
            {author.bio && <PortableText value={author.bio} />}
          </Box>
          {author.image && (
            <Box
              component="img"
              src={urlFor(author.image).width(200).url()}
              alt={author.name}
              sx={{
                width: 150,
                height: 150,
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
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
