package com.thryveo.widget

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import com.thryveo.R
import java.util.Calendar
import org.json.JSONArray

data class WidgetPlant(val id: String, val name: String, val nextReminder: Long, val dimmed: Boolean = false)

class PlantWidgetFactory(
    private val context: Context,
    private val intent: Intent,
) : RemoteViewsService.RemoteViewsFactory {

    private var plants: List<WidgetPlant> = emptyList()

    override fun onCreate() {}

    override fun onDataSetChanged() {
        loadData()
    }

    override fun onDestroy() {}

    override fun getCount(): Int = plants.size

    override fun getViewAt(position: Int): RemoteViews {
        val plant = plants[position]
        val rv = RemoteViews(context.packageName, R.layout.widget_plant_item)
        rv.setTextViewText(R.id.plant_name_text, plant.name)

        if (plant.dimmed) {
            // Gray out text and fade the water button for upcoming (not-yet-due) plants
            rv.setTextColor(R.id.plant_name_text, Color.parseColor("#999999"))
            rv.setFloat(R.id.water_button, "setAlpha", 0.35f)
        }

        // Tapping the row opens the plant detail screen (works for both normal and dimmed)
        val openFillIn = Intent().apply {
            putExtra(WidgetConstants.EXTRA_ACTION, WidgetConstants.ACTION_OPEN)
            putExtra(WidgetConstants.EXTRA_PLANT_ID, plant.id)
        }
        rv.setOnClickFillInIntent(R.id.item_root, openFillIn)

        // Water button only wired for today's due plants
        if (!plant.dimmed) {
            val waterFillIn = Intent().apply {
                putExtra(WidgetConstants.EXTRA_ACTION, WidgetConstants.ACTION_WATER)
                putExtra(WidgetConstants.EXTRA_PLANT_ID, plant.id)
            }
            rv.setOnClickFillInIntent(R.id.water_button, waterFillIn)
        }

        return rv
    }

    override fun getLoadingView(): RemoteViews? = null

    override fun getViewTypeCount(): Int = 1

    override fun getItemId(position: Int): Long = plants[position].id.hashCode().toLong()

    override fun hasStableIds(): Boolean = true

    private fun loadData() {
        val prefs = context.getSharedPreferences(WidgetConstants.PREFS_NAME, Context.MODE_PRIVATE)
        val json = prefs.getString(WidgetConstants.KEY_PLANTS, "[]") ?: "[]"

        val endOfToday = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 23)
            set(Calendar.MINUTE, 59)
            set(Calendar.SECOND, 59)
            set(Calendar.MILLISECOND, 999)
        }.timeInMillis

        val all = mutableListOf<WidgetPlant>()
        try {
            val arr = JSONArray(json)
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                val r = obj.optLong("nextReminder", 0L)
                // Default 0L so legacy snapshots without the field still render.
                if (r > 0L) {
                    all.add(WidgetPlant(id = obj.getString("id"), name = obj.getString("name"), nextReminder = r))
                }
            }
        } catch (_: Exception) {}

        // Show today's due plants if any
        val dueToday = all.filter { it.nextReminder <= endOfToday }
        if (dueToday.isNotEmpty()) {
            plants = dueToday.sortedBy { it.nextReminder }
            return
        }

        // Nothing due today — find the next upcoming calendar date and show those grayed out
        val upcoming = all.filter { it.nextReminder > endOfToday }
        if (upcoming.isEmpty()) {
            plants = emptyList()
            return
        }

        val nextMs = upcoming.minOf { it.nextReminder }
        val nextCal = Calendar.getInstance().apply { timeInMillis = nextMs }
        val nextYear = nextCal.get(Calendar.YEAR)
        val nextDoy = nextCal.get(Calendar.DAY_OF_YEAR)
        plants = upcoming.filter {
            val c = Calendar.getInstance().apply { timeInMillis = it.nextReminder }
            c.get(Calendar.YEAR) == nextYear && c.get(Calendar.DAY_OF_YEAR) == nextDoy
        }.map { it.copy(dimmed = true) }.sortedBy { it.nextReminder }
    }
}
