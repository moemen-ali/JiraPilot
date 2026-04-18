'use client';

import styles from './AgentSelector.module.css';

export default function AgentSelector({ agents, activeId, onSelect }) {
  return (
    <nav className={styles.sidebar}>
      <div className={styles.logo}>
        <span className={styles.logoIcon}>◈</span>
        <span className={styles.logoAgent}>Agent</span>
        <span className={styles.logoDesk}>Desk</span>
      </div>

      <div className={styles.sectionLabel}>Agents</div>

      <ul className={styles.agentList}>
        {agents.map((agent) => (
          <li
            key={agent.id}
            className={`${styles.agentItem} ${agent.id === activeId ? styles.active : ''}`}
            onClick={() => onSelect(agent.id)}
          >
            <div className={styles.agentName}>{agent.name}</div>
            <div className={styles.agentDesc}>{agent.description}</div>
          </li>
        ))}
      </ul>

      <div className={styles.sidebarFooter}>
        <a href="/settings" className={styles.settingsLink}>
          Settings
        </a>
      </div>
    </nav>
  );
}