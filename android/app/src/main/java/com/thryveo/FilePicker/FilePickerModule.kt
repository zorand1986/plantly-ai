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
    private var savePromise: Promise? = null
    private var saveContent: String? = null

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
        activity.startActivityForResult(intent, REQUEST_CODE_OPEN)
    }

    @ReactMethod
    fun saveJsonFile(content: String, filename: String, promise: Promise) {
        val activity = ctx.currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No activity available")
            return
        }
        savePromise = promise
        saveContent = content
        val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "application/json"
            putExtra(Intent.EXTRA_TITLE, filename)
        }
        activity.startActivityForResult(intent, REQUEST_CODE_SAVE)
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        when (requestCode) {
            REQUEST_CODE_OPEN -> handleOpen(resultCode, data)
            REQUEST_CODE_SAVE -> handleSave(resultCode, data)
        }
    }

    private fun handleOpen(resultCode: Int, data: Intent?) {
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

    private fun handleSave(resultCode: Int, data: Intent?) {
        val promise = savePromise ?: return
        val content = saveContent
        savePromise = null
        saveContent = null

        if (resultCode != Activity.RESULT_OK || data?.data == null) {
            promise.reject("CANCELLED", "User cancelled save location picker")
            return
        }

        if (content == null) {
            promise.reject("NO_CONTENT", "No content to save")
            return
        }

        try {
            ctx.contentResolver.openOutputStream(data.data!!)
                ?.bufferedWriter()
                ?.use { it.write(content) }
                ?: throw Exception("Could not open output stream")
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("WRITE_ERROR", e.message, e)
        }
    }

    override fun onNewIntent(intent: Intent) {}

    companion object {
        private const val REQUEST_CODE_OPEN = 7392
        private const val REQUEST_CODE_SAVE = 7393
    }
}
