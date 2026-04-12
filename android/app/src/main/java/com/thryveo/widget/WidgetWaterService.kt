package com.thryveo.widget

import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

/**
 * Headless JS task service started by [WaterPlantReceiver] when the user waters
 * a plant from the widget.  Passes the plant's notificationId to the JS side so
 * the pending notifee alarm can be cancelled immediately — before it fires.
 */
class WidgetWaterService : HeadlessJsTaskService() {
    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig {
        val data = Arguments.createMap().apply {
            putString("notificationId", intent?.getStringExtra(EXTRA_NOTIFICATION_ID) ?: "")
        }
        return HeadlessJsTaskConfig(
            "CancelWateringNotification",
            data,
            10_000,
            true,
        )
    }

    companion object {
        const val EXTRA_NOTIFICATION_ID = "notificationId"
    }
}
