"use client";
import React, { useState, useEffect } from 'react';
import { Box, List, ListItem, ListItemText, IconButton } from '@mui/material';
import TocIcon from '@mui/icons-material/Toc';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

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
  const [panelOpen, setPanelOpen] = useState(true);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setHeadings(body.filter(
      (block) => block._type === 'block' && block.style &&
        (block.style.startsWith('h2') || block.style.startsWith('h3') || block.style.startsWith('h4'))
    ));
  }, [body]);

  const getHeadingText = (heading: Heading) => heading.children.map((c) => c.text).join('');
  const slugify = (text: string) => text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

  // Sync heading element colors to hover/active state
  useEffect(() => {
    headings.forEach((heading) => {
      const id = slugify(getHeadingText(heading));
      const el = document.getElementById(id);
      if (!el) return;
      if (id === hoveredId)     el.style.color = '#FFFACD';
      else if (id === activeId) el.style.color = '#D4A017';
      else                      el.style.color = '';
    });
    return () => {
      headings.forEach((heading) => {
        const el = document.getElementById(slugify(getHeadingText(heading)));
        if (el) el.style.color = '';
      });
    };
  }, [hoveredId, activeId, headings]);

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setActiveId(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleChapter = (id: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (headings.length === 0) return null;

  type HeadingItem = { heading: Heading; id: string; text: string };
  type Chapter = HeadingItem & { subheadings: HeadingItem[] };

  // Group h2s as chapters; orphaned h3/h4s attach to the last chapter
  const chapters = headings.reduce<Chapter[]>((acc, heading) => {
    const text = getHeadingText(heading);
    const id = slugify(text);
    if (heading.style === 'h2') {
      acc.push({ heading, id, text, subheadings: [] });
    } else if (acc.length > 0) {
      acc[acc.length - 1].subheadings.push({ heading, id, text });
    }
    return acc;
  }, []);

  const linkColor = (id: string) =>
    id === hoveredId ? '#FFFACD' : id === activeId ? '#D4A017' : 'inherit';

  return (
    <>
      {/* Toggle button — always visible at article's left edge */}
      <IconButton
        onClick={() => setPanelOpen((v) => !v)}
        title={panelOpen ? 'Hide contents' : 'Show contents'}
        sx={{ position: 'fixed', right: 'calc(50vw + 350px + 4px)', top: 108, zIndex: 1001 }}
      >
        <TocIcon />
      </IconButton>

      {/* Sliding panel — translates right (behind article) when closed */}
      <Box sx={{
        position: 'fixed',
        right: 'calc(50vw + 350px + 48px)',
        top: 100,
        width: 200,
        maxHeight: 'calc(100vh - 116px)',
        overflowY: 'auto',
        textAlign: 'right',
        zIndex: 1000,
        transform: panelOpen ? 'translateX(0)' : 'translateX(252px)',
        opacity: panelOpen ? 1 : 0,
        pointerEvents: panelOpen ? 'auto' : 'none',
        transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.35s',
      }}>
        <List dense disablePadding>
          {chapters.map((chapter) => (
            <React.Fragment key={chapter.heading._key}>
              <ListItem disablePadding sx={{ justifyContent: 'flex-end' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'flex-end', gap: 0.25 }}>
                  {chapter.subheadings.length > 0 && (
                    <IconButton
                      size="small"
                      onClick={() => toggleChapter(chapter.id)}
                      sx={{ p: 0, flexShrink: 0 }}
                    >
                      {expandedChapters.has(chapter.id)
                        ? <ExpandLessIcon fontSize="small" />
                        : <ExpandMoreIcon fontSize="small" />}
                    </IconButton>
                  )}
                  <a
                    href={`#${chapter.id}`}
                    onClick={(e) => handleScroll(e, chapter.id)}
                    onMouseEnter={() => setHoveredId(chapter.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{ textDecoration: 'none', color: linkColor(chapter.id), transition: 'color 0.15s' }}
                  >
                    <ListItemText primary={chapter.text} />
                  </a>
                </Box>
              </ListItem>

              {expandedChapters.has(chapter.id) && chapter.subheadings.map((sub) => (
                <ListItem
                  key={sub.heading._key}
                  disablePadding
                  sx={{ pl: sub.heading.style === 'h4' ? 4 : 2, justifyContent: 'flex-end' }}
                >
                  <a
                    href={`#${sub.id}`}
                    onClick={(e) => handleScroll(e, sub.id)}
                    onMouseEnter={() => setHoveredId(sub.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{ textDecoration: 'none', color: linkColor(sub.id), transition: 'color 0.15s' }}
                  >
                    <ListItemText primary={sub.text} />
                  </a>
                </ListItem>
              ))}
            </React.Fragment>
          ))}
        </List>
      </Box>
    </>
  );
};

export default TableOfContents;
