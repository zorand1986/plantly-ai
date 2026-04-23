package com.thryveo.widget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.thryveo.R
import org.json.JSONArray
import org.json.JSONObject

class WaterPlantReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.getStringExtra(WidgetConstants.EXTRA_ACTION) ?: return
        val plantId = intent.getStringExtra(WidgetConstants.EXTRA_PLANT_ID) ?: return

        when (action) {
            WidgetConstants.ACTION_WATER -> handleWater(context, plantId)
            WidgetConstants.ACTION_OPEN -> handleOpen(context, plantId)
            WidgetConstants.ACTION_CLEANUP -> handleCleanup(context)
        }
    }

    private fun handleWater(context: Context, plantId: String) {
        val prefs = context.getSharedPreferences(WidgetConstants.PREFS_NAME, Context.MODE_PRIVATE)

        // Append to pending waterings so the JS app can process on next launch
        val existingJson = prefs.getString(WidgetConstants.KEY_PENDING_WATERINGS, "[]") ?: "[]"
        val pendingArr = try { JSONArray(existingJson) } catch (_: Exception) { JSONArray() }
        pendingArr.put(
            JSONObject().apply {
                put("plantId", plantId)
                put("timestamp", System.currentTimeMillis())
            }
        )

        // Remove this plant from the widget list immediately
        val plantsJson = prefs.getString(WidgetConstants.KEY_PLANTS, "[]") ?: "[]"
        val plantsArr = try { JSONArray(plantsJson) } catch (_: Exception) { JSONArray() }
        val remaining = JSONArray()
        for (i in 0 until plantsArr.length()) {
            val obj = plantsArr.getJSONObject(i)
            if (obj.getString("id") != plantId) remaining.put(obj)
        }

        prefs.edit()
            .putString(WidgetConstants.KEY_PENDING_WATERINGS, pendingArr.toString())
            .putString(WidgetConstants.KEY_PLANTS, remaining.toString())
            .putBoolean(WidgetConstants.KEY_JUST_WATERED, true)
            .apply()

        // Cancel the scheduled notification for this plant immediately so it doesn't
        // fire even if the app isn't opened before the alarm time.
        val notificationId = getNotificationIdForPlant(plantsArr, plantId)
        if (notificationId.isNotEmpty()) {
            try {
                HeadlessJsTaskService.acquireWakeLockNow(context)
                context.startService(
                    Intent(context, WidgetWaterService::class.java).apply {
                        putExtra(WidgetWaterService.EXTRA_NOTIFICATION_ID, notificationId)
                    }
                )
            } catch (_: Exception) { /* non-critical — plant data is already recorded */ }
        }

        // Refresh the full widget — updateAppWidget() calls notifyAppWidgetViewDataChanged
        // internally so the list also refreshes to remove the just-watered plant.
        val manager = AppWidgetManager.getInstance(context)
        val ids = manager.getAppWidgetIds(ComponentName(context, PlantWidget::class.java))
        for (id in ids) PlantWidget.updateAppWidget(context, manager, id)

        // Reset the "watered" header back to normal after 2.5 seconds
        val cleanupIntent = Intent(context, WaterPlantReceiver::class.java).apply {
            putExtra(WidgetConstants.EXTRA_ACTION, WidgetConstants.ACTION_CLEANUP)
            putExtra(WidgetConstants.EXTRA_PLANT_ID, plantId)
        }
        val pi = PendingIntent.getBroadcast(
            context,
            0,
            cleanupIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        am.set(AlarmManager.RTC, System.currentTimeMillis() + 2500L, pi)
    }

    private fun getNotificationIdForPlant(plantsArr: JSONArray, plantId: String): String {
        for (i in 0 until plantsArr.length()) {
            val obj = plantsArr.optJSONObject(i) ?: continue
            if (obj.optString("id") == plantId) {
                return obj.optString("notificationId", "")
            }
        }
        return ""
    }

    private fun handleCleanup(context: Context) {
        val prefs = context.getSharedPreferences(WidgetConstants.PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putBoolean(WidgetConstants.KEY_JUST_WATERED, false).apply()

        val manager = AppWidgetManager.getInstance(context)
        val ids = manager.getAppWidgetIds(ComponentName(context, PlantWidget::class.java))
        for (id in ids) PlantWidget.updateAppWidget(context, manager, id)
    }

    private fun handleOpen(context: Context, plantId: String) {
        val launchIntent = context.packageManager
            .getLaunchIntentForPackage(context.packageName)
            ?.apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                data = android.net.Uri.parse("thryveo://plant/$plantId")
            }
        if (launchIntent != null) {
            context.startActivity(launchIntent)
        }
    }
}
