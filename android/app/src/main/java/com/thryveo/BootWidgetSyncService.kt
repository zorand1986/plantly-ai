package com.thryveo

import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

class BootWidgetSyncService : HeadlessJsTaskService() {
    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig {
        return HeadlessJsTaskConfig(
            "SyncWidget",
            Arguments.createMap(),
            30_000,   // 30 second timeout — task now also reschedules notifications
            true,     // allowed in foreground
        )
    }
}
