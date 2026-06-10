import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { BaeBaeCalendarWidget } from './BaeBaeWidget';
import { buildWidgetData } from './buildWidgetData';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const action = props.widgetAction;

  if (
    action === 'WIDGET_ADDED' ||
    action === 'WIDGET_UPDATE' ||
    action === 'WIDGET_RESIZED'
  ) {
    const data = await buildWidgetData();
    props.renderWidget(
      React.createElement(BaeBaeCalendarWidget, { data }),
    );
  }
}
