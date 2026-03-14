'use client';

import styles from './Topbar.module.css';

export default function Topbar() {
  return (
    <header className={styles.topbar}>
      <div className={styles.searchWrapper}>
        <span className={styles.searchIcon}>🔍</span>
        <input 
          type="text" 
          placeholder="Pesquisar..." 
          className={styles.searchInput}
        />
      </div>
      <div className={styles.right}>
        <div className={styles.notifications}>
          <span style={{ fontSize: '1.2rem', cursor: 'pointer' }}>🔔</span>
        </div>
        <div className={styles.userProfile}>
          <div className={styles.avatar}>U</div>
          <span className={styles.userName}>Usuário Administrador</span>
        </div>
      </div>
    </header>
  );
}
