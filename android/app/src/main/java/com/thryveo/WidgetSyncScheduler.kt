package com.thryveo

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import java.util.Calendar

/**
 * Schedules periodic widget syncs at 00:00:01, 08:00:01, and 16:00:01 local time.
 * Uses self-rescheduling exact alarms so the widget stays fresh without the app being open.
 */
object WidgetSyncScheduler {

    private const val REQUEST_CODE = 9001

    /** Schedule the next aligned sync slot (called on boot and when the widget is added). */
    fun schedule(context: Context) {
        try {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            alarmManager.setExactAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                nextAlignedTrigger(),
                buildPendingIntent(context),
            )
        } catch (_: Exception) {}
    }

    /** Cancel all pending syncs (called when the last widget instance is removed). */
    fun cancel(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarmManager.cancel(buildPendingIntent(context))
    }

    /**
     * Returns the next trigger time among today's fixed slots (00:00:01, 08:00:01, 16:00:01).
     * If all of today's slots have already passed, returns tomorrow's 00:00:01.
     */
    private fun nextAlignedTrigger(): Long {
        val now = System.currentTimeMillis()
        val cal = Calendar.getInstance()

        for (hour in listOf(0, 8, 16)) {
            cal.set(Calendar.HOUR_OF_DAY, hour)
            cal.set(Calendar.MINUTE, 0)
            cal.set(Calendar.SECOND, 1)
            cal.set(Calendar.MILLISECOND, 0)
            if (cal.timeInMillis > now) return cal.timeInMillis
        }

        // All of today's slots have passed — use tomorrow's midnight slot
        cal.add(Calendar.DAY_OF_YEAR, 1)
        cal.set(Calendar.HOUR_OF_DAY, 0)
        cal.set(Calendar.MINUTE, 0)
        cal.set(Calendar.SECOND, 1)
        cal.set(Calendar.MILLISECOND, 0)
        return cal.timeInMillis
    }

    private fun buildPendingIntent(context: Context): PendingIntent {
        val intent = Intent(context, PeriodicWidgetSyncReceiver::class.java)
        return PendingIntent.getBroadcast(
            context,
            REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }
}
