package com.thryveo.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.thryveo.R

class WidgetDataModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "WidgetData"

    /**
     * Called from JS to push today's due-plants JSON to SharedPreferences and
     * trigger a widget refresh.
     * Expected JSON: [{"id":"...","name":"...","nextReminder":12345}, ...]
     * Also clears the force-update flag so the widget becomes usable again after an update.
     */
    @ReactMethod
    fun syncWidget(plantsJson: String, promise: Promise) {
        try {
            val ctx = reactApplicationContext
            ctx.getSharedPreferences(WidgetConstants.PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putString(WidgetConstants.KEY_PLANTS, plantsJson)
                .putBoolean(WidgetConstants.KEY_FORCE_UPDATE, false)
                .apply()

            val manager = AppWidgetManager.getInstance(ctx)
            val ids = manager.getAppWidgetIds(ComponentName(ctx, PlantWidget::class.java))
            if (ids.isNotEmpty()) {
                for (id in ids) PlantWidget.updateAppWidget(ctx, manager, id)
                manager.notifyAppWidgetViewDataChanged(ids, R.id.widget_list)
            }
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("WIDGET_SYNC_ERROR", e.message, e)
        }
    }

    /**
     * Called from JS when a force-update is required (or cleared).
     * Sets the flag in SharedPreferences and refreshes all widget instances.
     */
    @ReactMethod
    fun setForceUpdateRequired(required: Boolean, promise: Promise) {
        try {
            val ctx = reactApplicationContext
            ctx.getSharedPreferences(WidgetConstants.PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putBoolean(WidgetConstants.KEY_FORCE_UPDATE, required)
                .apply()

            val manager = AppWidgetManager.getInstance(ctx)
            val ids = manager.getAppWidgetIds(ComponentName(ctx, PlantWidget::class.java))
            for (id in ids) PlantWidget.updateAppWidget(ctx, manager, id)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("WIDGET_ERROR", e.message, e)
        }
    }

    /**
     * Called from JS to retrieve and clear any waterings that were performed
     * directly from the widget while the app was not running.
     * Returns JSON: [{"plantId":"...","timestamp":12345}, ...]
     */
    @ReactMethod
    fun getPendingWaterings(promise: Promise) {
        try {
            val ctx = reactApplicationContext
            val prefs = ctx.getSharedPreferences(WidgetConstants.PREFS_NAME, Context.MODE_PRIVATE)
            val json = prefs.getString(WidgetConstants.KEY_PENDING_WATERINGS, "[]") ?: "[]"
            prefs.edit().putString(WidgetConstants.KEY_PENDING_WATERINGS, "[]").apply()
            promise.resolve(json)
        } catch (e: Exception) {
            promise.reject("WIDGET_READ_ERROR", e.message, e)
        }
    }
}
