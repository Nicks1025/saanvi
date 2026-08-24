import { useEffect, useState, useRef } from 'react';

export const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const targetRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsIntersecting(true);
        if (options.triggerOnce && targetRef.current) {
          observer.unobserve(targetRef.current);
        }
      } else {
        if (!options.triggerOnce) {
          setIsIntersecting(false);
        }
      }
    }, options);

    const target = targetRef.current;
    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, [options.root, options.rootMargin, options.threshold, options.triggerOnce]);

  return [targetRef, isIntersecting];
};
