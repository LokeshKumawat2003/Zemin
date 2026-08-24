const React = require('react');
const {View} = require('react-native');

function MockCamera() {
  return React.createElement(View, {testID: 'mock-camera'});
}

module.exports = {
  Camera: MockCamera,
  CameraType: {
    Back: 'back',
    Front: 'front',
  },
};
