package com.thryveo.widget

import android.appwidget.AppWidgetManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.thryveo.R

/**
 * Triggers a widget redraw when the system date, time, or timezone changes.
 * Because the widget filters "due today" at render time, this broadcast alone
 * is enough to keep the list correct across the midnight rollover — no JS,
 * no alarms, no headless task required.
 */
class DateChangeReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val manager = AppWidgetManager.getInstance(context)
        val ids = manager.getAppWidgetIds(ComponentName(context, PlantWidget::class.java))
        if (ids.isEmpty()) return
        for (id in ids) PlantWidget.updateAppWidget(context, manager, id)
        manager.notifyAppWidgetViewDataChanged(ids, R.id.widget_list)
    }
}
