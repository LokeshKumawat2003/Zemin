import { CameraType } from 'react-native-camera-kit';
import { getLiveKitFacingMode } from './livekit';

describe('getLiveKitFacingMode', () => {
  it('maps front camera to user-facing mode', () => {
    expect(getLiveKitFacingMode(CameraType.Front)).toBe('user');
  });

  it('maps back camera to environment-facing mode', () => {
    expect(getLiveKitFacingMode(CameraType.Back)).toBe('environment');
  });
});
