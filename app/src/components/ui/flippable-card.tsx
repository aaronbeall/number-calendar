import { motion } from 'framer-motion';
import React, { useRef, useEffect, useState } from 'react';

interface FlippableCardProps {
  /**
   * Whether the card is open (showing back side)
   */
  open: boolean;
  /**
   * Content to show on the front side
   */
  front: React.ReactNode;
  /**
   * Content to show on the back side
   */
  back: React.ReactNode;
  /**
   * Animation duration in seconds
   * @default 0.3
   */
  duration?: number;
}

/**
 * A flippable card component with 3D flip animation.
 * Transitions smoothly between front and back content.
 */
export function FlippableCard({ 
  open, 
  front, 
  back, 
  duration = 0.3 
}: FlippableCardProps) {
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const [frontHeight, setFrontHeight] = useState<number | undefined>(undefined);
  const [backHeight, setBackHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      if (frontRef.current) {
        setFrontHeight(frontRef.current.offsetHeight);
      }
      if (backRef.current) {
        setBackHeight(backRef.current.offsetHeight);
      }
    });

    if (frontRef.current) {
      resizeObserver.observe(frontRef.current);
    }
    if (backRef.current) {
      resizeObserver.observe(backRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const visibleHeight = open ? backHeight : frontHeight;

  return (
    <div
      className="transition-height duration-300 ease-in-out"
      style={{
        perspective: '1000px',
        height: visibleHeight || 'auto',
      }}
    >
      <motion.div
        initial={false}
        animate={{ rotateY: open ? 180 : 0 }}
        transition={{ duration }}
        style={{
          transformStyle: 'preserve-3d',
          width: '100%',
          height: '100%',
        }}
      >
        {/* Front side */}
        <div
          ref={frontRef}
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            width: '100%',
          }}
        >
          {front}
        </div>

        {/* Back side - rotated 180 degrees */}
        <div
          ref={backRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {back}
        </div>
      </motion.div>
    </div>
  );
}
