import React from 'react'

export type IconName =
  | 'home' | 'expense' | 'income' | 'book'
  | 'bell' | 'chevron' | 'arrowUp' | 'arrowDown'
  | 'plus' | 'bag' | 'taxi' | 'homeSmall' | 'coffee' | 'more'
  | 'edit' | 'trash' | 'download' | 'upload' | 'save' | 'x' | 'calendar'
  | 'search' | 'help' | 'filter' | 'sparkles' | 'piggyBank' | 'trendingUp' 
  | 'wallet' | 'history'

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: (<><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10.5V20h13v-9.5M9.5 20v-6h5v6" /></>),
    expense: (<><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /><path d="m18 5 2 2 3-4" /></>),
    income: (<><path d="M12 3v15M7 13l5 5 5-5" /><path d="M4 21h16" /></>),
    book: (<><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22Z" /><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22Z" /></>),
    bell: (<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>),
    chevron: <path d="m9 18 6-6-6-6" />,
    arrowUp: <path d="M12 19V5M6 11l6-6 6 6" />,
    arrowDown: <path d="M12 5v14M18 13l-6 6-6-6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    bag: (<><path d="M5 8h14l-1 13H6Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></>),
    taxi: (<><path d="m5 11 2-5h10l2 5" /><path d="M4 11h16v7H4zM7 18v2M17 18v2M8 14h.01M16 14h.01" /></>),
    homeSmall: (<><path d="m4 11 8-7 8 7v9H4Z" /><path d="M9 20v-6h6v6" /></>),
    coffee: (<><path d="M4 8h13v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Z" /><path d="M17 10h2a3 3 0 0 1 0 6h-2M7 4v2M11 3v3M15 4v2" /></>),
    more: (<><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></>),
    edit: (<><path d="M4 20h4l10-10-4-4L4 16v4Z" /><path d="m14 6 4 4" /></>),
    trash: (<><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13h10l1-13" /><path d="M10 11v6M14 11v6" /></>),
    download: (<><path d="M12 3v12M7 11l5 5 5-5" /><path d="M5 21h14" /></>),
    upload: (<><path d="M12 21V9M7 13l5-5 5 5" /><path d="M5 3h14" /></>),
    save: (<><path d="M4 4h12l4 4v12H4Z" /><path d="M8 4v6h8V4M8 14h8v6H8z" /></>),
    x: <path d="m6 6 12 12M18 6 6 18" />,
    calendar: (<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>),
    search: (  <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>),
    filter: (
      <>
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
      </>
    ),
    help: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </>
    ),
  sparkles: (
    <>
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </>
  ),
  piggyBank: (
    <>
      <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z" />
      <path d="M2 9v1c0 1.1.9 2 2 2h1" />
      <path d="M16 11h.01" />
    </>
  ),
  trendingUp: (
    <>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </>
  ),
  wallet: (
    <>
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </>
  ),
  history: (
  <>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </>
  ),
  }

  return (
    <svg
      aria-hidden="true"
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}