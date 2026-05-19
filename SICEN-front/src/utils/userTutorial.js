import Swal from "sweetalert2";

export const USER_TUTORIAL_REQUIRED_CODE = "USER_TUTORIAL_REQUIRED";

export const USER_TUTORIAL_SWAL_TEXT =
  'Para utilizar el sistema primero debe completar el curso "Manual usuario", que puede encontrar en las opciones del menú ubicado debajo de sus datos personales.';

/**
 * @param {{ userTutorial?: boolean } | null | undefined} user
 */
export function hasCompletedUserTutorial(user) {
  return user?.userTutorial === true;
}

export function showUserTutorialRequiredSwal() {
  return Swal.fire({
    icon: "info",
    title: "Curso pendiente",
    text: USER_TUTORIAL_SWAL_TEXT,
    confirmButtonText: "Entendido",
  });
}

/**
 * @param {unknown} err
 */
export function isUserTutorialRequiredError(err) {
  return (
    err?.status === 403 &&
    err?.data?.code === USER_TUTORIAL_REQUIRED_CODE
  );
}
