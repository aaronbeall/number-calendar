import { useRef, useState } from 'react';

interface UseSwipeOptions {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  threshold?: number;
  animationDuration?: number;
}

interface UseSwipeReturn {
  handleSwipeStart: (e: React.TouchEvent) => void;
  handleSwipeMove: (e: React.TouchEvent) => void;
  handleSwipeEnd: (e: React.TouchEvent) => void;
  animationPhase: 'none' | 'out' | 'in' | 'preview' | 'snapback';
  swipeDirection: 'left' | 'right' | null;
  getAnimationStyle: () => React.CSSProperties;
}

export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  animationDuration = 300,
}: UseSwipeOptions): UseSwipeReturn {
  const swipeStartX = useRef<number | null>(null);
  const [animationPhase, setAnimationPhase] = useState<'none' | 'out' | 'in' | 'preview' | 'snapback'>('none');
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [dragDistance, setDragDistance] = useState<number>(0);

  // Split animation duration: 20% out, 80% in
  const outDuration = Math.round(animationDuration * 0.2);
  const inDuration = Math.round(animationDuration * 0.8);

  const slideInLeft = `slideInLeft ${inDuration}ms cubic-bezier(0.215, 0.61, 0.355, 1) forwards`;
  const slideOutLeft = `slideOutLeft ${outDuration}ms cubic-bezier(0.55, 0.055, 0.675, 0.19) forwards`;
  const slideInRight = `slideInRight ${inDuration}ms cubic-bezier(0.215, 0.61, 0.355, 1) forwards`;
  const slideOutRight = `slideOutRight ${outDuration}ms cubic-bezier(0.55, 0.055, 0.675, 0.19) forwards`;

  const getAnimationStyle = (): React.CSSProperties => {
    if (animationPhase === 'preview') {
      // Show the drag preview without transition
      return { transform: `translateX(${dragDistance}px)` };
    } else if (animationPhase === 'snapback') {
      // Snap back to 0 with a smooth transition
      return {
        transform: 'translateX(0)',
        transition: 'transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      };
    } else if (animationPhase === 'out') {
      const animation = swipeDirection === 'left' ? slideOutLeft : slideOutRight;
      return { animation };
    } else if (animationPhase === 'in') {
      const animation = swipeDirection === 'left' ? slideInRight : slideInLeft;
      return { animation };
    }
    return {};
  };

  const handleSwipeStart = (e: React.TouchEvent) => {
    swipeStartX.current = e.touches[0].clientX;
    setAnimationPhase('preview');
    setDragDistance(0);
  };

  const handleSwipeMove = (e: React.TouchEvent) => {
    if (swipeStartX.current === null) return;

    const currentX = e.touches[0].clientX;
    const delta = currentX - swipeStartX.current;
    setDragDistance(delta);
  };

  const handleSwipeEnd = (e: React.TouchEvent) => {
    if (swipeStartX.current === null) return;
    
    const swipeEndX = e.changedTouches[0].clientX;
    const swipeDelta = swipeStartX.current - swipeEndX;

    if (Math.abs(swipeDelta) > threshold) {
      const isSwipeLeft = swipeDelta > 0;
      setSwipeDirection(isSwipeLeft ? 'left' : 'right');
      setAnimationPhase('out');
      setDragDistance(0);

      setTimeout(() => {
        if (isSwipeLeft) {
          onSwipeLeft();
        } else {
          onSwipeRight();
        }
        setAnimationPhase('in');

        setTimeout(() => {
          setAnimationPhase('none');
          setSwipeDirection(null);
        }, inDuration);
      }, outDuration);
    } else {
      // Snap back to 0 if below threshold
      setAnimationPhase('snapback');
      setTimeout(() => {
        setAnimationPhase('none');
        setDragDistance(0);
      }, 150);
    }
    
    swipeStartX.current = null;
  };

  return {
    handleSwipeStart,
    handleSwipeMove,
    handleSwipeEnd,
    animationPhase,
    swipeDirection,
    getAnimationStyle,
  };
}
