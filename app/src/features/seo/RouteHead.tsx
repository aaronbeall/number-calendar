import { useDataset } from '@/features/db/useDatasetData';
import { useEffect } from 'react';
import { matchPath, useLocation } from 'react-router-dom';

export const SITE_URL = 'https://numbersgoup.app';
export const SITE_NAME = 'Numbers Go Up';
/** Must match the <title> in index.html, which is what crawlers see before JS runs. */
export const HOME_TITLE = 'Numbers Go Up - A calendar for numbers that knows good from bad';

const datasetPageTitles: Record<string, string> = {
  '': 'Calendar',
  achievements: 'Achievements',
  analysis: 'Analysis',
  targets: 'Targets',
  milestones: 'Milestones',
  records: 'Records',
  timeline: 'Timeline',
  settings: 'Settings',
};

const appPageTitles: Record<string, string> = {
  milestones: 'Milestones',
  targets: 'Targets',
  achievements: 'Achievements',
};

function setMeta(name: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
}

/**
 * Keeps the document title, robots and canonical tags in step with the route.
 *
 * Only the homepage is public content. Everything under /dataset/... shows data that exists only in
 * the visitor's own browser, so those pages are marked noindex and point their canonical at the
 * homepage. Titles still follow the page so tabs, history and installed-app windows read well.
 */
export function RouteHead() {
  const { pathname } = useLocation();
  const datasetMatch = matchPath('/dataset/:datasetId/*', pathname);
  const datasetId = datasetMatch?.params.datasetId ?? '';
  const { data: dataset } = useDataset(datasetId);

  let title = HOME_TITLE;
  let indexable = pathname === '/';
  if (datasetMatch) {
    const sub = (datasetMatch.params['*'] ?? '').split('/')[0];
    const page = datasetPageTitles[sub] ?? 'Calendar';
    title = dataset ? `${dataset.name} · ${page} · ${SITE_NAME}` : `${page} · ${SITE_NAME}`;
  } else {
    const sub = pathname.replace(/^\/|\/$/g, '');
    if (appPageTitles[sub]) {
      title = `${appPageTitles[sub]} · ${SITE_NAME}`;
      indexable = false;
    }
  }

  useEffect(() => {
    document.title = title;
    setMeta('robots', indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow');
    setCanonical(`${SITE_URL}/`);
  }, [title, indexable]);

  return null;
}
