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
        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int,
        ) {
            val prefs = context.getSharedPreferences(WidgetConstants.PREFS_NAME, Context.MODE_PRIVATE)
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

            // Show "✓ Watered!" in the header briefly after a plant is watered
            val justWatered = prefs.getBoolean(WidgetConstants.KEY_JUST_WATERED, false)
            views.setTextViewText(
                R.id.widget_header,
                if (justWatered) "✓ Watered!" else "💧 Water Today",
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
        }
    }
}
