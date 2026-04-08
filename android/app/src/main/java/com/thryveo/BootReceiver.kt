package com.thryveo

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.facebook.react.HeadlessJsTaskService

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val bootActions = setOf(
            Intent.ACTION_BOOT_COMPLETED,
            "android.intent.action.QUICKBOOT_POWERON",
            "com.htc.intent.action.QUICKBOOT_POWERON",
        )
        if (intent.action in bootActions) {
            HeadlessJsTaskService.acquireWakeLockNow(context)
            val serviceIntent = Intent(context, BootTaskService::class.java)
            context.startService(serviceIntent)
        }
    }
}
