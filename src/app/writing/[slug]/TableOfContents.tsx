"use client";
import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  Box, Collapse, List, ListItem, ListItemText, IconButton,
  Dialog, DialogTitle, DialogContent, useMediaQuery, useTheme,
} from '@mui/material';
import { TocContext } from '../../TocContext';
import TocIcon from '@mui/icons-material/Toc';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CloseIcon from '@mui/icons-material/Close';

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
  const { tocOpen, setTocOpen, setHasToc } = useContext(TocContext);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    setHeadings(body.filter(
      (block) => block._type === 'block' && block.style &&
        (block.style.startsWith('h2') || block.style.startsWith('h3') || block.style.startsWith('h4'))
    ));
  }, [body]);

  useEffect(() => () => {
    if (activeTimerRef.current) clearTimeout(activeTimerRef.current);
  }, []);

  useEffect(() => {
    setHasToc(true);
    return () => setHasToc(false);
  }, [setHasToc]);

  const getHeadingText = (heading: Heading) => heading.children.map((c) => c.text).join('');
  const slugify = (text: string) => text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

  // Active takes priority over hover when syncing heading element colors
  useEffect(() => {
    headings.forEach((heading) => {
      const id = slugify(getHeadingText(heading));
      const el = document.getElementById(id);
      if (!el) return;
      if (id === activeId)       el.style.color = '#D4A017';
      else if (id === hoveredId) el.style.color = '#FFFACD';
      else                       el.style.color = '';
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
    if (activeTimerRef.current) clearTimeout(activeTimerRef.current);
    setActiveId(id);
    activeTimerRef.current = setTimeout(() => setActiveId(null), 1000);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    if (isMobile) setTocOpen(false);
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

  // Active (gold flash) takes priority over hover (light yellow)
  const linkColor = (id: string) =>
    id === activeId ? '#D4A017' : id === hoveredId ? '#FFFACD' : 'inherit';

  const tocList = () => (
    <List dense disablePadding>
      {chapters.map((chapter) => (
        <React.Fragment key={chapter.heading._key}>
          <ListItem disablePadding>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%', gap: 0.5 }}>
              <a
                href={`#${chapter.id}`}
                onClick={(e) => {
                  handleScroll(e, chapter.id);
                  if (chapter.subheadings.length > 0)
                    setExpandedChapters((prev) => new Set(prev).add(chapter.id));
                }}
                onMouseEnter={() => setHoveredId(chapter.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{ textDecoration: 'none', color: linkColor(chapter.id), transition: 'color 0.15s', flex: 1 }}
              >
                <ListItemText primary={chapter.text} />
              </a>
              {chapter.subheadings.length > 0 && (
                <IconButton
                  size="small"
                  onClick={() => toggleChapter(chapter.id)}
                  sx={{ p: 0, flexShrink: 0, mt: 0.5 }}
                >
                  {expandedChapters.has(chapter.id)
                    ? <ExpandLessIcon fontSize="small" />
                    : <ExpandMoreIcon fontSize="small" />}
                </IconButton>
              )}
            </Box>
          </ListItem>
          <Collapse in={expandedChapters.has(chapter.id)} timeout={250} unmountOnExit>
            {chapter.subheadings.map((sub) => (
              <ListItem
                key={sub.heading._key}
                disablePadding
                sx={{ pl: sub.heading.style === 'h4' ? 4 : 2 }}
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
          </Collapse>
        </React.Fragment>
      ))}
    </List>
  );

  if (isMobile) {
    return (
      <Dialog open={tocOpen} onClose={() => setTocOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ pr: 6 }}>
          Contents
          <IconButton
            onClick={() => setTocOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {tocList()}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <IconButton
        onClick={() => setPanelOpen((v) => !v)}
        title={panelOpen ? 'Hide contents' : 'Show contents'}
        sx={{ position: 'fixed', right: 'calc(50vw + 350px + 4px)', top: 108, zIndex: 1001 }}
      >
        <TocIcon />
      </IconButton>
      <Box sx={{
        position: 'fixed',
        right: 'calc(50vw + 350px + 48px)',
        top: 100,
        width: 'max-content',
        minWidth: 180,
        maxWidth: 'min(600px, calc(50vw - 350px - 60px))',
        maxHeight: 'calc(100vh - 116px)',
        overflowY: 'auto',
        zIndex: 1000,
        transform: panelOpen ? 'translateX(0)' : 'translateX(calc(100% + 52px))',
        opacity: panelOpen ? 1 : 0,
        pointerEvents: panelOpen ? 'auto' : 'none',
        transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.35s',
      }}>
        {tocList()}
      </Box>
    </>
  );
};

export default TableOfContents;
