package com.thryveo.widget

import android.content.Context
import android.content.Intent
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

        return rv
    }

    override fun getLoadingView(): RemoteViews? = null

    override fun getViewTypeCount(): Int = 1

    override fun getItemId(position: Int): Long = plants[position].id.hashCode().toLong()

    override fun hasStableIds(): Boolean = true

    private fun loadData() {
        val prefs = context.getSharedPreferences(WidgetConstants.PREFS_NAME, Context.MODE_PRIVATE)
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
    }
}
