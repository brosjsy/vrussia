import { describe, it, expect } from 'vitest';
import { groundFor, trafficLevel, footstep, horn, bird, door, StreetAudio } from '../src/worldsound';

describe('the sounds of the street', () => {
  it('picks the ground from the weather and the place', () => {
    expect(groundFor('clear', false)).toBe('street');
    expect(groundFor('snow', false)).toBe('snow');
    expect(groundFor('frost', false)).toBe('snow');
    expect(groundFor('snow', true)).toBe('floor');
  });
  it('traffic is loud when a car is close and silent when it is far or absent', () => {
    expect(trafficLevel(0)).toBe(1);
    expect(trafficLevel(30)).toBeGreaterThan(trafficLevel(50));
    expect(trafficLevel(60)).toBe(0);
    expect(trafficLevel(Infinity)).toBe(0);
  });
  it('never throws without an audio system', () => {
    expect(footstep('street')).toBe(false); expect(horn()).toBe(false); expect(bird()).toBe(false); expect(door()).toBe(false);
    const s = new StreetAudio(); s.update(0.1, 5, true, true, true); s.hush(); s.dispose();
  });
});
