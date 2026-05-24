export function TabNavigation({ label = "Overview" }: { label?: string }) {
  return (
    <nav className="tab-navigation">
      <span className="tab-link active">{label}</span>
    </nav>
  );
}
