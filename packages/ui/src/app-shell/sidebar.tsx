'use client';

import { cn } from '../lib/cn';
import { Tooltip } from '../ui/tooltip';
import type { NavGroup, NavItem } from './types';

/** Minimal link component contract so apps can pass `next/link`. */
export type LinkComponent = React.ComponentType<
  { href: string; className?: string; 'aria-current'?: 'page' | undefined } & {
    children: React.ReactNode;
  }
>;

export interface SidebarProps {
  groups: NavGroup[];
  /** Current path — drives active highlighting. */
  pathname: string;
  collapsed?: boolean;
  /** Brand wordmark (top of the rail). */
  brand: React.ReactNode;
  /** Link component (e.g. next/link). Falls back to <a>. */
  link?: LinkComponent;
  /** aria-label for the <nav>. */
  navLabel?: string;
  /** Suffix appended to disabled "coming soon" items, e.g. "Soon". */
  comingSoonLabel?: string;
  /** Invoked when a nav link is activated (used to close the mobile drawer). */
  onNavigate?: () => void;
  className?: string;
}

/** Active when the path equals the href or is nested under it. Root is exact. */
function isActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

const DefaultLink: LinkComponent = ({ href, className, children, ...rest }) => (
  <a href={href} className={className} {...rest}>
    {children}
  </a>
);

function SidebarLink({
  item,
  pathname,
  collapsed,
  Link,
  comingSoonLabel,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
  Link: LinkComponent;
  comingSoonLabel: string;
  onNavigate?: () => void;
}) {
  const active = isActive(item.href, pathname);
  const Icon = item.icon;

  const inner = (
    <>
      {/* Active accent bar on the logical start edge (mirrors in RTL). */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-1.5 start-0 w-[3px] rounded-pill bg-accent transition-opacity duration-fast',
          active ? 'opacity-100' : 'opacity-0',
        )}
      />
      <Icon
        className={cn(
          'h-5 w-5 shrink-0 transition-colors duration-fast',
          active ? 'text-accent' : 'text-teal-400 group-hover:text-teal-200',
        )}
        aria-hidden="true"
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && item.badge != null && item.badge > 0 && (
        <span className="ms-auto rounded-pill bg-accent px-sm py-px text-overline font-semibold tabular-nums text-text-on-primary">
          {item.badge}
        </span>
      )}
      {!collapsed && item.comingSoon && (
        <span className="ms-auto rounded-pill bg-teal-700/60 px-sm py-px text-overline font-semibold uppercase tracking-wide text-teal-200">
          {comingSoonLabel}
        </span>
      )}
    </>
  );

  const base = cn(
    'group relative flex h-10 items-center gap-md rounded-pill px-md text-body-sm font-medium transition-colors duration-fast',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset',
    collapsed && 'justify-center px-0',
  );

  if (item.comingSoon) {
    const node = (
      <span
        aria-disabled="true"
        className={cn(base, 'cursor-not-allowed text-teal-400/70')}
      >
        {inner}
      </span>
    );
    return collapsed ? (
      <Tooltip content={`${item.label} · ${comingSoonLabel}`} side="right">
        {node}
      </Tooltip>
    ) : (
      node
    );
  }

  const linkNode = (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        base,
        active
          ? 'bg-teal-700 text-text-on-primary'
          : 'text-teal-200 hover:bg-teal-700/40 hover:text-text-on-primary',
      )}
    >
      {/* onClick is delegated by the wrapping list for drawer-close */}
      <span className="contents" onClick={onNavigate}>
        {inner}
      </span>
    </Link>
  );

  return collapsed ? (
    <Tooltip content={item.label} side="right">
      {linkNode}
    </Tooltip>
  ) : (
    linkNode
  );
}

/** Deep-teal sidebar with grouped, overline-labelled nav. */
export function Sidebar({
  groups,
  pathname,
  collapsed = false,
  brand,
  link,
  navLabel = 'Main navigation',
  comingSoonLabel = 'Soon',
  onNavigate,
  className,
}: SidebarProps) {
  const Link = link ?? DefaultLink;
  return (
    <div className={cn('flex h-full flex-col bg-primary', className)}>
      <div className={cn('flex items-center px-lg py-lg', collapsed && 'justify-center px-sm')}>
        {brand}
      </div>
      <nav aria-label={navLabel} className="scrollbar-dark flex-1 overflow-y-auto px-md pb-lg">
        {groups.map((group) => (
          <div key={group.label} className="mb-lg">
            {!collapsed && (
              <p className="px-md pb-xs pt-sm text-overline font-semibold uppercase tracking-[0.14em] text-teal-400">
                {group.label}
              </p>
            )}
            <div className="flex flex-col gap-xs">
              {group.items.map((item) => (
                <SidebarLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  collapsed={collapsed}
                  Link={Link}
                  comingSoonLabel={comingSoonLabel}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
