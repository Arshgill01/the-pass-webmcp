import { formatServiceTime } from "../domain/clock";
import { useKitchenState } from "../app/KitchenProvider";

export function ActivityLog() {
  const state = useKitchenState();
  const entries = [...state.activity].reverse().slice(0, 8);

  return (
    <section className="activity-log" aria-label="Activity evidence">
      <header>
        <h2>Activity</h2>
        <span>Human, agent, and stale writes</span>
      </header>
      {entries.length === 0 ? (
        <p>Board on. Waiting for the first change.</p>
      ) : (
        <ol>
          {entries.map((entry) => (
            <li key={entry.id}>
              <span className={`actor-tag is-${entry.actor}`}>{entry.actor}</span>
              <span>v{entry.version}</span>
              <time>{formatServiceTime(entry.atElapsedMs)}</time>
              <p>{entry.summary}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
