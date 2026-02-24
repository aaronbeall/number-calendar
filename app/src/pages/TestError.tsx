import { useState } from 'react';

/**
 * Test component to verify ErrorBoundary functionality
 * This page intentionally throws an error when you click the button
 */
export default function TestError() {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error('This is a test error from the TestError page. Click "Try again" in the error message to recover.');
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-900/80 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
          Error Boundary Test
        </h1>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">How to test:</h2>
          <ol className="list-decimal list-inside space-y-2 text-blue-800 dark:text-blue-200 text-sm">
            <li>Click the button below to trigger an error</li>
            <li>Notice the error message appears but the header stays visible (inline error)</li>
            <li>Click "Try again" to recover and return to this page</li>
            <li>You can also navigate to another route and the error will be replaced</li>
          </ol>
        </div>

        <button
          onClick={() => setShouldThrow(true)}
          className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
        >
          Trigger Error
        </button>

        <div className="mt-8 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            This route is wrapped by an inline ErrorBoundary. When you trigger the error, you should see:
          </p>
          <ul className="list-disc list-inside mt-2 text-sm text-slate-600 dark:text-slate-400 space-y-1">
            <li>Header and navigation remain visible</li>
            <li>Error message centered in the main content area</li>
            <li>"Try again" button to recover</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
