package com.thryveo.FilePicker

import android.app.Activity
import android.content.Intent
import android.net.Uri
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class FilePickerModule(private val ctx: ReactApplicationContext) :
    ReactContextBaseJavaModule(ctx), ActivityEventListener {

    private var pickerPromise: Promise? = null

    init {
        ctx.addActivityEventListener(this)
    }

    override fun getName(): String = "FilePicker"

    @ReactMethod
    fun pickJsonFile(promise: Promise) {
        val activity = ctx.currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No activity available")
            return
        }
        pickerPromise = promise
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "*/*"
            putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("application/json", "text/plain", "*/*"))
        }
        activity.startActivityForResult(intent, REQUEST_CODE)
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != REQUEST_CODE) return
        val promise = pickerPromise ?: return
        pickerPromise = null

        if (resultCode != Activity.RESULT_OK || data?.data == null) {
            promise.reject("CANCELLED", "User cancelled file picker")
            return
        }

        val uri: Uri = data.data!!
        try {
            ctx.contentResolver.takePersistableUriPermission(
                uri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION,
            )
        } catch (_: Exception) {}

        try {
            val content = ctx.contentResolver
                .openInputStream(uri)
                ?.bufferedReader()
                ?.use { it.readText() }
                ?: throw Exception("Could not open file")
            promise.resolve(content)
        } catch (e: Exception) {
            promise.reject("READ_ERROR", e.message, e)
        }
    }

    override fun onNewIntent(intent: Intent) {}

    companion object {
        private const val REQUEST_CODE = 7392
    }
}
