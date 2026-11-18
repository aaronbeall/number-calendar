import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BrandMark } from '@/components/brand/Brand';
import { PlusSquare, Share } from 'lucide-react';

/** iOS has no install API, so explain Add to Home Screen. */
export function IOSInstallDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <BrandMark className="w-12 h-12 mx-auto mb-2" />
          <DialogTitle className="text-center">Install Numbers Go Up</DialogTitle>
          <DialogDescription className="text-center">
            Add it to your home screen to open it like an app. It works offline, and your data stays on this device.
          </DialogDescription>
        </DialogHeader>
        <ol className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
          <li className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <Share className="h-4 w-4 text-blue-500" />
            </span>
            <span>Tap the <strong>Share</strong> button in Safari's toolbar.</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <PlusSquare className="h-4 w-4" />
            </span>
            <span>Choose <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.</span>
          </li>
        </ol>
        <DialogFooter>
          <Button className="w-full" onClick={() => onOpenChange(false)}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
