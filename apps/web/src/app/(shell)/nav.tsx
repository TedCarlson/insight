import NavDefault, { Nav as NavNamed } from "../_nav";

// Supports either:
// - export default function ...
// - export function Nav ...
const Nav = (NavDefault ?? NavNamed) as unknown as React.ComponentType;

export default Nav;
