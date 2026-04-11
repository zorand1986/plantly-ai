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
            10_000,   // 10 second timeout
            true,     // allowed in foreground
        )
    }
}
