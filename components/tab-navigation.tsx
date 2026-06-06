type TabItem = {
  label: string;
  href: string;
};

export function TabNavigation({
  label = "Overview",
  tabs,
  onSelect,
}: {
  label?: string;
  tabs?: TabItem[];
  onSelect?: (label: string) => void;
}) {
  if (!tabs?.length) return null;

  return (
    <nav className="tab-navigation" aria-label="Profile sections">
      {tabs.map((tab) => (
        onSelect ? (
          <button className={`tab-link ${tab.label === label ? "active" : ""}`} type="button" onClick={() => onSelect(tab.label)} key={tab.label}>
            {tab.label}
          </button>
        ) : (
          <a className={`tab-link ${tab.label === label ? "active" : ""}`} href={tab.href} key={tab.label}>
            {tab.label}
          </a>
        )
      ))}
    </nav>
  );
}
