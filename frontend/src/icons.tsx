import React from 'react'

export type IconName =
  | 'home' | 'expense' | 'income' | 'book'
  | 'bell' | 'chevron' | 'arrowUp' | 'arrowDown'
  | 'plus' | 'bag' | 'taxi' | 'homeSmall' | 'coffee' | 'more'
  | 'edit' | 'trash' | 'download' | 'upload' | 'save' | 'x' | 'calendar'
  | 'search'

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
    search: (  <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>)
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