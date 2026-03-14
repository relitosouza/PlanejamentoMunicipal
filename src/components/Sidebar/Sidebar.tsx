'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

const navItems = [
  { name: 'Dashboard PPA', path: '/ppa', section: 'Planejamento' },
  { name: 'Importar PPA', path: '/ppa/importar' },
  { name: 'Dashboard LDO', path: '/ldo' },
  { name: 'Dashboard LOA', path: '/loa' },
  { name: 'Secretarias', path: '/secretarias', section: 'Configurações' },
  { name: 'Base Legal', path: '/base-legal' },
  { name: 'Auditoria', path: '/auditoria' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        PPA-LDO-LOA
      </div>
      <nav className={styles.nav}>
        {navItems.map((item, index) => (
          <div key={item.path}>
            {item.section && <div className={styles.navSection}>{item.section}</div>}
            <Link 
              href={item.path}
              className={`${styles.navLink} ${pathname.startsWith(item.path) ? styles.active : ''}`}
            >
              {item.name}
            </Link>
          </div>
        ))}
      </nav>
    </aside>
  );
}
