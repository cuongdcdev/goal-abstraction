import Link from 'next/link';

import styles from '@/styles/app.module.css';

export const Cards = () => {
  return (
    <div className={styles.grid}>

      <Link
        href="/hello-near"
        className={styles.card}
        rel="noopener noreferrer"
      >
        <h2>
          Near Integration <span>-&gt;</span>
        </h2>
        <p>Discover how simple it is to interact with a Near smart contract.</p>
      </Link>
    </div>
  );
};