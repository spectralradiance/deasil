import Link from 'next/link';
import AltarIcon from './AltarIcon';
import GlyphIcon from './GlyphIcon';
import SundialIcon from './SundialIcon';

const programs = [
  { href: '/programs/altar', title: 'Altar', icon: <AltarIcon /> },
  { href: '/programs/glyph', title: 'Glyph', icon: <GlyphIcon /> },
  { href: '/programs/sundial', title: 'Sundial', icon: <SundialIcon /> },
];

export default function ProgramsPage() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ display: 'flex', gap: '2rem' }}>
        {programs.map((program) => (
          <Link key={program.href} href={program.href} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              {program.icon}
              <span>{program.title}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
