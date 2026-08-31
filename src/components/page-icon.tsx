export default function PageIcon({ type }: { type: "lost" | "check" | "question" | "lock" }) {
  const paths = {
    lost: <><path d="M7 7h10v10H7z"/><path d="m4 4 3 3m10 10 3 3M17 7l3-3M7 17l-3 3"/></>,
    check: <><path d="M5 12.5 10 17l9-10"/><path d="M4 4h16v16H4z"/></>,
    question: <><path d="M9.5 9a2.7 2.7 0 1 1 4.5 2c-1.3 1-2 1.4-2 3"/><path d="M12 18h.01"/><circle cx="12" cy="12" r="9"/></>,
    lock: <><rect x="5" y="10" width="14" height="10"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v2"/></>,
  };
  return <svg className="page-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">{paths[type]}</svg>;
}
