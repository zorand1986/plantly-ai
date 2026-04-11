package com.thryveo.widget

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import com.thryveo.R
import org.json.JSONArray

data class WidgetPlant(val id: String, val name: String)

class PlantWidgetFactory(
    private val context: Context,
    private val intent: Intent,
) : RemoteViewsService.RemoteViewsFactory {

    private var plants: List<WidgetPlant> = emptyList()
    private var justWateredIds: Set<String> = emptySet()

    override fun onCreate() {}

    override fun onDataSetChanged() {
        loadData()
    }

    override fun onDestroy() {}

    override fun getCount(): Int = plants.size

    override fun getViewAt(position: Int): RemoteViews {
        val plant = plants[position]
        val rv = RemoteViews(context.packageName, R.layout.widget_plant_item)

        if (plant.id in justWateredIds) {
            // Watered state: green styling with checkmark, no click actions
            rv.setTextViewText(R.id.plant_name_text, "✓  ${plant.name}")
            rv.setInt(R.id.plant_name_text, "setTextColor", Color.parseColor("#388e3c"))
            rv.setTextViewText(R.id.water_button, "✓")
            rv.setInt(R.id.water_button, "setTextColor", Color.parseColor("#388e3c"))
            rv.setInt(R.id.item_root, "setBackgroundColor", Color.parseColor("#e8f5e9"))
            // Empty fill-in intents so tapping a watered row does nothing
            rv.setOnClickFillInIntent(R.id.item_root, Intent())
            rv.setOnClickFillInIntent(R.id.water_button, Intent())
        } else {
            // Normal state
            rv.setTextViewText(R.id.plant_name_text, plant.name)
            rv.setInt(R.id.plant_name_text, "setTextColor", Color.parseColor("#1b5e20"))
            rv.setTextViewText(R.id.water_button, "💧")
            rv.setInt(R.id.water_button, "setTextColor", Color.BLACK)
            rv.setInt(R.id.item_root, "setBackgroundColor", Color.TRANSPARENT)

            // Tapping the item row opens the plant detail screen
            val openFillIn = Intent().apply {
                putExtra(WidgetConstants.EXTRA_ACTION, WidgetConstants.ACTION_OPEN)
                putExtra(WidgetConstants.EXTRA_PLANT_ID, plant.id)
            }
            rv.setOnClickFillInIntent(R.id.item_root, openFillIn)

            // Tapping the water-drop button marks the plant as watered
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

        // Load plants
        val json = prefs.getString(WidgetConstants.KEY_PLANTS, "[]") ?: "[]"
        val result = mutableListOf<WidgetPlant>()
        try {
            val arr = JSONArray(json)
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                result.add(WidgetPlant(id = obj.getString("id"), name = obj.getString("name")))
            }
        } catch (_: Exception) {}
        plants = result

        // Load just_watered set
        val jwJson = prefs.getString(WidgetConstants.KEY_JUST_WATERED, "[]") ?: "[]"
        val jwSet = mutableSetOf<String>()
        try {
            val arr = JSONArray(jwJson)
            for (i in 0 until arr.length()) jwSet.add(arr.getString(i))
        } catch (_: Exception) {}
        justWateredIds = jwSet
    }
}
