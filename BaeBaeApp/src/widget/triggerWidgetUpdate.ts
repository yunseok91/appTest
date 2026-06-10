import React from 'react';
import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { BaeBaeCalendarWidget } from './BaeBaeWidget';
import { buildWidgetData } from './buildWidgetData';

export async function triggerWidgetUpdate() {
  if (Platform.OS !== 'android') return;
  try {
    const data = await buildWidgetData();
    await requestWidgetUpdate({
      widgetName: 'BaeBaeWidget',
      renderWidget: () => React.createElement(BaeBaeCalendarWidget, { data }),
      widgetNotFound: () => {},
    });
  } catch {}
}
