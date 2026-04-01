"use client";
import React, { useState, useEffect } from 'react';
import { Accordion, AccordionSummary, AccordionDetails, Typography, List, ListItem, ListItemText, Box } from '@mui/material';
import TocIcon from '@mui/icons-material/Toc';

interface Heading {
  _key: string;
  style: string;
  children: { text: string }[];
}

interface TableOfContentsProps {
  body: any[];
}

const TableOfContents: React.FC<TableOfContentsProps> = ({ body }) => {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    const extractedHeadings = body.filter(
      (block) => block._type === 'block' && block.style && (block.style.startsWith('h2') || block.style.startsWith('h3') || block.style.startsWith('h4'))
    );
    setHeadings(extractedHeadings);
  }, [body]);

  if (headings.length === 0) {
    return null;
  }

  const getHeadingText = (heading: Heading) => {
    return heading.children.map(child => child.text).join('');
  };

  const slugify = (text: string) => {
    return text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  };

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>, targetId: string) => {
    e.preventDefault();
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <Box sx={{ position: 'sticky', top: 100, width: expanded ? 200 : 56, zIndex: 1000, transition: 'width 0.3s ease-in-out', alignSelf: 'flex-start' }}>
      <Accordion expanded={expanded} onChange={() => setExpanded(!expanded)} sx={{ boxShadow: 'none', backgroundColor: 'transparent', bacjkground: 'transparent', border: 'none' }}>
        <AccordionSummary
          aria-controls="panel1a-content"
          id="panel1a-header"
        >
          <TocIcon />
        </AccordionSummary>
        <AccordionDetails>
          <List dense>
            {headings.map((heading) => {
              const text = getHeadingText(heading);
              const id = slugify(text);
              const style = {
                paddingLeft: heading.style === 'h3' ? 2 : (heading.style === 'h4' ? 4 : 0)
              };
              return (
                <ListItem key={heading._key} sx={style}>
                  <a href={`#${id}`} onClick={(e) => handleScroll(e, id)} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <ListItemText primary={text} />
                  </a>
                </ListItem>
              );
            })}
          </List>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default TableOfContents;
