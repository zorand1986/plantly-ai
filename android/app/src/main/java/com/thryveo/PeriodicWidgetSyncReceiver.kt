package com.thryveo

import android.appwidget.AppWidgetManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.thryveo.R
import com.thryveo.widget.PlantWidget

/**
 * Triggered by [WidgetSyncScheduler] at 00:00:01, 08:00:01, and 16:00:01 local time.
 * Runs the SyncWidget headless JS task and schedules the next aligned slot.
 */
class PeriodicWidgetSyncReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        // Re-schedule first so the chain is never broken, even if anything below fails
        WidgetSyncScheduler.schedule(context)

        // Pure-Kotlin widget refresh — no JS runtime required.
        // Triggers PlantWidgetFactory.onDataSetChanged() → loadData(), which recomputes
        // "due today vs upcoming" from the existing SharedPreferences data using the
        // current date. This is the primary mechanism for the midnight rollover so that
        // the widget switches from "tomorrow (grayed)" to "today (actionable)" even when
        // the headless JS task below fails to start (e.g. device in Doze).
        try {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, PlantWidget::class.java))
            if (ids.isNotEmpty()) {
                for (id in ids) PlantWidget.updateAppWidget(context, manager, id)
                manager.notifyAppWidgetViewDataChanged(ids, R.id.widget_list)
            }
        } catch (_: Exception) {}

        // Also attempt the JS sync so fresh AsyncStorage data reaches the widget.
        // Non-critical — the pure-Kotlin refresh above already guarantees correctness.
        try {
            HeadlessJsTaskService.acquireWakeLockNow(context)
            context.startService(Intent(context, BootWidgetSyncService::class.java))
        } catch (_: Exception) {}
    }
}
