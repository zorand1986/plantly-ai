package com.thryveo.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
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
        // Refresh the header so it matches the newly computed list.
        // notifyList=false prevents updateAppWidget() from calling notifyAppWidgetViewDataChanged
        // again, which would trigger onDataSetChanged() in an infinite loop.
        val manager = AppWidgetManager.getInstance(context)
        val ids = manager.getAppWidgetIds(ComponentName(context, PlantWidget::class.java))
        if (ids.isNotEmpty()) {
            for (id in ids) PlantWidget.updateAppWidget(context, manager, id, notifyList = false)
        }
    }

    override fun onDestroy() {}

    override fun getCount(): Int = plants.size

    override fun getViewAt(position: Int): RemoteViews {
        val plant = plants[position]
        val rv = RemoteViews(context.packageName, R.layout.widget_plant_item)
        rv.setTextViewText(R.id.plant_name_text, plant.name)

        // Always set all visual properties explicitly — recycled views retain stale state
        // from their previous render if properties are only set in one branch.
        if (plant.dimmed) {
            rv.setTextColor(R.id.plant_name_text, Color.parseColor("#999999"))
            rv.setFloat(R.id.water_button, "setAlpha", 0.35f)
        } else {
            rv.setTextColor(R.id.plant_name_text, Color.parseColor("#111111"))
            rv.setFloat(R.id.water_button, "setAlpha", 1.0f)
        }

        // Tapping the row opens the plant detail screen (works for both normal and dimmed)
        val openFillIn = Intent().apply {
            putExtra(WidgetConstants.EXTRA_ACTION, WidgetConstants.ACTION_OPEN)
            putExtra(WidgetConstants.EXTRA_PLANT_ID, plant.id)
        }
        rv.setOnClickFillInIntent(R.id.item_root, openFillIn)

        // Always wire the water button — empty Intent for dimmed items so that
        // WaterPlantReceiver.onReceive() returns early (action extra is null) without
        // accidentally watering a plant on a recycled view that had a live intent before.
        val waterFillIn = if (!plant.dimmed) {
            Intent().apply {
                putExtra(WidgetConstants.EXTRA_ACTION, WidgetConstants.ACTION_WATER)
                putExtra(WidgetConstants.EXTRA_PLANT_ID, plant.id)
            }
        } else {
            Intent()  // no extras → WaterPlantReceiver returns early
        }
        rv.setOnClickFillInIntent(R.id.water_button, waterFillIn)

        return rv
    }

    override fun getLoadingView(): RemoteViews? = null

    override fun getViewTypeCount(): Int = 1

    override fun getItemId(position: Int): Long = plants[position].id.hashCode().toLong()

    override fun hasStableIds(): Boolean = true

    private fun loadData() {
        val prefs = context.getSharedPreferences(WidgetConstants.PREFS_NAME, Context.MODE_PRIVATE)
        val json = prefs.getString(WidgetConstants.KEY_PLANTS, "[]") ?: "[]"

        val today = Calendar.getInstance()
        val endOfToday = (today.clone() as Calendar).apply {
            set(Calendar.HOUR_OF_DAY, 23)
            set(Calendar.MINUTE, 59)
            set(Calendar.SECOND, 59)
            set(Calendar.MILLISECOND, 999)
        }.timeInMillis
        val startOfToday = (today.clone() as Calendar).apply {
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }.timeInMillis

        val all = mutableListOf<WidgetPlant>()
        try {
            val arr = JSONArray(json)
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                val r = obj.optLong("nextReminder", 0L)
                if (r > 0L) {
                    all.add(WidgetPlant(id = obj.getString("id"), name = obj.getString("name"), nextReminder = r))
                }
            }
        } catch (_: Exception) {}

        // Determine what to show and derive the matching header label in one pass.
        val dueToday = all.filter { it.nextReminder <= endOfToday }
        val headerLabel: String
        if (dueToday.isNotEmpty()) {
            plants = dueToday.sortedBy { it.nextReminder }
            headerLabel = "💧 Water Today"
        } else {
            val upcoming = all.filter { it.nextReminder > endOfToday }
            if (upcoming.isEmpty()) {
                plants = emptyList()
                headerLabel = "💧 Water Today"
            } else {
                val nextMs = upcoming.minOf { it.nextReminder }
                val nextCal = Calendar.getInstance().apply { timeInMillis = nextMs }
                val nextYear = nextCal.get(Calendar.YEAR)
                val nextDoy = nextCal.get(Calendar.DAY_OF_YEAR)
                plants = upcoming.filter {
                    val c = Calendar.getInstance().apply { timeInMillis = it.nextReminder }
                    c.get(Calendar.YEAR) == nextYear && c.get(Calendar.DAY_OF_YEAR) == nextDoy
                }.map { it.copy(dimmed = true) }.sortedBy { it.nextReminder }

                val nextDayStart = Calendar.getInstance().apply {
                    timeInMillis = nextMs
                    set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0)
                    set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
                }.timeInMillis
                val daysAway = ((nextDayStart - startOfToday) / 86_400_000L).toInt()
                headerLabel = when {
                    daysAway <= 0 -> "💧 Water Today"
                    daysAway == 1 -> "💧 Tomorrow"
                    else -> "💧 In $daysAway days"
                }
            }
        }

        // headerLabel computed above is intentionally not persisted to SharedPreferences.
        // PlantWidget.computeHeaderLabel() re-derives it fresh from KEY_PLANTS on every
        // updateAppWidget() call so the header is always correct at the time of rendering.
    }
}
