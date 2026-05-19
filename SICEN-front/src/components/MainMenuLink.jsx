import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import {
  hasCompletedUserTutorial,
  showUserTutorialRequiredSwal,
} from "../utils/userTutorial.js";

/**
 * Enlace del menú principal: bloquea navegación si falta el tutorial.
 */
export function MainMenuLink({ to, children, className, onClick, ...rest }) {
  const { user } = useAuth();

  if (hasCompletedUserTutorial(user)) {
    return (
      <Link to={to} className={className} onClick={onClick} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <a
      href={to}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
        showUserTutorialRequiredSwal();
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
