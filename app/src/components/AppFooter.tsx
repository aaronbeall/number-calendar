import BuyMeACoffeeIcon from '@/assets/buymeacoffee.svg?react';
import PatreonIcon from '@/assets/patreon.svg?react';
import { Share2 } from 'lucide-react';

export function AppFooter() {
  const handleShare = async () => {
    try {
      await navigator.share({
        title: 'Numbers Go Up',
        text: 'A calendar for numberphiles - Track your daily numbers and visualize your progress!',
        url: window.location.href,
      });
    } catch (err) {
      // User cancelled or share failed
      if ((err as Error).name !== 'AbortError') {
        console.error('Share failed:', err);
      }
    }
  };

  return (
    <footer className="w-full py-4 text-center text-xs text-slate-500 dark:text-slate-400 bg-transparent mt-8">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 flex-wrap">
        <span>
          Made with <span aria-label="love" role="img">❤️</span> and <span aria-label="banana" role="img">🍌</span> by <a href="https://metamodernmonkey.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-500 transition-colors">Meta Modern Monkey</a> &copy; {new Date().getFullYear()}
        </span>

        <div className="flex items-center justify-center gap-2 flex-wrap sm:border-l sm:border-slate-300 sm:dark:border-slate-700 sm:pl-2 sm:ml-2">
          <a
            href="https://patreon.com/metamodernmonkey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors group"
            aria-label="Patreon"
          >
            <PatreonIcon className="w-3 h-3 text-slate-400 group-hover:text-pink-600 transition-colors" />
            <span className="group-hover:text-pink-600 transition-colors">Patreon</span>
          </a>

          <a
            href="https://buymeacoffee.com/metamodernmonkey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors group"
            aria-label="Buy Me a Coffee"
          >
            <BuyMeACoffeeIcon className="w-3 h-3 text-slate-400 group-hover:text-yellow-600 transition-colors" />
            <span className="group-hover:text-yellow-600 transition-colors">Buy Me a Coffee</span>
          </a>

          {typeof navigator.share === 'function' && (
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group"
              aria-label="Share"
            >
              <Share2 className="w-3 h-3 group-hover:text-blue-500 transition-colors" />
              <span className="group-hover:text-blue-500 transition-colors">Share</span>
            </button>
          )}
        </div>
      </div>
    </footer>
  );
}
