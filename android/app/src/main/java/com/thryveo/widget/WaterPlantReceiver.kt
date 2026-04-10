package com.thryveo.widget

import android.appwidget.AppWidgetManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.thryveo.R
import org.json.JSONArray
import org.json.JSONObject

class WaterPlantReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val plantId = intent.getStringExtra(WidgetConstants.EXTRA_PLANT_ID) ?: return
        val action = intent.getStringExtra(WidgetConstants.EXTRA_ACTION) ?: return

        when (action) {
            WidgetConstants.ACTION_WATER -> handleWater(context, plantId)
            WidgetConstants.ACTION_OPEN -> handleOpen(context, plantId)
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
            if (obj.getString("id") != plantId) {
                remaining.put(obj)
            }
        }

        prefs.edit()
            .putString(WidgetConstants.KEY_PENDING_WATERINGS, pendingArr.toString())
            .putString(WidgetConstants.KEY_PLANTS, remaining.toString())
            .apply()

        // Refresh widget list
        val manager = AppWidgetManager.getInstance(context)
        val ids = manager.getAppWidgetIds(ComponentName(context, PlantWidget::class.java))
        manager.notifyAppWidgetViewDataChanged(ids, R.id.widget_list)
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
