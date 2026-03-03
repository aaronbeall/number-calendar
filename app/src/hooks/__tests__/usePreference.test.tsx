/* @vitest-environment jsdom */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { usePreference } from '../usePreference';

describe('usePreference', () => {
  it('initializes', () => {
    const { result } = renderHook(() => usePreference('k1', 'init'));
    expect(result.current[0]).toBe('init');
  });

  it('updates', () => {
    const { result } = renderHook(() => usePreference('k2', 'init'));
    act(() => result.current[1]('new'));
    expect(result.current[0]).toBe('new');
  });

  it('saves to localStorage', () => {
    renderHook(() => usePreference('k3', 'init'));
    expect(localStorage.getItem('k3')).toBe(JSON.stringify('init'));
  });

  it('loads from localStorage', () => {
    localStorage.setItem('k4', JSON.stringify('stored'));
    const { result } = renderHook(() => usePreference('k4', 'default'));
    expect(result.current[0]).toBe('stored');
  });

  it('handles objects', () => {
    const { result } = renderHook(() =>
      usePreference('k5', { count: 0 })
    );
    act(() => {
      result.current[1]((prev) => ({ count: prev.count + 1 }));
    });
    expect(result.current[0]).toEqual({ count: 1 });
  });
});
