package com.thryveo

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.facebook.react.HeadlessJsTaskService

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            "android.intent.action.QUICKBOOT_POWERON",
            "com.htc.intent.action.QUICKBOOT_POWERON" -> {
                HeadlessJsTaskService.acquireWakeLockNow(context)
                // Single service runs processPendingWaterings → rescheduleAll →
                // syncWidget serially so the two JS paths cannot race and produce
                // duplicate notifications.
                context.startService(Intent(context, BootWidgetSyncService::class.java))
                // Re-arm the periodic widget sync alarm (cleared on power-off)
                WidgetSyncScheduler.schedule(context)
            }
            Intent.ACTION_MY_PACKAGE_REPLACED -> {
                // App update clears all AlarmManager PendingIntents — re-arm the
                // midnight sync chain immediately so the widget resumes auto-updating.
                WidgetSyncScheduler.schedule(context)
                // Also re-sync data so the widget is immediately up to date with
                // any data migrations or format changes introduced by the update.
                try {
                    HeadlessJsTaskService.acquireWakeLockNow(context)
                    context.startService(Intent(context, BootWidgetSyncService::class.java))
                } catch (_: Exception) {}
            }
        }
    }
}
