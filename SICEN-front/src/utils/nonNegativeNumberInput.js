/**
 * `onKeyDown` para `<input type="number">`: evita signo menos/más y notación científica.
 */
export function preventNegativeNumberKeys(e) {
  if (["-", "+", "e", "E"].includes(e.key)) {
    e.preventDefault();
  }
}
