package com.thryveo.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import com.thryveo.MainActivity
import com.thryveo.R
import com.thryveo.WidgetSyncScheduler
import java.util.Calendar
import org.json.JSONArray

class PlantWidget : AppWidgetProvider() {

    override fun onEnabled(context: Context) {
        // First widget instance added — start periodic background syncs
        WidgetSyncScheduler.schedule(context)
    }

    override fun onDisabled(context: Context) {
        // Last widget instance removed — stop periodic syncs
        WidgetSyncScheduler.cancel(context)
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        /**
         * @param notifyList  When true (default), also notifies the RemoteAdapter so
         *   PlantWidgetFactory.onDataSetChanged() runs and the list reflects the current date.
         *   Pass false only when called FROM onDataSetChanged() to prevent an infinite loop.
         */
        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int,
            notifyList: Boolean = true,
        ) {
            val prefs = context.getSharedPreferences(WidgetConstants.PREFS_NAME, Context.MODE_PRIVATE)

            // Default true so existing installs before this key was introduced keep working.
            val loggedIn = prefs.getBoolean(WidgetConstants.KEY_LOGGED_IN, true)
            if (!loggedIn) {
                val views = RemoteViews(context.packageName, R.layout.widget_sign_in)
                val openAppIntent = Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                }
                val openAppPendingIntent = PendingIntent.getActivity(
                    context,
                    0,
                    openAppIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                )
                views.setOnClickPendingIntent(R.id.widget_sign_in_root, openAppPendingIntent)
                appWidgetManager.updateAppWidget(appWidgetId, views)
                return
            }

            val forceUpdateRequired = prefs.getBoolean(WidgetConstants.KEY_FORCE_UPDATE, false)

            if (forceUpdateRequired) {
                val views = RemoteViews(context.packageName, R.layout.widget_force_update)
                // Tapping the blocked widget opens the app so the user sees the update prompt
                val openAppIntent = Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                }
                val openAppPendingIntent = PendingIntent.getActivity(
                    context,
                    0,
                    openAppIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                )
                views.setOnClickPendingIntent(R.id.widget_force_update_root, openAppPendingIntent)
                appWidgetManager.updateAppWidget(appWidgetId, views)
                return
            }

            val views = RemoteViews(context.packageName, R.layout.widget_plants)

            // Compute header fresh from plant data every call — never reads the cached
            // KEY_HEADER_LABEL. This guarantees the header is correct even at midnight
            // when the alarm fires before PlantWidgetFactory.onDataSetChanged() has run.
            val justWatered = prefs.getBoolean(WidgetConstants.KEY_JUST_WATERED, false)
            val plantsJson = prefs.getString(WidgetConstants.KEY_PLANTS, "[]") ?: "[]"
            views.setTextViewText(
                R.id.widget_header,
                if (justWatered) "✓ Watered!" else computeHeaderLabel(plantsJson),
            )

            // Set up remote adapter for the scrollable list
            val serviceIntent = Intent(context, PlantWidgetService::class.java).apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                data = Uri.parse(toUri(Intent.URI_INTENT_SCHEME))
            }
            views.setRemoteAdapter(R.id.widget_list, serviceIntent)
            views.setEmptyView(R.id.widget_list, R.id.widget_empty_text)

            // Template PendingIntent for list-item clicks (water + open actions)
            val templateIntent = Intent(context, WaterPlantReceiver::class.java)
            val templatePendingIntent = PendingIntent.getBroadcast(
                context,
                appWidgetId,
                templateIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE,
            )
            views.setPendingIntentTemplate(R.id.widget_list, templatePendingIntent)

            // Header tap → open app
            val openAppIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val openAppPendingIntent = PendingIntent.getActivity(
                context,
                0,
                openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            views.setOnClickPendingIntent(R.id.widget_header, openAppPendingIntent)
            views.setOnClickPendingIntent(R.id.widget_empty_text, openAppPendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)

            // Notify the list adapter so PlantWidgetFactory.onDataSetChanged() fires and
            // re-runs loadData() with the current date. This is what switches the list from
            // "tomorrow (grayed)" to "today (actionable)" at midnight.
            // Skipped when called FROM onDataSetChanged() to prevent an infinite loop.
            if (notifyList) {
                appWidgetManager.notifyAppWidgetViewDataChanged(intArrayOf(appWidgetId), R.id.widget_list)
            }
        }

        /**
         * Computes the header label ("💧 Water Today", "💧 Tomorrow", "💧 In N days") from the
         * raw plant JSON stored in SharedPreferences, using the current wall-clock date.
         * Called every time updateAppWidget() renders — always reflects the real current date.
         */
        private fun computeHeaderLabel(json: String): String {
            val startOfToday = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
            }.timeInMillis
            val endOfToday = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, 23); set(Calendar.MINUTE, 59)
                set(Calendar.SECOND, 59); set(Calendar.MILLISECOND, 999)
            }.timeInMillis
            return try {
                val arr = JSONArray(json)
                var minUpcoming = Long.MAX_VALUE
                for (i in 0 until arr.length()) {
                    val r = arr.getJSONObject(i).optLong("nextReminder", 0L)
                    if (r <= 0L) continue
                    if (r <= endOfToday) return "💧 Water Today"
                    if (r < minUpcoming) minUpcoming = r
                }
                if (minUpcoming == Long.MAX_VALUE) return "💧 Water Today"
                val nextDayStart = Calendar.getInstance().apply {
                    timeInMillis = minUpcoming
                    set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0)
                    set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
                }.timeInMillis
                val daysAway = ((nextDayStart - startOfToday) / 86_400_000L).toInt()
                when {
                    daysAway <= 0 -> "💧 Water Today"
                    daysAway == 1 -> "💧 Tomorrow"
                    else -> "💧 In $daysAway days"
                }
            } catch (_: Exception) { "💧 Water Today" }
        }
    }
}
