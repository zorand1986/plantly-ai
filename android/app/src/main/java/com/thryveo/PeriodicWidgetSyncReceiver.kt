package com.thryveo

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.facebook.react.HeadlessJsTaskService

/**
 * Triggered by [WidgetSyncScheduler] at 00:00:01, 08:00:01, and 16:00:01 local time.
 * Runs the SyncWidget headless JS task and schedules the next aligned slot.
 */
class PeriodicWidgetSyncReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        HeadlessJsTaskService.acquireWakeLockNow(context)
        context.startService(Intent(context, BootWidgetSyncService::class.java))
        // Re-schedule so the next aligned slot is queued
        WidgetSyncScheduler.schedule(context)
    }
}
