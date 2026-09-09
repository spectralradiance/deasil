"use client";
import Link from 'next/link';
import AltarIcon from './AltarIcon';
import AriaIcon from './AriaIcon';
import SundialIcon from './SundialIcon';

const programs = [
  { href: '/programs/altar', title: 'Altar', description: 'Tarot, runes, and ogham divination', icon: <AltarIcon /> },
  { href: '/programs/aria', title: 'Aria', description: 'A generative music tracker', icon: <AriaIcon /> },
  { href: '/programs/sundial', title: 'Sundial', description: 'Solar, lunar, and yearly clocks', icon: <SundialIcon /> },
];

export default function ProgramsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem' }}>
      <h1 style={{ marginBottom: '2rem' }}>Programs</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: 400 }}>
        {programs.map((program) => (
          <Link key={program.href} href={program.href} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '8px' }}>
              {program.icon}
              <div>
                <div style={{ fontWeight: 600, fontSize: '1.3em' }}>{program.title}</div>
                <div style={{ fontSize: '1em', opacity: 0.65, marginTop: 2 }}>{program.description}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
