import React from 'react';
import {View} from 'react-native';

function MockVideo() {
  return React.createElement(View, {testID: 'mock-video'});
}

module.exports = MockVideo;
module.exports.default = MockVideo;
module.exports.Video = MockVideo;
