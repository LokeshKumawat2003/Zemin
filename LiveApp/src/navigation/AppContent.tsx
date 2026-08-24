import React from 'react';
import { Provider } from 'react-redux';

import { store } from '../redux/store';
import { RootNavigator } from './RootNavigator';

export default function AppContent() {
  return (
    <Provider store={store}>
      <RootNavigator />
    </Provider>
  );
}
