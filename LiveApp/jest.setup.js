jest.mock('react-native-screens', () => ({
  enableScreens: jest.fn(),
}));

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const {View} = require('react-native');

  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    ToolbarAndroid: View,
    DrawerLayoutAndroid: View,
    NativeViewGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    RawButton: View,
    BaseButton: View,
    RectButton: View,
    BorderlessButton: View,
    FlatList: View,
    gestureHandlerRootHOC: Component => Component,
    Directions: {},
    GestureHandlerRootView: ({children}) =>
      React.createElement(View, null, children),
  };
});

jest.mock('@react-native-vector-icons/material-icons', () => {
  const React = require('react');
  const {Text} = require('react-native');

  return {
    __esModule: true,
    default: ({name}) => React.createElement(Text, null, name),
  };
});
