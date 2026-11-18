import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { IOSInstallDialog } from './IOSInstallDialog';
import { promptInstall, useInstallState } from './install';

/**
 * Install support for menus and buttons.
 * `canInstall` is true when there's something to offer: the browser's install dialog, or
 * Add to Home Screen steps on iPhone and iPad. Render `dialog` somewhere in the tree.
 */
export function useInstallApp() {
  const state = useInstallState();
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  const install = useCallback(async () => {
    if (state === 'ios') {
      setShowIOSHelp(true);
      return;
    }
    if (state === 'prompt') {
      const accepted = await promptInstall();
      if (accepted) toast.success('Numbers Go Up is installed', { description: 'Open it from your home screen or app list.' });
    }
  }, [state]);

  const dialog = <IOSInstallDialog open={showIOSHelp} onOpenChange={setShowIOSHelp} />;

  return { state, canInstall: state === 'prompt' || state === 'ios', install, dialog };
}
