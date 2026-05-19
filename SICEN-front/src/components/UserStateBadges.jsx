import { getActiveUserStates } from "../constants/userStates.js";

const TITLE = "Especializaciones del usuario:";
const COLLAPSE_ID = "user-state-badges-collapse";

/**
 * @param {{ active: ReturnType<typeof getActiveUserStates> }} props
 */
function BadgeList({ active }) {
  return (
    <div className="d-flex flex-column gap-2">
      {active.map((state) => (
        <div
          key={state.code}
          className="user-state-badge rounded-2 d-flex align-items-center justify-content-between gap-2"
        >
          <span className="user-state-badge__text">{state.name}</span>
          <i
            className={`user-state-badge__icon bi ${state.icon} flex-shrink-0`}
            aria-hidden="true"
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Barras de habilitaciones activas (sidebar inicio).
 * @param {{ states?: unknown }} props
 */
export function UserStateBadges({ states }) {
  const active = getActiveUserStates(states);
  if (active.length === 0) return null;

  return (
    <section className="user-state-badges mt-3">
      <div
        className="d-none d-xl-block"
        aria-labelledby="user-state-badges-title-desktop"
      >
        <h6
          id="user-state-badges-title-desktop"
          className="user-state-badges__title text-muted mb-3"
        >
          {TITLE}
        </h6>
        <BadgeList active={active} />
      </div>

      <div className="accordion user-state-badges-accordion d-xl-none">
        <div className="accordion-item border-0 bg-transparent">
          <h2 className="accordion-header">
            <button
              className="accordion-button collapsed user-state-badges__title user-state-badges-accordion__toggle text-muted"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target={`#${COLLAPSE_ID}`}
              aria-expanded="false"
              aria-controls={COLLAPSE_ID}
            >
              {TITLE}
            </button>
          </h2>
          <div
            id={COLLAPSE_ID}
            className="accordion-collapse collapse"
            data-bs-parent=".user-state-badges-accordion"
          >
            <div className="accordion-body user-state-badges-accordion__body">
              <BadgeList active={active} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
