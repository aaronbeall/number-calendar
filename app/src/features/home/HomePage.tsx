import { IntroLanding } from '@/pages/IntroLanding';
import { useEffect, useState } from 'react';
import { countSavedCalendars } from './countSavedCalendars';

/** The homepage, with the number of calendars already saved in this browser (0 for new visitors). */
export function HomePage() {
  const [datasetCount, setDatasetCount] = useState(0);
  useEffect(() => {
    countSavedCalendars().then(setDatasetCount);
  }, []);
  return <IntroLanding datasetCount={datasetCount} />;
}
