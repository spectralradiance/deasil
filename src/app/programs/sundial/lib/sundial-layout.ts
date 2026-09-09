// MUI sx helpers for the shared clock-box + slide-in info-panel layout used by all four clock sections.

// Shared MUI sx helpers for the clock + slide-in info panel layout.
// The clock stays a fixed width; only the narrow info panel slides in/out beside it
// (open width is ~25% of the combined open footprint, closed width is 0).

export const clockBoxSx = () => ({
  position: 'relative' as const,
  flexShrink: 0,
  width: { xs: '100%', md: '630px' },
  '& > svg': { width: '100%', height: 'auto', display: 'block' },
});

// Info panel container: width handles layout, content translates for slide-from-behind visual
export const infoPanelSx = (open: boolean) => ({
  flexShrink: 0,
  overflow: 'hidden',
  width:     { xs: '100%', md: open ? '210px' : '0px' },
  maxHeight: { xs: open ? '900px' : '0px', md: 'none' },
  transition: 'width 0.45s cubic-bezier(0.4,0,0.2,1), max-height 0.45s cubic-bezier(0.4,0,0.2,1)',
});

export const infoPanelContentSx = (open: boolean) => ({
  p: 2,
  minWidth: { md: '210px' },
  overflowX: 'hidden' as const,
  transform: open ? 'translateX(0)' : 'translateX(-32px)',
  opacity: open ? 1 : 0,
  transition: 'transform 0.45s cubic-bezier(0.4,0,0.2,1), opacity 0.3s cubic-bezier(0.4,0,0.2,1)',
});
